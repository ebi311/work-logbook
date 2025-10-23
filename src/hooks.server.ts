import type { Handle } from '@sveltejs/kit';
import { validateSession } from '$lib/server/auth/session';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

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
		return await resolve(event);
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
					isActive: users.isActive
				})
				.from(users)
				.where(eq(users.id, sessionResult.userId))
				.limit(1);

			// Set user in locals if found and active
			if (user && user.isActive) {
				locals.user = user;
			}
		}
	}

	const response = await resolve(event);

	return response;
};
