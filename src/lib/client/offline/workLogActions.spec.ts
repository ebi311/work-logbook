import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	executeOfflineAction,
	type OfflineActionContext,
	type ActiveWorkLog,
} from './workLogActions';
import * as workLogsDb from '../db/workLogs';
import * as syncTrigger from '../sync/trigger';

// モックの設定
vi.mock('../db/workLogs', () => ({
	saveWorkLogOffline: vi.fn(),
	updateWorkLogOffline: vi.fn(),
}));

vi.mock('../sync/trigger', () => ({
	requestSync: vi.fn(),
}));

describe('workLogActions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('executeOfflineAction - start', () => {
		it('作業を開始し、新しいactiveを返す', async () => {
			// Arrange
			const mockId = 'test-id-123';
			vi.mocked(workLogsDb.saveWorkLogOffline).mockResolvedValue(mockId);

			const context: OfflineActionContext = {
				currentActive: undefined,
				description: 'テスト作業',
				tags: ['tag1', 'tag2'],
				userId: 'user-123',
			};

			// Act
			const result = await executeOfflineAction('start', context);

			// Assert
			expect(result.success).toBe(true);
			expect(result.currentActive).toBeDefined();
			expect(result.currentActive?.id).toBe(mockId);
			expect(result.currentActive?.description).toBe('テスト作業');
			expect(result.currentActive?.tags).toEqual(['tag1', 'tag2']);
			expect(result.currentActive?.endedAt).toBe(null);
			expect(result.message).toBe('作業を開始しました（オフライン）');

			expect(workLogsDb.saveWorkLogOffline).toHaveBeenCalledWith({
				userId: 'user-123',
				startAt: expect.any(String),
				endAt: null,
				description: 'テスト作業',
				tags: ['tag1', 'tag2'],
			});

			expect(syncTrigger.requestSync).toHaveBeenCalled();
		});
	});

	describe('executeOfflineAction - stop', () => {
		it('進行中の作業を終了し、undefinedを返す', async () => {
			// Arrange
			const currentActive: ActiveWorkLog = {
				id: 'active-id',
				startedAt: new Date(Date.now() - 60000).toISOString(), // 1分前
				endedAt: null,
				description: '進行中の作業',
				tags: ['tag1'],
			};

			const context: OfflineActionContext = {
				currentActive,
				description: '進行中の作業(更新)',
				tags: ['tag1', 'tag2'],
				userId: 'user-123',
			};

			vi.mocked(workLogsDb.updateWorkLogOffline).mockResolvedValue();

			// Act
			const result = await executeOfflineAction('stop', context);

			// Assert
			expect(result.success).toBe(true);
			expect(result.currentActive).toBeUndefined();
			expect(result.duration).toBeDefined();
			expect(result.duration).toBeGreaterThanOrEqual(0);
			expect(result.message).toContain('作業を終了しました（オフライン');

			expect(workLogsDb.updateWorkLogOffline).toHaveBeenCalledWith('active-id', {
				endAt: expect.any(String),
				description: '進行中の作業(更新)',
				tags: ['tag1', 'tag2'],
			});

			expect(syncTrigger.requestSync).toHaveBeenCalled();
		});

		it('進行中の作業がない場合はエラーを返す', async () => {
			// Arrange
			const context: OfflineActionContext = {
				currentActive: undefined,
				description: 'テスト',
				tags: [],
				userId: 'user-123',
			};

			// Act
			const result = await executeOfflineAction('stop', context);

			// Assert
			expect(result.success).toBe(false);
			expect(result.error).toBe('進行中の作業がありません');
			expect(workLogsDb.updateWorkLogOffline).not.toHaveBeenCalled();
		});
	});

	describe('executeOfflineAction - switch', () => {
		it('作業を切り替え、新しいactiveを返す', async () => {
			// Arrange
			const currentActive: ActiveWorkLog = {
				id: 'old-id',
				startedAt: new Date(Date.now() - 120000).toISOString(), // 2分前
				endedAt: null,
				description: '古い作業',
				tags: ['old-tag'],
			};

			const newId = 'new-id-456';
			vi.mocked(workLogsDb.updateWorkLogOffline).mockResolvedValue();
			vi.mocked(workLogsDb.saveWorkLogOffline).mockResolvedValue(newId);

			const context: OfflineActionContext = {
				currentActive,
				description: '新しい作業',
				tags: ['new-tag'],
				userId: 'user-123',
			};

			// Act
			const result = await executeOfflineAction('switch', context);

			// Assert
			expect(result.success).toBe(true);
			expect(result.currentActive).toBeDefined();
			expect(result.currentActive?.id).toBe(newId);
			expect(result.currentActive?.description).toBe('新しい作業');
			expect(result.currentActive?.tags).toEqual(['new-tag']);
			expect(result.duration).toBeDefined();
			expect(result.duration).toBeGreaterThanOrEqual(1);
			expect(result.message).toContain('作業を切り替えました（オフライン');

			// 既存の作業を終了
			expect(workLogsDb.updateWorkLogOffline).toHaveBeenCalledWith('old-id', {
				endAt: expect.any(String),
				description: '古い作業',
				tags: ['old-tag'],
			});

			// 新しい作業を開始
			expect(workLogsDb.saveWorkLogOffline).toHaveBeenCalledWith({
				userId: 'user-123',
				startAt: expect.any(String),
				endAt: null,
				description: '新しい作業',
				tags: ['new-tag'],
			});

			expect(syncTrigger.requestSync).toHaveBeenCalled();
		});

		it('進行中の作業がない場合はエラーを返す', async () => {
			// Arrange
			const context: OfflineActionContext = {
				currentActive: undefined,
				description: '新しい作業',
				tags: [],
				userId: 'user-123',
			};

			// Act
			const result = await executeOfflineAction('switch', context);

			// Assert
			expect(result.success).toBe(false);
			expect(result.error).toBe('進行中の作業がありません');
			expect(workLogsDb.updateWorkLogOffline).not.toHaveBeenCalled();
			expect(workLogsDb.saveWorkLogOffline).not.toHaveBeenCalled();
		});
	});

	describe('executeOfflineAction - エラーハンドリング', () => {
		it('DBエラー時にエラーメッセージを返す', async () => {
			// Arrange
			vi.mocked(workLogsDb.saveWorkLogOffline).mockRejectedValue(new Error('DB Error'));

			const context: OfflineActionContext = {
				currentActive: undefined,
				description: 'テスト',
				tags: [],
				userId: 'user-123',
			};

			// Act
			const result = await executeOfflineAction('start', context);

			// Assert
			expect(result.success).toBe(false);
			expect(result.error).toBe('オフライン操作でエラーが発生しました');
		});
	});
});
