import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { listWorkLogs } from './workLogs';

// モック用のヘルパー型
type MockDb = {
	select: Mock;
	from: Mock;
	innerJoin: Mock;
	where: Mock;
	groupBy: Mock;
	having: Mock;
	orderBy: Mock;
	limit: Mock;
	offset: Mock;
};

// dbをモック化
vi.mock('./index', () => {
	const mockSelect = vi.fn().mockReturnThis();
	const mockFrom = vi.fn().mockReturnThis();
	const mockInnerJoin = vi.fn().mockReturnThis();
	const mockWhere = vi.fn().mockReturnThis();
	const mockGroupBy = vi.fn().mockReturnThis();
	const mockHaving = vi.fn().mockReturnThis();
	const mockOrderBy = vi.fn().mockReturnThis();
	const mockLimit = vi.fn().mockReturnThis();
	const mockOffset = vi.fn();

	return {
		db: {
			select: mockSelect,
			from: mockFrom,
			innerJoin: mockInnerJoin,
			where: mockWhere,
			groupBy: mockGroupBy,
			having: mockHaving,
			orderBy: mockOrderBy,
			limit: mockLimit,
			offset: mockOffset,
			query: {
				workLogTags: {
					findMany: vi.fn(),
				},
			},
		},
	};
});

const mockedReturnTags: DbWorkLogTag[] = [
	{
		id: 1,
		workLogId: 'log-1',
		tag: 'backend',
		createdAt: new Date(),
	},
];

// モックのインポート（モック後に取得）
import { db } from './index';
import type { DbWorkLogTag } from './schema';
const mockDb = db as unknown as MockDb;

describe('listWorkLogs - タグフィルタ', () => {
	const testUserId = 'test-user-id';

	beforeEach(() => {
		// モックをリセット
		vi.clearAllMocks();
		// デフォルトの返り値を設定（空配列）
		mockDb.offset.mockResolvedValue([]);
		// タグのモックをデフォルトで空配列に設定
		vi.mocked(db.query.workLogTags.findMany).mockResolvedValue([]);
	});

	it('タグフィルタなし: 通常のクエリ（JOIN なし）', async () => {
		const mockData = [
			{
				id: 'log-1',
				startedAt: new Date('2025-10-25T10:00:00Z'),
				endedAt: new Date('2025-10-25T12:00:00Z'),
				userId: testUserId,
			},
		];
		mockDb.offset.mockResolvedValue(mockData);
		vi.mocked(db.query.workLogTags.findMany).mockResolvedValue([]);

		const result = await listWorkLogs(testUserId, { limit: 10, offset: 0 });

		// JOIN が呼ばれないことを確認
		expect(mockDb.innerJoin).not.toHaveBeenCalled();
		expect(mockDb.groupBy).not.toHaveBeenCalled();
		expect(mockDb.having).not.toHaveBeenCalled();

		// 通常の select/from/where/orderBy/limit/offset が呼ばれる
		expect(mockDb.select).toHaveBeenCalledTimes(2);
		expect(mockDb.from).toHaveBeenCalledTimes(2);
		expect(mockDb.where).toHaveBeenCalledTimes(2);
		expect(mockDb.orderBy).toHaveBeenCalledTimes(2);
		expect(mockDb.limit).toHaveBeenCalledWith(11);
		expect(mockDb.offset).toHaveBeenCalledWith(0);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].id).toBe('log-1');
	});

	it('タグフィルタあり（1つ）: 指定タグを含む作業記録を取得', async () => {
		const mockData = [
			{
				workLog: {
					id: 'log-1',
					startedAt: new Date('2025-10-25T10:00:00Z'),
					endedAt: new Date('2025-10-25T12:00:00Z'),
					userId: testUserId,
					description: '',
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			},
		];
		mockDb.offset.mockResolvedValueOnce(mockData).mockResolvedValueOnce(mockedReturnTags);
		vi.mocked(db.query.workLogTags.findMany).mockResolvedValue([
			{ id: 1, workLogId: 'log-1', tag: 'backend', createdAt: new Date() },
		]);

		const result = await listWorkLogs(testUserId, { limit: 10, offset: 0, tags: ['backend'] });

		// JOIN/groupBy/having が呼ばれることを確認
		expect(mockDb.select).toHaveBeenCalledTimes(2);
		expect(mockDb.from).toHaveBeenCalledTimes(2);
		expect(mockDb.innerJoin).toHaveBeenCalledTimes(1);
		expect(mockDb.where).toHaveBeenCalledTimes(2);
		expect(mockDb.groupBy).toHaveBeenCalledTimes(1);
		expect(mockDb.having).toHaveBeenCalledTimes(1);
		expect(mockDb.orderBy).toHaveBeenCalledTimes(2);
		expect(mockDb.limit).toHaveBeenCalledWith(11);
		expect(mockDb.offset).toHaveBeenCalledWith(0);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].id).toBe('log-1');
		expect(result.items[0].tags).toEqual(['backend']);
	});

	it('タグフィルタあり（複数）: AND検索で指定タグをすべて含む作業記録を取得', async () => {
		const mockData = [
			{
				workLog: {
					id: 'log-1',
					startedAt: new Date('2025-10-25T10:00:00Z'),
					endedAt: new Date('2025-10-25T12:00:00Z'),
					userId: testUserId,
					description: '',
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			},
		];
		mockDb.offset.mockResolvedValueOnce(mockData).mockResolvedValueOnce([
			...mockedReturnTags,
			{
				id: 2,
				workLogId: 'log-1',
				tag: 'api',
				createdAt: new Date(),
			},
		]);
		vi.mocked(db.query.workLogTags.findMany).mockResolvedValue([
			{ id: 1, workLogId: 'log-1', tag: 'backend', createdAt: new Date() },
			{ id: 2, workLogId: 'log-1', tag: 'api', createdAt: new Date() },
		]);

		const result = await listWorkLogs(testUserId, {
			limit: 10,
			offset: 0,
			tags: ['backend', 'api'],
		});

		// JOIN/groupBy/having が呼ばれることを確認
		expect(mockDb.innerJoin).toHaveBeenCalledTimes(1);
		expect(mockDb.groupBy).toHaveBeenCalledTimes(1);
		expect(mockDb.having).toHaveBeenCalledTimes(1);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].id).toBe('log-1');
		expect(result.items[0].tags).toEqual(['backend', 'api']);
	});

	it('タグフィルタあり（空配列）: 通常のクエリ（JOIN なし）', async () => {
		const mockData = [
			{
				id: 'log-1',
				startedAt: new Date('2025-10-25T10:00:00Z'),
				endedAt: new Date('2025-10-25T12:00:00Z'),
				userId: testUserId,
			},
		];
		mockDb.offset.mockResolvedValueOnce(mockData).mockResolvedValueOnce(mockedReturnTags);

		const result = await listWorkLogs(testUserId, { limit: 10, offset: 0, tags: [] });

		// 空配列の場合、JOIN は実行されない
		expect(mockDb.innerJoin).not.toHaveBeenCalled();
		expect(mockDb.groupBy).not.toHaveBeenCalled();
		expect(mockDb.having).not.toHaveBeenCalled();

		expect(result.items).toHaveLength(1);
	});
});
