import type { RequestHandler } from '@sveltejs/kit';
import { deleteSession } from '$lib/server/auth/session';

const SESSION_COOKIE = 'session_id';

export const POST: RequestHandler = async ({ cookies }) => {
	const sessionId = cookies.get(SESSION_COOKIE);

	// Delete session from Redis if exists
	if (sessionId) {
		await deleteSession(sessionId);
	}

	// Delete session cookie
	cookies.delete(SESSION_COOKIE, { path: '/' });

	// Redirect to home
	return new Response(null, {
		status: 302,
		headers: { Location: '/' },
	});
};
