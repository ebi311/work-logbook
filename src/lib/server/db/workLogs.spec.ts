import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './index';
import { workLogs } from './schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

/**
 * F-001: 作業記録 DB関数のテスト
 * 
 * テストケース:
 * 1. 正常系: 作業開始→終了
 * 2. 異常系: 二重開始 → 409 CONFLICT
 * 3. 異常系: 進行中なしで停止 → 404 NOT_FOUND
 */

describe('WorkLogs DB Functions', () => {
	const testUserId = randomUUID(); // 有効なUUID v4を生成

	beforeEach(async () => {
		// テスト前に対象ユーザーの作業記録をクリア
		await db.delete(workLogs).where(eq(workLogs.userId, testUserId));
	});

	describe('getActiveWorkLog', () => {
		it('進行中の作業がない場合、nullを返す', async () => {
			// このテストは getActiveWorkLog 関数実装後に動作確認
			// 現時点では関数未実装のため、直接DBクエリで確認
			const active = await db.query.workLogs.findFirst({
				where: (workLogs, { eq, and, isNull }) =>
					and(eq(workLogs.userId, testUserId), isNull(workLogs.endedAt))
			});

			expect(active).toBeUndefined();
		});

		it('進行中の作業がある場合、レコードを返す', async () => {
			// 進行中の作業を作成
			const serverNow = new Date().toISOString();
			await db.insert(workLogs).values({
				userId: testUserId,
				startedAt: serverNow,
				endedAt: null
			}).returning();

			// 検索
			const active = await db.query.workLogs.findFirst({
				where: (workLogs, { eq, and, isNull }) =>
					and(eq(workLogs.userId, testUserId), isNull(workLogs.endedAt))
			});

			expect(active).toBeDefined();
			expect(active?.userId).toBe(testUserId);
			expect(active?.endedAt).toBeNull();
		});
	});

	describe('createWorkLog', () => {
		it('新規作業を開始できる', async () => {
			const serverNow = new Date().toISOString();
			
			const [workLog] = await db.insert(workLogs).values({
				userId: testUserId,
				startedAt: serverNow,
				endedAt: null
			}).returning();

			expect(workLog).toBeDefined();
			expect(workLog.userId).toBe(testUserId);
			// タイムスタンプは文字列として保存され、形式が異なる可能性があるため存在確認のみ
			expect(workLog.startedAt).toBeDefined();
			expect(new Date(workLog.startedAt).getTime()).toBeCloseTo(new Date(serverNow).getTime(), -2);
			expect(workLog.endedAt).toBeNull();
		});

		it('既に進行中の作業がある場合、部分ユニーク制約違反でエラー', async () => {
			const serverNow = new Date().toISOString();

			// 1つ目の作業を開始
			await db.insert(workLogs).values({
				userId: testUserId,
				startedAt: serverNow,
				endedAt: null
			});

			// 2つ目の作業を開始しようとすると制約違反
			await expect(async () => {
				await db.insert(workLogs).values({
					userId: testUserId,
					startedAt: new Date().toISOString(),
					endedAt: null
				});
			}).rejects.toThrow();
		});
	});

	describe('stopWorkLog', () => {
		it('進行中の作業を終了できる', async () => {
			const startedAt = new Date().toISOString();
			
			// 作業を開始
			const [created] = await db.insert(workLogs).values({
				userId: testUserId,
				startedAt,
				endedAt: null
			}).returning();

			// 作業を終了
			const endedAt = new Date().toISOString();
			const [updated] = await db.update(workLogs)
				.set({ endedAt })
				.where(eq(workLogs.id, created.id))
				.returning();

			// タイムスタンプは存在確認と時刻の妥当性チェック
			expect(updated.endedAt).toBeDefined();
			expect(updated.startedAt).toBeDefined();
			expect(new Date(updated.endedAt!).getTime()).toBeGreaterThanOrEqual(new Date(updated.startedAt).getTime());

			// 経過時間の計算確認
			const duration = new Date(updated.endedAt!).getTime() - new Date(updated.startedAt).getTime();
			expect(duration).toBeGreaterThanOrEqual(0);
		});

		it('進行中の作業がない場合はエラー（404想定）', async () => {
			// 進行中の作業がない状態で終了を試みる
			const result = await db.update(workLogs)
				.set({ endedAt: new Date().toISOString() })
				.where(eq(workLogs.userId, testUserId))
				.returning();

			// 更新対象がないため空配列
			expect(result).toHaveLength(0);
		});
	});

	describe('updated_at トリガー動作確認', () => {
		it('レコード更新時に updated_at が自動更新される', async () => {
			const startedAt = new Date().toISOString();
			
			// 作業を開始
			const [created] = await db.insert(workLogs).values({
				userId: testUserId,
				startedAt,
				endedAt: null
			}).returning();

			const originalUpdatedAt = created.updatedAt;

			// 少し待機
			await new Promise(resolve => setTimeout(resolve, 100));

			// 作業を終了（更新）
			const endedAt = new Date().toISOString();
			const [updated] = await db.update(workLogs)
				.set({ endedAt })
				.where(eq(workLogs.id, created.id))
				.returning();

			// updated_at が更新されていることを確認
			// トリガーが動作していれば originalUpdatedAt と異なるはず
			expect(updated.updatedAt).not.toBe(originalUpdatedAt);
		});
	});
});
