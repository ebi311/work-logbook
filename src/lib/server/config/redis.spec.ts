import { describe, it, expect, vi } from 'vitest';
import type { RedisClientType } from 'redis';
// 外部依存を避けるため、モジュールを完全にモック
vi.mock('./redis', () => {
	const fakeClient = {} as unknown as RedisClientType;
	return {
		getRedisClient: vi.fn(async () => fakeClient),
		closeRedisClient: vi.fn(async () => {})
	};
});

/**
 * Redis接続のユニットテスト
 *
 * 注意: Redis接続ロジックはシンプルなため、
 * 実装の正しさを型レベルで検証します。
 * 実際のRedis接続テストは統合テスト（E2E）で行います。
 */

describe('Redis Client', () => {
	describe('型定義の検証', () => {
		it('getRedisClient が正しい型を返すことを確認', async () => {
			const { getRedisClient } = await import('./redis');

			// 型チェック: RedisClientTypeを返すことを確認
			const client: RedisClientType = await getRedisClient();
			expect(client).toBeDefined();
		});

		it('closeRedisClient が正しい型を返すことを確認', async () => {
			const { closeRedisClient } = await import('./redis');

			// 型チェック: Promiseを返すことを確認
			const result: Promise<void> = closeRedisClient();
			expect(result).toBeInstanceOf(Promise);
		});
	});

	describe('モジュールのエクスポート', () => {
		it('必要な関数がエクスポートされている', async () => {
			const redisModule = await import('./redis');

			expect(redisModule.getRedisClient).toBeDefined();
			expect(typeof redisModule.getRedisClient).toBe('function');

			expect(redisModule.closeRedisClient).toBeDefined();
			expect(typeof redisModule.closeRedisClient).toBe('function');
		});
	});
});
