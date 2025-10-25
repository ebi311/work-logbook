import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { listWorkLogs } from './workLogs';

// モック用のヘルパー型
type MockDb = {
	select: Mock;
	from: Mock;
	where: Mock;
	orderBy: Mock;
	limit: Mock;
	offset: Mock;
};

// dbをモック化
vi.mock('./index', () => {
	const mockSelect = vi.fn().mockReturnThis();
	const mockFrom = vi.fn().mockReturnThis();
	const mockWhere = vi.fn().mockReturnThis();
	const mockOrderBy = vi.fn().mockReturnThis();
	const mockLimit = vi.fn().mockReturnThis();
	const mockOffset = vi.fn();

	return {
		db: {
			select: mockSelect,
			from: mockFrom,
			where: mockWhere,
			orderBy: mockOrderBy,
			limit: mockLimit,
			offset: mockOffset
		}
	};
});

// モックのインポート（モック後に取得）
import { db } from './index';
const mockDb = db as unknown as MockDb;

describe('listWorkLogs', () => {
	const testUserId = 'test-user-id';

	beforeEach(() => {
		// モックをリセット
		vi.clearAllMocks();
		// デフォルトの返り値を設定（空配列）
		mockDb.offset.mockResolvedValue([]);
	});

	it('基本的な一覧取得（フィルタなし、デフォルトページング）', async () => {
		const mockData = [
			{
				id: 'log-1',
				startedAt: new Date('2025-10-25T10:00:00Z'),
				endedAt: new Date('2025-10-25T12:00:00Z'),
				userId: testUserId
			}
		];
		mockDb.offset.mockResolvedValue(mockData);

		const result = await listWorkLogs(testUserId, { limit: 10, offset: 0 });

		// クエリが正しく呼ばれたことを確認
		expect(mockDb.select).toHaveBeenCalledTimes(1);
		expect(mockDb.from).toHaveBeenCalledTimes(1);
		expect(mockDb.where).toHaveBeenCalledTimes(1);
		expect(mockDb.orderBy).toHaveBeenCalledTimes(1);
		expect(mockDb.limit).toHaveBeenCalledWith(11); // limit+1
		expect(mockDb.offset).toHaveBeenCalledWith(0);

		// 結果の検証
		expect(result.items).toEqual(mockData);
		expect(result.hasNext).toBe(false);
	});

	it('limit+1 で hasNext を判定（次ページあり）', async () => {
		// limit=10の場合、11件取得して10件返す
		const mockData = Array.from({ length: 11 }, (_, i) => ({
			id: `log-${i}`,
			startedAt: new Date(`2025-10-${25 - i}T10:00:00Z`),
			endedAt: new Date(`2025-10-${25 - i}T12:00:00Z`),
			userId: testUserId
		}));
		mockDb.offset.mockResolvedValue(mockData);

		const result = await listWorkLogs(testUserId, { limit: 10, offset: 0 });

		// limit+1でクエリ
		expect(mockDb.limit).toHaveBeenCalledWith(11);

		// 結果は10件、hasNextはtrue
		expect(result.items).toHaveLength(10);
		expect(result.hasNext).toBe(true);
	});

	it('limit+1 で hasNext を判定（次ページなし）', async () => {
		// limit=10の場合、10件以下なら次ページなし
		const mockData = Array.from({ length: 5 }, (_, i) => ({
			id: `log-${i}`,
			startedAt: new Date(`2025-10-${25 - i}T10:00:00Z`),
			endedAt: new Date(`2025-10-${25 - i}T12:00:00Z`),
			userId: testUserId
		}));
		mockDb.offset.mockResolvedValue(mockData);

		const result = await listWorkLogs(testUserId, { limit: 10, offset: 0 });

		// 結果は5件、hasNextはfalse
		expect(result.items).toHaveLength(5);
		expect(result.hasNext).toBe(false);
	});

	it('startedAt desc で並び順が正しい', async () => {
		const mockData = [
			{
				id: 'log-1',
				startedAt: new Date('2025-10-25T10:00:00Z'),
				endedAt: null,
				userId: testUserId
			},
			{
				id: 'log-2',
				startedAt: new Date('2025-10-24T10:00:00Z'),
				endedAt: new Date('2025-10-24T12:00:00Z'),
				userId: testUserId
			}
		];
		mockDb.offset.mockResolvedValue(mockData);

		const result = await listWorkLogs(testUserId, { limit: 10, offset: 0 });

		// orderBy が呼ばれたことを確認（引数の詳細検証は実装依存）
		expect(mockDb.orderBy).toHaveBeenCalledTimes(1);
		expect(result.items).toEqual(mockData);
	});

	it('from/to 範囲フィルタを適用', async () => {
		const from = new Date('2025-10-01T00:00:00Z');
		const to = new Date('2025-10-31T23:59:59Z');

		mockDb.offset.mockResolvedValue([]);

		await listWorkLogs(testUserId, { limit: 10, offset: 0, from, to });

		// where が呼ばれたことを確認（範囲条件含む）
		expect(mockDb.where).toHaveBeenCalledTimes(1);
	});

	it('offset を適用してページネーション', async () => {
		mockDb.offset.mockResolvedValue([]);

		await listWorkLogs(testUserId, { limit: 10, offset: 20 });

		// offset(20) が呼ばれたことを確認
		expect(mockDb.offset).toHaveBeenCalledWith(20);
	});

	it('進行中(endedAt=null)のログも含む', async () => {
		const mockData = [
			{
				id: 'log-1',
				startedAt: new Date('2025-10-25T10:00:00Z'),
				endedAt: null, // 進行中
				userId: testUserId
			}
		];
		mockDb.offset.mockResolvedValue(mockData);

		const result = await listWorkLogs(testUserId, { limit: 10, offset: 0 });

		// 進行中のログも返される
		expect(result.items).toHaveLength(1);
		expect(result.items[0].endedAt).toBeNull();
	});

	it('レコードが0件の場合は空配列を返す', async () => {
		mockDb.offset.mockResolvedValue([]);

		const result = await listWorkLogs(testUserId, { limit: 10, offset: 0 });

		expect(result.items).toEqual([]);
		expect(result.hasNext).toBe(false);
	});

	it('limit が範囲外（小さすぎ）の場合はエラー', async () => {
		await expect(listWorkLogs(testUserId, { limit: 5, offset: 0 })).rejects.toThrow();
	});

	it('limit が範囲外（大きすぎ）の場合はエラー', async () => {
		await expect(listWorkLogs(testUserId, { limit: 150, offset: 0 })).rejects.toThrow();
	});

	it('offset が負の場合はエラー', async () => {
		await expect(listWorkLogs(testUserId, { limit: 10, offset: -1 })).rejects.toThrow();
	});

	it('from > to の場合はエラー', async () => {
		const from = new Date('2025-10-31T00:00:00Z');
		const to = new Date('2025-10-01T00:00:00Z');

		await expect(listWorkLogs(testUserId, { limit: 10, offset: 0, from, to })).rejects.toThrow(
			'from must be less than or equal to to'
		);
	});

	it('limit=10, offset=0 は有効', async () => {
		mockDb.offset.mockResolvedValue([]);

		const result = await listWorkLogs(testUserId, { limit: 10, offset: 0 });

		expect(result.items).toEqual([]);
		expect(result.hasNext).toBe(false);
	});

	it('limit=100, offset=0 は有効', async () => {
		mockDb.offset.mockResolvedValue([]);

		const result = await listWorkLogs(testUserId, { limit: 100, offset: 0 });

		expect(result.items).toEqual([]);
		expect(result.hasNext).toBe(false);
	});

	it('from = to は有効', async () => {
		const sameDate = new Date('2025-10-15T00:00:00Z');
		mockDb.offset.mockResolvedValue([]);

		const result = await listWorkLogs(testUserId, { limit: 10, offset: 0, from: sameDate, to: sameDate });

		expect(result.items).toEqual([]);
		expect(result.hasNext).toBe(false);
	});
});
