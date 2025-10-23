import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Redis client
const delMock = vi.fn(async (...args: unknown[]) => {
	void args;
	return 1;
});

vi.mock('$lib/server/config/redis', () => ({
	getRedisClient: vi.fn(async () => ({
		del: delMock
	}))
}));

import { POST } from './+server';

describe('POST /auth/logout', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('セッションを削除し、Cookieを削除し、リダイレクトする', async () => {
		const sessionId = 'test-session-123';

		const cookies = {
			get: vi.fn(() => sessionId),
			delete: vi.fn()
		} as unknown as Parameters<typeof POST>[0]['cookies'];

		const event = {
			cookies
		} as unknown as Parameters<typeof POST>[0];

		const res = await POST(event);

		// Redirect to /
		expect(res.status).toBe(302);
		expect(res.headers.get('Location')).toBe('/');

		// session_id Cookie削除
		expect(cookies.delete).toHaveBeenCalledWith(
			'session_id',
			expect.objectContaining({ path: '/' })
		);

		// Redis からセッション削除（deleteSession内部で実行）
		expect(delMock).toHaveBeenCalledWith(`session:${sessionId}`);
	});

	it('セッションIDがない場合でもリダイレクトする', async () => {
		const cookies = {
			get: vi.fn(() => undefined),
			delete: vi.fn()
		} as unknown as Parameters<typeof POST>[0]['cookies'];

		const event = {
			cookies
		} as unknown as Parameters<typeof POST>[0];

		const res = await POST(event);

		// Redirect to /
		expect(res.status).toBe(302);
		expect(res.headers.get('Location')).toBe('/');

		// Cookie削除は呼ばれる
		expect(cookies.delete).toHaveBeenCalledWith(
			'session_id',
			expect.objectContaining({ path: '/' })
		);

		// Redis削除は呼ばれない
		expect(delMock).not.toHaveBeenCalled();
	});
});
