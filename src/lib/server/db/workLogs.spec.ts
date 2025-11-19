import { describe, it, expect, beforeEach, vi } from 'vitest';
import { randomUUID } from 'crypto';
import type { DbWorkLog } from './schema';
import {
	toWorkLog,
	getActiveWorkLog,
	createWorkLog,
	stopWorkLog,
	updateActiveWorkLog,
	getPreviousEndedAt,
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
				findFirst: vi.fn(),
			},
			workLogTags: {
				findMany: vi.fn(),
			},
		},
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				leftJoin: vi.fn(() => ({
					where: vi.fn(() => ({
						orderBy: vi.fn(() => Promise.resolve([])),
					})),
				})),
				innerJoin: vi.fn(() => ({
					where: vi.fn(() => ({
						groupBy: vi.fn(() => ({
							having: vi.fn(() => ({
								orderBy: vi.fn(() => ({
									limit: vi.fn(() => ({
										offset: vi.fn(() => Promise.resolve([])),
									})),
								})),
							})),
						})),
					})),
				})),
				where: vi.fn(() => ({
					orderBy: vi.fn(() => ({
						limit: vi.fn(() => ({
							offset: vi.fn(() => Promise.resolve([])),
						})),
					})),
				})),
			})),
		})),
		insert: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		transaction: vi.fn(),
	},
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
				description: '',
				createdAt: serverNow,
				updatedAt: serverNow,
			};

			const workLog = toWorkLog(dbWorkLog);

			expect(workLog).toBeInstanceOf(WorkLog);
			expect(workLog.userId).toBe(testUserId);
			expect(workLog.startedAt).toBeInstanceOf(Date);
			expect(workLog.endedAt).toBeNull();
			expect(workLog.description).toBe('');
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
				description: 'テスト作業',
				createdAt: startedAt,
				updatedAt: endedAt,
			};

			const workLog = toWorkLog(dbWorkLog);

			expect(workLog).toBeInstanceOf(WorkLog);
			expect(workLog.isActive()).toBe(false);
			expect(workLog.getDuration()).toBe(3600);
			expect(workLog.description).toBe('テスト作業');
		});

		it('異常系: 不正なデータでエラー', () => {
			const invalidData = {
				id: 'invalid-uuid',
				userId: testUserId,
				startedAt: new Date(),
				endedAt: null,
				description: '',
				createdAt: new Date(),
				updatedAt: new Date(),
			} as DbWorkLog;

			expect(() => toWorkLog(invalidData)).toThrow();
		});
	});

	describe('getActiveWorkLog()', () => {
		it('進行中の作業がない場合、nullを返す', async () => {
			// モック: 検索結果なし (db.select().from()...の最終結果)
			const mockSelect = vi.fn(() => ({
				from: vi.fn(() => ({
					leftJoin: vi.fn(() => ({
						where: vi.fn(() => ({
							orderBy: vi.fn(() => Promise.resolve([])),
						})),
					})),
				})),
			}));
			// @ts-expect-error - モックの型定義が複雑なため
			vi.mocked(db.select).mockImplementation(mockSelect);

			const active = await getActiveWorkLog(testUserId);

			expect(active).toBeNull();
			expect(db.select).toHaveBeenCalledOnce();
		});

		it('進行中の作業がある場合、WorkLogインスタンスを返す', async () => {
			const serverNow = new Date();
			const mockDbWorkLog: DbWorkLog = {
				id: testWorkLogId,
				userId: testUserId,
				startedAt: serverNow,
				endedAt: null,
				description: '',
				createdAt: serverNow,
				updatedAt: serverNow,
			};

			// モック: 進行中の作業を返す (タグなし)
			const mockResults = [
				{
					workLog: mockDbWorkLog,
					tag: null,
				},
			];

			const mockSelect = vi.fn(() => ({
				from: vi.fn(() => ({
					leftJoin: vi.fn(() => ({
						where: vi.fn(() => ({
							orderBy: vi.fn(() => Promise.resolve(mockResults)),
						})),
					})),
				})),
			}));
			// @ts-expect-error - モックの型定義が複雑なため
			vi.mocked(db.select).mockImplementation(mockSelect);

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
				description: '',
				createdAt: serverNow,
				updatedAt: serverNow,
			};

			// モック: insertのチェーンメソッド
			const mockReturning = vi.fn().mockResolvedValue([mockDbWorkLog]);
			const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
			const mockInsert = vi.fn().mockReturnValue({ values: mockValues });
			vi.mocked(db.insert).mockImplementation(mockInsert);

			const workLog = await createWorkLog(testUserId, serverNow, '');

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
				await createWorkLog(testUserId, new Date(), '');
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
				description: '',
				createdAt: startedAt,
				updatedAt: endedAt,
			};

			// モック: updateのチェーンメソッド
			const mockReturning = vi.fn().mockResolvedValue([mockDbWorkLog]);
			const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
			const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
			const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });
			vi.mocked(db.update).mockImplementation(mockUpdate);

			const updated = await stopWorkLog(testWorkLogId, endedAt, '');

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

			const result = await stopWorkLog(testWorkLogId, new Date(), '');

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

			const result = await stopWorkLog(fakeId, new Date(), '');

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
				description: '',
				createdAt: startedAt,
				updatedAt: startedAt,
			};
			const mockInsertReturning = vi.fn().mockResolvedValue([createdDbWorkLog]);
			const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning });
			const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });
			vi.mocked(db.insert).mockImplementation(mockInsert);

			const created = await createWorkLog(testUserId, startedAt, '');
			expect(created.isActive()).toBe(true);

			// 2. 進行中の作業を取得のモック
			const mockResults = [
				{
					workLog: createdDbWorkLog,
					tag: null,
				},
			];
			const mockSelect1 = vi.fn(() => ({
				from: vi.fn(() => ({
					leftJoin: vi.fn(() => ({
						where: vi.fn(() => ({
							orderBy: vi.fn(() => Promise.resolve(mockResults)),
						})),
					})),
				})),
			}));
			// @ts-expect-error - モックの型定義が複雑なため
			vi.mocked(db.select).mockImplementation(mockSelect1);

			const active = await getActiveWorkLog(testUserId);
			expect(active).toBeInstanceOf(WorkLog);
			expect(active?.id).toBe(created.id); // 3. 作業終了のモック
			const stoppedDbWorkLog: DbWorkLog = {
				...createdDbWorkLog,
				endedAt,
				updatedAt: endedAt,
			};
			const mockUpdateReturning = vi.fn().mockResolvedValue([stoppedDbWorkLog]);
			const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockUpdateReturning });
			const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
			const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });
			vi.mocked(db.update).mockImplementation(mockUpdate);

			const stopped = await stopWorkLog(created.id, endedAt, '');
			expect(stopped?.isActive()).toBe(false);
			expect(stopped?.getDuration()).toBe(5);

			// 4. 進行中の作業を取得 → null のモック
			const mockSelect2 = vi.fn(() => ({
				from: vi.fn(() => ({
					leftJoin: vi.fn(() => ({
						where: vi.fn(() => ({
							orderBy: vi.fn(() => Promise.resolve([])),
						})),
					})),
				})),
			}));
			// @ts-expect-error - モックの型定義が複雑なため
			vi.mocked(db.select).mockImplementation(mockSelect2);

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
				description: '',
				createdAt: startedAt,
				updatedAt: originalUpdatedAt,
			};
			const mockInsertReturning = vi.fn().mockResolvedValue([createdDbWorkLog]);
			const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning });
			const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });
			vi.mocked(db.insert).mockImplementation(mockInsert);

			const created = await createWorkLog(testUserId, startedAt, '');

			// 作業を終了のモック（updated_atが更新される）
			const endedAt = new Date(startedAt.getTime() + 100);
			const newUpdatedAt = new Date(endedAt.getTime() + 10); // 更新時刻をシミュレート
			const stoppedDbWorkLog: DbWorkLog = {
				...createdDbWorkLog,
				endedAt,
				updatedAt: newUpdatedAt,
			};
			const mockUpdateReturning = vi.fn().mockResolvedValue([stoppedDbWorkLog]);
			const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockUpdateReturning });
			const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
			const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });
			vi.mocked(db.update).mockImplementation(mockUpdate);

			const updated = await stopWorkLog(created.id, endedAt, '');

			// updated_at が更新されていることを確認
			expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
		});
	});

	describe('updateActiveWorkLog()', () => {
		it('進行中の作業を更新できる', async () => {
			const startedAt = new Date('2025-01-01T10:00:00Z');
			const newStartedAt = new Date('2025-01-01T09:00:00Z');
			const updatedAt = new Date('2025-01-01T10:30:00Z');

			const updatedDbWorkLog: DbWorkLog = {
				id: testWorkLogId,
				userId: testUserId,
				startedAt: newStartedAt,
				endedAt: null,
				description: '更新された説明',
				createdAt: startedAt,
				updatedAt,
			};

			// トランザクションのモック
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				const txMock = {
					update: vi.fn().mockReturnValue({
						set: vi.fn().mockReturnValue({
							where: vi.fn().mockReturnValue({
								returning: vi.fn().mockResolvedValue([updatedDbWorkLog]),
							}),
						}),
					}),
					delete: vi.fn().mockReturnValue({
						where: vi.fn().mockResolvedValue(undefined),
					}),
					insert: vi.fn().mockReturnValue({
						values: vi.fn().mockResolvedValue(undefined),
					}),
				};
				return callback(txMock);
			});
			vi.mocked(db.transaction).mockImplementation(mockTransaction as any);

			const updated = await updateActiveWorkLog(testUserId, testWorkLogId, {
				startedAt: newStartedAt,
				description: '更新された説明',
				tags: ['タグ1', 'タグ2'],
			});

			expect(updated).toBeInstanceOf(WorkLog);
			expect(updated?.startedAt).toEqual(newStartedAt);
			expect(updated?.description).toBe('更新された説明');
			expect(updated?.tags).toEqual(['タグ1', 'タグ2']);
			expect(db.transaction).toHaveBeenCalledOnce();
		});

		it('進行中でない作業は更新できず null を返す', async () => {
			// トランザクションのモック（更新結果が空配列）
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				const txMock = {
					update: vi.fn().mockReturnValue({
						set: vi.fn().mockReturnValue({
							where: vi.fn().mockReturnValue({
								returning: vi.fn().mockResolvedValue([]),
							}),
						}),
					}),
				};
				return callback(txMock);
			});
			vi.mocked(db.transaction).mockImplementation(mockTransaction as any);

			const result = await updateActiveWorkLog(testUserId, testWorkLogId, {
				startedAt: new Date(),
				description: '更新しようとした説明',
				tags: [],
			});

			expect(result).toBeNull();
		});

		it('タグが空の場合でも更新できる', async () => {
			const startedAt = new Date('2025-01-01T10:00:00Z');
			const newStartedAt = new Date('2025-01-01T09:00:00Z');
			const updatedAt = new Date('2025-01-01T10:30:00Z');

			const updatedDbWorkLog: DbWorkLog = {
				id: testWorkLogId,
				userId: testUserId,
				startedAt: newStartedAt,
				endedAt: null,
				description: '説明のみ更新',
				createdAt: startedAt,
				updatedAt,
			};

			// トランザクションのモック
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				const txMock = {
					update: vi.fn().mockReturnValue({
						set: vi.fn().mockReturnValue({
							where: vi.fn().mockReturnValue({
								returning: vi.fn().mockResolvedValue([updatedDbWorkLog]),
							}),
						}),
					}),
					delete: vi.fn().mockReturnValue({
						where: vi.fn().mockResolvedValue(undefined),
					}),
					insert: vi.fn(),
				};
				return callback(txMock);
			});
			vi.mocked(db.transaction).mockImplementation(mockTransaction as any);

			const updated = await updateActiveWorkLog(testUserId, testWorkLogId, {
				startedAt: newStartedAt,
				description: '説明のみ更新',
				tags: [],
			});

			expect(updated).toBeInstanceOf(WorkLog);
			expect(updated?.tags).toEqual([]);
			// タグが空の場合 insert が呼ばれない
			expect(db.transaction).toHaveBeenCalledOnce();
		});
	});

	describe('getPreviousEndedAt()', () => {
		it('完了した作業がない場合、null を返す', async () => {
			vi.mocked(db.query.workLogs.findFirst).mockResolvedValue(undefined);

			const previousEndedAt = await getPreviousEndedAt(testUserId);

			expect(previousEndedAt).toBeNull();
			expect(db.query.workLogs.findFirst).toHaveBeenCalledOnce();
		});

		it('最新の完了作業の終了時刻を返す', async () => {
			const endedAt = new Date('2025-01-01T09:00:00Z');
			const mockDbWorkLog: DbWorkLog = {
				id: randomUUID(),
				userId: testUserId,
				startedAt: new Date('2025-01-01T08:00:00Z'),
				endedAt,
				description: '完了した作業',
				createdAt: new Date('2025-01-01T08:00:00Z'),
				updatedAt: endedAt,
			};

			vi.mocked(db.query.workLogs.findFirst).mockResolvedValue(mockDbWorkLog);

			const previousEndedAt = await getPreviousEndedAt(testUserId);

			expect(previousEndedAt).toEqual(endedAt);
		});

		it('複数の完了作業がある場合、最新のものを返す', async () => {
			const latestEndedAt = new Date('2025-01-01T15:00:00Z');
			const mockDbWorkLog: DbWorkLog = {
				id: randomUUID(),
				userId: testUserId,
				startedAt: new Date('2025-01-01T14:00:00Z'),
				endedAt: latestEndedAt,
				description: '最新の完了作業',
				createdAt: new Date('2025-01-01T14:00:00Z'),
				updatedAt: latestEndedAt,
			};

			// findFirst は orderBy desc で最新を取得する想定
			vi.mocked(db.query.workLogs.findFirst).mockResolvedValue(mockDbWorkLog);

			const previousEndedAt = await getPreviousEndedAt(testUserId);

			expect(previousEndedAt).toEqual(latestEndedAt);
			expect(db.query.workLogs.findFirst).toHaveBeenCalledOnce();
		});
	});
});
