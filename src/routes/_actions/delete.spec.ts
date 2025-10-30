/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { randomUUID } from 'crypto';
import type { WorkLog } from '../../models/workLog';

/**
 * F-004: deleteアクションのテスト
 */

// workLogs モジュールをモック化
vi.mock('$lib/server/db/workLogs', () => ({
	getWorkLogById: vi.fn(),
	deleteWorkLog: vi.fn(),
}));

import { handleDeleteAction } from './delete';
import { getWorkLogById, deleteWorkLog } from '$lib/server/db/workLogs';

describe('Server Actions: delete', () => {
	const testUserId = randomUUID();
	const testWorkLogId = randomUUID();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('TC1: 削除 - 正常系', () => {
		it('完了した自分の作業記録を削除できる', async () => {
			const startedAt = new Date('2025-10-20T12:00:00.000Z');
			const endedAt = new Date('2025-10-20T13:00:00.000Z');

			// モック: 作業記録を返す（完了済み）
			const mockWorkLog = {
				id: testWorkLogId,
				userId: testUserId,
				startedAt,
				endedAt,
				description: 'テスト作業',
				isActive: () => false,
			} as WorkLog;

			vi.mocked(getWorkLogById).mockResolvedValue(mockWorkLog);
			vi.mocked(deleteWorkLog).mockResolvedValue(true);

			// モック: locals
			const locals = { user: { id: testUserId } };

			// モック: request (FormData)
			const formData = new FormData();
			formData.set('id', testWorkLogId);

			const request = {
				formData: async () => formData,
			};

			// delete アクションを呼び出し
			const result = await handleDeleteAction({ locals, request } as any);

			// 検証
			expect(result).toEqual({
				ok: true,
				deletedId: testWorkLogId,
				serverNow: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
			});
			expect(getWorkLogById).toHaveBeenCalledWith(testWorkLogId);
			expect(deleteWorkLog).toHaveBeenCalledWith(testWorkLogId, testUserId);
		});
	});

	describe('TC2: 削除 - 認証エラー', () => {
		it('ログインしていない場合、401エラー', async () => {
			// モック: locals (ユーザーなし)
			const locals = {};

			// モック: request (FormData)
			const formData = new FormData();
			formData.set('id', testWorkLogId);

			const request = {
				formData: async () => formData,
			};

			// delete アクションを呼び出し
			await expect(handleDeleteAction({ locals, request } as any)).rejects.toThrow();

			// データベースが呼ばれていないことを確認
			expect(getWorkLogById).not.toHaveBeenCalled();
			expect(deleteWorkLog).not.toHaveBeenCalled();
		});
	});

	describe('TC3: 削除 - 存在しないID', () => {
		it('存在しないIDを指定した場合、404エラー', async () => {
			// モック: 作業記録が見つからない
			vi.mocked(getWorkLogById).mockResolvedValue(null);

			// モック: locals
			const locals = { user: { id: testUserId } };

			// モック: request (FormData)
			const formData = new FormData();
			formData.set('id', testWorkLogId);

			const request = {
				formData: async () => formData,
			};

			// delete アクションを呼び出し
			const result = await handleDeleteAction({ locals, request } as any);

			// 検証
			expect(result).toMatchObject({
				status: 404,
				data: {
					ok: false,
					reason: 'NOT_FOUND',
					message: '作業記録が見つかりません',
					serverNow: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
				},
			});
			expect(getWorkLogById).toHaveBeenCalledWith(testWorkLogId);
			expect(deleteWorkLog).not.toHaveBeenCalled();
		});
	});

	describe('TC4: 削除 - 権限エラー', () => {
		it('他のユーザーの作業記録を削除しようとした場合、403エラー', async () => {
			const otherUserId = randomUUID();

			// モック: 他のユーザーの作業記録を返す
			const mockWorkLog = {
				id: testWorkLogId,
				userId: otherUserId, // 別のユーザー
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: new Date('2025-10-20T13:00:00.000Z'),
				description: 'テスト作業',
				isActive: () => false,
			} as WorkLog;

			vi.mocked(getWorkLogById).mockResolvedValue(mockWorkLog);

			// モック: locals (現在のユーザー)
			const locals = { user: { id: testUserId } };

			// モック: request (FormData)
			const formData = new FormData();
			formData.set('id', testWorkLogId);

			const request = {
				formData: async () => formData,
			};

			// delete アクションを呼び出し
			const result = await handleDeleteAction({ locals, request } as any);

			// 検証
			expect(result).toMatchObject({
				status: 403,
				data: {
					ok: false,
					reason: 'FORBIDDEN',
					message: 'この操作を実行する権限がありません',
					serverNow: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
				},
			});
			expect(getWorkLogById).toHaveBeenCalledWith(testWorkLogId);
			expect(deleteWorkLog).not.toHaveBeenCalled();
		});
	});
});
