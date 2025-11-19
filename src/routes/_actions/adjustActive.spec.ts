/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { WorkLog } from '../../models/workLog';
import type { ServerLoadEvent } from '@sveltejs/kit';

/**
 * F-001.2: Server Actions - adjustActive のテスト
 */

// workLogs モジュールをモック化
vi.mock('$lib/server/db/workLogs', () => ({
	getActiveWorkLog: vi.fn(),
	updateActiveWorkLog: vi.fn(),
	getPreviousEndedAt: vi.fn(),
}));

import { handleAdjustActiveAction } from './adjustActive';
import { getActiveWorkLog, updateActiveWorkLog, getPreviousEndedAt } from '$lib/server/db/workLogs';

describe('Server Actions: adjustActive', () => {
	const testUserId = randomUUID();
	const testWorkLogId = randomUUID();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('TC1: 進行中作業の調整成功', () => {
		it('ok: true と更新された workLog を返却する', async () => {
			const originalStartedAt = new Date('2025-11-19T10:00:00Z');
			const newStartedAt = new Date('2025-11-19T09:00:00Z');
			const updatedAt = new Date('2025-11-19T11:00:00Z');

			// モック: 進行中の作業あり
			const mockActiveWorkLog = WorkLog.from({
				id: testWorkLogId,
				userId: testUserId,
				startedAt: originalStartedAt,
				endedAt: null,
				description: '元の説明',
				tags: ['元のタグ'],
				createdAt: originalStartedAt,
				updatedAt: originalStartedAt,
			});
			vi.mocked(getActiveWorkLog).mockResolvedValue(mockActiveWorkLog);

			// モック: previousEndedAt なし
			vi.mocked(getPreviousEndedAt).mockResolvedValue(null);

			// モック: 更新成功
			const mockUpdatedWorkLog = WorkLog.from({
				id: testWorkLogId,
				userId: testUserId,
				startedAt: newStartedAt,
				endedAt: null,
				description: '更新された説明',
				tags: ['新しいタグ1', '新しいタグ2'],
				createdAt: originalStartedAt,
				updatedAt,
			});
			vi.mocked(updateActiveWorkLog).mockResolvedValue(mockUpdatedWorkLog);

			// モック: locals
			const locals = {
				user: {
					id: testUserId,
				},
			};

			// モック: request with FormData
			const formData = new FormData();
			formData.append('workLogId', testWorkLogId);
			formData.append('startedAt', newStartedAt.toISOString());
			formData.append('description', '更新された説明');
			formData.append('tags', '新しいタグ1 新しいタグ2');
			const request = new Request('http://localhost:5173/?/adjustActive', {
				method: 'POST',
				body: formData,
			});

			// adjustActive actionを呼び出し
			const result = await handleAdjustActiveAction({ locals, request } as ServerLoadEvent);

			// 検証
			expect(result).toHaveProperty('ok', true);
			expect(result).toHaveProperty('workLog');
			expect(result).toHaveProperty('serverNow');
			expect((result as any).workLog).toEqual({
				id: testWorkLogId,
				startedAt: newStartedAt.toISOString(),
				endedAt: null,
				description: '更新された説明',
				tags: ['新しいタグ1', '新しいタグ2'],
				updatedAt: updatedAt.toISOString(),
			});
			expect((result as any).serverNow).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
			expect(updateActiveWorkLog).toHaveBeenCalledWith(testUserId, testWorkLogId, {
				startedAt: newStartedAt,
				description: '更新された説明',
				tags: ['新しいタグ1', '新しいタグ2'],
			});
		});
	});

	describe('TC2: 進行中の作業がない', () => {
		it('404エラーで NO_ACTIVE を返却する', async () => {
			const newStartedAt = new Date('2025-11-19T09:00:00Z');

			// モック: 進行中の作業なし
			vi.mocked(getActiveWorkLog).mockResolvedValue(null);

			// モック: locals
			const locals = {
				user: {
					id: testUserId,
				},
			};

			// モック: request with FormData
			const formData = new FormData();
			formData.append('workLogId', testWorkLogId);
			formData.append('startedAt', newStartedAt.toISOString());
			formData.append('description', '説明');
			formData.append('tags', '');
			const request = new Request('http://localhost:5173/?/adjustActive', {
				method: 'POST',
				body: formData,
			});

			// adjustActive actionを呼び出し
			const result = await handleAdjustActiveAction({ locals, request } as ServerLoadEvent);

			// 検証
			expect(result).toHaveProperty('status', 404);
			expect(result).toHaveProperty('data');
			expect((result as any).data).toHaveProperty('reason', 'NO_ACTIVE');
			expect((result as any).data).toHaveProperty('message', '進行中の作業が見つかりません');
		});
	});

	describe('TC3: workLogId の不一致（concurrency エラー）', () => {
		it('409エラーで CONFLICT_STOPPED を返却する', async () => {
			const originalStartedAt = new Date('2025-11-19T10:00:00Z');
			const newStartedAt = new Date('2025-11-19T09:00:00Z');
			const differentWorkLogId = randomUUID();

			// モック: 異なるworkLogIdの進行中の作業
			const mockActiveWorkLog = WorkLog.from({
				id: differentWorkLogId,
				userId: testUserId,
				startedAt: originalStartedAt,
				endedAt: null,
				description: '元の説明',
				tags: [],
				createdAt: originalStartedAt,
				updatedAt: originalStartedAt,
			});
			vi.mocked(getActiveWorkLog).mockResolvedValue(mockActiveWorkLog);

			// モック: locals
			const locals = {
				user: {
					id: testUserId,
				},
			};

			// モック: request with FormData
			const formData = new FormData();
			formData.append('workLogId', testWorkLogId); // 異なるID
			formData.append('startedAt', newStartedAt.toISOString());
			formData.append('description', '説明');
			formData.append('tags', '');
			const request = new Request('http://localhost:5173/?/adjustActive', {
				method: 'POST',
				body: formData,
			});

			// adjustActive actionを呼び出し
			const result = await handleAdjustActiveAction({ locals, request } as ServerLoadEvent);

			// 検証
			expect(result).toHaveProperty('status', 409);
			expect(result).toHaveProperty('data');
			expect((result as any).data).toHaveProperty('reason', 'CONFLICT_STOPPED');
			expect((result as any).data).toHaveProperty('message', '進行中の作業が変更されています');
		});
	});

	describe('TC4: バリデーションエラー（previousEndedAt 違反）', () => {
		it('400エラーで VALIDATION_ERROR を返却する', async () => {
			const originalStartedAt = new Date('2025-11-19T10:00:00Z');
			const previousEndedAt = new Date('2025-11-19T09:30:00Z');
			const newStartedAt = new Date('2025-11-19T09:00:00Z'); // previousEndedAt より前

			// モック: 進行中の作業あり
			const mockActiveWorkLog = WorkLog.from({
				id: testWorkLogId,
				userId: testUserId,
				startedAt: originalStartedAt,
				endedAt: null,
				description: '元の説明',
				tags: [],
				createdAt: originalStartedAt,
				updatedAt: originalStartedAt,
			});
			vi.mocked(getActiveWorkLog).mockResolvedValue(mockActiveWorkLog);

			// モック: previousEndedAt あり（境界違反が発生する）
			vi.mocked(getPreviousEndedAt).mockResolvedValue(previousEndedAt);

			// モック: locals
			const locals = {
				user: {
					id: testUserId,
				},
			};

			// モック: request with FormData
			const formData = new FormData();
			formData.append('workLogId', testWorkLogId);
			formData.append('startedAt', newStartedAt.toISOString());
			formData.append('description', '説明');
			formData.append('tags', '');
			const request = new Request('http://localhost:5173/?/adjustActive', {
				method: 'POST',
				body: formData,
			});

			// adjustActive actionを呼び出し
			const result = await handleAdjustActiveAction({ locals, request } as ServerLoadEvent);

			// 検証
			expect(result).toHaveProperty('status', 400);
			expect(result).toHaveProperty('data');
			expect((result as any).data).toHaveProperty('reason', 'VALIDATION_ERROR');
			expect((result as any).data).toHaveProperty('errors');
			expect((result as any).data.errors).toHaveProperty('startedAt');
		});
	});

	describe('TC5: バリデーションエラー（24時間超過）', () => {
		it('400エラーで VALIDATION_ERROR を返却する', async () => {
			const originalStartedAt = new Date('2025-11-19T10:00:00Z');
			const serverNow = new Date('2025-11-20T11:00:00Z'); // 25時間後
			const newStartedAt = new Date('2025-11-19T09:00:00Z'); // 26時間前

			// モック: 進行中の作業あり
			const mockActiveWorkLog = WorkLog.from({
				id: testWorkLogId,
				userId: testUserId,
				startedAt: originalStartedAt,
				endedAt: null,
				description: '元の説明',
				tags: [],
				createdAt: originalStartedAt,
				updatedAt: originalStartedAt,
			});
			vi.mocked(getActiveWorkLog).mockResolvedValue(mockActiveWorkLog);

			// モック: previousEndedAt なし
			vi.mocked(getPreviousEndedAt).mockResolvedValue(null);

			// モック: locals
			const locals = {
				user: {
					id: testUserId,
				},
			};

			// モック: request with FormData
			const formData = new FormData();
			formData.append('workLogId', testWorkLogId);
			formData.append('startedAt', newStartedAt.toISOString());
			formData.append('description', '説明');
			formData.append('tags', '');
			const request = new Request('http://localhost:5173/?/adjustActive', {
				method: 'POST',
				body: formData,
			});

			// 現在時刻を serverNow に固定
			vi.useFakeTimers();
			vi.setSystemTime(serverNow);

			// adjustActive actionを呼び出し
			const result = await handleAdjustActiveAction({ locals, request } as ServerLoadEvent);

			// タイマーをリセット
			vi.useRealTimers();

			// 検証
			expect(result).toHaveProperty('status', 400);
			expect(result).toHaveProperty('data');
			expect((result as any).data).toHaveProperty('reason', 'VALIDATION_ERROR');
			expect((result as any).data).toHaveProperty('errors');
			expect((result as any).data.errors).toHaveProperty('startedAt');
		});
	});

	describe('TC6: DB更新失敗（進行中でなくなった）', () => {
		it('409エラーで CONFLICT_STOPPED を返却する', async () => {
			const originalStartedAt = new Date('2025-11-19T10:00:00Z');
			const newStartedAt = new Date('2025-11-19T09:00:00Z');

			// モック: 進行中の作業あり
			const mockActiveWorkLog = WorkLog.from({
				id: testWorkLogId,
				userId: testUserId,
				startedAt: originalStartedAt,
				endedAt: null,
				description: '元の説明',
				tags: [],
				createdAt: originalStartedAt,
				updatedAt: originalStartedAt,
			});
			vi.mocked(getActiveWorkLog).mockResolvedValue(mockActiveWorkLog);

			// モック: previousEndedAt なし
			vi.mocked(getPreviousEndedAt).mockResolvedValue(null);

			// モック: 更新失敗（進行中でなくなった）
			vi.mocked(updateActiveWorkLog).mockResolvedValue(null);

			// モック: locals
			const locals = {
				user: {
					id: testUserId,
				},
			};

			// モック: request with FormData
			const formData = new FormData();
			formData.append('workLogId', testWorkLogId);
			formData.append('startedAt', newStartedAt.toISOString());
			formData.append('description', '説明');
			formData.append('tags', '');
			const request = new Request('http://localhost:5173/?/adjustActive', {
				method: 'POST',
				body: formData,
			});

			// adjustActive actionを呼び出し
			const result = await handleAdjustActiveAction({ locals, request } as ServerLoadEvent);

			// 検証
			expect(result).toHaveProperty('status', 409);
			expect(result).toHaveProperty('data');
			expect((result as any).data).toHaveProperty('reason', 'CONFLICT_STOPPED');
			expect((result as any).data).toHaveProperty('message', '作業が既に終了されています');
		});
	});

	describe('TC7: タグのバリデーションエラー', () => {
		it('空白のみのタグは正規化後に空配列になり、正常に処理される', async () => {
			const originalStartedAt = new Date('2025-11-19T10:00:00Z');
			const newStartedAt = new Date('2025-11-19T09:00:00Z');
			const updatedAt = new Date('2025-11-19T11:00:00Z');

			// モック: 進行中の作業あり
			const mockActiveWorkLog = WorkLog.from({
				id: testWorkLogId,
				userId: testUserId,
				startedAt: originalStartedAt,
				endedAt: null,
				description: '元の説明',
				tags: [],
				createdAt: originalStartedAt,
				updatedAt: originalStartedAt,
			});
			vi.mocked(getActiveWorkLog).mockResolvedValue(mockActiveWorkLog);

			// モック: previousEndedAt なし
			vi.mocked(getPreviousEndedAt).mockResolvedValue(null);

			// モック: 更新成功
			const mockUpdatedWorkLog = WorkLog.from({
				id: testWorkLogId,
				userId: testUserId,
				startedAt: newStartedAt,
				endedAt: null,
				description: '説明',
				tags: [], // 空白のみのタグは正規化後に空配列
				createdAt: originalStartedAt,
				updatedAt,
			});
			vi.mocked(updateActiveWorkLog).mockResolvedValue(mockUpdatedWorkLog);

			// モック: locals
			const locals = {
				user: {
					id: testUserId,
				},
			};

			// モック: request with FormData（空白のみのタグ）
			const formData = new FormData();
			formData.append('workLogId', testWorkLogId);
			formData.append('startedAt', newStartedAt.toISOString());
			formData.append('description', '説明');
			formData.append('tags', '   '); // 空白のみのタグ（正規化後は空配列になる）
			const request = new Request('http://localhost:5173/?/adjustActive', {
				method: 'POST',
				body: formData,
			});

			// adjustActive actionを呼び出し
			const result = await handleAdjustActiveAction({ locals, request } as ServerLoadEvent);

			// 検証（空白のみの場合は正規化後に空配列になり、正常に処理される）
			expect(result).toHaveProperty('ok', true);
			expect((result as any).workLog.tags).toEqual([]);
		});
	});

	describe('TC8: 認証エラー', () => {
		it('401エラーをスローする', async () => {
			// モック: 未認証
			const locals = {
				user: null,
			};

			// モック: request with FormData
			const formData = new FormData();
			const request = new Request('http://localhost:5173/?/adjustActive', {
				method: 'POST',
				body: formData,
			});

			// adjustActive actionを呼び出し（エラーをキャッチ）
			await expect(handleAdjustActiveAction({ locals, request } as any)).rejects.toThrowError();
		});
	});
});
