import type { RequestHandler } from '@sveltejs/kit'
import type { Cookies } from '@sveltejs/kit'
import { getEnvConfig, isAllowedGithubId } from '$lib/server/config/env'
import { getRedisClient } from '$lib/server/config/redis'
import { createSession } from '$lib/server/auth/session'
import { db } from '$lib/server/db'
import { users } from '$lib/server/db/schema'
import type { RedisClientType } from 'redis'

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

/**
 * state を Cookie と Redis で検証し、検証後に削除する
 */
const validateAndConsumeState = async (
	state: string | null,
	cookies: Cookies,
	redisClient: RedisClientType
): Promise<boolean> => {
	const stateCookie = cookies.get('oauth_state');
	if (!stateCookie || stateCookie !== state) {
		return false;
	}

	const redisState = await redisClient.get(`oauth_state:${state}`);
	if (!redisState) {
		return false;
	}

	// Delete state from Redis and Cookie
	await redisClient.del(`oauth_state:${state}`);
	cookies.delete('oauth_state', { path: '/' });

	return true;
};

/**
 * GitHub OAuth フローを実行: code → access_token → user
 */
const authenticateWithGitHub = async (
	code: string,
	clientId: string,
	clientSecret: string,
	callbackUrl: string,
	fetchFn: typeof fetch
): Promise<GitHubUser> => {
	const accessToken = await exchangeCodeForToken(
		code,
		clientId,
		clientSecret,
		callbackUrl,
		fetchFn
	);
	return await fetchGitHubUser(accessToken, fetchFn);
};

/**
 * GitHub ユーザー情報を DB に upsert し、DB上のユーザーレコードを返す
 */
const upsertUser = async (githubUser: GitHubUser) => {
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

	return dbUser;
};

/**
 * セッションを作成し、Cookie に設定する
 */
const createSessionAndSetCookie = async (userId: string, cookies: Cookies): Promise<void> => {
	const sessionId = await createSession(userId);

	cookies.set(_SESSION_COOKIE, sessionId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: true,
		maxAge: _SESSION_TTL_SECONDS
	});
};

export const GET: RequestHandler = async ({ url, cookies, fetch }) => {
	const { github } = getEnvConfig();
	const redisClient = await getRedisClient();

	// Extract query params
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');

	// Validate state
	const isStateValid = await validateAndConsumeState(state, cookies, redisClient);
	if (!isStateValid) {
		return new Response(JSON.stringify({ error: 'Invalid state' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Validate code
	if (!code) {
		return new Response(JSON.stringify({ error: 'Missing code' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Authenticate with GitHub
	const githubUser = await authenticateWithGitHub(
		code,
		github.clientId,
		github.clientSecret,
		github.callbackUrl,
		fetch
	);

	// Check whitelist
	if (!isAllowedGithubId(String(githubUser.id))) {
		return new Response(JSON.stringify({ error: 'Access denied' }), {
			status: 403,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Upsert user in DB
	const dbUser = await upsertUser(githubUser);

	// Create session and set cookie
	await createSessionAndSetCookie(dbUser.id, cookies);

	// Redirect to home
	return new Response(null, {
		status: 302,
		headers: { Location: '/' }
	});
};
