import { getSyncQueue, removeSyncQueueItem, updateSyncQueueItem } from '$lib/client/db/syncQueue';
import type { SyncQueueItem } from '$lib/client/db';

const MAX_RETRY_COUNT = 5;
const RETRY_DELAY_MS = 2000; // 初回は2秒

/**
 * 同期キューの全アイテムを処理する
 * @returns 同期が成功した場合true、失敗またはアイテムがない場合false
 */
export const processSyncQueue = async (): Promise<boolean> => {
	const queue = await getSyncQueue();
	console.log(`[Sync] Processing ${queue.length} items in sync queue`);

	if (queue.length === 0) {
		console.log('[Sync] No items to sync');
		return false;
	}

	let hasSuccess = false;

	for (const item of queue) {
		try {
			console.log(`[Sync] Processing item ${item.id} (${item.operation})`);
			await processSyncQueueItem(item);
			console.log(`[Sync] Successfully processed item ${item.id}`);
			hasSuccess = true;
		} catch (error) {
			console.error('Sync queue item processing failed:', error);
			// エラーがあっても次のアイテムは処理を続ける
		}
	}

	console.log('[Sync] Queue processing completed');
	return hasSuccess;
};

/**
 * 単一の同期キューアイテムを処理する
 */
const processSyncQueueItem = async (item: SyncQueueItem): Promise<void> => {
	try {
		// サーバーAPIに送信
		await syncToServer(item);

		// 成功したらキューから削除
		await removeSyncQueueItem(item.id);
	} catch (error) {
		// エラーハンドリング: リトライカウントを増やす
		const newRetryCount = item.retryCount + 1;

		if (newRetryCount >= MAX_RETRY_COUNT) {
			// 最大リトライ回数に達したらエラー状態として保持
			await updateSyncQueueItem(item.id, {
				retryCount: newRetryCount,
				lastError: error instanceof Error ? error.message : 'Unknown error',
			});
			throw new Error(`Sync failed after ${MAX_RETRY_COUNT} retries: ${item.id}`);
		} else {
			// リトライカウントを更新
			await updateSyncQueueItem(item.id, {
				retryCount: newRetryCount,
				lastError: error instanceof Error ? error.message : 'Unknown error',
			});

			// Exponential Backoff でリトライ
			const delay = RETRY_DELAY_MS * Math.pow(2, newRetryCount - 1);
			await new Promise((resolve) => setTimeout(resolve, delay));

			// 再試行
			await processSyncQueueItem(item);
		}
	}
};

/**
 * FormDataを作成する共通関数
 */
const createFormDataFromWorkLog = (data: SyncQueueItem['data']): FormData => {
	const formData = new FormData();
	if (data.id) {
		formData.set('id', data.id);
	}
	formData.set('startAt', data.startAt);
	if (data.endAt) {
		formData.set('endAt', data.endAt);
	}
	formData.set('description', data.description || '');
	// タグの配列を個別に追加
	if (data.tags && Array.isArray(data.tags)) {
		data.tags.forEach((tag: string) => {
			formData.append('tags', tag);
		});
	}
	return formData;
};

/**
 * サーバーAPIに同期データを送信する
 */
const syncToServer = async (item: SyncQueueItem): Promise<void> => {
	const { operation, data } = item;

	switch (operation) {
		case 'create': {
			const formData = createFormDataFromWorkLog(data);
			const res = await fetch('/?/start', {
				method: 'POST',
				body: formData,
			});
			if (!res.ok) {
				throw new Error(`Server responded with ${res.status}: ${await res.text()}`);
			}
			break;
		}

		case 'update': {
			const formData = createFormDataFromWorkLog(data);
			const res = await fetch('/?/update', {
				method: 'POST',
				body: formData,
			});
			if (!res.ok) {
				throw new Error(`Server responded with ${res.status}: ${await res.text()}`);
			}
			break;
		}

		case 'delete': {
			const formData = new FormData();
			formData.set('id', data.id);
			const res = await fetch('/?/delete', {
				method: 'POST',
				body: formData,
			});
			if (!res.ok) {
				throw new Error(`Server responded with ${res.status}: ${await res.text()}`);
			}
			break;
		}

		default:
			throw new Error(`Unknown operation: ${operation}`);
	}
};
