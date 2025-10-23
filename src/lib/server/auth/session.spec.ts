import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Redis client used by the session utilities
vi.mock('../config/redis', () => {
	const store = new Map<string, string>();

	const setMock = vi.fn(async (...args: unknown[]) => {
		const [key, value] = args as [string, string];
		store.set(key, value);
		return 'OK';
	});
	const getMock = vi.fn(async (key: string) => {
		return store.has(key) ? (store.get(key) as string) : null;
	});
	const delMock = vi.fn(async (key: string) => {
		return store.delete(key) ? 1 : 0;
	});
	const expireMock = vi.fn(async (...args: unknown[]) => {
		void args;
		return true;
	});

	const client = {
		on: vi.fn(),
		connect: vi.fn(),
		quit: vi.fn(),
		set: setMock,
		get: getMock,
		del: delMock,
		expire: expireMock
	};

	return {
		getRedisClient: vi.fn(async () => client),
		closeRedisClient: vi.fn(async () => {}),
		__client: client,
		__mocks: { setMock, getMock, delMock, expireMock, store }
	};
});

import {
	createSession,
	validateSession,
	deleteSession,
	refreshSession,
	SESSION_PREFIX,
	SESSION_TTL_SECONDS
} from './session';
import * as redisModule from '../config/redis';

// Utilities
type MocksShape = {
	setMock: ReturnType<typeof vi.fn>;
	getMock: ReturnType<typeof vi.fn>;
	delMock: ReturnType<typeof vi.fn>;
	expireMock: ReturnType<typeof vi.fn>;
	store: Map<string, string>;
};

const getMocks = () => (redisModule as unknown as { __mocks: MocksShape }).__mocks;

describe('Session utilities', () => {
	beforeEach(() => {
		// reset mocks and in-memory store
		const { setMock, getMock, delMock, expireMock, store } = getMocks();
		setMock.mockClear();
		getMock.mockClear();
		delMock.mockClear();
		expireMock.mockClear();
		store.clear();
	});

	it('createSession -> validateSession: 正常系', async () => {
		const userId = '11111111-2222-3333-4444-555555555555';
		const sessionId = await createSession(userId);

		expect(sessionId).toBeTruthy();
		expect(typeof sessionId).toBe('string');

		const res = await validateSession(sessionId);
		expect(res.valid).toBe(true);
		if (res.valid) {
			expect(res.userId).toBe(userId);
		}

		// 保存フォーマット確認
		const { store } = getMocks();
		const raw = store.get(`${SESSION_PREFIX}${sessionId}`);
		expect(raw).toBeTruthy();
		const parsed = JSON.parse(raw as string);
		expect(parsed.userId).toBe(userId);
		expect(typeof parsed.createdAt).toBe('string');
	});

	it('refreshSession: TTL更新が呼ばれる', async () => {
		const userId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
		const sessionId = await createSession(userId);

		const { expireMock } = getMocks();
		expireMock.mockClear();

		const refreshed = await refreshSession(sessionId);
		expect(refreshed).toBe(true);

		expect(expireMock).toHaveBeenCalledTimes(1);
		expect(expireMock).toHaveBeenCalledWith(`${SESSION_PREFIX}${sessionId}`, SESSION_TTL_SECONDS);
	});

	it('deleteSession: 削除後は無効', async () => {
		const userId = '99999999-8888-7777-6666-555555555555';
		const sessionId = await createSession(userId);

		const deleted = await deleteSession(sessionId);
		expect(deleted).toBe(true);

		const res = await validateSession(sessionId);
		expect(res.valid).toBe(false);
	});

	it('validateSession: 存在しないIDは無効', async () => {
		const res = await validateSession('not-exist');
		expect(res.valid).toBe(false);
	});
});
