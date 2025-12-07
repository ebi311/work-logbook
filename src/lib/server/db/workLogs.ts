import { db } from './index';
import { workLogs, workLogTags, type DbWorkLog } from './schema';
import { eq, and, isNull, sql, isNotNull, gte, lte, desc, like, inArray } from 'drizzle-orm';
import { WorkLog } from '../../../models/workLog';
import { getMonthRange } from '../../utils/timezone';
import { z } from 'zod';
import dayjs from 'dayjs';

/**
 * ListWorkLogs の引数オプションスキーマ
 */
const ListWorkLogsOptionsSchema = z
	.object({
		limit: z.number().int().min(10).max(100),
		offset: z.number().int().min(0),
		from: z.date().optional(),
		to: z.date().optional(),
		tags: z.array(z.string()).optional(),
	})
	.refine(
		(data) => {
			if (data.from && data.to) {
				return data.from <= data.to;
			}
			return true;
		},
		{
			message: 'from must be less than or equal to to',
		},
	);

/**
 * DB → ドメイン変換
 * @param dbWorkLog - DB から取得した作業記録
 * @returns ドメインモデルの WorkLog インスタンス
 * @throws ZodError - バリデーション失敗時
 */
export const toWorkLog = (dbWorkLog: DbWorkLog): WorkLog => {
	return WorkLog.from(dbWorkLog);
};

/**
 * 進行中の作業を取得
 * @param userId - ユーザーID
 * @returns 進行中の作業、または null
 */
export const getActiveWorkLog = async (userId: string): Promise<WorkLog | null> => {
	const perfStart = Date.now();

	// 作業ログとタグを1回のクエリで取得
	const results = await db
		.select({
			workLog: workLogs,
			tag: workLogTags.tag,
		})
		.from(workLogs)
		.leftJoin(workLogTags, eq(workLogTags.workLogId, workLogs.id))
		.where(and(eq(workLogs.userId, userId), isNull(workLogs.endedAt)))
		.orderBy(workLogTags.createdAt);

	console.log('[PERF] getActiveWorkLog - DB query completed', {
		duration: Date.now() - perfStart,
		resultCount: results.length,
	});

	if (results.length === 0) {
		return null;
	}

	// 最初の行から作業ログ情報を取得
	const dbWorkLog = results[0].workLog;

	// タグを集約
	const tags = results.map((r) => r.tag).filter((tag): tag is string => tag !== null);

	console.log('[PERF] getActiveWorkLog - data aggregation completed', {
		duration: Date.now() - perfStart,
		tagCount: tags.length,
	});

	return WorkLog.from({ ...dbWorkLog, tags });
};

/**
 * 作業を開始
 * @param userId - ユーザーID
 * @param startedAt - 作業開始日時
 * @param description - 作業内容
 * @returns 作成された作業記録
 * @throws Error - 進行中の作業が既に存在する場合（部分ユニーク制約違反）
 */
export const createWorkLog = async (
	userId: string,
	startedAt: Date,
	description: string,
): Promise<WorkLog> => {
	const [dbWorkLog] = await db
		.insert(workLogs)
		.values({
			userId,
			startedAt,
			endedAt: null,
			description,
		})
		.returning();

	return toWorkLog(dbWorkLog);
};

/**
 * 作業を終了
 * @param workLogId - 作業記録ID
 * @param endedAt - 作業終了日時
 * @param description - 作業内容
 * @returns 更新された作業記録、またはnull（レコードが見つからない場合）
 */
export const stopWorkLog = async (
	workLogId: string,
	endedAt: Date,
	description: string,
): Promise<WorkLog | null> => {
	const [dbWorkLog] = await db
		.update(workLogs)
		.set({ endedAt, description })
		.where(and(eq(workLogs.id, workLogId), isNull(workLogs.endedAt)))
		.returning();

	if (!dbWorkLog) {
		return null;
	}

	return toWorkLog(dbWorkLog);
};

/**
 * 月次作業時間の合計を集計(境界クリップ、進行中除外)
 * @param userId - ユーザーID
 * @param options - { month: YYYY-MM, timezone: タイムゾーン }
 * @returns 月次合計作業秒数
 */
export const aggregateMonthlyWorkLogDuration = async (
	userId: string,
	{ month, timezone }: { month: string; timezone: string },
): Promise<number> => {
	const { from, to } = getMonthRange(month, timezone);

	// SQLで境界クリップを実行: GREATEST/LEASTで範囲内の寄与時間を算出
	// contribSec = EXTRACT(EPOCH FROM (LEAST(ended_at, to) - GREATEST(started_at, from)))
	const result = await db
		.select({
			totalSec: sql<number>`COALESCE(SUM(
				EXTRACT(EPOCH FROM (
					LEAST(${workLogs.endedAt}, ${to}::timestamptz)
					- GREATEST(${workLogs.startedAt}, ${from}::timestamptz)
				))
			), 0)`,
		})
		.from(workLogs)
		.where(
			and(
				eq(workLogs.userId, userId),
				isNotNull(workLogs.endedAt),
				sql`${workLogs.startedAt} < ${to}::timestamptz`,
				sql`${workLogs.endedAt} > ${from}::timestamptz`,
			),
		);

	return Math.floor(result[0].totalSec);
};

/**
 * 指定日の作業時間合計を集計(境界クリップ、進行中除外)
 * @param userId - ユーザーID
 * @param options - { fromDate: ISO8601形式のタイムゾーン付き日付開始時刻 }
 * @returns 日次合計作業秒数
 */
export const aggregateDailyWorkLogDuration = async (
	userId: string,
	{ fromDate }: { fromDate: string },
): Promise<number> => {
	// ISO8601形式のタイムゾーン付き日付開始時刻から24時間後を計算
	const from = dayjs(fromDate);
	const to = from.add(24, 'hour');

	// SQLで境界クリップを実行
	const result = await db
		.select({
			totalSec: sql<number>`COALESCE(SUM(
				EXTRACT(EPOCH FROM (
					LEAST(${workLogs.endedAt}, ${to.toISOString()}::timestamptz)
					- GREATEST(${workLogs.startedAt}, ${from.toISOString()}::timestamptz)
				))
			), 0)`,
		})
		.from(workLogs)
		.where(
			and(
				eq(workLogs.userId, userId),
				isNotNull(workLogs.endedAt),
				sql`${workLogs.startedAt} < ${to.toISOString()}::timestamptz`,
				sql`${workLogs.endedAt} > ${from.toISOString()}::timestamptz`,
			),
		);

	return Math.floor(result[0].totalSec);
};

/**
 * 作業ログのタグを一括取得してマップ化
 * @param workLogIds - 作業ログID配列
 * @returns 作業ログIDをキー、タグ配列を値とするMap
 */
const fetchAndGroupTags = async (workLogIds: string[]): Promise<Map<string, string[]>> => {
	if (workLogIds.length === 0) {
		return new Map();
	}

	const tagsQueryStart = Date.now();
	const allTags = await db
		.select()
		.from(workLogTags)
		.where(inArray(workLogTags.workLogId, workLogIds))
		.orderBy(workLogTags.createdAt)
		.offset(0);

	console.log('[PERF] fetchAndGroupTags - tags query completed', {
		duration: Date.now() - tagsQueryStart,
		tagCount: allTags.length,
	});

	// 作業ログIDごとにタグをグループ化
	const tagsByWorkLogId = new Map<string, string[]>();
	for (const tagRow of allTags) {
		const existing = tagsByWorkLogId.get(tagRow.workLogId) || [];
		existing.push(tagRow.tag);
		tagsByWorkLogId.set(tagRow.workLogId, existing);
	}

	return tagsByWorkLogId;
};

/**
 * タグフィルタなしで作業ログを取得
 * @param userId - ユーザーID
 * @param conditions - WHERE条件の配列
 * @param limit - 取得件数
 * @param offset - オフセット
 * @returns 作業ログ配列と次ページの有無
 */
const listWorkLogsWithoutTagFilter = async (
	userId: string,
	conditions: ReturnType<typeof eq>[],
	limit: number,
	offset: number,
): Promise<{ items: Array<DbWorkLog & { tags: string[] }>; hasNext: boolean }> => {
	const queryStart = Date.now();
	const results = await db
		.select()
		.from(workLogs)
		.where(and(...conditions))
		.orderBy(desc(workLogs.startedAt))
		.limit(limit + 1)
		.offset(offset);

	console.log('[PERF] listWorkLogsWithoutTagFilter - main query completed', {
		duration: Date.now() - queryStart,
		resultCount: results.length,
	});

	// limit+1 件取得できた場合は次ページあり
	const hasNext = results.length > limit;
	const workLogsSlice = hasNext ? results.slice(0, limit) : results;

	if (workLogsSlice.length === 0) {
		return { items: [], hasNext: false };
	}

	// タグを一括取得
	const workLogIds = workLogsSlice.map((w) => w.id);
	const tagsByWorkLogId = await fetchAndGroupTags(workLogIds);

	const items = workLogsSlice.map((workLog) => ({
		...workLog,
		tags: tagsByWorkLogId.get(workLog.id) || [],
	}));

	return { items, hasNext };
};

/**
 * タグフィルタありで作業ログを取得(AND検索)
 * @param userId - ユーザーID
 * @param conditions - WHERE条件の配列
 * @param tags - フィルタタグ配列
 * @param limit - 取得件数
 * @param offset - オフセット
 * @returns 作業ログ配列と次ページの有無
 */
const listWorkLogsWithTagFilter = async (
	userId: string,
	conditions: ReturnType<typeof eq>[],
	tags: string[],
	limit: number,
	offset: number,
): Promise<{ items: Array<DbWorkLog & { tags: string[] }>; hasNext: boolean }> => {
	const queryStart = Date.now();
	const results = await db
		.select({
			workLog: workLogs,
		})
		.from(workLogs)
		.innerJoin(workLogTags, eq(workLogTags.workLogId, workLogs.id))
		.where(and(...conditions, inArray(workLogTags.tag, tags)))
		.groupBy(workLogs.id)
		.having(sql`COUNT(DISTINCT ${workLogTags.tag}) = ${tags.length}`)
		.orderBy(desc(workLogs.startedAt))
		.limit(limit + 1)
		.offset(offset);

	console.log('[PERF] listWorkLogsWithTagFilter - main query completed', {
		duration: Date.now() - queryStart,
		resultCount: results.length,
	});

	// limit+1 件取得できた場合は次ページあり
	const hasNext = results.length > limit;
	const workLogsSlice = hasNext ? results.slice(0, limit) : results;

	if (workLogsSlice.length === 0) {
		return { items: [], hasNext: false };
	}

	// タグを一括取得
	const workLogIds = workLogsSlice.map((r) => r.workLog.id);
	const tagsByWorkLogId = await fetchAndGroupTags(workLogIds);

	const items = workLogsSlice.map((result) => ({
		...result.workLog,
		tags: tagsByWorkLogId.get(result.workLog.id) || [],
	}));

	return { items, hasNext };
};

/**
 * 作業ログを一覧取得(降順・ページング)
 * @param userId - ユーザーID
 * @param options - { limit: 件数(10〜100), offset: オフセット(0以上), from?: 開始日時, to?: 終了日時, tags?: タグ配列 }
 * @returns { items: 作業ログ配列, hasNext: 次ページの有無 }
 * @throws ZodError - バリデーション失敗時(limit/offset範囲外、from > to)
 */
export const listWorkLogs = async (
	userId: string,
	options: {
		limit: number;
		offset: number;
		from?: Date;
		to?: Date;
		tags?: string[];
	},
): Promise<{
	items: Array<DbWorkLog & { tags: string[] }>;
	hasNext: boolean;
}> => {
	const perfStart = Date.now();

	// Zodでバリデーション
	const validatedOptions = ListWorkLogsOptionsSchema.parse(options);
	const { limit, offset, from, to, tags } = validatedOptions;

	// 基本条件
	const conditions = [eq(workLogs.userId, userId)];

	// from/to 範囲フィルタ(指定がある場合)
	if (from) {
		conditions.push(gte(workLogs.startedAt, from));
	}
	if (to) {
		conditions.push(lte(workLogs.startedAt, to));
	}

	// タグフィルタの有無で処理を分岐
	let result;
	if (!tags || tags.length === 0) {
		result = await listWorkLogsWithoutTagFilter(userId, conditions, limit, offset);
	} else {
		result = await listWorkLogsWithTagFilter(userId, conditions, tags, limit, offset);
	}

	console.log('[PERF] listWorkLogs - total duration', {
		duration: Date.now() - perfStart,
	});

	return result;
};

/**
 * 作業記録をIDで取得
 * F-004: 編集機能のために追加
 * @param id - 作業記録ID
 * @returns 作業記録、または null
 */
export const getWorkLogById = async (id: string): Promise<WorkLog | null> => {
	const dbWorkLog = await db.query.workLogs.findFirst({
		where: (workLogs, { eq }) => eq(workLogs.id, id),
	});

	if (!dbWorkLog) {
		return null;
	}

	// タグを取得
	const tags = await getWorkLogTags(dbWorkLog.id);

	return WorkLog.from({ ...dbWorkLog, tags });
};

/**
 * 作業記録を更新
 * F-004: 編集機能のために追加
 * F-003.1: タグの更新をサポート
 * @param id - 作業記録ID
 * @param updates - 更新するフィールド
 * @returns 更新後の作業記録、または null（見つからない場合）
 */
export const updateWorkLog = async (
	id: string,
	updates: {
		startedAt?: Date;
		endedAt?: Date | null;
		description?: string;
		tags?: string[];
	},
): Promise<WorkLog | null> => {
	const now = new Date();

	// タグを別で処理
	const { tags, ...workLogUpdates } = updates;

	const result = await db
		.update(workLogs)
		.set({
			...workLogUpdates,
			updatedAt: now,
		})
		.where(eq(workLogs.id, id))
		.returning();

	if (result.length === 0) {
		return null;
	}

	// タグが指定されている場合は保存
	if (tags !== undefined) {
		await saveWorkLogTags(id, tags);
	}

	// タグを含めて返す
	const workLogTags = await getWorkLogTags(id);
	const dbWorkLog = result[0];

	return WorkLog.from({
		...dbWorkLog,
		tags: workLogTags,
	});
};

/**
 * 作業記録を削除
 * F-004: 削除機能のために追加
 * @param id - 作業記録ID
 * @param userId - ユーザーID（権限チェック用）
 * @returns 削除成功時は true、レコードが見つからない場合は false
 */
export const deleteWorkLog = async (id: string, userId: string): Promise<boolean> => {
	const result = await db
		.delete(workLogs)
		.where(and(eq(workLogs.id, id), eq(workLogs.userId, userId)))
		.returning();

	return result.length > 0;
};

/**
 * 作業記録のタグを保存（既存タグを削除して新規タグを挿入）
 * F-003: タグ機能のために追加
 * @param workLogId - 作業記録ID
 * @param tags - タグ配列
 */
export const saveWorkLogTags = async (workLogId: string, tags: string[]): Promise<void> => {
	// 既存のタグを削除
	await db.delete(workLogTags).where(eq(workLogTags.workLogId, workLogId));

	// 新しいタグを挿入（空配列の場合はスキップ）
	if (tags.length > 0) {
		await db.insert(workLogTags).values(
			tags.map((tag) => ({
				workLogId,
				tag,
			})),
		);
	}
};

/**
 * 作業記録のタグを取得
 * F-003: タグ機能のために追加
 * @param workLogId - 作業記録ID
 * @returns タグ配列
 */
export const getWorkLogTags = async (workLogId: string): Promise<string[]> => {
	const dbTags = await db.query.workLogTags.findMany({
		where: (workLogTags, { eq }) => eq(workLogTags.workLogId, workLogId),
		orderBy: (workLogTags, { asc }) => [asc(workLogTags.createdAt)],
	});

	return dbTags.map((dbTag) => dbTag.tag);
};

/**
 * ユーザーのタグ候補を取得（部分一致検索、使用頻度順）
 * F-003: タグ機能のために追加
 * @param userId - ユーザーID
 * @param query - 検索クエリ（部分一致）
 * @param limit - 取得件数
 * @returns タグと使用回数のリスト
 */
export const getUserTagSuggestions = async (
	userId: string,
	query: string,
	limit: number,
): Promise<{ tag: string; count: number }[]> => {
	// work_log_tags を work_logs と JOIN して、そのユーザーが使用したタグのみを取得
	// GROUP BY で重複を除外し、tag で部分一致検索、使用回数でソート
	const conditions = [eq(workLogs.userId, userId)];

	if (query) {
		conditions.push(like(workLogTags.tag, `%${query}%`));
	}

	const results = await db
		.select({
			tag: workLogTags.tag,
			count: sql<number>`COUNT(*)`.as('count'),
		})
		.from(workLogTags)
		.innerJoin(workLogs, eq(workLogTags.workLogId, workLogs.id))
		.where(and(...conditions))
		.groupBy(workLogTags.tag)
		.orderBy(desc(sql`count`), workLogTags.tag)
		.limit(limit);

	return results.map((r) => ({ tag: r.tag, count: Number(r.count) }));
};

/**
 * 作業記録をタグ付きで取得
 * F-003: タグ機能のために追加
 * @param id - 作業記録ID
 * @returns タグを含む作業記録、または null
 */
export const getWorkLogWithTags = async (id: string): Promise<WorkLog | null> => {
	const dbWorkLog = await db.query.workLogs.findFirst({
		where: (workLogs, { eq }) => eq(workLogs.id, id),
	});

	if (!dbWorkLog) {
		return null;
	}

	const tags = await getWorkLogTags(id);

	return WorkLog.from({
		...dbWorkLog,
		tags,
	});
};

/**
 * 進行中の作業記録を更新
 * F-001.2: 進行中作業の編集機能のために追加
 * @param userId - ユーザーID
 * @param workLogId - 作業記録ID
 * @param updates - 更新するフィールド
 * @returns 更新後の作業記録、または null（進行中でない、または見つからない場合）
 */
export const updateActiveWorkLog = async (
	userId: string,
	workLogId: string,
	updates: {
		startedAt: Date;
		description: string;
		tags: string[];
	},
): Promise<WorkLog | null> => {
	const now = new Date();

	// 進行中の作業のみ更新（ended_at IS NULL の条件）
	const result = await db
		.update(workLogs)
		.set({
			startedAt: updates.startedAt,
			description: updates.description,
			updatedAt: now,
		})
		.where(and(eq(workLogs.id, workLogId), eq(workLogs.userId, userId), isNull(workLogs.endedAt)))
		.returning();

	// 条件に合わない場合（進行中でない、またはユーザー不一致）
	if (result.length === 0) {
		return null;
	}

	// タグを保存
	await saveWorkLogTags(workLogId, updates.tags);

	const dbWorkLog = result[0];
	return WorkLog.from({
		...dbWorkLog,
		tags: updates.tags,
	});
};

/**
 * ユーザーの最新の完了した作業の終了時刻を取得
 * F-001.2: 進行中作業の編集機能のために追加
 * @param userId - ユーザーID
 * @returns 最新の完了作業の終了時刻、または null（完了作業がない場合）
 */
export const getPreviousEndedAt = async (userId: string): Promise<Date | null> => {
	const result = await db.query.workLogs.findFirst({
		where: (workLogs, { eq, and, isNotNull }) =>
			and(eq(workLogs.userId, userId), isNotNull(workLogs.endedAt)),
		orderBy: (workLogs, { desc }) => [desc(workLogs.endedAt)],
	});

	return result?.endedAt ?? null;
};

/**
 * 指定月の日別集計を取得
 * F-009: 日別合計時間表示機能
 * @param userId - ユーザーID
 * @param month - 対象月（YYYY-MM）
 * @param timezone - ユーザーのタイムゾーン
 * @param tags - タグフィルタ（OR条件、任意）
 * @returns 日別集計データ
 */
export const getDailySummary = async (
	userId: string,
	month: string,
	timezone: string,
	tags?: string[],
): Promise<{
	items: Array<{
		date: string;
		totalSec: number;
		count: number;
	}>;
	monthlyTotalSec: number;
}> => {
	// 月の範囲を計算（UTC基準）
	const startOfMonth = new Date(`${month}-01T00:00:00Z`);
	const endOfMonth = new Date(startOfMonth);
	endOfMonth.setUTCMonth(endOfMonth.getUTCMonth() + 1);

	// 日別集計クエリ
	const conditions = [
		eq(workLogs.userId, userId),
		gte(workLogs.startedAt, startOfMonth),
		lte(workLogs.startedAt, endOfMonth),
		isNotNull(workLogs.endedAt),
	];

	// タグフィルタ（OR条件）
	if (tags && tags.length > 0) {
		const tagConditions = tags.map(
			(tag) =>
				sql`EXISTS (
				SELECT 1 FROM ${workLogTags}
				WHERE ${workLogTags.workLogId} = ${workLogs.id}
				AND ${workLogTags.tag} = ${tag}
			)`,
		);
		conditions.push(sql`(${sql.join(tagConditions, sql` OR `)})`);
	}

	const results = await db
		.select({
			date: sql<string>`(${workLogs.startedAt} AT TIME ZONE ${timezone})::date`,
			totalSec: sql<number>`SUM(EXTRACT(EPOCH FROM (${workLogs.endedAt} - ${workLogs.startedAt})))`,
			count: sql<number>`COUNT(*)`,
		})
		.from(workLogs)
		.where(and(...conditions))
		.groupBy(sql`(${workLogs.startedAt} AT TIME ZONE ${timezone})::date`)
		.orderBy(desc(sql`(${workLogs.startedAt} AT TIME ZONE ${timezone})::date`));

	// 月次合計を計算
	const monthlyTotalSec = results.reduce((sum, row) => sum + Number(row.totalSec || 0), 0);

	return {
		items: results.map((row) => ({
			date: row.date,
			totalSec: Math.floor(Number(row.totalSec || 0)),
			count: Number(row.count || 0),
		})),
		monthlyTotalSec: Math.floor(monthlyTotalSec),
	};
};
