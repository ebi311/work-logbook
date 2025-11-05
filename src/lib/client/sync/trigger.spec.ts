import { describe, it, expect, beforeEach, vi } from 'vitest';
import { requestSync, syncWorkLogsNow, setupAutoSync } from './trigger';
import { isOnline } from '$lib/client/network/status';
import * as processor from './processor';

vi.mock('./processor', () => ({
	processSyncQueue: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('$app/navigation', () => ({
	invalidateAll: vi.fn().mockResolvedValue(undefined),
}));

describe('sync/trigger', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		isOnline.set(true);
	});

	describe('syncWorkLogsNow', () => {
		it('オンライン時に同期処理を実行する', async () => {
			isOnline.set(true);
			await syncWorkLogsNow();

			expect(processor.processSyncQueue).toHaveBeenCalledOnce();
		});

		it('オフライン時は同期処理をスキップする', async () => {
			isOnline.set(false);
			await syncWorkLogsNow();

			expect(processor.processSyncQueue).not.toHaveBeenCalled();
		});

		it('同期処理のエラーを伝播する', async () => {
			isOnline.set(true);
			const error = new Error('Sync error');
			vi.mocked(processor.processSyncQueue).mockRejectedValueOnce(error);

			await expect(syncWorkLogsNow()).rejects.toThrow('Sync error');
		});
	});

	describe('requestSync', () => {
		it('オフライン時は何もしない', async () => {
			isOnline.set(false);
			await requestSync();

			expect(processor.processSyncQueue).not.toHaveBeenCalled();
		});

		it('オンライン時に同期をリクエストする', async () => {
			isOnline.set(true);
			await requestSync();

			// Background Sync非対応環境では即座に実行される
			expect(processor.processSyncQueue).toHaveBeenCalled();
		});
	});

	describe('setupAutoSync', () => {
		it('セットアップ関数が存在する', () => {
			expect(setupAutoSync).toBeDefined();
			expect(typeof setupAutoSync).toBe('function');
		});

		it('ブラウザ環境外では何もしない', () => {
			// Node.js環境ではwindowが存在しないが、エラーにならないことを確認
			expect(() => setupAutoSync()).not.toThrow();
		});
	});
});
