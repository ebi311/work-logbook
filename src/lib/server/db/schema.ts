import { pgTable, text, boolean, uuid, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// NF-001: ユーザーテーブル
export const users = pgTable('users', {
	id: uuid('id').primaryKey().defaultRandom(),
	githubId: text('github_id').notNull().unique(),
	githubUsername: text('github_username').notNull(),
	githubEmail: text('github_email'),
	avatarUrl: text('avatar_url'),
	isActive: boolean('is_active').notNull().default(true),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()
});

// F-001: 作業記録テーブル
export const workLogs = pgTable(
	'work_logs',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id),
		startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }).notNull(),
		endedAt: timestamp('ended_at', { withTimezone: true, mode: 'date' }),
		description: text('description').notNull().default(''),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()
	},
	(table) => [
		// 部分ユニークインデックス: 1ユーザーにつき1つだけ進行中の作業を許可
		uniqueIndex('work_logs_user_id_active_unique')
			.on(table.userId)
			.where(sql`${table.endedAt} IS NULL`)
	]
);

// 型エクスポート
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type DbWorkLog = typeof workLogs.$inferSelect;
export type NewDbWorkLog = typeof workLogs.$inferInsert;
