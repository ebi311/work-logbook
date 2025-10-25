import { db } from './index';
import { workLogs, type DbWorkLog } from './schema';
import { eq, and, isNull, sql, lt, gt, isNotNull } from 'drizzle-orm';
import { WorkLog } from '../../../models/workLog';
import { getMonthRange } from '../../utils/dateRange';

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
 * @returns 作成された作業記録
 * @throws Error - 進行中の作業が既に存在する場合（部分ユニーク制約違反）
 */
export const createWorkLog = async (userId: string, startedAt: Date): Promise<WorkLog> => {
	const [dbWorkLog] = await db
		.insert(workLogs)
		.values({
			userId,
			startedAt,
			endedAt: null
		})
		.returning();

	return toWorkLog(dbWorkLog);
};

/**
 * 作業を終了
 * @param workLogId - 作業記録ID
 * @param endedAt - 作業終了日時
 * @returns 更新された作業記録、またはnull（レコードが見つからない場合）
 */
export const stopWorkLog = async (workLogId: string, endedAt: Date): Promise<WorkLog | null> => {
	const [dbWorkLog] = await db
		.update(workLogs)
		.set({ endedAt })
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
