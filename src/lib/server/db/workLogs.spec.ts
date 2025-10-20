import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './index';
import { workLogs, type DbWorkLog } from './schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import {
	toWorkLog,
	getActiveWorkLog,
	createWorkLog,
	stopWorkLog
} from './workLogs';
import { WorkLog } from '../../../models/workLog';

/**
 * F-001: 作業記録 DB関数のテスト
 * 
 * テストケース:
 * 1. 変換関数: toWorkLog()
 * 2. DB関数: getActiveWorkLog(), createWorkLog(), stopWorkLog()
 * 3. 統合テスト: 作業開始→終了の正常フロー
 * 4. 異常系: 二重開始、進行中なしで停止
 */

describe('WorkLogs DB Functions', () => {
	const testUserId = randomUUID(); // 有効なUUID v4を生成

	beforeEach(async () => {
		// テスト前に対象ユーザーの作業記録をクリア
		await db.delete(workLogs).where(eq(workLogs.userId, testUserId));
	});

	describe('toWorkLog()', () => {
		it('正常系: DB レコードをドメインモデルに変換できる', async () => {
			const serverNow = new Date();
			const [dbWorkLog] = await db
				.insert(workLogs)
				.values({
					userId: testUserId,
					startedAt: serverNow,
					endedAt: null
				})
				.returning();

			const workLog = toWorkLog(dbWorkLog);

			expect(workLog).toBeInstanceOf(WorkLog);
			expect(workLog.userId).toBe(testUserId);
			expect(workLog.startedAt).toBeInstanceOf(Date);
			expect(workLog.endedAt).toBeNull();
			expect(workLog.isActive()).toBe(true);
		});

		it('正常系: 完了済み作業も変換できる', async () => {
			const startedAt = new Date();
			const endedAt = new Date(startedAt.getTime() + 3600000); // 1時間後
			const [dbWorkLog] = await db
				.insert(workLogs)
				.values({
					userId: testUserId,
					startedAt,
					endedAt
				})
				.returning();

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
			const active = await getActiveWorkLog(testUserId);
			expect(active).toBeNull();
		});

		it('進行中の作業がある場合、WorkLogインスタンスを返す', async () => {
			// 進行中の作業を作成
			const serverNow = new Date();
			await db
				.insert(workLogs)
				.values({
					userId: testUserId,
					startedAt: serverNow,
					endedAt: null
				})
				.returning();

			// 検索
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

			const workLog = await createWorkLog(testUserId, serverNow);

			expect(workLog).toBeInstanceOf(WorkLog);
			expect(workLog.userId).toBe(testUserId);
			expect(workLog.startedAt).toBeInstanceOf(Date);
			expect(workLog.startedAt.getTime()).toBeCloseTo(serverNow.getTime(), -2);
			expect(workLog.endedAt).toBeNull();
			expect(workLog.isActive()).toBe(true);
		});

		it('既に進行中の作業がある場合、部分ユニーク制約違反でエラー', async () => {
			const serverNow = new Date();

			// 1つ目の作業を開始
			await createWorkLog(testUserId, serverNow);

			// 2つ目の作業を開始しようとすると制約違反
			await expect(async () => {
				await createWorkLog(testUserId, new Date());
			}).rejects.toThrow();
		});
	});

	describe('stopWorkLog()', () => {
		it('進行中の作業を終了できる', async () => {
			const startedAt = new Date();

			// 作業を開始
			const created = await createWorkLog(testUserId, startedAt);

			// 作業を終了
			const endedAt = new Date(startedAt.getTime() + 1000); // 1秒後
			const updated = await stopWorkLog(created.id, endedAt);

			expect(updated).toBeInstanceOf(WorkLog);
			expect(updated?.endedAt).toBeInstanceOf(Date);
			expect(updated?.isActive()).toBe(false);
			expect(updated?.getDuration()).toBe(1);
		});

		it('既に終了済みの作業は更新できない', async () => {
			const startedAt = new Date();
			const endedAt = new Date(startedAt.getTime() + 1000);

			// 作業を開始して終了
			const created = await createWorkLog(testUserId, startedAt);
			await stopWorkLog(created.id, endedAt);

			// 再度終了しようとすると null が返る
			const result = await stopWorkLog(created.id, new Date());
			expect(result).toBeNull();
		});

		it('存在しないIDでは更新できない', async () => {
			const fakeId = randomUUID();
			const result = await stopWorkLog(fakeId, new Date());
			expect(result).toBeNull();
		});
	});

	describe('統合テスト: 作業開始→終了', () => {
		it('正常フロー: 開始 → 取得 → 終了 → 取得でnull', async () => {
			// 1. 作業開始
			const startedAt = new Date();
			const created = await createWorkLog(testUserId, startedAt);
			expect(created.isActive()).toBe(true);

			// 2. 進行中の作業を取得
			const active = await getActiveWorkLog(testUserId);
			expect(active).toBeInstanceOf(WorkLog);
			expect(active?.id).toBe(created.id);

			// 3. 作業終了
			const endedAt = new Date(startedAt.getTime() + 5000); // 5秒後
			const stopped = await stopWorkLog(created.id, endedAt);
			expect(stopped?.isActive()).toBe(false);
			expect(stopped?.getDuration()).toBe(5);

			// 4. 進行中の作業を取得 → null
			const noActive = await getActiveWorkLog(testUserId);
			expect(noActive).toBeNull();
		});
	});

	describe('updated_at トリガー動作確認', () => {
		it('レコード更新時に updated_at が自動更新される', async () => {
			const startedAt = new Date();

			// 作業を開始
			const created = await createWorkLog(testUserId, startedAt);
			const originalUpdatedAt = created.updatedAt;

			// 少し待機
			await new Promise((resolve) => setTimeout(resolve, 100));

			// 作業を終了（更新）
			const endedAt = new Date();
			const updated = await stopWorkLog(created.id, endedAt);

			// updated_at が更新されていることを確認
			expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
		});
	});
});
