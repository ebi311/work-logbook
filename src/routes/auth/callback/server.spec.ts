/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock env config
vi.mock('$lib/server/config/env', () => ({
	getEnvConfig: vi.fn(() => ({
		github: {
			clientId: 'test-client-id',
			clientSecret: 'test-client-secret',
			callbackUrl: 'http://localhost:5173/auth/callback'
		},
		session: { secret: 'test' },
		allowedGithubIds: ['12345'],
		redis: { url: 'redis://redis:6379' }
	})),
	isAllowedGithubId: vi.fn((id: string) => id === '12345')
}));

// Mock Redis client
vi.mock('$lib/server/config/redis', () => {
	const store = new Map<string, string>();
	return {
		getRedisClient: vi.fn(async () => ({
			get: vi.fn(async (key: string) => store.get(key) || null),
			del: vi.fn(async (key: string) => (store.delete(key) ? 1 : 0)),
			_testStore: store
		})),
		__testGetStore: () => store
	};
});

// Mock session utilities
vi.mock('$lib/server/auth/session', () => ({
	createSession: vi.fn(async (userId: string) => `session-${userId}`),
	_OAUTH_STATE_COOKIE: 'oauth_state'
}));

// Mock DB
vi.mock('$lib/server/db', () => {
	const mockDb = {
		insert: vi.fn(() => mockDb),
		values: vi.fn(() => mockDb),
		onConflictDoUpdate: vi.fn(() => mockDb),
		returning: vi.fn(async () => [
			{ id: 'user-uuid-1', githubId: '12345', githubUsername: 'testuser' }
		])
	};
	return { db: mockDb };
});

import { GET } from './+server';
import * as redisModule from '$lib/server/config/redis';
import * as sessionModule from '$lib/server/auth/session';
import * as dbModule from '$lib/server/db';

type FetchMock = ReturnType<typeof vi.fn>;

const getRedisStore = () => {
	const mod = redisModule as unknown as { __testGetStore: () => Map<string, string> };
	return mod.__testGetStore();
};

describe('GET /auth/callback', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getRedisStore().clear();
	});

	it('正常系: state検証→code交換→ユーザー取得→DB upsert→セッション発行→リダイレクト', async () => {
		const state = 'test-state-123';
		const code = 'test-code-456';

		// Redis state存在
		getRedisStore().set(`oauth_state:${state}`, '1');

		// Cookie mock
		const cookies = {
			get: vi.fn((name: string) => (name === 'oauth_state' ? state : undefined)),
			set: vi.fn(),
			delete: vi.fn()
		} as any;

		// Fetch mock: GitHub token + user API
		const fetchMock = vi.fn(async (url: string | URL) => {
			const urlStr = url.toString();
			if (urlStr.includes('github.com/login/oauth/access_token')) {
				return {
					ok: true,
					json: async () => ({ access_token: 'gho_test_token' })
				};
			}
			if (urlStr.includes('api.github.com/user')) {
				return {
					ok: true,
					json: async () => ({
						id: 12345,
						login: 'testuser',
						email: 'test@example.com',
						avatar_url: 'https://avatar.url/test'
					})
				};
			}
			throw new Error('Unexpected fetch URL');
		}) as unknown as FetchMock;

		const event = {
			cookies,
			fetch: fetchMock,
			url: new URL(`http://localhost:5173/auth/callback?code=${code}&state=${state}`)
		} as unknown as Parameters<typeof GET>[0];

		const res = await GET(event);

		// Redirect to /
		expect(res.status).toBe(302);
		expect(res.headers.get('Location')).toBe('/');

		// State cookie削除
		expect(cookies.delete).toHaveBeenCalledWith(
			'oauth_state',
			expect.objectContaining({ path: '/' })
		);

		// Session cookie設定
		expect(cookies.set).toHaveBeenCalledWith(
			'session_id',
			'session-user-uuid-1',
			expect.objectContaining({ httpOnly: true, sameSite: 'lax' })
		);

		// DB upsert呼び出し
		const dbMock = dbModule.db as any;
		expect(dbMock.insert).toHaveBeenCalled();
		expect(dbMock.values).toHaveBeenCalledWith(
			expect.objectContaining({
				githubId: '12345',
				githubUsername: 'testuser',
				githubEmail: 'test@example.com',
				avatarUrl: 'https://avatar.url/test'
			})
		);

		// Session作成
		expect(sessionModule.createSession).toHaveBeenCalledWith('user-uuid-1');

		// GitHub API呼び出し
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('異常系: stateがCookieにない', async () => {
		const cookies = {
			get: vi.fn(() => undefined)
		} as any;

		const event = {
			cookies,
			url: new URL('http://localhost:5173/auth/callback?code=test&state=test')
		} as unknown as Parameters<typeof GET>[0];

		const res = await GET(event);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Invalid state');
	});

	it('異常系: stateがRedisにない', async () => {
		const state = 'missing-state';
		const cookies = {
			get: vi.fn(() => state)
		} as any;

		const event = {
			cookies,
			url: new URL(`http://localhost:5173/auth/callback?code=test&state=${state}`)
		} as unknown as Parameters<typeof GET>[0];

		const res = await GET(event);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Invalid state');
	});

	it('異常系: codeパラメータがない', async () => {
		const state = 'test-state';
		getRedisStore().set(`oauth_state:${state}`, '1');

		const cookies = {
			get: vi.fn(() => state),
			delete: vi.fn()
		} as unknown as Parameters<typeof GET>[0]['cookies'];

		const event = {
			cookies,
			url: new URL(`http://localhost:5173/auth/callback?state=${state}`)
		} as unknown as Parameters<typeof GET>[0];

		const res = await GET(event);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Missing code');
	});

	it('異常系: GitHubユーザーがホワイトリストにない', async () => {
		const state = 'test-state';
		const code = 'test-code';
		getRedisStore().set(`oauth_state:${state}`, '1');

		const cookies = {
			get: vi.fn(() => state),
			delete: vi.fn()
		} as any;

		const fetchMock = vi.fn(async (url: string | URL) => {
			const urlStr = url.toString();
			if (urlStr.includes('access_token')) {
				return { ok: true, json: async () => ({ access_token: 'token' }) };
			}
			if (urlStr.includes('api.github.com/user')) {
				return {
					ok: true,
					json: async () => ({ id: 99999, login: 'unauthorized', email: null, avatar_url: null })
				};
			}
			throw new Error('Unexpected');
		}) as unknown as FetchMock;

		const event = {
			cookies,
			fetch: fetchMock,
			url: new URL(`http://localhost:5173/auth/callback?code=${code}&state=${state}`)
		} as unknown as Parameters<typeof GET>[0];

		const res = await GET(event);

		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.error).toBe('Access denied');
	});
});
