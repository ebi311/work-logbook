/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from './index';
import { workLogTags } from './schema';
import {
	saveWorkLogTags,
	getWorkLogTags,
	getUserTagSuggestions,
	getWorkLogWithTags
} from './workLogs';

describe('WorkLog タグ関連関数', () => {
	const mockUserId = '123e4567-e89b-12d3-a456-426614174001';
	const mockWorkLogId = '123e4567-e89b-12d3-a456-426614174000';

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('saveWorkLogTags', () => {
		it('TC1: 正常系 - タグを保存できる', async () => {
			const tags = ['開発', 'バグ修正'];

			// 既存タグの削除をモック
			const deleteSpy = vi.spyOn(db, 'delete').mockReturnValue({
				where: vi.fn().mockResolvedValue([])
			} as any);

			// 新規タグの挿入をモック
			const insertSpy = vi.spyOn(db, 'insert').mockReturnValue({
				values: vi.fn().mockResolvedValue([
					{ id: 1, workLogId: mockWorkLogId, tag: '開発', createdAt: new Date() },
					{ id: 2, workLogId: mockWorkLogId, tag: 'バグ修正', createdAt: new Date() }
				])
			} as any);

			await saveWorkLogTags(mockWorkLogId, tags);

			expect(deleteSpy).toHaveBeenCalledWith(workLogTags);
			expect(insertSpy).toHaveBeenCalledWith(workLogTags);
		});

		it('TC2: 正常系 - 空配列を保存すると既存タグが削除される', async () => {
			const tags: string[] = [];

			const deleteSpy = vi.spyOn(db, 'delete').mockReturnValue({
				where: vi.fn().mockResolvedValue([])
			} as any);

			const insertSpy = vi.spyOn(db, 'insert');

			await saveWorkLogTags(mockWorkLogId, tags);

			expect(deleteSpy).toHaveBeenCalledWith(workLogTags);
			// 空配列の場合はinsertが呼ばれない
			expect(insertSpy).not.toHaveBeenCalled();
		});
	});

	describe('getWorkLogTags', () => {
		it('TC1: 正常系 - タグを取得できる', async () => {
			const mockTags = [
				{ id: 1, workLogId: mockWorkLogId, tag: '開発', createdAt: new Date() },
				{ id: 2, workLogId: mockWorkLogId, tag: 'バグ修正', createdAt: new Date() }
			];

			vi.spyOn(db.query.workLogTags, 'findMany').mockResolvedValue(mockTags as any);

			const result = await getWorkLogTags(mockWorkLogId);

			expect(result).toEqual(['開発', 'バグ修正']);
		});

		it('TC2: 正常系 - タグが存在しない場合は空配列を返す', async () => {
			vi.spyOn(db.query.workLogTags, 'findMany').mockResolvedValue([]);

			const result = await getWorkLogTags(mockWorkLogId);

			expect(result).toEqual([]);
		});
	});

	describe('getUserTagSuggestions', () => {
		it('TC1: 正常系 - タグ候補を取得できる', async () => {
			const mockResults = [
				{ tag: '開発', count: 5 },
				{ tag: 'バグ修正', count: 3 },
				{ tag: 'レビュー', count: 2 }
			];

			// SELECT ... FROM work_log_tags をモック
			const selectMock = {
				from: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							groupBy: vi.fn().mockReturnValue({
								orderBy: vi.fn().mockReturnValue({
									limit: vi.fn().mockResolvedValue(mockResults)
								})
							})
						})
					})
				})
			};

			vi.spyOn(db, 'select').mockReturnValue(selectMock as any);

			const result = await getUserTagSuggestions(mockUserId, '開', 5);

			expect(result).toEqual(['開発', 'バグ修正', 'レビュー']);
		});

		it('TC2: 正常系 - queryが空文字の場合は全てのタグを返す', async () => {
			const mockResults = [
				{ tag: '開発', count: 5 },
				{ tag: 'バグ修正', count: 3 }
			];

			const selectMock = {
				from: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							groupBy: vi.fn().mockReturnValue({
								orderBy: vi.fn().mockReturnValue({
									limit: vi.fn().mockResolvedValue(mockResults)
								})
							})
						})
					})
				})
			};

			vi.spyOn(db, 'select').mockReturnValue(selectMock as any);

			const result = await getUserTagSuggestions(mockUserId, '', 10);

			expect(result).toEqual(['開発', 'バグ修正']);
		});

		it('TC3: 正常系 - 結果が0件の場合は空配列を返す', async () => {
			const selectMock = {
				from: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							groupBy: vi.fn().mockReturnValue({
								orderBy: vi.fn().mockReturnValue({
									limit: vi.fn().mockResolvedValue([])
								})
							})
						})
					})
				})
			};

			vi.spyOn(db, 'select').mockReturnValue(selectMock as any);

			const result = await getUserTagSuggestions(mockUserId, 'xxx', 5);

			expect(result).toEqual([]);
		});
	});

	describe('getWorkLogWithTags', () => {
		it('TC1: 正常系 - 作業記録とタグを取得できる', async () => {
			const mockWorkLog = {
				id: mockWorkLogId,
				userId: mockUserId,
				startedAt: new Date('2025-10-30T10:00:00Z'),
				endedAt: null,
				description: 'テスト作業',
				createdAt: new Date('2025-10-30T10:00:00Z'),
				updatedAt: new Date('2025-10-30T10:00:00Z')
			};

			const mockTags = [{ id: 1, workLogId: mockWorkLogId, tag: '開発', createdAt: new Date() }];

			vi.spyOn(db.query.workLogs, 'findFirst').mockResolvedValue(mockWorkLog as any);
			vi.spyOn(db.query.workLogTags, 'findMany').mockResolvedValue(mockTags as any);

			const result = await getWorkLogWithTags(mockWorkLogId);

			expect(result).not.toBeNull();
			expect(result?.id).toBe(mockWorkLogId);
			expect(result?.tags).toEqual(['開発']);
		});

		it('TC2: 正常系 - 作業記録が存在しない場合はnullを返す', async () => {
			vi.spyOn(db.query.workLogs, 'findFirst').mockResolvedValue(undefined);

			const result = await getWorkLogWithTags('non-existent-id');

			expect(result).toBeNull();
		});

		it('TC3: 正常系 - タグが存在しない場合は空配列を返す', async () => {
			const mockWorkLog = {
				id: mockWorkLogId,
				userId: mockUserId,
				startedAt: new Date('2025-10-30T10:00:00Z'),
				endedAt: null,
				description: 'テスト作業',
				createdAt: new Date('2025-10-30T10:00:00Z'),
				updatedAt: new Date('2025-10-30T10:00:00Z')
			};

			vi.spyOn(db.query.workLogs, 'findFirst').mockResolvedValue(mockWorkLog as any);
			vi.spyOn(db.query.workLogTags, 'findMany').mockResolvedValue([]);

			const result = await getWorkLogWithTags(mockWorkLogId);

			expect(result).not.toBeNull();
			expect(result?.tags).toEqual([]);
		});
	});
});
