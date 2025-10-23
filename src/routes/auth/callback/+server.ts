import type { RequestHandler } from '@sveltejs/kit';
import { getEnvConfig, isAllowedGithubId } from '$lib/server/config/env';
import { getRedisClient } from '$lib/server/config/redis';
import { createSession } from '$lib/server/auth/session';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';

export const _SESSION_COOKIE = 'session_id';
export const _SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

type GitHubTokenResponse = {
	access_token: string;
	token_type?: string;
	scope?: string;
};

type GitHubUser = {
	id: number;
	login: string;
	email: string | null;
	avatar_url: string | null;
};

const exchangeCodeForToken = async (
	code: string,
	clientId: string,
	clientSecret: string,
	redirectUri: string,
	fetchFn: typeof fetch
): Promise<string> => {
	const res = await fetchFn('https://github.com/login/oauth/access_token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json'
		},
		body: JSON.stringify({
			client_id: clientId,
			client_secret: clientSecret,
			code,
			redirect_uri: redirectUri
		})
	});

	if (!res.ok) {
		throw new Error('Failed to exchange code for token');
	}

	const data = (await res.json()) as GitHubTokenResponse;
	if (!data.access_token) {
		throw new Error('No access token in response');
	}

	return data.access_token;
};

const fetchGitHubUser = async (accessToken: string, fetchFn: typeof fetch): Promise<GitHubUser> => {
	const res = await fetchFn('https://api.github.com/user', {
		headers: {
			Authorization: `Bearer ${accessToken}`,
			Accept: 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28'
		}
	});

	if (!res.ok) {
		throw new Error('Failed to fetch GitHub user');
	}

	return (await res.json()) as GitHubUser;
};

export const GET: RequestHandler = async ({ url, cookies, fetch }) => {
	const { github } = getEnvConfig();

	// Extract query params
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');

	// Validate state (Cookie + Redis)
	const stateCookie = cookies.get('oauth_state');
	if (!stateCookie || stateCookie !== state) {
		return new Response(JSON.stringify({ error: 'Invalid state' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const client = await getRedisClient();
	const redisState = await client.get(`oauth_state:${state}`);
	if (!redisState) {
		return new Response(JSON.stringify({ error: 'Invalid state' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Delete state from Redis and Cookie
	await client.del(`oauth_state:${state}`);
	cookies.delete('oauth_state', { path: '/' });

	if (!code) {
		return new Response(JSON.stringify({ error: 'Missing code' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Exchange code for access token
	const accessToken = await exchangeCodeForToken(
		code,
		github.clientId,
		github.clientSecret,
		github.callbackUrl,
		fetch
	);

	// Fetch GitHub user
	const githubUser = await fetchGitHubUser(accessToken, fetch);

	// Check whitelist
	if (!isAllowedGithubId(String(githubUser.id))) {
		return new Response(JSON.stringify({ error: 'Access denied' }), {
			status: 403,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Upsert user in DB
	const [dbUser] = await db
		.insert(users)
		.values({
			githubId: String(githubUser.id),
			githubUsername: githubUser.login,
			githubEmail: githubUser.email,
			avatarUrl: githubUser.avatar_url
		})
		.onConflictDoUpdate({
			target: users.githubId,
			set: {
				githubUsername: githubUser.login,
				githubEmail: githubUser.email,
				avatarUrl: githubUser.avatar_url,
				updatedAt: new Date()
			}
		})
		.returning();

	// Create session
	const sessionId = await createSession(dbUser.id);

	// Set session cookie
	cookies.set(_SESSION_COOKIE, sessionId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: true,
		maxAge: _SESSION_TTL_SECONDS
	});

	// Redirect to home
	return new Response(null, {
		status: 302,
		headers: { Location: '/' }
	});
};
