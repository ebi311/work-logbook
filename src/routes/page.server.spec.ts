import { describe, it, expect, beforeEach, vi } from 'vitest';
import { randomUUID } from 'crypto';
import type { WorkLog } from '../models/workLog';

/**
 * F-001: Server Actions のテスト
 * 
 * テストケース:
 * 1. load: 初期状態取得
 * 2. start: 作業開始
 */

// workLogs モジュールをモック化
vi.mock('$lib/server/db/workLogs', () => ({
	getActiveWorkLog: vi.fn(),
	createWorkLog: vi.fn()
}));

import { load, actions } from './+page.server';
import { getActiveWorkLog, createWorkLog } from '$lib/server/db/workLogs';
import type { ServerLoadEvent } from '@sveltejs/kit';

describe('Server Actions: load', () => {
	const testUserId = randomUUID();
	const testWorkLogId = randomUUID();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('TC1: 進行中の作業がある場合', () => {
		it('activeオブジェクトとserverNowを返却する', async () => {
			const startedAt = new Date('2025-10-21T03:00:00Z');
			
			// モック: 進行中の作業を返す
			const mockWorkLog = {
				id: testWorkLogId,
				userId: testUserId,
				startedAt,
				endedAt: null,
				isActive: () => true,
				getDuration: () => 0
			} as WorkLog;
			
			vi.mocked(getActiveWorkLog).mockResolvedValue(mockWorkLog);

			// モック: locals
			const locals = {
				user: {
					id: testUserId
				}
			};

			// load関数を呼び出し
			const result = await load({ locals } as ServerLoadEvent);

			// 検証
			expect(result).toHaveProperty('active');
			expect(result).toHaveProperty('serverNow');
			expect(result?.active).toEqual({
				id: testWorkLogId,
				startedAt: startedAt.toISOString(),
				endedAt: null
			});
			expect(result?.serverNow).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
			expect(getActiveWorkLog).toHaveBeenCalledWith(testUserId);
		});
	});

	describe('TC2: 進行中の作業がない場合', () => {
		it('activeを含まず、serverNowのみ返却する', async () => {
			// モック: 進行中の作業なし
			vi.mocked(getActiveWorkLog).mockResolvedValue(null);

			// モック: locals
			const locals = {
				user: {
					id: testUserId
				}
			};

			// load関数を呼び出し
			const result = await load({ locals } as ServerLoadEvent);

			// 検証
			expect(result).not.toHaveProperty('active');
			expect(result).toHaveProperty('serverNow');
			expect(result?.serverNow).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
			expect(getActiveWorkLog).toHaveBeenCalledWith(testUserId);
		});
	});

	describe('TC3: 未認証', () => {
		it('401エラーをスローする', async () => {
			// モック: locals.userがundefined
			const locals = {};

			// load関数を呼び出し
			await expect(async () => {
				await load({ locals } as ServerLoadEvent);
			}).rejects.toThrow();

			// getActiveWorkLogが呼ばれないことを確認
			expect(getActiveWorkLog).not.toHaveBeenCalled();
		});
	});

	describe('TC4: DBエラー', () => {
		it('500エラーをスローし、エラーログを出力する', async () => {
			// console.errorをモック
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			// モック: DBエラー
			const dbError = new Error('Database connection failed');
			vi.mocked(getActiveWorkLog).mockRejectedValue(dbError);

			// モック: locals
			const locals = {
				user: {
					id: testUserId
				}
			};

			// load関数を呼び出し
			await expect(async () => {
				await load({ locals } as ServerLoadEvent);
			}).rejects.toThrow();

			// エラーログが出力されることを確認
			expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load work log:', dbError);

			// クリーンアップ
			consoleErrorSpy.mockRestore();
		});
	});
});

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
				isActive: () => true,
				getDuration: () => 0
			} as WorkLog;
			vi.mocked(createWorkLog).mockResolvedValue(mockWorkLog);

			// モック: locals
			const locals = {
				user: {
					id: testUserId
				}
			};

			// モック: request
			const request = new Request('http://localhost:5173/?/start', {
				method: 'POST'
			});

			// start actionを呼び出し
			const result = await actions.start({ locals, request } as ServerLoadEvent);

			// 検証
			expect(result).toHaveProperty('ok', true);
			expect(result).toHaveProperty('workLog');
			expect(result).toHaveProperty('serverNow');
			expect(result?.workLog).toEqual({
				id: testWorkLogId,
				startedAt: startedAt.toISOString(),
				endedAt: null
			});
			expect(result?.serverNow).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
			expect(createWorkLog).toHaveBeenCalledWith(testUserId, expect.any(Date));
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
				isActive: () => true,
				getDuration: () => 0
			} as WorkLog;
			vi.mocked(getActiveWorkLog).mockResolvedValue(mockWorkLog);

			// モック: locals
			const locals = {
				user: {
					id: testUserId
				}
			};

			// モック: request
			const request = new Request('http://localhost:5173/?/start', {
				method: 'POST'
			});

			// start actionを呼び出し
			const result = await actions.start({ locals, request } as ServerLoadEvent);

			// 検証
			expect(result).toHaveProperty('status', 409);
			expect(result).toHaveProperty('data');
			expect(result?.data).toHaveProperty('reason', 'ACTIVE_EXISTS');
			expect(result?.data).toHaveProperty('active');
			expect(result?.data?.active).toEqual({
				id: testWorkLogId,
				startedAt: startedAt.toISOString(),
				endedAt: null
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
				method: 'POST'
			});

			// start actionを呼び出し
			await expect(async () => {
				await actions.start({ locals, request } as ServerLoadEvent);
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
					id: testUserId
				}
			};

			// モック: request
			const request = new Request('http://localhost:5173/?/start', {
				method: 'POST'
			});

			// start actionを呼び出し
			await expect(async () => {
				await actions.start({ locals, request } as ServerLoadEvent);
			}).rejects.toThrow();

			// エラーログが出力されることを確認
			expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to start work log:', dbError);

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
					id: testUserId
				}
			};

			// モック: request
			const request = new Request('http://localhost:5173/?/start', {
				method: 'POST'
			});

			// start actionを呼び出し
			await expect(async () => {
				await actions.start({ locals, request } as ServerLoadEvent);
			}).rejects.toThrow();
		});
	});
});
