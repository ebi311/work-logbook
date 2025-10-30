import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock env config to avoid depending on $env/static/private
vi.mock('$lib/server/config/env', () => ({
	getEnvConfig: vi.fn(() => ({
		github: {
			clientId: 'test-client-id',
			clientSecret: 'dummy',
			callbackUrl: 'http://localhost:5173/auth/callback',
		},
		session: { secret: 'test' },
		allowedGithubIds: [],
		redis: { url: 'redis://redis:6379' },
	})),
}));

// Mock Redis client
vi.mock('$lib/server/config/redis', () => {
	const set = vi.fn(async (...args: unknown[]) => {
		void args;
		return 'OK';
	});
	const client = { set };
	return {
		getRedisClient: vi.fn(async () => client),
		__mocks: { set },
	};
});

import { GET, _OAUTH_STATE_COOKIE, _OAUTH_STATE_TTL_SECONDS } from './+server';
import * as redisModule from '$lib/server/config/redis';

const getRedisSetMock = () =>
	(redisModule as unknown as { __mocks: { set: ReturnType<typeof vi.fn> } }).__mocks.set;

describe('GET /auth/login', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('GitHub OAuthへリダイレクトし、stateをCookieとRedisに保存する', async () => {
		const cookieStore = new Map<string, { value: string; options: Record<string, unknown> }>();
		const cookies = {
			set: vi.fn((name: string, value: string, options: Record<string, unknown>) => {
				cookieStore.set(name, { value, options });
			}),
		} as { set: (name: string, value: string, options: Record<string, unknown>) => void };

		const event = {
			cookies,
			url: new URL('http://localhost:5173/auth/login'),
		} as unknown as Parameters<typeof GET>[0];

		const res = await GET(event);

		// 302 Redirect
		expect(res.status).toBe(302);
		const location = res.headers.get('Location') || '';
		expect(location.startsWith('https://github.com/login/oauth/authorize')).toBe(true);

		const url = new URL(location);
		expect(url.searchParams.get('client_id')).toBe('test-client-id');
		expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:5173/auth/callback');
		const scope = url.searchParams.get('scope');
		expect(scope).toContain('read:user');
		expect(scope).toContain('user:email');

		const state = url.searchParams.get('state');
		expect(state).toBeTruthy();

		// Cookieにstateが設定されている
		expect(cookieStore.has(_OAUTH_STATE_COOKIE)).toBe(true);
		const cookieEntry = cookieStore.get(_OAUTH_STATE_COOKIE)!;
		expect(cookieEntry.value).toBe(state);
		expect(cookieEntry.options).toMatchObject({ httpOnly: true, sameSite: 'lax' });

		// Redisにstateが保存され、TTLが設定されている
		const setMock = getRedisSetMock();
		expect(setMock).toHaveBeenCalledTimes(1);
		const [key, value, opts] = setMock.mock.calls[0];
		expect(key).toBe(`oauth_state:${state}`);
		expect(value).toBe('1');
		expect(opts).toMatchObject({ EX: _OAUTH_STATE_TTL_SECONDS });
	});
});
