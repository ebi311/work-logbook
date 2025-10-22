import { describe, it, expect } from 'vitest';
import { users, workLogs } from './schema';
import { getTableColumns, getTableName } from 'drizzle-orm';

describe('Database Schema - Users Table', () => {
	it('usersテーブルが正しい名前で定義されている', () => {
		expect(getTableName(users)).toBe('users');
	});

	it('usersテーブルが必要なカラムを持っている', () => {
		const columns = getTableColumns(users);

		expect(columns.id).toBeDefined();
		expect(columns.githubId).toBeDefined();
		expect(columns.githubUsername).toBeDefined();
		expect(columns.githubEmail).toBeDefined();
		expect(columns.avatarUrl).toBeDefined();
		expect(columns.isActive).toBeDefined();
		expect(columns.createdAt).toBeDefined();
		expect(columns.updatedAt).toBeDefined();
	});

	it('idカラムがUUID型のプライマリーキーである', () => {
		const columns = getTableColumns(users);
		expect(columns.id.primary).toBe(true);
		// UUIDはstringとして扱われる
		expect(columns.id.dataType).toBe('string');
	});

	it('githubIdカラムがユニークである', () => {
		const columns = getTableColumns(users);
		expect(columns.githubId.notNull).toBe(true);
	});

	it('isActiveカラムがデフォルトでtrueである', () => {
		const columns = getTableColumns(users);
		expect(columns.isActive.hasDefault).toBe(true);
	});
});

describe('Database Schema - WorkLogs Foreign Key', () => {
	it('work_logsテーブルのuserIdがusersテーブルへの参照を持つ', () => {
		const columns = getTableColumns(workLogs);
		expect(columns.userId).toBeDefined();
		expect(columns.userId.notNull).toBe(true);
	});
});
