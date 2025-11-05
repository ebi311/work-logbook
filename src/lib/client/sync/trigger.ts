import { processSyncQueue } from './processor';
import { isOnline } from '$lib/client/network/status';
import { get } from 'svelte/store';

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
 */
export const syncWorkLogsNow = async (): Promise<void> => {
	// オフライン時は何もしない
	if (!get(isOnline)) {
		console.log('Offline, skipping sync');
		return;
	}

	try {
		await processSyncQueue();
		console.log('Sync completed successfully');
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
export const setupAutoSync = (): void => {
	if (typeof window === 'undefined') {
		return;
	}

	// オンライン復帰イベントで同期
	window.addEventListener('online', () => {
		console.log('Network connection restored, syncing...');
		requestSync().catch((error) => {
			console.error('Auto sync failed:', error);
		});
	});

	// isOnlineストアの変更を監視
	isOnline.subscribe((online) => {
		if (online) {
			console.log('Online status changed to true, syncing...');
			requestSync().catch((error) => {
				console.error('Auto sync on status change failed:', error);
			});
		}
	});
};
