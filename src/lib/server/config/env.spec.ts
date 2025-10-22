import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Environment Variables Validation', () => {
	let originalEnv: NodeJS.ProcessEnv;

	beforeEach(() => {
		// 環境変数のバックアップ
		originalEnv = { ...process.env };
	});

	afterEach(() => {
		// 環境変数を復元
		process.env = originalEnv;
	});

	describe('getEnvConfig', () => {
		it('すべての必須環境変数が設定されている場合、設定オブジェクトを返す', async () => {
			// 環境変数をセット
			process.env.GITHUB_CLIENT_ID = 'test_client_id';
			process.env.GITHUB_CLIENT_SECRET = 'test_client_secret';
			process.env.GITHUB_CALLBACK_URL = 'http://localhost:5173/auth/callback';
			process.env.SESSION_SECRET = 'test_secret_key_with_at_least_32_chars';
			process.env.ALLOWED_GITHUB_IDS = '12345,67890';
			process.env.HEROKU_REDIS_URL = 'redis://localhost:6379';

			const { getEnvConfig } = await import('./env');
			const config = getEnvConfig();

			expect(config.github.clientId).toBe('test_client_id');
			expect(config.github.clientSecret).toBe('test_client_secret');
			expect(config.github.callbackUrl).toBe('http://localhost:5173/auth/callback');
			expect(config.session.secret).toBe('test_secret_key_with_at_least_32_chars');
			expect(config.allowedGithubIds).toEqual(['12345', '67890']);
			expect(config.redis.url).toBe('redis://localhost:6379');
		});

		it('ALLOWED_GITHUB_IDSが空の場合、空配列を返す', async () => {
			process.env.GITHUB_CLIENT_ID = 'test_client_id';
			process.env.GITHUB_CLIENT_SECRET = 'test_client_secret';
			process.env.GITHUB_CALLBACK_URL = 'http://localhost:5173/auth/callback';
			process.env.SESSION_SECRET = 'test_secret_key_with_at_least_32_chars';
			process.env.ALLOWED_GITHUB_IDS = '';
			process.env.HEROKU_REDIS_URL = 'redis://localhost:6379';

			const { getEnvConfig } = await import('./env');
			const config = getEnvConfig();

			expect(config.allowedGithubIds).toEqual([]);
		});

		it('GITHUB_CLIENT_IDが未設定の場合、エラーをスローする', async () => {
			process.env.GITHUB_CLIENT_SECRET = 'test_client_secret';
			process.env.GITHUB_CALLBACK_URL = 'http://localhost:5173/auth/callback';
			process.env.SESSION_SECRET = 'test_secret_key_with_at_least_32_chars';
			process.env.ALLOWED_GITHUB_IDS = '12345';
			process.env.HEROKU_REDIS_URL = 'redis://localhost:6379';

			const { getEnvConfig } = await import('./env');

			expect(() => getEnvConfig()).toThrow('GITHUB_CLIENT_ID is not set');
		});

		it('GITHUB_CLIENT_SECRETが未設定の場合、エラーをスローする', async () => {
			process.env.GITHUB_CLIENT_ID = 'test_client_id';
			process.env.GITHUB_CALLBACK_URL = 'http://localhost:5173/auth/callback';
			process.env.SESSION_SECRET = 'test_secret_key_with_at_least_32_chars';
			process.env.ALLOWED_GITHUB_IDS = '12345';
			process.env.HEROKU_REDIS_URL = 'redis://localhost:6379';

			const { getEnvConfig } = await import('./env');

			expect(() => getEnvConfig()).toThrow('GITHUB_CLIENT_SECRET is not set');
		});

		it('SESSION_SECRETが未設定の場合、エラーをスローする', async () => {
			process.env.GITHUB_CLIENT_ID = 'test_client_id';
			process.env.GITHUB_CLIENT_SECRET = 'test_client_secret';
			process.env.GITHUB_CALLBACK_URL = 'http://localhost:5173/auth/callback';
			process.env.ALLOWED_GITHUB_IDS = '12345';
			process.env.HEROKU_REDIS_URL = 'redis://localhost:6379';

			const { getEnvConfig } = await import('./env');

			expect(() => getEnvConfig()).toThrow('SESSION_SECRET is not set');
		});

		it('HEROKU_REDIS_URLが未設定の場合、エラーをスローする', async () => {
			process.env.GITHUB_CLIENT_ID = 'test_client_id';
			process.env.GITHUB_CLIENT_SECRET = 'test_client_secret';
			process.env.GITHUB_CALLBACK_URL = 'http://localhost:5173/auth/callback';
			process.env.SESSION_SECRET = 'test_secret_key_with_at_least_32_chars';
			process.env.ALLOWED_GITHUB_IDS = '12345';

			const { getEnvConfig } = await import('./env');

			expect(() => getEnvConfig()).toThrow('HEROKU_REDIS_URL is not set');
		});
	});

	describe('isAllowedGithubId', () => {
		it('許可されたGitHub IDの場合、trueを返す', async () => {
			process.env.GITHUB_CLIENT_ID = 'test_client_id';
			process.env.GITHUB_CLIENT_SECRET = 'test_client_secret';
			process.env.GITHUB_CALLBACK_URL = 'http://localhost:5173/auth/callback';
			process.env.SESSION_SECRET = 'test_secret_key_with_at_least_32_chars';
			process.env.ALLOWED_GITHUB_IDS = '12345,67890';
			process.env.HEROKU_REDIS_URL = 'redis://localhost:6379';

			const { isAllowedGithubId } = await import('./env');

			expect(isAllowedGithubId('12345')).toBe(true);
			expect(isAllowedGithubId('67890')).toBe(true);
		});

		it('許可されていないGitHub IDの場合、falseを返す', async () => {
			process.env.GITHUB_CLIENT_ID = 'test_client_id';
			process.env.GITHUB_CLIENT_SECRET = 'test_client_secret';
			process.env.GITHUB_CALLBACK_URL = 'http://localhost:5173/auth/callback';
			process.env.SESSION_SECRET = 'test_secret_key_with_at_least_32_chars';
			process.env.ALLOWED_GITHUB_IDS = '12345,67890';
			process.env.HEROKU_REDIS_URL = 'redis://localhost:6379';

			const { isAllowedGithubId } = await import('./env');

			expect(isAllowedGithubId('99999')).toBe(false);
		});

		it('ALLOWED_GITHUB_IDSが空の場合、すべてfalseを返す', async () => {
			process.env.GITHUB_CLIENT_ID = 'test_client_id';
			process.env.GITHUB_CLIENT_SECRET = 'test_client_secret';
			process.env.GITHUB_CALLBACK_URL = 'http://localhost:5173/auth/callback';
			process.env.SESSION_SECRET = 'test_secret_key_with_at_least_32_chars';
			process.env.ALLOWED_GITHUB_IDS = '';
			process.env.HEROKU_REDIS_URL = 'redis://localhost:6379';

			const { isAllowedGithubId } = await import('./env');

			expect(isAllowedGithubId('12345')).toBe(false);
		});
	});
});
