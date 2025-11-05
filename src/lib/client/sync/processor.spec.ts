import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { processSyncQueue } from './processor';
import { addToSyncQueue, getSyncQueue, clearSyncQueue } from '$lib/client/db/syncQueue';
import type { SyncQueueItem } from '$lib/client/db';

// fetch APIをモック
global.fetch = vi.fn();

const createTestSyncItem = (
	id: string,
	operation: 'create' | 'update' | 'delete',
): SyncQueueItem => ({
	id,
	workLogId: `work-${id}`,
	operation,
	data: {
		id: `work-${id}`,
		userId: 'user-1',
		startAt: '2025-11-05T10:00:00Z',
		endAt: null,
		description: 'Test work',
		tags: [],
		syncStatus: 'pending',
		operation,
		localCreatedAt: Date.now(),
	},
	timestamp: Date.now(),
	retryCount: 0,
});

describe('sync/processor', () => {
	beforeEach(async () => {
		await clearSyncQueue();
		vi.clearAllMocks();
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
			ok: true,
			status: 200,
			text: async () => 'OK',
		});
	});

	describe('processSyncQueue', () => {
		it('空のキューを処理できる', async () => {
			await processSyncQueue();
			expect(global.fetch).not.toHaveBeenCalled();
		});

		it('create操作を同期できる', async () => {
			const item = createTestSyncItem('sync-1', 'create');
			await addToSyncQueue(item);

			await processSyncQueue();

			expect(global.fetch).toHaveBeenCalledWith(
				'/api/worklogs',
				expect.objectContaining({
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
				}),
			);

			const queue = await getSyncQueue();
			expect(queue).toHaveLength(0); // 成功したらキューから削除される
		});

		it('update操作を同期できる', async () => {
			const item = createTestSyncItem('sync-2', 'update');
			await addToSyncQueue(item);

			await processSyncQueue();

			expect(global.fetch).toHaveBeenCalledWith(
				`/api/worklogs/${item.workLogId}`,
				expect.objectContaining({
					method: 'PUT',
				}),
			);

			const queue = await getSyncQueue();
			expect(queue).toHaveLength(0);
		});

		it('delete操作を同期できる', async () => {
			const item = createTestSyncItem('sync-3', 'delete');
			await addToSyncQueue(item);

			await processSyncQueue();

			expect(global.fetch).toHaveBeenCalledWith(`/api/worklogs/${item.workLogId}`, {
				method: 'DELETE',
			});

			const queue = await getSyncQueue();
			expect(queue).toHaveLength(0);
		});

		it('複数のアイテムを順番に同期できる', async () => {
			await addToSyncQueue(createTestSyncItem('sync-1', 'create'));
			await addToSyncQueue(createTestSyncItem('sync-2', 'update'));
			await addToSyncQueue(createTestSyncItem('sync-3', 'delete'));

			await processSyncQueue();

			expect(global.fetch).toHaveBeenCalledTimes(3);

			const queue = await getSyncQueue();
			expect(queue).toHaveLength(0);
		});

		it('サーバーエラー時にリトライカウントを増やす', async () => {
			// 最初の1回だけエラーを返し、その後は成功させる
			let callCount = 0;
			(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async () => {
				callCount++;
				if (callCount === 1) {
					return {
						ok: false,
						status: 500,
						text: async () => 'Server Error',
					};
				}
				return {
					ok: true,
					status: 200,
					text: async () => 'OK',
				};
			});

			const item = createTestSyncItem('sync-4', 'create');
			await addToSyncQueue(item);

			await processSyncQueue();

			// 2回呼ばれる（1回目失敗、2回目成功）
			expect(callCount).toBe(2);

			// 成功したのでキューから削除される
			const queue = await getSyncQueue();
			expect(queue).toHaveLength(0);
		});
	});
});
