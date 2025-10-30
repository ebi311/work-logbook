/**
 * Redis接続管理
 * NF-001: GitHub OAuth認証 - セッション管理用
 */

import { createClient, type RedisClientType } from 'redis';
import { getEnvConfig } from './env';

// Redisクライアントのシングルトンインスタンス
let redisClient: RedisClientType | null = null;

/**
 * Redisクライアントを取得（シングルトン）
 * @returns {Promise<RedisClientType>} Redisクライアント
 */
export const getRedisClient = async (): Promise<RedisClientType> => {
	if (redisClient && redisClient.isOpen) {
		return redisClient;
	}

	const config = getEnvConfig();
	redisClient = createClient({
		url: config.redis.url,
	});

	// エラーハンドリング
	redisClient.on('error', (err) => {
		console.error('Redis Client Error:', err);
	});

	// 接続
	await redisClient.connect();
	console.log('✅ Redis connected:', config.redis.url);

	return redisClient;
};

/**
 * Redis接続をクローズ
 */
export const closeRedisClient = async (): Promise<void> => {
	if (redisClient && redisClient.isOpen) {
		await redisClient.quit();
		redisClient = null;
		console.log('🔌 Redis disconnected');
	}
};

/**
 * アプリケーション終了時にRedis接続をクローズ
 */
process.on('SIGINT', async () => {
	await closeRedisClient();
	process.exit(0);
});

process.on('SIGTERM', async () => {
	await closeRedisClient();
	process.exit(0);
});
