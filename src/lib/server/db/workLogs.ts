import { db } from './index';
import { workLogs, type DbWorkLog } from './schema';
import { eq, and, isNull, sql, lt, gt, isNotNull, gte, lte, desc } from 'drizzle-orm';
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
		to: z.date().optional()
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
			message: 'from must be less than or equal to to'
		}
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
			and(eq(workLogs.userId, userId), isNull(workLogs.endedAt))
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
	description: string
): Promise<WorkLog> => {
	const [dbWorkLog] = await db
		.insert(workLogs)
		.values({
			userId,
			startedAt,
			endedAt: null,
			description
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
	description: string
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
	{ month }: { month: string }
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
			), 0)`
		})
		.from(workLogs)
		.where(
			and(
				eq(workLogs.userId, userId),
				isNotNull(workLogs.endedAt),
				lt(workLogs.startedAt, toExclusive),
				gt(workLogs.endedAt, from)
			)
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
	}
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
