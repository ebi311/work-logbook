import { db } from './index';
import { workLogs, type DbWorkLog } from './schema';
import { eq, and, isNull } from 'drizzle-orm';
import { WorkLog } from '../../../models/workLog';

/**
 * DB → ドメイン変換
 * @param dbWorkLog - DB から取得した作業記録
 * @returns ドメインモデルの WorkLog インスタンス
 * @throws ZodError - バリデーション失敗時
 */
export function toWorkLog(dbWorkLog: DbWorkLog): WorkLog {
	return WorkLog.from(dbWorkLog);
}

/**
 * 進行中の作業を取得
 * @param userId - ユーザーID
 * @returns 進行中の作業、または null
 */
export async function getActiveWorkLog(userId: string): Promise<WorkLog | null> {
	const dbWorkLog = await db.query.workLogs.findFirst({
		where: (workLogs, { eq, and, isNull }) =>
			and(eq(workLogs.userId, userId), isNull(workLogs.endedAt))
	});

	if (!dbWorkLog) {
		return null;
	}

	return toWorkLog(dbWorkLog);
}

/**
 * 作業を開始
 * @param userId - ユーザーID
 * @param startedAt - 作業開始日時
 * @returns 作成された作業記録
 * @throws Error - 進行中の作業が既に存在する場合（部分ユニーク制約違反）
 */
export async function createWorkLog(userId: string, startedAt: Date): Promise<WorkLog> {
	const [dbWorkLog] = await db
		.insert(workLogs)
		.values({
			userId,
			startedAt,
			endedAt: null
		})
		.returning();

	return toWorkLog(dbWorkLog);
}

/**
 * 作業を終了
 * @param workLogId - 作業記録ID
 * @param endedAt - 作業終了日時
 * @returns 更新された作業記録、またはnull（レコードが見つからない場合）
 */
export async function stopWorkLog(workLogId: string, endedAt: Date): Promise<WorkLog | null> {
	const [dbWorkLog] = await db
		.update(workLogs)
		.set({ endedAt })
		.where(and(eq(workLogs.id, workLogId), isNull(workLogs.endedAt)))
		.returning();

	if (!dbWorkLog) {
		return null;
	}

	return toWorkLog(dbWorkLog);
}
