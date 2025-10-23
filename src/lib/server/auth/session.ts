import { getRedisClient } from '../config/redis';

export type SessionRecord = {
	userId: string;
	createdAt: string; // ISO string
};

export const SESSION_PREFIX = 'session:';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

const buildKey = (sessionId: string) => `${SESSION_PREFIX}${sessionId}`;

const randomId = (): string => {
	// Node 18+ has crypto.randomUUID
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
		return crypto.randomUUID();
	}
	// Fallback (non-crypto strong, acceptable for session id in tests; in production crypto exists)
	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const createSession = async (userId: string): Promise<string> => {
	const client = await getRedisClient();
	const sessionId = randomId();
	const key = buildKey(sessionId);
	const record: SessionRecord = {
		userId,
		createdAt: new Date().toISOString()
	};
	await client.set(key, JSON.stringify(record), { EX: SESSION_TTL_SECONDS });
	return sessionId;
};

export const validateSession = async (
	sessionId: string
): Promise<{ valid: true; userId: string } | { valid: false }> => {
	const client = await getRedisClient();
	const key = buildKey(sessionId);
	const raw = await client.get(key);
	if (!raw) return { valid: false };

	// refresh TTL on read
	await client.expire(key, SESSION_TTL_SECONDS);

	try {
		const parsed = JSON.parse(raw) as SessionRecord;
		if (!parsed?.userId) return { valid: false };
		return { valid: true, userId: parsed.userId };
	} catch {
		return { valid: false };
	}
};

export const refreshSession = async (sessionId: string): Promise<boolean> => {
	const client = await getRedisClient();
	const key = buildKey(sessionId);
	const ok = await client.expire(key, SESSION_TTL_SECONDS);
	return !!ok;
};

export const deleteSession = async (sessionId: string): Promise<boolean> => {
	const client = await getRedisClient();
	const key = buildKey(sessionId);
	const res = await client.del(key);
	return (res as number) > 0;
};
