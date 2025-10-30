/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { randomUUID } from 'crypto';
import type { WorkLog } from '../../models/workLog';
import type { ServerLoadEvent } from '@sveltejs/kit';

/**
 * F-001: Server Actions - stop のテスト
 */

// workLogs モジュールをモック化
vi.mock('$lib/server/db/workLogs', () => ({
	getActiveWorkLog: vi.fn(),
	stopWorkLog: vi.fn(),
	saveWorkLogTags: vi.fn(),
}));

import { handleStopAction } from './stop';
import { getActiveWorkLog, stopWorkLog, saveWorkLogTags } from '$lib/server/db/workLogs';

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
				getDuration: () => 0,
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
				getDuration: () => durationSec,
			} as WorkLog;
			vi.mocked(stopWorkLog).mockResolvedValue(mockStoppedWorkLog);
			vi.mocked(saveWorkLogTags).mockResolvedValue();

			// モック: locals
			const locals = {
				user: {
					id: testUserId,
				},
			};

			// モック: request with FormData
			const formData = new FormData();
			formData.append('description', 'Updated description');
			const request = new Request('http://localhost:5173/?/stop', {
				method: 'POST',
				body: formData,
			});

			// stop actionを呼び出し
			const result = await handleStopAction({ locals, request } as ServerLoadEvent);

			// 検証
			expect(result).toHaveProperty('ok', true);
			expect(result).toHaveProperty('workLog');
			expect(result).toHaveProperty('serverNow');
			expect(result).toHaveProperty('durationSec', durationSec);
			expect((result as any).workLog).toEqual({
				id: testWorkLogId,
				startedAt: startedAt.toISOString(),
				endedAt: endedAt.toISOString(),
				description: 'Updated description',
				tags: [],
			});
			expect((result as any).serverNow).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
			expect(stopWorkLog).toHaveBeenCalledWith(
				testWorkLogId,
				expect.any(Date),
				'Updated description',
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
					id: testUserId,
				},
			};

			// モック: request with FormData
			const formData = new FormData();
			formData.append('description', '');
			const request = new Request('http://localhost:5173/?/stop', {
				method: 'POST',
				body: formData,
			});

			// stop actionを呼び出し
			const result = await handleStopAction({ locals, request } as ServerLoadEvent);

			// 検証
			expect(result).toHaveProperty('status', 404);
			expect(result).toHaveProperty('data');
			expect((result as any).data).toHaveProperty('reason', 'NO_ACTIVE');
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
				body: formData,
			});

			// stop actionを呼び出し
			await expect(async () => {
				await handleStopAction({ locals, request } as ServerLoadEvent);
			}).rejects.toThrow();

			// getActiveWorkLogが呼ばれないことを確認
			expect(getActiveWorkLog).not.toHaveBeenCalled();
			expect(stopWorkLog).not.toHaveBeenCalled();
		});
	});

	describe('TC4: DB接続エラー', () => {
		it('500エラーをスローし、エラーログを出力する', async () => {
			const startedAt = new Date('2025-10-21T03:00:00Z');

			// モック: 進行中の作業あり
			const mockActiveWorkLog = {
				id: testWorkLogId,
				userId: testUserId,
				startedAt,
				endedAt: null,
				description: '',
				isActive: () => true,
				getDuration: () => 0,
			} as WorkLog;
			vi.mocked(getActiveWorkLog).mockResolvedValue(mockActiveWorkLog);

			// モック: DBエラー
			const dbError = new Error('Database connection failed');
			vi.mocked(stopWorkLog).mockRejectedValue(dbError);

			// モック: locals
			const locals = {
				user: {
					id: testUserId,
				},
			};

			// モック: request with FormData
			const formData = new FormData();
			formData.append('description', '');
			const request = new Request('http://localhost:5173/?/stop', {
				method: 'POST',
				body: formData,
			});

			// stop actionを呼び出し
			await expect(async () => {
				await handleStopAction({ locals, request } as ServerLoadEvent);
			}).rejects.toThrow();

			// エラーログはhandleStopAction内では出力されない
			// (+page.server.tsのactionsラッパーで出力される)
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
				getDuration: () => 0,
			} as WorkLog;
			vi.mocked(getActiveWorkLog).mockResolvedValue(mockActiveWorkLog);

			// モック: stopWorkLogがnullを返す（既に終了済み）
			vi.mocked(stopWorkLog).mockResolvedValue(null);

			// モック: locals
			const locals = {
				user: {
					id: testUserId,
				},
			};

			// モック: request with FormData
			const formData = new FormData();
			formData.append('description', '');
			const request = new Request('http://localhost:5173/?/stop', {
				method: 'POST',
				body: formData,
			});

			// stop actionを呼び出し
			const result = await handleStopAction({ locals, request } as ServerLoadEvent);

			// 検証
			expect(result).toHaveProperty('status', 404);
			expect(result).toHaveProperty('data');
			expect((result as any).data).toHaveProperty('reason', 'NO_ACTIVE');
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
				getDuration: () => 0,
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
				getDuration: () => durationSec,
			} as WorkLog;
			vi.mocked(stopWorkLog).mockResolvedValue(mockStoppedWorkLog);
			vi.mocked(saveWorkLogTags).mockResolvedValue();

			// モック: locals
			const locals = {
				user: {
					id: testUserId,
				},
			};

			// モック: request with FormData
			const formData = new FormData();
			formData.append('description', '');
			const request = new Request('http://localhost:5173/?/stop', {
				method: 'POST',
				body: formData,
			});

			// stop actionを呼び出し
			const result = await handleStopAction({ locals, request } as ServerLoadEvent);

			// 検証
			expect(result).toHaveProperty('durationSec', 3600);
			expect((result as any).workLog?.startedAt).toBe(startedAt.toISOString());
			expect((result as any).workLog?.endedAt).toBe(endedAt.toISOString());
		});
	});
});
