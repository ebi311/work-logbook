import { getSyncQueue, removeSyncQueueItem, updateSyncQueueItem } from '$lib/client/db/syncQueue';
import type { SyncQueueItem } from '$lib/client/db';

const MAX_RETRY_COUNT = 5;
const RETRY_DELAY_MS = 2000; // 初回は2秒

/**
 * 同期キューの全アイテムを処理する
 */
export const processSyncQueue = async (): Promise<void> => {
	const queue = await getSyncQueue();

	for (const item of queue) {
		try {
			await processSyncQueueItem(item);
		} catch (error) {
			console.error('Sync queue item processing failed:', error);
			// エラーがあっても次のアイテムは処理を続ける
		}
	}
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
 * サーバーAPIに同期データを送信する
 */
const syncToServer = async (item: SyncQueueItem): Promise<void> => {
	const { operation, data } = item;

	switch (operation) {
		case 'create':
			await fetch('/api/worklogs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					startAt: data.startAt,
					endAt: data.endAt,
					description: data.description,
					tags: data.tags,
				}),
			}).then(async (res) => {
				if (!res.ok) {
					throw new Error(`Server responded with ${res.status}: ${await res.text()}`);
				}
			});
			break;

		case 'update':
			await fetch(`/api/worklogs/${data.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					startAt: data.startAt,
					endAt: data.endAt,
					description: data.description,
					tags: data.tags,
				}),
			}).then(async (res) => {
				if (!res.ok) {
					throw new Error(`Server responded with ${res.status}: ${await res.text()}`);
				}
			});
			break;

		case 'delete':
			await fetch(`/api/worklogs/${data.id}`, {
				method: 'DELETE',
			}).then(async (res) => {
				if (!res.ok) {
					throw new Error(`Server responded with ${res.status}: ${await res.text()}`);
				}
			});
			break;

		default:
			throw new Error(`Unknown operation: ${operation}`);
	}
};
