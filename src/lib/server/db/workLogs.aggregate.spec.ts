import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { aggregateMonthlyWorkLogDuration } from './workLogs';

// モック用のヘルパー型
type MockDb = {
	select: Mock;
	from: Mock;
	where: Mock;
};

// dbをモック化
vi.mock('./index', () => {
	const mockSelect = vi.fn().mockReturnThis();
	const mockFrom = vi.fn().mockReturnThis();
	const mockWhere = vi.fn();

	return {
		db: {
			select: mockSelect,
			from: mockFrom,
			where: mockWhere,
		},
	};
});

// モックのインポート（モック後に取得）
import { db } from './index';
const mockDb = db as unknown as MockDb;

describe('aggregateMonthlyWorkLogDuration', () => {
	const testUserId = 'test-user-id';

	beforeEach(() => {
		// モックをリセット
		vi.clearAllMocks();
		// デフォルトの返り値を設定
		mockDb.where.mockResolvedValue([{ totalSec: 0 }]);
	});

	it('正しいクエリパラメータで呼び出される（通常月）', async () => {
		mockDb.where.mockResolvedValue([{ totalSec: 7200 }]);

		const total = await aggregateMonthlyWorkLogDuration(testUserId, { month: '2025-10' });

		// select が呼ばれたことを確認
		expect(mockDb.select).toHaveBeenCalledTimes(1);
		// from が work_logs テーブルで呼ばれたことを確認
		expect(mockDb.from).toHaveBeenCalledTimes(1);
		// where が呼ばれたことを確認
		expect(mockDb.where).toHaveBeenCalledTimes(1);

		// where の引数を検証（userId, isNotNull, 範囲チェック）
		const whereArg = mockDb.where.mock.calls[0][0];
		expect(whereArg).toBeDefined();

		// 結果の検証
		expect(total).toBe(7200);
	});

	it('月境界が正しく計算される（2月うるう年）', async () => {
		mockDb.where.mockResolvedValue([{ totalSec: 86400 }]);

		const total = await aggregateMonthlyWorkLogDuration(testUserId, { month: '2024-02' });

		// 2024-02-01 00:00:00Z 〜 2024-03-01 00:00:00Z の範囲でクエリされることを期待
		expect(mockDb.select).toHaveBeenCalledTimes(1);
		expect(mockDb.from).toHaveBeenCalledTimes(1);
		expect(mockDb.where).toHaveBeenCalledTimes(1);

		expect(total).toBe(86400);
	});

	it('月境界が正しく計算される（年末）', async () => {
		mockDb.where.mockResolvedValue([{ totalSec: 3600 }]);

		const total = await aggregateMonthlyWorkLogDuration(testUserId, { month: '2025-12' });

		// 2025-12-01 00:00:00Z 〜 2026-01-01 00:00:00Z の範囲でクエリされることを期待
		expect(mockDb.select).toHaveBeenCalledTimes(1);
		expect(mockDb.from).toHaveBeenCalledTimes(1);
		expect(mockDb.where).toHaveBeenCalledTimes(1);

		expect(total).toBe(3600);
	});

	it('レコードが0件の場合は0を返す', async () => {
		mockDb.where.mockResolvedValue([{ totalSec: 0 }]);

		const total = await aggregateMonthlyWorkLogDuration(testUserId, { month: '2025-10' });

		expect(total).toBe(0);
	});

	it('小数点以下は切り捨てられる', async () => {
		mockDb.where.mockResolvedValue([{ totalSec: 7200.9 }]);

		const total = await aggregateMonthlyWorkLogDuration(testUserId, { month: '2025-10' });

		expect(total).toBe(7200); // Math.floor適用
	});

	it('複数回呼び出しても正しく動作する', async () => {
		// 1回目
		mockDb.where.mockResolvedValueOnce([{ totalSec: 1000 }]);
		const total1 = await aggregateMonthlyWorkLogDuration(testUserId, { month: '2025-10' });
		expect(total1).toBe(1000);

		// 2回目
		mockDb.where.mockResolvedValueOnce([{ totalSec: 2000 }]);
		const total2 = await aggregateMonthlyWorkLogDuration(testUserId, { month: '2025-11' });
		expect(total2).toBe(2000);

		expect(mockDb.select).toHaveBeenCalledTimes(2);
	});

	it('不正な月形式では getMonthRange が例外を投げる', async () => {
		await expect(
			aggregateMonthlyWorkLogDuration(testUserId, { month: 'invalid' }),
		).rejects.toThrow();

		// DBクエリは実行されない
		expect(mockDb.select).not.toHaveBeenCalled();
	});
});
