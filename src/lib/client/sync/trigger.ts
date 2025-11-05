import { processSyncQueue } from './processor';
import { isOnline } from '$lib/client/network/status';
import { get } from 'svelte/store';
import { invalidateAll } from '$app/navigation';

/**
 * 同期成功時のコールバック関数の型
 */
type SyncSuccessCallback = () => void | Promise<void>;

let syncSuccessCallback: SyncSuccessCallback | null = null;

/**
 * 同期成功時のコールバックを設定
 */
export const setSyncSuccessCallback = (callback: SyncSuccessCallback | null): void => {
	syncSuccessCallback = callback;
};

/**
 * Background Sync APIを使用して同期をリクエストする
 * Background Sync APIが利用できない場合は即座に同期を試みる
 */
export const requestSync = async (): Promise<void> => {
	// オフライン時は何もしない
	if (!get(isOnline)) {
		return;
	}

	// Background Sync API対応チェック
	if (supportsBackgroundSync()) {
		try {
			const registration = await navigator.serviceWorker.ready;
			await registration.sync.register('sync-worklogs');
			console.log('Background Sync registered');
		} catch (error) {
			console.error('Background Sync registration failed:', error);
			// フォールバック: 即座に同期を試みる
			await syncWorkLogsNow();
		}
	} else {
		// Background Sync非対応ブラウザ
		console.log('Background Sync not supported, syncing immediately');
		await syncWorkLogsNow();
	}
};

/**
 * 即座に同期処理を実行する
 * @returns 同期が成功した場合true
 */
export const syncWorkLogsNow = async (): Promise<boolean> => {
	// オフライン時は何もしない
	if (!get(isOnline)) {
		console.log('Offline, skipping sync');
		return false;
	}

	try {
		const hasSuccess = await processSyncQueue();
		if (hasSuccess) {
			console.log('Sync completed successfully');
			
			// 同期成功時のコールバックを実行（hasOfflineChangesフラグのリセットなど）
			if (syncSuccessCallback) {
				await syncSuccessCallback();
			}
			
			// データを再取得（ページリロードの代わり）
			if (typeof window !== 'undefined') {
				console.log('[Sync] Invalidating data to refresh...');
				await invalidateAll();
			}
		}
		return hasSuccess;
	} catch (error) {
		console.error('Sync failed:', error);
		throw error;
	}
};

/**
 * Background Sync APIがサポートされているかチェック
 */
const supportsBackgroundSync = (): boolean => {
	if (typeof window === 'undefined') {
		return false;
	}

	return 'serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype;
};

/**
 * オンライン復帰時に自動的に同期を試みる
 */
export const setupAutoSync = (): (() => void) => {
	if (typeof window === 'undefined') {
		return () => {};
	}

	// オンライン復帰イベントで同期
	const handleOnline = () => {
		console.log('Network connection restored, syncing...');
		requestSync().catch((error) => {
			console.error('Auto sync failed:', error);
		});
	};

	window.addEventListener('online', handleOnline);

	// クリーンアップ関数を返す
	return () => {
		window.removeEventListener('online', handleOnline);
	};
};
