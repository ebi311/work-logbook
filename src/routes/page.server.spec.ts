import { describe, it, expect, beforeEach, vi } from 'vitest';
import { randomUUID } from 'crypto';
import type { WorkLog } from '../models/workLog';

/**
 * F-001: Server Actions - load のテスト
 * 
 * テストケース:
 * 1. 正常系: 進行中の作業がある場合
 * 2. 正常系: 進行中の作業がない場合
 * 3. 異常系: 未認証
 * 4. 異常系: DBエラー
 */

// workLogs モジュールをモック化
vi.mock('$lib/server/db/workLogs', () => ({
	getActiveWorkLog: vi.fn()
}));

import { load } from './+page.server';
import { getActiveWorkLog } from '$lib/server/db/workLogs';
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
