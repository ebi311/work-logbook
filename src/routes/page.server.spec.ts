import { describe, it, expect, beforeEach, vi } from 'vitest';
import { randomUUID } from 'crypto';
import type { WorkLog } from '../models/workLog';

/**
 * F-001: Server Actions のテスト
 *
 * テストケース:
 * 1. load: 初期状態取得
 * 2. start: 作業開始
 * 3. stop: 作業終了
 */

// workLogs モジュールをモック化
vi.mock('$lib/server/db/workLogs', () => ({
	getActiveWorkLog: vi.fn(),
	listWorkLogs: vi.fn(),
	aggregateMonthlyWorkLogDuration: vi.fn(),
	aggregateDailyWorkLogDuration: vi.fn(),
	getUserTagSuggestions: vi.fn(),
}));

import { load } from './+page.server';
import {
	getActiveWorkLog,
	listWorkLogs,
	aggregateMonthlyWorkLogDuration,
	aggregateDailyWorkLogDuration,
	getUserTagSuggestions,
} from '$lib/server/db/workLogs';
import type { ServerLoadEvent } from '@sveltejs/kit';

describe('Server Actions: load', () => {
	const testUserId = randomUUID();
	const testWorkLogId = randomUUID();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('TC1: 進行中の作業がある場合', () => {
		it('activeオブジェクト、serverNow、listDataを返却する', async () => {
			const startedAt = new Date('2025-10-21T03:00:00Z');

			// モック: 進行中の作業を返す
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
			vi.mocked(listWorkLogs).mockResolvedValue({ items: [], hasNext: false });
			vi.mocked(aggregateMonthlyWorkLogDuration).mockResolvedValue(0);
			vi.mocked(aggregateDailyWorkLogDuration).mockResolvedValue(0);
			vi.mocked(aggregateDailyWorkLogDuration).mockResolvedValue(0);
			vi.mocked(getUserTagSuggestions).mockResolvedValue([]);

			// モック: locals と URL
			const locals = {
				user: {
					id: testUserId,
				},
			};
			const url = new URL('http://localhost:5173/');

			// load関数を呼び出し
			const result = await load({ locals, url } as unknown as ServerLoadEvent);

			// 軽量データの検証
			expect(result).toHaveProperty('active');
			expect(result).toHaveProperty('serverNow');
			expect(result).toHaveProperty('listData');
			expect(result?.active).toEqual({
				id: testWorkLogId,
				startedAt: startedAt.toISOString(),
				endedAt: null,
				description: '',
				tags: [],
			});
			expect(result?.serverNow).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
			expect(getActiveWorkLog).toHaveBeenCalledWith(testUserId);

			// listDataはPromiseなのでawait
			const listData = await result?.listData;
			expect(listData).toHaveProperty('items');
			expect(listData).toHaveProperty('page');
			expect(listData).toHaveProperty('size');
			expect(listData).toHaveProperty('hasNext');
			expect(listData).toHaveProperty('monthlyTotalSec');
			expect(listData).toHaveProperty('dailyTotalSec');
		});
	});

	describe('TC2: 進行中の作業がない場合', () => {
		it('activeを含まず、serverNowとlistDataを返却する', async () => {
			// モック: 進行中の作業なし
			vi.mocked(getActiveWorkLog).mockResolvedValue(null);
			vi.mocked(listWorkLogs).mockResolvedValue({ items: [], hasNext: false });
			vi.mocked(aggregateMonthlyWorkLogDuration).mockResolvedValue(0);
			vi.mocked(aggregateDailyWorkLogDuration).mockResolvedValue(0);
			vi.mocked(aggregateDailyWorkLogDuration).mockResolvedValue(0);
			vi.mocked(getUserTagSuggestions).mockResolvedValue([]);

			// モック: locals と URL
			const locals = {
				user: {
					id: testUserId,
				},
			};
			const url = new URL('http://localhost:5173/');

			// load関数を呼び出し
			const result = await load({ locals, url } as unknown as ServerLoadEvent);

			// 検証
			expect(result).not.toHaveProperty('active');
			expect(result).toHaveProperty('serverNow');
			expect(result).toHaveProperty('listData');
			expect(result?.serverNow).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
			expect(getActiveWorkLog).toHaveBeenCalledWith(testUserId);

			// listDataを解決
			const listData = await result?.listData;
			expect(listData.items).toEqual([]);
		});
	});

	describe('TC3: 未認証', () => {
		it('401エラーをスローする', async () => {
			// モック: locals.userがundefined
			const locals = {};
			const url = new URL('http://localhost:5173/');

			// load関数を呼び出し
			await expect(async () => {
				await load({ locals, url } as unknown as ServerLoadEvent);
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

			// モック: locals と URL
			const locals = {
				user: {
					id: testUserId,
				},
			};
			const url = new URL('http://localhost:5173/');

			// load関数を呼び出し
			await expect(async () => {
				await load({ locals, url } as unknown as ServerLoadEvent);
			}).rejects.toThrow();

			// エラーログが出力されることを確認
			expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load work log:', dbError);

			// クリーンアップ
			consoleErrorSpy.mockRestore();
		});
	});
});

describe('Server Load: F-005/F-006 一覧取得と月次合計', () => {
	const testUserId = randomUUID();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('TC1: クエリパラメータなしの場合、今月の一覧と合計を返す', () => {
		it('デフォルトで今月のデータを取得', async () => {
			// モック: 進行中の作業なし
			vi.mocked(getActiveWorkLog).mockResolvedValue(null);

			// モック: 一覧取得
			const mockItems = [
				{
					id: randomUUID(),
					userId: testUserId,
					startedAt: new Date('2025-10-25T10:00:00Z'),
					endedAt: new Date('2025-10-25T12:00:00Z'),
					description: '',
					createdAt: new Date(),
					updatedAt: new Date(),
					tags: [],
				},
			];
			vi.mocked(listWorkLogs).mockResolvedValue({
				items: mockItems,
				hasNext: false,
			}); // モック: 月次合計
			vi.mocked(aggregateMonthlyWorkLogDuration).mockResolvedValue(7200); // 2時間
			vi.mocked(aggregateDailyWorkLogDuration).mockResolvedValue(0);
			vi.mocked(getUserTagSuggestions).mockResolvedValue([]);

			// モック: locals
			const locals = {
				user: {
					id: testUserId,
				},
			};

			// モック: url (クエリパラメータなし)
			const url = new URL('http://localhost:5173/');

			// load関数を呼び出し
			const result = await load({ locals, url } as unknown as ServerLoadEvent);

			// listDataを解決
			const listData = await result?.listData;

			// 検証
			expect(listData).toHaveProperty('items');
			expect(listData).toHaveProperty('monthlyTotalSec', 7200);
			expect(listData).toHaveProperty('dailyTotalSec', 0);
			expect(listData).toHaveProperty('page', 1);
			expect(listData).toHaveProperty('size', 20);
			expect(listData).toHaveProperty('hasNext', false);
			expect(listWorkLogs).toHaveBeenCalledTimes(1);
			expect(aggregateMonthlyWorkLogDuration).toHaveBeenCalledTimes(1);
		});
	});

	describe('TC2: month パラメータが指定されている場合', () => {
		it('指定月のデータを取得', async () => {
			// モック: 進行中の作業なし
			vi.mocked(getActiveWorkLog).mockResolvedValue(null);

			// モック: 一覧取得
			vi.mocked(listWorkLogs).mockResolvedValue({
				items: [],
				hasNext: false,
			});

			// モック: 月次合計
			vi.mocked(aggregateMonthlyWorkLogDuration).mockResolvedValue(3600); // 1時間
			vi.mocked(aggregateDailyWorkLogDuration).mockResolvedValue(0);
			vi.mocked(getUserTagSuggestions).mockResolvedValue([]);

			// モック: locals
			const locals = {
				user: {
					id: testUserId,
				},
			};

			// モック: url (month=2025-09)
			const url = new URL('http://localhost:5173/?month=2025-09');

			// load関数を呼び出し
			const result = await load({ locals, url } as unknown as ServerLoadEvent);

			// listDataを解決
			const listData = await result?.listData;

			// 検証: aggregateMonthlyWorkLogDuration が month='2025-09' で呼ばれる
			expect(aggregateMonthlyWorkLogDuration).toHaveBeenCalledWith(testUserId, {
				month: '2025-09',
			});
			expect(listData.monthlyTotalSec).toBe(3600);
			expect(listData.dailyTotalSec).toBe(0);
		});
	});

	describe('TC3: page/size パラメータ', () => {
		it('page=2, size=50 で正しく呼ばれる', async () => {
			// モック: 進行中の作業なし
			vi.mocked(getActiveWorkLog).mockResolvedValue(null);

			// モック: 一覧取得
			vi.mocked(listWorkLogs).mockResolvedValue({
				items: [],
				hasNext: true,
			});

			// モック: 月次合計
			vi.mocked(aggregateMonthlyWorkLogDuration).mockResolvedValue(0);
			vi.mocked(aggregateDailyWorkLogDuration).mockResolvedValue(0);
			vi.mocked(getUserTagSuggestions).mockResolvedValue([]);

			// モック: locals
			const locals = {
				user: {
					id: testUserId,
				},
			};

			// モック: url
			const url = new URL('http://localhost:5173/?page=2&size=50');

			// load関数を呼び出し
			const result = await load({ locals, url } as unknown as ServerLoadEvent);

			// listDataを解決
			const listData = await result?.listData;

			// 検証: listWorkLogs が limit=50, offset=50 で呼ばれる
			expect(listWorkLogs).toHaveBeenCalledWith(
				testUserId,
				expect.objectContaining({
					limit: 50,
					offset: 50,
				}),
			);
			expect(listData.page).toBe(2);
			expect(listData.size).toBe(50);
			expect(listData.hasNext).toBe(true);
		});
	});

	describe('TC4: 認証エラー', () => {
		it('未認証の場合は401エラー', async () => {
			// モック: locals (認証なし)
			const locals = {
				user: null,
			};

			// モック: url
			const url = new URL('http://localhost:5173/');

			// load関数を呼び出し
			await expect(load({ locals, url } as unknown as ServerLoadEvent)).rejects.toThrow();
		});
	});

	describe('TC5: タグフィルタ', () => {
		it('URLに tags パラメータがある場合、タグフィルタが適用される', async () => {
			// モック設定
			vi.mocked(getActiveWorkLog).mockResolvedValue(null);
			vi.mocked(listWorkLogs).mockResolvedValue({ items: [], hasNext: false });
			vi.mocked(aggregateMonthlyWorkLogDuration).mockResolvedValue(0);
			vi.mocked(aggregateDailyWorkLogDuration).mockResolvedValue(0);
			vi.mocked(getUserTagSuggestions).mockResolvedValue([]);

			// モック: locals
			const locals = {
				user: {
					id: testUserId,
				},
			};

			// モック: URL with tags parameter
			const url = new URL('http://localhost:5173/?tags=backend,api');

			// load関数を呼び出し
			const result = await load({ locals, url } as unknown as ServerLoadEvent);

			// listData を await
			await result?.listData;

			// listWorkLogs が tags パラメータで呼ばれたことを確認
			expect(listWorkLogs).toHaveBeenCalledWith(
				testUserId,
				expect.objectContaining({
					tags: ['backend', 'api'],
				}),
			);
		});

		it('URLに tags パラメータがない場合、タグフィルタは undefined', async () => {
			// モック設定
			vi.mocked(getActiveWorkLog).mockResolvedValue(null);
			vi.mocked(listWorkLogs).mockResolvedValue({ items: [], hasNext: false });
			vi.mocked(aggregateMonthlyWorkLogDuration).mockResolvedValue(0);
			vi.mocked(aggregateDailyWorkLogDuration).mockResolvedValue(0);
			vi.mocked(getUserTagSuggestions).mockResolvedValue([]);

			// モック: locals
			const locals = {
				user: {
					id: testUserId,
				},
			};

			// モック: URL without tags parameter
			const url = new URL('http://localhost:5173/');

			// load関数を呼び出し
			const result = await load({ locals, url } as unknown as ServerLoadEvent);

			// listData を await
			await result?.listData;

			// listWorkLogs が tags: undefined で呼ばれたことを確認
			expect(listWorkLogs).toHaveBeenCalledWith(
				testUserId,
				expect.objectContaining({
					tags: undefined,
				}),
			);
		});

		it('tags パラメータのバリデーション（トリム、長さ制限、個数制限）', async () => {
			// モック設定
			vi.mocked(getActiveWorkLog).mockResolvedValue(null);
			vi.mocked(listWorkLogs).mockResolvedValue({ items: [], hasNext: false });
			vi.mocked(aggregateMonthlyWorkLogDuration).mockResolvedValue(0);
			vi.mocked(aggregateDailyWorkLogDuration).mockResolvedValue(0);
			vi.mocked(getUserTagSuggestions).mockResolvedValue([]);

			// モック: locals
			const locals = {
				user: {
					id: testUserId,
				},
			};

			// モック: URL with many tags (空文字、スペース含む)
			const url = new URL(
				'http://localhost:5173/?tags= backend , api , , frontend ,db,test1,test2,test3,test4,test5,test6,test7 ',
			);

			// load関数を呼び出し
			const result = await load({ locals, url } as unknown as ServerLoadEvent);

			// listData を await
			await result?.listData;

			// 空文字は除外、トリム、最大10個に制限
			expect(listWorkLogs).toHaveBeenCalledWith(
				testUserId,
				expect.objectContaining({
					tags: [
						'backend',
						'api',
						'frontend',
						'db',
						'test1',
						'test2',
						'test3',
						'test4',
						'test5',
						'test6',
					],
				}),
			);
		});
	});
});
