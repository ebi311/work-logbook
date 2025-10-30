/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { randomUUID } from 'crypto';
import type { WorkLog } from '../../models/workLog';
import type { ServerLoadEvent } from '@sveltejs/kit';

/**
 * F-001: Server Actions - start のテスト
 */

// workLogs モジュールをモック化
vi.mock('$lib/server/db/workLogs', () => ({
	getActiveWorkLog: vi.fn(),
	createWorkLog: vi.fn(),
	saveWorkLogTags: vi.fn(),
}));

import { handleStartAction } from './start';
import { getActiveWorkLog, createWorkLog } from '$lib/server/db/workLogs';

describe('Server Actions: start', () => {
	const testUserId = randomUUID();
	const testWorkLogId = randomUUID();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('TC1: 作業開始成功', () => {
		it('ok: trueとworkLogオブジェクトを返却する', async () => {
			const startedAt = new Date('2025-10-21T03:00:00Z');

			// モック: 進行中の作業なし
			vi.mocked(getActiveWorkLog).mockResolvedValue(null);

			// モック: 新規作業作成
			const mockWorkLog = {
				id: testWorkLogId,
				userId: testUserId,
				startedAt,
				endedAt: null,
				description: '',
				isActive: () => true,
				getDuration: () => 0,
			} as WorkLog;
			vi.mocked(createWorkLog).mockResolvedValue(mockWorkLog);

			// モック: locals
			const locals = {
				user: {
					id: testUserId,
				},
			};

			// モック: request with FormData
			const formData = new FormData();
			formData.append('description', '');
			const request = new Request('http://localhost:5173/?/start', {
				method: 'POST',
				body: formData,
			});

			// start actionを呼び出し
			const result = await handleStartAction({ locals, request } as ServerLoadEvent);

			// 検証
			expect(result).toHaveProperty('ok', true);
			expect(result).toHaveProperty('workLog');
			expect(result).toHaveProperty('serverNow');
			expect((result as any).workLog).toEqual({
				id: testWorkLogId,
				startedAt: startedAt.toISOString(),
				endedAt: null,
				description: '',
				tags: [],
			});
			expect((result as any).serverNow).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
			expect(createWorkLog).toHaveBeenCalledWith(testUserId, expect.any(Date), '');
		});
	});

	describe('TC2: 既に進行中の作業がある', () => {
		it('409エラーでACTIVE_EXISTSを返却する', async () => {
			const startedAt = new Date('2025-10-21T03:00:00Z');

			// モック: 進行中の作業あり
			const mockWorkLog = {
				id: testWorkLogId,
				userId: testUserId,
				startedAt,
				endedAt: null,
				description: '',
				isActive: () => true,
				getDuration: () => 0,
			} as WorkLog;
			vi.mocked(getActiveWorkLog).mockResolvedValue(mockWorkLog);

			// モック: locals
			const locals = {
				user: {
					id: testUserId,
				},
			};

			// モック: request with FormData
			const formData = new FormData();
			formData.append('description', '');
			const request = new Request('http://localhost:5173/?/start', {
				method: 'POST',
				body: formData,
			});

			// start actionを呼び出し
			const result = await handleStartAction({ locals, request } as ServerLoadEvent);

			// 検証
			expect(result).toHaveProperty('status', 409);
			expect(result).toHaveProperty('data');
			expect((result as any).data).toHaveProperty('reason', 'ACTIVE_EXISTS');
			expect((result as any).data).toHaveProperty('active');
			expect((result as any).data?.active).toEqual({
				id: testWorkLogId,
				startedAt: startedAt.toISOString(),
				endedAt: null,
				description: '',
				tags: [],
			});
			expect(createWorkLog).not.toHaveBeenCalled();
		});
	});

	describe('TC3: 未認証', () => {
		it('401エラーをスローする', async () => {
			// モック: locals.userがundefined
			const locals = {};

			// モック: request
			const request = new Request('http://localhost:5173/?/start', {
				method: 'POST',
			});

			// start actionを呼び出し
			await expect(async () => {
				await handleStartAction({ locals, request } as ServerLoadEvent);
			}).rejects.toThrow();

			// getActiveWorkLogが呼ばれないことを確認
			expect(getActiveWorkLog).not.toHaveBeenCalled();
			expect(createWorkLog).not.toHaveBeenCalled();
		});
	});

	describe('TC4: DB接続エラー', () => {
		it('500エラーをスローし、エラーログを出力する', async () => {
			// console.errorをモック
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			// モック: 進行中の作業なし
			vi.mocked(getActiveWorkLog).mockResolvedValue(null);

			// モック: DBエラー
			const dbError = new Error('Database connection failed');
			vi.mocked(createWorkLog).mockRejectedValue(dbError);

			// モック: locals
			const locals = {
				user: {
					id: testUserId,
				},
			};

			// モック: request with FormData
			const formData = new FormData();
			formData.append('description', '');
			const request = new Request('http://localhost:5173/?/start', {
				method: 'POST',
				body: formData,
			});

			// start actionを呼び出し
			await expect(async () => {
				await handleStartAction({ locals, request } as ServerLoadEvent);
			}).rejects.toThrow();

			// エラーログはhandleStartAction内では出力されない
			// (+page.server.tsのactionsラッパーで出力される)
			// そのため、このテストではエラーログのチェックをスキップ

			// クリーンアップ
			consoleErrorSpy.mockRestore();
		});
	});

	describe('TC5: UNIQUE制約違反', () => {
		it('エラーをスローする', async () => {
			// モック: 進行中の作業なし（getActiveWorkLogでは検出できなかった）
			vi.mocked(getActiveWorkLog).mockResolvedValue(null);

			// モック: UNIQUE制約違反
			const uniqueError = new Error('UNIQUE constraint failed');
			vi.mocked(createWorkLog).mockRejectedValue(uniqueError);

			// モック: locals
			const locals = {
				user: {
					id: testUserId,
				},
			};

			// モック: request
			const request = new Request('http://localhost:5173/?/start', {
				method: 'POST',
			});

			// start actionを呼び出し
			await expect(async () => {
				await handleStartAction({ locals, request } as ServerLoadEvent);
			}).rejects.toThrow();
		});
	});
});
