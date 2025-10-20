import { pgTable, serial, integer, uuid, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const user = pgTable('user', {
	id: serial('id').primaryKey(),
	age: integer('age')
});

// F-001: 作業記録テーブル
export const workLogs = pgTable('work_logs', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id').notNull(),
	startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }).notNull(),
	endedAt: timestamp('ended_at', { withTimezone: true, mode: 'date' }),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
	// 部分ユニークインデックス: 1ユーザーにつき1つだけ進行中の作業を許可
	activeWorkLogUniqueIndex: uniqueIndex('work_logs_user_id_active_unique')
		.on(table.userId)
		.where(sql`${table.endedAt} IS NULL`),
}));

// 型エクスポート
export type DbWorkLog = typeof workLogs.$inferSelect;
export type NewDbWorkLog = typeof workLogs.$inferInsert;
