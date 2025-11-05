import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
	saveWorkLogOffline,
	updateWorkLogOffline,
	deleteWorkLogOffline,
	getWorkLogsOffline,
	getWorkLogOffline,
	clearWorkLogsOffline,
} from './workLogs';
import { clearSyncQueue, getSyncQueue } from './syncQueue';
import type { OfflineWorkLog } from './index';

describe('workLogs', () => {
	beforeEach(async () => {
		// テスト前にデータをクリア
		await clearWorkLogsOffline();
		await clearSyncQueue();
	});

	describe('saveWorkLogOffline', () => {
		it('新しいWorkLogを保存できる', async () => {
			const workLog: Omit<OfflineWorkLog, 'id' | 'syncStatus' | 'operation' | 'localCreatedAt'> = {
				userId: 'user-1',
				startAt: '2025-11-05T10:00:00Z',
				endAt: null,
				description: 'Test work',
				tags: ['tag1', 'tag2'],
			};

			const id = await saveWorkLogOffline(workLog);

			expect(id).toBeDefined();
			expect(typeof id).toBe('string');

			const saved = await getWorkLogOffline(id);
			expect(saved).toBeDefined();
			expect(saved?.userId).toBe('user-1');
			expect(saved?.startAt).toBe('2025-11-05T10:00:00Z');
			expect(saved?.endAt).toBeNull();
			expect(saved?.description).toBe('Test work');
			expect(saved?.tags).toEqual(['tag1', 'tag2']);
			expect(saved?.syncStatus).toBe('pending');
			expect(saved?.operation).toBe('create');
			expect(saved?.localCreatedAt).toBeGreaterThan(0);
		});

		it('同期キューに追加される', async () => {
			const workLog: Omit<OfflineWorkLog, 'id' | 'syncStatus' | 'operation' | 'localCreatedAt'> = {
				userId: 'user-1',
				startAt: '2025-11-05T10:00:00Z',
				endAt: null,
				description: 'Test work',
				tags: [],
			};

			const id = await saveWorkLogOffline(workLog);

			const queue = await getSyncQueue();
			expect(queue).toHaveLength(1);
			expect(queue[0].workLogId).toBe(id);
			expect(queue[0].operation).toBe('create');
			expect(queue[0].retryCount).toBe(0);
		});
	});

	describe('updateWorkLogOffline', () => {
		it('既存のWorkLogを更新できる', async () => {
			const workLog: Omit<OfflineWorkLog, 'id' | 'syncStatus' | 'operation' | 'localCreatedAt'> = {
				userId: 'user-1',
				startAt: '2025-11-05T10:00:00Z',
				endAt: null,
				description: 'Original description',
				tags: ['tag1'],
			};

			const id = await saveWorkLogOffline(workLog);

			await updateWorkLogOffline(id, {
				endAt: '2025-11-05T11:00:00Z',
				description: 'Updated description',
				tags: ['tag1', 'tag2'],
			});

			const updated = await getWorkLogOffline(id);
			expect(updated?.endAt).toBe('2025-11-05T11:00:00Z');
			expect(updated?.description).toBe('Updated description');
			expect(updated?.tags).toEqual(['tag1', 'tag2']);
			expect(updated?.syncStatus).toBe('pending');
			expect(updated?.operation).toBe('update');
		});

		it('存在しないWorkLogの更新はエラーになる', async () => {
			await expect(
				updateWorkLogOffline('non-existent-id', {
					description: 'Updated',
				}),
			).rejects.toThrow('WorkLog non-existent-id not found');
		});

		it('更新が同期キューに追加される', async () => {
			const workLog: Omit<OfflineWorkLog, 'id' | 'syncStatus' | 'operation' | 'localCreatedAt'> = {
				userId: 'user-1',
				startAt: '2025-11-05T10:00:00Z',
				endAt: null,
				description: 'Original',
				tags: [],
			};

			const id = await saveWorkLogOffline(workLog);
			await clearSyncQueue(); // 作成時のキューをクリア

			await updateWorkLogOffline(id, {
				description: 'Updated',
			});

			const queue = await getSyncQueue();
			expect(queue).toHaveLength(1);
			expect(queue[0].workLogId).toBe(id);
			expect(queue[0].operation).toBe('update');
		});
	});

	describe('deleteWorkLogOffline', () => {
		it('WorkLogを削除マークできる', async () => {
			const workLog: Omit<OfflineWorkLog, 'id' | 'syncStatus' | 'operation' | 'localCreatedAt'> = {
				userId: 'user-1',
				startAt: '2025-11-05T10:00:00Z',
				endAt: null,
				description: 'To be deleted',
				tags: [],
			};

			const id = await saveWorkLogOffline(workLog);

			await deleteWorkLogOffline(id);

			const deleted = await getWorkLogOffline(id);
			expect(deleted?.syncStatus).toBe('pending');
			expect(deleted?.operation).toBe('delete');
		});

		it('存在しないWorkLogの削除は何もしない', async () => {
			await expect(deleteWorkLogOffline('non-existent-id')).resolves.toBeUndefined();
		});

		it('削除が同期キューに追加される', async () => {
			const workLog: Omit<OfflineWorkLog, 'id' | 'syncStatus' | 'operation' | 'localCreatedAt'> = {
				userId: 'user-1',
				startAt: '2025-11-05T10:00:00Z',
				endAt: null,
				description: 'To be deleted',
				tags: [],
			};

			const id = await saveWorkLogOffline(workLog);
			await clearSyncQueue(); // 作成時のキューをクリア

			await deleteWorkLogOffline(id);

			const queue = await getSyncQueue();
			expect(queue).toHaveLength(1);
			expect(queue[0].workLogId).toBe(id);
			expect(queue[0].operation).toBe('delete');
		});
	});

	describe('getWorkLogsOffline', () => {
		it('userIdでWorkLogを取得できる', async () => {
			await saveWorkLogOffline({
				userId: 'user-1',
				startAt: '2025-11-05T10:00:00Z',
				endAt: null,
				description: 'Work 1',
				tags: [],
			});

			await saveWorkLogOffline({
				userId: 'user-1',
				startAt: '2025-11-05T11:00:00Z',
				endAt: null,
				description: 'Work 2',
				tags: [],
			});

			await saveWorkLogOffline({
				userId: 'user-2',
				startAt: '2025-11-05T12:00:00Z',
				endAt: null,
				description: 'Work 3',
				tags: [],
			});

			const user1WorkLogs = await getWorkLogsOffline('user-1');
			expect(user1WorkLogs).toHaveLength(2);
			expect(user1WorkLogs.every((w) => w.userId === 'user-1')).toBe(true);

			const user2WorkLogs = await getWorkLogsOffline('user-2');
			expect(user2WorkLogs).toHaveLength(1);
			expect(user2WorkLogs[0].userId).toBe('user-2');
		});

		it('該当するWorkLogがない場合は空配列を返す', async () => {
			const workLogs = await getWorkLogsOffline('non-existent-user');
			expect(workLogs).toEqual([]);
		});
	});

	describe('getWorkLogOffline', () => {
		it('IDでWorkLogを取得できる', async () => {
			const id = await saveWorkLogOffline({
				userId: 'user-1',
				startAt: '2025-11-05T10:00:00Z',
				endAt: null,
				description: 'Test work',
				tags: ['tag1'],
			});

			const workLog = await getWorkLogOffline(id);
			expect(workLog).toBeDefined();
			expect(workLog?.id).toBe(id);
			expect(workLog?.description).toBe('Test work');
		});

		it('存在しないIDの場合はundefinedを返す', async () => {
			const workLog = await getWorkLogOffline('non-existent-id');
			expect(workLog).toBeUndefined();
		});
	});
});
