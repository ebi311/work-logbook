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
	createWorkLog: vi.fn(),
	stopWorkLog: vi.fn(),
	listWorkLogs: vi.fn(),
	aggregateMonthlyWorkLogDuration: vi.fn()
}));

import { load, actions } from './+page.server';
import {
	getActiveWorkLog,
	createWorkLog,
	stopWorkLog,
	listWorkLogs,
	aggregateMonthlyWorkLogDuration
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
				getDuration: () => 0
			} as WorkLog;

			vi.mocked(getActiveWorkLog).mockResolvedValue(mockWorkLog);
			vi.mocked(listWorkLogs).mockResolvedValue({ items: [], hasNext: false });
			vi.mocked(aggregateMonthlyWorkLogDuration).mockResolvedValue(0);

			// モック: locals と URL
			const locals = {
				user: {
					id: testUserId
				}
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
				description: ''
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
		});
	});

	describe('TC2: 進行中の作業がない場合', () => {
		it('activeを含まず、serverNowとlistDataを返却する', async () => {
			// モック: 進行中の作業なし
			vi.mocked(getActiveWorkLog).mockResolvedValue(null);
			vi.mocked(listWorkLogs).mockResolvedValue({ items: [], hasNext: false });
			vi.mocked(aggregateMonthlyWorkLogDuration).mockResolvedValue(0);

			// モック: locals と URL
			const locals = {
				user: {
					id: testUserId
				}
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
					id: testUserId
				}
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
				getDuration: () => 0
			} as WorkLog;
			vi.mocked(createWorkLog).mockResolvedValue(mockWorkLog);

			// モック: locals
			const locals = {
				user: {
					id: testUserId
				}
			};

			// モック: request with FormData
			const formData = new FormData();
			formData.append('description', '');
			const request = new Request('http://localhost:5173/?/start', {
				method: 'POST',
				body: formData
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
				endedAt: null,
				description: ''
			});
			expect(result?.serverNow).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
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
				getDuration: () => 0
			} as WorkLog;
			vi.mocked(getActiveWorkLog).mockResolvedValue(mockWorkLog);

			// モック: locals
			const locals = {
				user: {
					id: testUserId
				}
			};

			// モック: request with FormData
			const formData = new FormData();
			formData.append('description', '');
			const request = new Request('http://localhost:5173/?/start', {
				method: 'POST',
				body: formData
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
				endedAt: null,
				description: ''
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

			// モック: request with FormData
			const formData = new FormData();
			formData.append('description', '');
			const request = new Request('http://localhost:5173/?/start', {
				method: 'POST',
				body: formData
			});

			// start actionを呼び出し
			await expect(async () => {
				await actions.start({ locals, request } as ServerLoadEvent);
			}).rejects.toThrow();

			// エラーログが出力されることを確認
			expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to start work log:', expect.any(Error)); // クリーンアップ
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

describe('Server Actions: stop', () => {
	const testUserId = randomUUID();
	const testWorkLogId = randomUUID();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('TC1: 作業終了成功', () => {
		it('ok: trueと終了した作業、作業時間を返却する', async () => {
			const startedAt = new Date('2025-10-21T03:00:00Z');
			const endedAt = new Date('2025-10-21T04:00:00Z');
			const durationSec = 3600; // 1時間

			// モック: 進行中の作業あり
			const mockActiveWorkLog = {
				id: testWorkLogId,
				userId: testUserId,
				startedAt,
				endedAt: null,
				description: 'Initial description',
				isActive: () => true,
				getDuration: () => 0
			} as WorkLog;
			vi.mocked(getActiveWorkLog).mockResolvedValue(mockActiveWorkLog);

			// モック: 作業終了
			const mockStoppedWorkLog = {
				id: testWorkLogId,
				userId: testUserId,
				startedAt,
				endedAt,
				description: 'Updated description',
				isActive: () => false,
				getDuration: () => durationSec
			} as WorkLog;
			vi.mocked(stopWorkLog).mockResolvedValue(mockStoppedWorkLog);

			// モック: locals
			const locals = {
				user: {
					id: testUserId
				}
			};

			// モック: request with FormData
			const formData = new FormData();
			formData.append('description', 'Updated description');
			const request = new Request('http://localhost:5173/?/stop', {
				method: 'POST',
				body: formData
			});

			// stop actionを呼び出し
			const result = await actions.stop({ locals, request } as ServerLoadEvent);

			// 検証
			expect(result).toHaveProperty('ok', true);
			expect(result).toHaveProperty('workLog');
			expect(result).toHaveProperty('serverNow');
			expect(result).toHaveProperty('durationSec', durationSec);
			expect(result?.workLog).toEqual({
				id: testWorkLogId,
				startedAt: startedAt.toISOString(),
				endedAt: endedAt.toISOString(),
				description: 'Updated description'
			});
			expect(result?.serverNow).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
			expect(stopWorkLog).toHaveBeenCalledWith(
				testWorkLogId,
				expect.any(Date),
				'Updated description'
			);
		});
	});

	describe('TC2: 進行中の作業がない', () => {
		it('404エラーでNO_ACTIVEを返却する', async () => {
			// モック: 進行中の作業なし
			vi.mocked(getActiveWorkLog).mockResolvedValue(null);

			// モック: locals
			const locals = {
				user: {
					id: testUserId
				}
			};

			// モック: request with FormData
			const formData = new FormData();
			formData.append('description', '');
			const request = new Request('http://localhost:5173/?/stop', {
				method: 'POST',
				body: formData
			});

			// stop actionを呼び出し
			const result = await actions.stop({ locals, request } as ServerLoadEvent);

			// 検証
			expect(result).toHaveProperty('status', 404);
			expect(result).toHaveProperty('data');
			expect(result?.data).toHaveProperty('reason', 'NO_ACTIVE');
			expect(stopWorkLog).not.toHaveBeenCalled();
		});
	});

	describe('TC3: 未認証', () => {
		it('401エラーをスローする', async () => {
			// モック: locals.userがundefined
			const locals = {};

			// モック: request with FormData
			const formData = new FormData();
			formData.append('description', '');
			const request = new Request('http://localhost:5173/?/stop', {
				method: 'POST',
				body: formData
			});

			// stop actionを呼び出し
			await expect(async () => {
				await actions.stop({ locals, request } as ServerLoadEvent);
			}).rejects.toThrow();

			// getActiveWorkLogが呼ばれないことを確認
			expect(getActiveWorkLog).not.toHaveBeenCalled();
			expect(stopWorkLog).not.toHaveBeenCalled();
		});
	});

	describe('TC4: DB接続エラー', () => {
		it('500エラーをスローし、エラーログを出力する', async () => {
			// console.errorをモック
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const startedAt = new Date('2025-10-21T03:00:00Z');

			// モック: 進行中の作業あり
			const mockActiveWorkLog = {
				id: testWorkLogId,
				userId: testUserId,
				startedAt,
				endedAt: null,
				description: '',
				isActive: () => true,
				getDuration: () => 0
			} as WorkLog;
			vi.mocked(getActiveWorkLog).mockResolvedValue(mockActiveWorkLog);

			// モック: DBエラー
			const dbError = new Error('Database connection failed');
			vi.mocked(stopWorkLog).mockRejectedValue(dbError);

			// モック: locals
			const locals = {
				user: {
					id: testUserId
				}
			};

			// モック: request with FormData
			const formData = new FormData();
			formData.append('description', '');
			const request = new Request('http://localhost:5173/?/stop', {
				method: 'POST',
				body: formData
			});

			// stop actionを呼び出し
			await expect(async () => {
				await actions.stop({ locals, request } as ServerLoadEvent);
			}).rejects.toThrow();

			// エラーログが出力されることを確認
			expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to stop work log:', dbError);

			// クリーンアップ
			consoleErrorSpy.mockRestore();
		});
	});

	describe('TC5: 更新失敗（既に終了済み）', () => {
		it('404エラーでNO_ACTIVEを返却する', async () => {
			const startedAt = new Date('2025-10-21T03:00:00Z');

			// モック: 進行中の作業あり（getActiveWorkLogでは取得できた）
			const mockActiveWorkLog = {
				id: testWorkLogId,
				userId: testUserId,
				startedAt,
				endedAt: null,
				description: '',
				isActive: () => true,
				getDuration: () => 0
			} as WorkLog;
			vi.mocked(getActiveWorkLog).mockResolvedValue(mockActiveWorkLog);

			// モック: stopWorkLogがnullを返す（既に終了済み）
			vi.mocked(stopWorkLog).mockResolvedValue(null);

			// モック: locals
			const locals = {
				user: {
					id: testUserId
				}
			};

			// モック: request with FormData
			const formData = new FormData();
			formData.append('description', '');
			const request = new Request('http://localhost:5173/?/stop', {
				method: 'POST',
				body: formData
			});

			// stop actionを呼び出し
			const result = await actions.stop({ locals, request } as ServerLoadEvent);

			// 検証
			expect(result).toHaveProperty('status', 404);
			expect(result).toHaveProperty('data');
			expect(result?.data).toHaveProperty('reason', 'NO_ACTIVE');
			expect(stopWorkLog).toHaveBeenCalledWith(testWorkLogId, expect.any(Date), '');
		});
	});

	describe('TC6: 作業時間の計算', () => {
		it('1時間の作業で3600秒を返却する', async () => {
			const startedAt = new Date('2025-10-21T03:00:00Z');
			const endedAt = new Date('2025-10-21T04:00:00Z');
			const durationSec = 3600; // 1時間

			// モック: 進行中の作業あり
			const mockActiveWorkLog = {
				id: testWorkLogId,
				userId: testUserId,
				startedAt,
				endedAt: null,
				description: '',
				isActive: () => true,
				getDuration: () => 0
			} as WorkLog;
			vi.mocked(getActiveWorkLog).mockResolvedValue(mockActiveWorkLog);

			// モック: 作業終了
			const mockStoppedWorkLog = {
				id: testWorkLogId,
				userId: testUserId,
				startedAt,
				endedAt,
				description: '',
				isActive: () => false,
				getDuration: () => durationSec
			} as WorkLog;
			vi.mocked(stopWorkLog).mockResolvedValue(mockStoppedWorkLog);

			// モック: locals
			const locals = {
				user: {
					id: testUserId
				}
			};

			// モック: request with FormData
			const formData = new FormData();
			formData.append('description', '');
			const request = new Request('http://localhost:5173/?/stop', {
				method: 'POST',
				body: formData
			});

			// stop actionを呼び出し
			const result = await actions.stop({ locals, request } as ServerLoadEvent);

			// 検証
			expect(result).toHaveProperty('durationSec', 3600);
			expect(result?.workLog?.startedAt).toBe(startedAt.toISOString());
			expect(result?.workLog?.endedAt).toBe(endedAt.toISOString());
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
					updatedAt: new Date()
				}
			];
			vi.mocked(listWorkLogs).mockResolvedValue({
				items: mockItems,
				hasNext: false
			});

			// モック: 月次合計
			vi.mocked(aggregateMonthlyWorkLogDuration).mockResolvedValue(7200); // 2時間

			// モック: locals
			const locals = {
				user: {
					id: testUserId
				}
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
				hasNext: false
			});

			// モック: 月次合計
			vi.mocked(aggregateMonthlyWorkLogDuration).mockResolvedValue(3600); // 1時間

			// モック: locals
			const locals = {
				user: {
					id: testUserId
				}
			};

			// モック: url (month=2025-09)
			const url = new URL('http://localhost:5173/?month=2025-09');

			// load関数を呼び出し
			const result = await load({ locals, url } as unknown as ServerLoadEvent);

			// listDataを解決
			const listData = await result?.listData;

			// 検証: aggregateMonthlyWorkLogDuration が month='2025-09' で呼ばれる
			expect(aggregateMonthlyWorkLogDuration).toHaveBeenCalledWith(testUserId, {
				month: '2025-09'
			});
			expect(listData.monthlyTotalSec).toBe(3600);
		});
	});

	describe('TC3: page/size パラメータ', () => {
		it('page=2, size=50 で正しく呼ばれる', async () => {
			// モック: 進行中の作業なし
			vi.mocked(getActiveWorkLog).mockResolvedValue(null);

			// モック: 一覧取得
			vi.mocked(listWorkLogs).mockResolvedValue({
				items: [],
				hasNext: true
			});

			// モック: 月次合計
			vi.mocked(aggregateMonthlyWorkLogDuration).mockResolvedValue(0);

			// モック: locals
			const locals = {
				user: {
					id: testUserId
				}
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
					offset: 50
				})
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
				user: null
			};

			// モック: url
			const url = new URL('http://localhost:5173/');

			// load関数を呼び出し
			await expect(load({ locals, url } as unknown as ServerLoadEvent)).rejects.toThrow();
		});
	});
});
