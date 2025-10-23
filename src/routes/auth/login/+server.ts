import type { RequestHandler } from '@sveltejs/kit';
import { nanoid } from 'nanoid';
import { getEnvConfig } from '$lib/server/config/env';
import { getRedisClient } from '$lib/server/config/redis';

export const _OAUTH_STATE_COOKIE = 'oauth_state';
export const _OAUTH_STATE_TTL_SECONDS = 60 * 10; // 10 minutes

const buildAuthorizeUrl = (clientId: string, redirectUri: string, state: string): string => {
	const u = new URL('https://github.com/login/oauth/authorize');
	u.searchParams.set('client_id', clientId);
	u.searchParams.set('redirect_uri', redirectUri);
	u.searchParams.set('scope', 'read:user user:email');
	u.searchParams.set('allow_signup', 'false');
	u.searchParams.set('state', state);
	return u.toString();
};

const randomState = (): string => nanoid(32);

export const GET: RequestHandler = async ({ cookies }) => {
	const { github } = getEnvConfig();

	const state = randomState();

	// Store state in Redis with TTL
	const client = await getRedisClient();
	await client.set(`oauth_state:${state}`, '1', { EX: _OAUTH_STATE_TTL_SECONDS });

	// Set state cookie (httpOnly)
	cookies.set(_OAUTH_STATE_COOKIE, state, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: true,
		maxAge: _OAUTH_STATE_TTL_SECONDS
	});

	const location = buildAuthorizeUrl(github.clientId, github.callbackUrl, state);
	return new Response(null, {
		status: 302,
		headers: { Location: location }
	});
};
