import { db } from './index';
import { workLogs, workLogTags, type DbWorkLog } from './schema';
import { eq, and, isNull, sql, lt, gt, isNotNull, gte, lte, desc, like } from 'drizzle-orm';
import { WorkLog } from '../../../models/workLog';
import { getMonthRange } from '../../utils/dateRange';
import { z } from 'zod';

/**
 * listWorkLogs オプションのバリデーションスキーマ
 */
const ListWorkLogsOptionsSchema = z
	.object({
		limit: z.number().int().min(10).max(100),
		offset: z.number().int().min(0),
		from: z.date().optional(),
		to: z.date().optional(),
	})
	.refine(
		(data) => {
			// from と to の両方が指定されている場合、from <= to を検証
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
	const dbWorkLog = await db.query.workLogs.findFirst({
		where: (workLogs, { eq, and, isNull }) =>
			and(eq(workLogs.userId, userId), isNull(workLogs.endedAt)),
	});

	if (!dbWorkLog) {
		return null;
	}

	return toWorkLog(dbWorkLog);
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
 * 指定月の作業時間合計を集計（境界クリップ、進行中除外）
 * @param userId - ユーザーID
 * @param options - { month: YYYY-MM }
 * @returns 月次合計作業秒数
 */
export const aggregateMonthlyWorkLogDuration = async (
	userId: string,
	{ month }: { month: string },
): Promise<number> => {
	const { from, toExclusive } = getMonthRange(month);

	// SQLで境界クリップを実行: GREATEST/LEASTで範囲内の寄与時間を算出
	// contribSec = EXTRACT(EPOCH FROM (LEAST(ended_at, toExclusive) - GREATEST(started_at, from)))
	const result = await db
		.select({
			totalSec: sql<number>`COALESCE(SUM(
				EXTRACT(EPOCH FROM (
					LEAST(${workLogs.endedAt}, ${toExclusive.toISOString()}::timestamptz)
					- GREATEST(${workLogs.startedAt}, ${from.toISOString()}::timestamptz)
				))
			), 0)`,
		})
		.from(workLogs)
		.where(
			and(
				eq(workLogs.userId, userId),
				isNotNull(workLogs.endedAt),
				lt(workLogs.startedAt, toExclusive),
				gt(workLogs.endedAt, from),
			),
		);

	return Math.floor(result[0].totalSec);
};

/**
 * 作業ログを一覧取得（降順・ページング）
 * @param userId - ユーザーID
 * @param options - { limit: 件数(10〜100), offset: オフセット(0以上), from?: 開始日時, to?: 終了日時 }
 * @returns { items: 作業ログ配列, hasNext: 次ページの有無 }
 * @throws ZodError - バリデーション失敗時（limit/offset範囲外、from > to）
 */
export const listWorkLogs = async (
	userId: string,
	options: {
		limit: number;
		offset: number;
		from?: Date;
		to?: Date;
	},
): Promise<{
	items: DbWorkLog[];
	hasNext: boolean;
}> => {
	// Zodでバリデーション
	const validatedOptions = ListWorkLogsOptionsSchema.parse(options);
	const { limit, offset, from, to } = validatedOptions;

	// limit+1 件取得して hasNext を判定
	const conditions = [eq(workLogs.userId, userId)];

	// from/to 範囲フィルタ（指定がある場合）
	if (from) {
		conditions.push(gte(workLogs.startedAt, from));
	}
	if (to) {
		conditions.push(lte(workLogs.startedAt, to));
	}

	const results = await db
		.select()
		.from(workLogs)
		.where(and(...conditions))
		.orderBy(desc(workLogs.startedAt))
		.limit(limit + 1)
		.offset(offset);

	// limit+1 件取得できた場合は次ページあり
	const hasNext = results.length > limit;
	const items = hasNext ? results.slice(0, limit) : results;

	return { items, hasNext };
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

	return toWorkLog(dbWorkLog);
};

/**
 * 作業記録を更新
 * F-004: 編集機能のために追加
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
	},
): Promise<WorkLog | null> => {
	const now = new Date();

	const result = await db
		.update(workLogs)
		.set({
			...updates,
			updatedAt: now,
		})
		.where(eq(workLogs.id, id))
		.returning();

	if (result.length === 0) {
		return null;
	}

	return toWorkLog(result[0]);
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
