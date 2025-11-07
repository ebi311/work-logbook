import type { Handle } from '@sveltejs/kit';
import { validateSession } from '$lib/server/auth/session';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getSecurityHeaders } from '$lib/server/security/headers';
import { DEFAULT_TIMEZONE } from '$lib/utils/timezone';

const SESSION_COOKIE = 'session_id';

// 認証不要なパス（認証ルート）
const PUBLIC_PATHS = ['/auth/login', '/auth/callback', '/auth/logout'];

// パスが認証不要かチェック
const isPublicPath = (pathname: string): boolean => {
	return PUBLIC_PATHS.some((path) => pathname.startsWith(path));
};

export const handle: Handle = async ({ event, resolve }) => {
	const { locals, cookies, url } = event;

	// 認証ルートは常に許可
	if (isPublicPath(url.pathname)) {
		const response = await resolve(event);
		return applySecurityHeaders(response);
	}

	// Get session ID from cookie
	const sessionId = cookies.get(SESSION_COOKIE);

	if (sessionId) {
		// Validate session
		const sessionResult = await validateSession(sessionId);

		if (sessionResult.valid) {
			// Load user from DB
			const [user] = await db
				.select({
					id: users.id,
					githubId: users.githubId,
					githubUsername: users.githubUsername,
					isActive: users.isActive,
				})
				.from(users)
				.where(eq(users.id, sessionResult.userId))
				.limit(1);

			// Set user in locals if found and active
			if (user && user.isActive) {
				// タイムゾーンを取得: セッション → Cookie → デフォルト
				const timezone = sessionResult.timezone || cookies.get('timezone') || DEFAULT_TIMEZONE;

				locals.user = {
					...user,
					timezone,
				};
			}
		}
	}

	// 認証が必要なパスで未認証の場合、/auth/login にリダイレクト
	if (!locals.user) {
		const response = new Response(null, {
			status: 302,
			headers: {
				location: '/auth/login',
			},
		});
		return applySecurityHeaders(response);
	}

	const response = await resolve(event);
	return applySecurityHeaders(response);
};

/**
 * レスポンスにセキュリティヘッダーを適用（CSP以外）
 * CSPはSvelteKitのcsp設定で自動的に適用される
 */
const applySecurityHeaders = (response: Response): Response => {
	const securityHeaders = getSecurityHeaders();
	const newHeaders = new Headers(response.headers);

	for (const [key, value] of Object.entries(securityHeaders)) {
		newHeaders.set(key, value);
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: newHeaders,
	});
};
