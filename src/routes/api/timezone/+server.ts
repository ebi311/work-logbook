import { json } from '@sveltejs/kit';
import { updateSessionTimezone } from '$lib/server/auth/session';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const sessionId = cookies.get('sessionId');
	if (!sessionId) {
		return json({ success: false, error: 'No session' }, { status: 401 });
	}

	try {
		const { timezone } = await request.json();
		if (!timezone || typeof timezone !== 'string') {
			return json({ success: false, error: 'Invalid timezone' }, { status: 400 });
		}

		// セッションを更新
		const updated = await updateSessionTimezone(sessionId, timezone);
		if (!updated) {
			return json({ success: false, error: 'Failed to update session' }, { status: 500 });
		}

		// Cookieにも保存(フォールバック用)
		cookies.set('timezone', timezone, {
			path: '/',
			httpOnly: false, // クライアント側からも読めるように
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 365, // 1年
		});

		return json({ success: true });
	} catch (error) {
		console.error('Failed to update timezone:', error);
		return json({ success: false, error: 'Internal error' }, { status: 500 });
	}
};
