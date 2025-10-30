import { pgTable, text, boolean, uuid, timestamp, uniqueIndex, serial, varchar, index } from 'drizzle-orm/pg-core';
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

// F-003: 作業記録タグテーブル
export const workLogTags = pgTable(
	'work_log_tags',
	{
		id: serial('id').primaryKey(),
		workLogId: uuid('work_log_id')
			.notNull()
			.references(() => workLogs.id, { onDelete: 'cascade' }),
		tag: varchar('tag', { length: 100 }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
			.notNull()
			.defaultNow()
	},
	(table) => [
		// 同じ作業に同じタグを重複して付けられないようにする
		uniqueIndex('work_log_tags_work_log_id_tag_unique').on(table.workLogId, table.tag),
		// タグでの検索を高速化
		index('work_log_tags_tag_idx').on(table.tag),
		// work_log_id での検索を高速化（JOINで使用）
		index('work_log_tags_work_log_id_idx').on(table.workLogId)
	]
);

// 型エクスポート
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type DbWorkLog = typeof workLogs.$inferSelect;
export type NewDbWorkLog = typeof workLogs.$inferInsert;

export type DbWorkLogTag = typeof workLogTags.$inferSelect;
export type NewDbWorkLogTag = typeof workLogTags.$inferInsert;
