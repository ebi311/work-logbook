/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock session validation
vi.mock('$lib/server/auth/session', () => ({
	validateSession: vi.fn()
}));

// Mock DB
vi.mock('$lib/server/db', () => {
	const mockDb = {
		select: vi.fn(() => mockDb),
		from: vi.fn(() => mockDb),
		where: vi.fn(() => mockDb),
		limit: vi.fn(async () => [])
	};
	return { db: mockDb };
});

import { handle } from './hooks.server';
import * as sessionModule from '$lib/server/auth/session';
import * as dbModule from '$lib/server/db';

describe('hooks.server.ts', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('認証ルート（/auth/*）はセッション検証をスキップする', async () => {
		const cookies = {
			get: vi.fn(() => undefined)
		} as any;

		const event = {
			cookies,
			locals: {},
			url: new URL('http://localhost:5173/auth/login')
		} as any;

		const resolve = vi.fn(async () => new Response('OK'));

		await handle({ event, resolve });

		// セッション検証は呼ばれない
		expect(sessionModule.validateSession).not.toHaveBeenCalled();

		// resolve は呼ばれる
		expect(resolve).toHaveBeenCalledWith(event);
	});

	it('/auth/callback もセッション検証をスキップする', async () => {
		const cookies = {
			get: vi.fn(() => undefined)
		} as any;

		const event = {
			cookies,
			locals: {},
			url: new URL('http://localhost:5173/auth/callback')
		} as any;

		const resolve = vi.fn(async () => new Response('OK'));

		await handle({ event, resolve });

		// セッション検証は呼ばれない
		expect(sessionModule.validateSession).not.toHaveBeenCalled();

		// resolve は呼ばれる
		expect(resolve).toHaveBeenCalledWith(event);
	});

	it('有効なセッションがある場合、locals.userにユーザー情報を設定する', async () => {
		const sessionId = 'valid-session-123';
		const userId = 'user-uuid-1';

		// Mock: セッション検証成功
		vi.mocked(sessionModule.validateSession).mockResolvedValue({
			valid: true,
			userId
		});

		// Mock: DB からユーザー取得
		const dbMock = dbModule.db as any;
		dbMock.limit.mockResolvedValue([
			{
				id: userId,
				githubId: '12345',
				githubUsername: 'testuser',
				isActive: true
			}
		]);

		const cookies = {
			get: vi.fn((name: string) => (name === 'session_id' ? sessionId : undefined))
		} as any;

		const event = {
			cookies,
			locals: {},
			url: new URL('http://localhost:5173/')
		} as any;

		const resolve = vi.fn(async () => new Response('OK'));

		await handle({ event, resolve });

		// セッション検証が呼ばれた
		expect(sessionModule.validateSession).toHaveBeenCalledWith(sessionId);

		// DB クエリが呼ばれた
		expect(dbMock.select).toHaveBeenCalled();

		// locals.user が設定された
		expect(event.locals.user).toEqual({
			id: userId,
			githubId: '12345',
			githubUsername: 'testuser',
			isActive: true
		});

		// resolve が呼ばれた
		expect(resolve).toHaveBeenCalledWith(event);
	});

	it('セッションCookieがない場合、locals.userは未設定のまま', async () => {
		const cookies = {
			get: vi.fn(() => undefined)
		} as any;

		const event = {
			cookies,
			locals: {},
			url: new URL('http://localhost:5173/')
		} as any;

		const resolve = vi.fn(async () => new Response('OK'));

		await handle({ event, resolve });

		// セッション検証は呼ばれない
		expect(sessionModule.validateSession).not.toHaveBeenCalled();

		// locals.user は undefined
		expect(event.locals.user).toBeUndefined();

		// resolve は呼ばれる
		expect(resolve).toHaveBeenCalledWith(event);
	});

	it('セッションが無効な場合、locals.userは未設定のまま', async () => {
		const sessionId = 'invalid-session';

		// Mock: セッション検証失敗
		vi.mocked(sessionModule.validateSession).mockResolvedValue({
			valid: false
		});

		const cookies = {
			get: vi.fn((name: string) => (name === 'session_id' ? sessionId : undefined))
		} as any;

		const event = {
			cookies,
			locals: {},
			url: new URL('http://localhost:5173/')
		} as any;

		const resolve = vi.fn(async () => new Response('OK'));

		await handle({ event, resolve });

		// セッション検証が呼ばれた
		expect(sessionModule.validateSession).toHaveBeenCalledWith(sessionId);

		// locals.user は undefined
		expect(event.locals.user).toBeUndefined();

		// resolve は呼ばれる
		expect(resolve).toHaveBeenCalledWith(event);
	});

	it('ユーザーがDBに存在しない、またはis_active=falseの場合、locals.userは未設定', async () => {
		const sessionId = 'valid-session-456';
		const userId = 'user-uuid-2';

		// Mock: セッション検証成功
		vi.mocked(sessionModule.validateSession).mockResolvedValue({
			valid: true,
			userId
		});

		// Mock: DB からユーザーが見つからない
		const dbMock = dbModule.db as any;
		dbMock.limit.mockResolvedValue([]);

		const cookies = {
			get: vi.fn((name: string) => (name === 'session_id' ? sessionId : undefined))
		} as any;

		const event = {
			cookies,
			locals: {},
			url: new URL('http://localhost:5173/')
		} as any;

		const resolve = vi.fn(async () => new Response('OK'));

		await handle({ event, resolve });

		// セッション検証が呼ばれた
		expect(sessionModule.validateSession).toHaveBeenCalledWith(sessionId);

		// DB クエリが呼ばれた
		expect(dbMock.select).toHaveBeenCalled();

		// locals.user は undefined
		expect(event.locals.user).toBeUndefined();

		// resolve は呼ばれる
		expect(resolve).toHaveBeenCalledWith(event);
	});
});
