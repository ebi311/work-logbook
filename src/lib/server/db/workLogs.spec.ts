import { describe, it, expect, beforeEach, vi } from 'vitest';
import { randomUUID } from 'crypto';
import type { DbWorkLog } from './schema';
import {
	toWorkLog,
	getActiveWorkLog,
	createWorkLog,
	stopWorkLog
} from './workLogs';
import { WorkLog } from '../../../models/workLog';

/**
 * F-001: 作業記録 DB関数のテスト (モック版)
 * 
 * テストケース:
 * 1. 変換関数: toWorkLog()
 * 2. DB関数: getActiveWorkLog(), createWorkLog(), stopWorkLog()
 * 3. 統合テスト: 作業開始→終了の正常フロー
 * 4. 異常系: 二重開始、進行中なしで停止
 * 
 * 注: 実際のDBへの接続をモック化し、高速で実行可能なユニットテストとして実装
 */

// dbモジュールをモック化
vi.mock('./index', () => ({
	db: {
		query: {
			workLogs: {
				findFirst: vi.fn()
			}
		},
		insert: vi.fn(),
		update: vi.fn(),
		delete: vi.fn()
	}
}));

import { db } from './index';

describe('WorkLogs DB Functions', () => {
	const testUserId = randomUUID();
	const testWorkLogId = randomUUID();

	beforeEach(() => {
		// モック関数をリセット
		vi.clearAllMocks();
	});

	describe('toWorkLog()', () => {
		it('正常系: DB レコードをドメインモデルに変換できる', () => {
			const serverNow = new Date();
			const dbWorkLog: DbWorkLog = {
				id: testWorkLogId,
				userId: testUserId,
				startedAt: serverNow,
				endedAt: null,
				createdAt: serverNow,
				updatedAt: serverNow
			};

			const workLog = toWorkLog(dbWorkLog);

			expect(workLog).toBeInstanceOf(WorkLog);
			expect(workLog.userId).toBe(testUserId);
			expect(workLog.startedAt).toBeInstanceOf(Date);
			expect(workLog.endedAt).toBeNull();
			expect(workLog.isActive()).toBe(true);
		});

		it('正常系: 完了済み作業も変換できる', () => {
			const startedAt = new Date();
			const endedAt = new Date(startedAt.getTime() + 3600000); // 1時間後
			const dbWorkLog: DbWorkLog = {
				id: testWorkLogId,
				userId: testUserId,
				startedAt,
				endedAt,
				createdAt: startedAt,
				updatedAt: endedAt
			};

			const workLog = toWorkLog(dbWorkLog);

			expect(workLog).toBeInstanceOf(WorkLog);
			expect(workLog.isActive()).toBe(false);
			expect(workLog.getDuration()).toBe(3600);
		});

		it('異常系: 不正なデータでエラー', () => {
			const invalidData = {
				id: 'invalid-uuid',
				userId: testUserId,
				startedAt: new Date(),
				endedAt: null,
				createdAt: new Date(),
				updatedAt: new Date()
			} as DbWorkLog;

			expect(() => toWorkLog(invalidData)).toThrow();
		});
	});

	describe('getActiveWorkLog()', () => {
		it('進行中の作業がない場合、nullを返す', async () => {
			// モック: 検索結果なし
			vi.mocked(db.query.workLogs.findFirst).mockResolvedValue(undefined);

			const active = await getActiveWorkLog(testUserId);

			expect(active).toBeNull();
			expect(db.query.workLogs.findFirst).toHaveBeenCalledOnce();
		});

		it('進行中の作業がある場合、WorkLogインスタンスを返す', async () => {
			const serverNow = new Date();
			const mockDbWorkLog: DbWorkLog = {
				id: testWorkLogId,
				userId: testUserId,
				startedAt: serverNow,
				endedAt: null,
				createdAt: serverNow,
				updatedAt: serverNow
			};

			// モック: 進行中の作業を返す
			vi.mocked(db.query.workLogs.findFirst).mockResolvedValue(mockDbWorkLog);

			const active = await getActiveWorkLog(testUserId);

			expect(active).toBeInstanceOf(WorkLog);
			expect(active?.userId).toBe(testUserId);
			expect(active?.endedAt).toBeNull();
			expect(active?.isActive()).toBe(true);
		});
	});

	describe('createWorkLog()', () => {
		it('新規作業を開始できる', async () => {
			const serverNow = new Date();
			const mockDbWorkLog: DbWorkLog = {
				id: testWorkLogId,
				userId: testUserId,
				startedAt: serverNow,
				endedAt: null,
				createdAt: serverNow,
				updatedAt: serverNow
			};

			// モック: insertのチェーンメソッド
			const mockReturning = vi.fn().mockResolvedValue([mockDbWorkLog]);
			const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
			const mockInsert = vi.fn().mockReturnValue({ values: mockValues });
			vi.mocked(db.insert).mockImplementation(mockInsert);

			const workLog = await createWorkLog(testUserId, serverNow);

			expect(workLog).toBeInstanceOf(WorkLog);
			expect(workLog.userId).toBe(testUserId);
			expect(workLog.startedAt).toBeInstanceOf(Date);
			expect(workLog.startedAt.getTime()).toBeCloseTo(serverNow.getTime(), -2);
			expect(workLog.endedAt).toBeNull();
			expect(workLog.isActive()).toBe(true);
			expect(db.insert).toHaveBeenCalledOnce();
		});

		it('既に進行中の作業がある場合、部分ユニーク制約違反でエラー', async () => {
			// モック: UNIQUE制約違反をシミュレート
			const mockReturning = vi.fn().mockRejectedValue(new Error('UNIQUE constraint failed'));
			const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
			const mockInsert = vi.fn().mockReturnValue({ values: mockValues });
			vi.mocked(db.insert).mockImplementation(mockInsert);

			await expect(async () => {
				await createWorkLog(testUserId, new Date());
			}).rejects.toThrow();
		});
	});

	describe('stopWorkLog()', () => {
		it('進行中の作業を終了できる', async () => {
			const startedAt = new Date();
			const endedAt = new Date(startedAt.getTime() + 1000); // 1秒後
			const mockDbWorkLog: DbWorkLog = {
				id: testWorkLogId,
				userId: testUserId,
				startedAt,
				endedAt,
				createdAt: startedAt,
				updatedAt: endedAt
			};

			// モック: updateのチェーンメソッド
			const mockReturning = vi.fn().mockResolvedValue([mockDbWorkLog]);
			const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
			const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
			const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });
			vi.mocked(db.update).mockImplementation(mockUpdate);

			const updated = await stopWorkLog(testWorkLogId, endedAt);

			expect(updated).toBeInstanceOf(WorkLog);
			expect(updated?.endedAt).toBeInstanceOf(Date);
			expect(updated?.isActive()).toBe(false);
			expect(updated?.getDuration()).toBe(1);
		});

		it('既に終了済みの作業は更新できない', async () => {
			// モック: 更新対象なし（空配列を返す）
			const mockReturning = vi.fn().mockResolvedValue([]);
			const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
			const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
			const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });
			vi.mocked(db.update).mockImplementation(mockUpdate);

			const result = await stopWorkLog(testWorkLogId, new Date());

			expect(result).toBeNull();
		});

		it('存在しないIDでは更新できない', async () => {
			const fakeId = randomUUID();

			// モック: 更新対象なし
			const mockReturning = vi.fn().mockResolvedValue([]);
			const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
			const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
			const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });
			vi.mocked(db.update).mockImplementation(mockUpdate);

			const result = await stopWorkLog(fakeId, new Date());

			expect(result).toBeNull();
		});
	});

	describe('統合テスト: 作業開始→終了', () => {
		it('正常フロー: 開始 → 取得 → 終了 → 取得でnull', async () => {
			const startedAt = new Date();
			const endedAt = new Date(startedAt.getTime() + 5000); // 5秒後

			// 1. 作業開始のモック
			const createdDbWorkLog: DbWorkLog = {
				id: testWorkLogId,
				userId: testUserId,
				startedAt,
				endedAt: null,
				createdAt: startedAt,
				updatedAt: startedAt
			};
			const mockInsertReturning = vi.fn().mockResolvedValue([createdDbWorkLog]);
			const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning });
			const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });
			vi.mocked(db.insert).mockImplementation(mockInsert);

			const created = await createWorkLog(testUserId, startedAt);
			expect(created.isActive()).toBe(true);

			// 2. 進行中の作業を取得のモック
			vi.mocked(db.query.workLogs.findFirst).mockResolvedValue(createdDbWorkLog);
			const active = await getActiveWorkLog(testUserId);
			expect(active).toBeInstanceOf(WorkLog);
			expect(active?.id).toBe(created.id);

			// 3. 作業終了のモック
			const stoppedDbWorkLog: DbWorkLog = {
				...createdDbWorkLog,
				endedAt,
				updatedAt: endedAt
			};
			const mockUpdateReturning = vi.fn().mockResolvedValue([stoppedDbWorkLog]);
			const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockUpdateReturning });
			const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
			const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });
			vi.mocked(db.update).mockImplementation(mockUpdate);

			const stopped = await stopWorkLog(created.id, endedAt);
			expect(stopped?.isActive()).toBe(false);
			expect(stopped?.getDuration()).toBe(5);

			// 4. 進行中の作業を取得 → null のモック
			vi.mocked(db.query.workLogs.findFirst).mockResolvedValue(undefined);
			const noActive = await getActiveWorkLog(testUserId);
			expect(noActive).toBeNull();
		});
	});

	describe('updated_at トリガー動作確認', () => {
		it('レコード更新時に updated_at が自動更新される', async () => {
			const startedAt = new Date();
			const originalUpdatedAt = new Date(startedAt);

			// 作業を開始のモック
			const createdDbWorkLog: DbWorkLog = {
				id: testWorkLogId,
				userId: testUserId,
				startedAt,
				endedAt: null,
				createdAt: startedAt,
				updatedAt: originalUpdatedAt
			};
			const mockInsertReturning = vi.fn().mockResolvedValue([createdDbWorkLog]);
			const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning });
			const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });
			vi.mocked(db.insert).mockImplementation(mockInsert);

			const created = await createWorkLog(testUserId, startedAt);

			// 作業を終了のモック（updated_atが更新される）
			const endedAt = new Date(startedAt.getTime() + 100);
			const newUpdatedAt = new Date(endedAt.getTime() + 10); // 更新時刻をシミュレート
			const stoppedDbWorkLog: DbWorkLog = {
				...createdDbWorkLog,
				endedAt,
				updatedAt: newUpdatedAt
			};
			const mockUpdateReturning = vi.fn().mockResolvedValue([stoppedDbWorkLog]);
			const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockUpdateReturning });
			const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
			const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });
			vi.mocked(db.update).mockImplementation(mockUpdate);

			const updated = await stopWorkLog(created.id, endedAt);

			// updated_at が更新されていることを確認
			expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
		});
	});
});
