import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
	addToSyncQueue,
	getSyncQueue,
	removeSyncQueueItem,
	updateSyncQueueItem,
	clearSyncQueue,
} from './syncQueue';
import type { SyncQueueItem, OfflineWorkLog } from './index';

const createTestWorkLog = (id: string, description = 'Test'): OfflineWorkLog => ({
	id,
	userId: 'user-1',
	startAt: '2025-11-05T10:00:00Z',
	endAt: null,
	description,
	tags: [],
	syncStatus: 'pending',
	operation: 'create',
	localCreatedAt: Date.now(),
});

describe('syncQueue', () => {
	beforeEach(async () => {
		// テスト前にキューをクリア
		await clearSyncQueue();
	});

	describe('addToSyncQueue', () => {
		it('同期キューにアイテムを追加できる', async () => {
			const item: SyncQueueItem = {
				id: 'queue-1',
				workLogId: 'work-1',
				operation: 'create',
				data: {
					id: 'work-1',
					userId: 'user-1',
					startAt: '2025-11-05T10:00:00Z',
					endAt: null,
					description: 'Test',
					tags: [],
					syncStatus: 'pending',
					operation: 'create',
					localCreatedAt: Date.now(),
				},
				timestamp: Date.now(),
				retryCount: 0,
			};

			await addToSyncQueue(item);

			const queue = await getSyncQueue();
			expect(queue).toHaveLength(1);
			expect(queue[0].id).toBe('queue-1');
			expect(queue[0].workLogId).toBe('work-1');
			expect(queue[0].operation).toBe('create');
		});

		it('複数のアイテムを追加できる', async () => {
			const items: SyncQueueItem[] = [
				{
					id: 'queue-1',
					workLogId: 'work-1',
					operation: 'create',
					data: createTestWorkLog('work-1'),
					timestamp: Date.now(),
					retryCount: 0,
				},
				{
					id: 'queue-2',
					workLogId: 'work-2',
					operation: 'update',
					data: createTestWorkLog('work-2'),
					timestamp: Date.now() + 1000,
					retryCount: 0,
				},
				{
					id: 'queue-3',
					workLogId: 'work-3',
					operation: 'delete',
					data: createTestWorkLog('work-3'),
					timestamp: Date.now() + 2000,
					retryCount: 0,
				},
			];

			for (const item of items) {
				await addToSyncQueue(item);
			}

			const queue = await getSyncQueue();
			expect(queue).toHaveLength(3);
		});
	});

	describe('getSyncQueue', () => {
		it('タイムスタンプ順にソートされた同期キューを取得できる', async () => {
			const now = Date.now();

			await addToSyncQueue({
				id: 'queue-3',
				workLogId: 'work-3',
				operation: 'delete',
				data: createTestWorkLog('work-3'),
				timestamp: now + 2000,
				retryCount: 0,
			});

			await addToSyncQueue({
				id: 'queue-1',
				workLogId: 'work-1',
				operation: 'create',
				data: createTestWorkLog('work-1'),
				timestamp: now,
				retryCount: 0,
			});

			await addToSyncQueue({
				id: 'queue-2',
				workLogId: 'work-2',
				operation: 'update',
				data: createTestWorkLog('work-2'),
				timestamp: now + 1000,
				retryCount: 0,
			});

			const queue = await getSyncQueue();
			expect(queue).toHaveLength(3);
			expect(queue[0].id).toBe('queue-1');
			expect(queue[1].id).toBe('queue-2');
			expect(queue[2].id).toBe('queue-3');
		});

		it('空のキューを取得できる', async () => {
			const queue = await getSyncQueue();
			expect(queue).toEqual([]);
		});
	});

	describe('removeSyncQueueItem', () => {
		it('同期キューからアイテムを削除できる', async () => {
			await addToSyncQueue({
				id: 'queue-1',
				workLogId: 'work-1',
				operation: 'create',
				data: createTestWorkLog('work-1'),
				timestamp: Date.now(),
				retryCount: 0,
			});

			await addToSyncQueue({
				id: 'queue-2',
				workLogId: 'work-2',
				operation: 'update',
				data: createTestWorkLog('work-2'),
				timestamp: Date.now(),
				retryCount: 0,
			});

			await removeSyncQueueItem('queue-1');

			const queue = await getSyncQueue();
			expect(queue).toHaveLength(1);
			expect(queue[0].id).toBe('queue-2');
		});

		it('存在しないアイテムの削除は何もしない', async () => {
			await addToSyncQueue({
				id: 'queue-1',
				workLogId: 'work-1',
				operation: 'create',
				data: createTestWorkLog('work-1'),
				timestamp: Date.now(),
				retryCount: 0,
			});

			await removeSyncQueueItem('non-existent-id');

			const queue = await getSyncQueue();
			expect(queue).toHaveLength(1);
		});
	});

	describe('updateSyncQueueItem', () => {
		it('同期キューアイテムを更新できる', async () => {
			const item: SyncQueueItem = {
				id: 'queue-1',
				workLogId: 'work-1',
				operation: 'create',
				data: createTestWorkLog('work-1', 'Original'),
				timestamp: Date.now(),
				retryCount: 0,
			};

			await addToSyncQueue(item);

			await updateSyncQueueItem('queue-1', {
				retryCount: 3,
				lastError: 'Network error',
			});

			const queue = await getSyncQueue();
			expect(queue).toHaveLength(1);
			expect(queue[0].retryCount).toBe(3);
			expect(queue[0].lastError).toBe('Network error');
			expect(queue[0].data.description).toBe('Original'); // 他のフィールドは変更されない
		});

		it('存在しないアイテムの更新は何もしない', async () => {
			await updateSyncQueueItem('non-existent-id', {
				retryCount: 5,
			});

			const queue = await getSyncQueue();
			expect(queue).toEqual([]);
		});
	});

	describe('clearSyncQueue', () => {
		it('同期キュー全体をクリアできる', async () => {
			await addToSyncQueue({
				id: 'queue-1',
				workLogId: 'work-1',
				operation: 'create',
				data: createTestWorkLog('work-1'),
				timestamp: Date.now(),
				retryCount: 0,
			});

			await addToSyncQueue({
				id: 'queue-2',
				workLogId: 'work-2',
				operation: 'update',
				data: createTestWorkLog('work-2'),
				timestamp: Date.now(),
				retryCount: 0,
			});

			await clearSyncQueue();

			const queue = await getSyncQueue();
			expect(queue).toEqual([]);
		});
	});
});
