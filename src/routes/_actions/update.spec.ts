/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { randomUUID } from 'crypto';
import type { WorkLog } from '../../models/workLog';

/**
 * F-004: updateアクションのテスト
 */

// workLogs モジュールをモック化
vi.mock('$lib/server/db/workLogs', () => ({
	getWorkLogById: vi.fn(),
	updateWorkLog: vi.fn()
}));

import { handleUpdateAction } from './update';
import { getWorkLogById, updateWorkLog } from '$lib/server/db/workLogs';

describe('Server Actions: update', () => {
	const testUserId = randomUUID();
	const testWorkLogId = randomUUID();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('TC1: 正常系 - 更新成功', () => {
		it('作業記録を更新し、成功レスポンスを返却する', async () => {
			const startedAt = new Date('2025-10-20T12:00:00.000Z');
			const endedAt = new Date('2025-10-20T13:00:00.000Z');
			const description = '更新された作業内容';

			// モック: 作業記録が存在
			const mockWorkLog = {
				id: testWorkLogId,
				userId: testUserId,
				startedAt: new Date('2025-10-20T11:00:00.000Z'),
				endedAt: new Date('2025-10-20T12:00:00.000Z'),
				description: '元の作業内容',
				createdAt: new Date('2025-10-20T11:00:00.000Z'),
				updatedAt: new Date('2025-10-20T11:00:00.000Z'),
				isActive: () => false
			} as WorkLog;

			vi.mocked(getWorkLogById).mockResolvedValue(mockWorkLog);

			// モック: 更新後の作業記録
			const updatedWorkLog = {
				id: testWorkLogId,
				userId: testUserId,
				startedAt,
				endedAt,
				description,
				createdAt: new Date('2025-10-20T11:00:00.000Z'),
				updatedAt: new Date(),
				isActive: () => false
			} as WorkLog;

			vi.mocked(updateWorkLog).mockResolvedValue(updatedWorkLog);

			// モック: locals
			const locals = { user: { id: testUserId } };

			// モック: request (FormData)
			const formData = new FormData();
			formData.set('id', testWorkLogId);
			formData.set('startedAt', startedAt.toISOString());
			formData.set('endedAt', endedAt.toISOString());
			formData.set('description', description);

			const request = {
				formData: async () => formData
			};

			// update アクションを呼び出し
			const result = await handleUpdateAction({ locals, request } as any);

			// 検証
			expect(result).toHaveProperty('ok', true);
			expect(result).toHaveProperty('workLog');
			expect(result).toHaveProperty('serverNow');
			expect((result as any).workLog.id).toBe(testWorkLogId);
			expect((result as any).workLog.startedAt).toBe(startedAt.toISOString());
			expect((result as any).workLog.endedAt).toBe(endedAt.toISOString());
			expect((result as any).workLog.description).toBe(description);

			// モック呼び出しの検証
			expect(getWorkLogById).toHaveBeenCalledWith(testWorkLogId);
			expect(updateWorkLog).toHaveBeenCalledWith(testWorkLogId, {
				startedAt,
				endedAt,
				description
			});
		});
	});

	describe('TC2: 異常系 - 未認証', () => {
		it('locals.userが存在しない場合、401エラーをスローする', async () => {
			// モック: locals (認証なし)
			const locals = { user: null };

			// モック: request
			const request = {
				formData: async () => new FormData()
			};

			// update アクションを呼び出し
			await expect(handleUpdateAction({ locals, request } as any)).rejects.toThrow();
		});
	});

	describe('TC3: 異常系 - 作業記録が見つからない', () => {
		it('作業記録が存在しない場合、404エラーを返却する', async () => {
			// モック: 作業記録が存在しない
			vi.mocked(getWorkLogById).mockResolvedValue(null);

			// モック: locals
			const locals = { user: { id: testUserId } };

			// モック: request (FormData)
			const formData = new FormData();
			formData.set('id', testWorkLogId);
			formData.set('startedAt', new Date().toISOString());
			formData.set('endedAt', new Date().toISOString());
			formData.set('description', '');

			const request = {
				formData: async () => formData
			};

			// update アクションを呼び出し
			const result = await handleUpdateAction({ locals, request } as any);

			// 検証
			expect(result).toHaveProperty('status', 404);
			expect((result as any).data).toHaveProperty('reason', 'NOT_FOUND');
		});
	});

	describe('TC4: 異常系 - 権限なし（他人の作業記録）', () => {
		it('作業記録のuserIdが一致しない場合、403エラーを返却する', async () => {
			const otherUserId = randomUUID();

			// モック: 他人の作業記録
			const mockWorkLog = {
				id: testWorkLogId,
				userId: otherUserId, // 別のユーザー
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: new Date('2025-10-20T13:00:00.000Z'),
				description: '',
				isActive: () => false
			} as WorkLog;

			vi.mocked(getWorkLogById).mockResolvedValue(mockWorkLog);

			// モック: locals
			const locals = { user: { id: testUserId } };

			// モック: request (FormData)
			const formData = new FormData();
			formData.set('id', testWorkLogId);
			formData.set('startedAt', new Date().toISOString());
			formData.set('endedAt', new Date().toISOString());
			formData.set('description', '');

			const request = {
				formData: async () => formData
			};

			// update アクションを呼び出し
			const result = await handleUpdateAction({ locals, request } as any);

			// 検証
			expect(result).toHaveProperty('status', 403);
			expect((result as any).data).toHaveProperty('reason', 'FORBIDDEN');
		});
	});

	describe('TC5: 異常系 - バリデーションエラー（時刻の整合性）', () => {
		it('startedAt >= endedAtの場合、400エラーを返却する', async () => {
			const startedAt = new Date('2025-10-20T13:00:00.000Z');
			const endedAt = new Date('2025-10-20T13:00:00.000Z'); // 同じ時刻

			// モック: 作業記録が存在
			const mockWorkLog = {
				id: testWorkLogId,
				userId: testUserId,
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: new Date('2025-10-20T14:00:00.000Z'),
				description: '',
				isActive: () => false
			} as WorkLog;

			vi.mocked(getWorkLogById).mockResolvedValue(mockWorkLog);

			// モック: locals
			const locals = { user: { id: testUserId } };

			// モック: request (FormData)
			const formData = new FormData();
			formData.set('id', testWorkLogId);
			formData.set('startedAt', startedAt.toISOString());
			formData.set('endedAt', endedAt.toISOString());
			formData.set('description', '');

			const request = {
				formData: async () => formData
			};

			// update アクションを呼び出し
			const result = await handleUpdateAction({ locals, request } as any);

			// 検証
			expect(result).toHaveProperty('status', 400);
			expect((result as any).data).toHaveProperty('reason', 'VALIDATION_ERROR');
			expect((result as any).data).toHaveProperty('errors');
		});
	});

	describe('TC6: 異常系 - バリデーションエラー（未来の時刻）', () => {
		it('endedAtが未来の時刻の場合、400エラーを返却する', async () => {
			const startedAt = new Date('2025-10-20T12:00:00.000Z');
			const futureDate = new Date(Date.now() + 1000 * 60 * 60); // 1時間後

			// モック: 作業記録が存在
			const mockWorkLog = {
				id: testWorkLogId,
				userId: testUserId,
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: new Date('2025-10-20T13:00:00.000Z'),
				description: '',
				isActive: () => false
			} as WorkLog;

			vi.mocked(getWorkLogById).mockResolvedValue(mockWorkLog);

			// モック: locals
			const locals = { user: { id: testUserId } };

			// モック: request (FormData)
			const formData = new FormData();
			formData.set('id', testWorkLogId);
			formData.set('startedAt', startedAt.toISOString());
			formData.set('endedAt', futureDate.toISOString());
			formData.set('description', '');

			const request = {
				formData: async () => formData
			};

			// update アクションを呼び出し
			const result = await handleUpdateAction({ locals, request } as any);

			// 検証
			expect(result).toHaveProperty('status', 400);
			expect((result as any).data).toHaveProperty('reason', 'VALIDATION_ERROR');
		});
	});

	describe('TC7: 異常系 - バリデーションエラー（文字数超過）', () => {
		it('descriptionが10,001文字の場合、400エラーを返却する', async () => {
			const description = 'a'.repeat(10001);

			// モック: 作業記録が存在
			const mockWorkLog = {
				id: testWorkLogId,
				userId: testUserId,
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: new Date('2025-10-20T13:00:00.000Z'),
				description: '',
				isActive: () => false
			} as WorkLog;

			vi.mocked(getWorkLogById).mockResolvedValue(mockWorkLog);

			// モック: locals
			const locals = { user: { id: testUserId } };

			// モック: request (FormData)
			const formData = new FormData();
			formData.set('id', testWorkLogId);
			formData.set('startedAt', new Date('2025-10-20T12:00:00.000Z').toISOString());
			formData.set('endedAt', new Date('2025-10-20T13:00:00.000Z').toISOString());
			formData.set('description', description);

			const request = {
				formData: async () => formData
			};

			// update アクションを呼び出し
			const result = await handleUpdateAction({ locals, request } as any);

			// 検証
			expect(result).toHaveProperty('status', 400);
			expect((result as any).data).toHaveProperty('reason', 'VALIDATION_ERROR');
		});
	});

	describe('TC8: 異常系 - サーバーエラー', () => {
		it('DB更新時にエラーが発生した場合、500エラーをスローする', async () => {
			// モック: 作業記録が存在
			const mockWorkLog = {
				id: testWorkLogId,
				userId: testUserId,
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: new Date('2025-10-20T13:00:00.000Z'),
				description: '',
				isActive: () => false
			} as WorkLog;

			vi.mocked(getWorkLogById).mockResolvedValue(mockWorkLog);

			// モック: DB更新時にエラー
			vi.mocked(updateWorkLog).mockRejectedValue(new Error('DB Error'));

			// モック: locals
			const locals = { user: { id: testUserId } };

			// モック: request (FormData)
			const formData = new FormData();
			formData.set('id', testWorkLogId);
			formData.set('startedAt', new Date('2025-10-20T12:00:00.000Z').toISOString());
			formData.set('endedAt', new Date('2025-10-20T13:00:00.000Z').toISOString());
			formData.set('description', '');

			const request = {
				formData: async () => formData
			};

			// update アクションを呼び出し
			await expect(handleUpdateAction({ locals, request } as any)).rejects.toThrow();
		});
	});
});
