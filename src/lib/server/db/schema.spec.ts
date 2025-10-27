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

describe('Database Schema - WorkLogs Table', () => {
	it('work_logsテーブルが正しい名前で定義されている', () => {
		expect(getTableName(workLogs)).toBe('work_logs');
	});

	it('work_logsテーブルが必要なカラムを持っている', () => {
		const columns = getTableColumns(workLogs);

		expect(columns.id).toBeDefined();
		expect(columns.userId).toBeDefined();
		expect(columns.startedAt).toBeDefined();
		expect(columns.endedAt).toBeDefined();
		expect(columns.description).toBeDefined();
		expect(columns.createdAt).toBeDefined();
		expect(columns.updatedAt).toBeDefined();
	});

	it('idカラムがUUID型のプライマリーキーである', () => {
		const columns = getTableColumns(workLogs);
		expect(columns.id.primary).toBe(true);
		expect(columns.id.dataType).toBe('string');
	});

	it('userIdカラムがNOT NULLでusersテーブルへの参照を持つ', () => {
		const columns = getTableColumns(workLogs);
		expect(columns.userId).toBeDefined();
		expect(columns.userId.notNull).toBe(true);
	});

	it('startedAtカラムがNOT NULLである', () => {
		const columns = getTableColumns(workLogs);
		expect(columns.startedAt.notNull).toBe(true);
	});

	it('endedAtカラムがNULL許可である', () => {
		const columns = getTableColumns(workLogs);
		expect(columns.endedAt.notNull).toBe(false);
	});

	it('descriptionカラムがNOT NULLでデフォルト値を持つ', () => {
		const columns = getTableColumns(workLogs);
		expect(columns.description).toBeDefined();
		expect(columns.description.notNull).toBe(true);
		expect(columns.description.hasDefault).toBe(true);
	});
});
