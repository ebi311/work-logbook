import { describe, it, expect } from 'vitest';
import { getEnvConfig, isAllowedGithubId } from './env';

/**
 * 環境変数のテスト
 *
 * 注意: $env/static/private を使用しているため、
 * ビルド時に環境変数が静的にバンドルされます。
 * そのため、テスト実行時には実際の.envファイルの値が使用されます。
 */
describe('Environment Variables', () => {
	describe('getEnvConfig', () => {
		it('環境変数から設定オブジェクトを取得できる', () => {
			const config = getEnvConfig();

			// 環境変数が設定されていることを確認
			expect(config.github.clientId).toBeDefined();
			expect(config.github.clientSecret).toBeDefined();
			expect(config.github.callbackUrl).toBeDefined();
			expect(config.session.secret).toBeDefined();
			expect(config.redis.url).toBeDefined();

			// 型が正しいことを確認
			expect(typeof config.github.clientId).toBe('string');
			expect(typeof config.github.clientSecret).toBe('string');
			expect(typeof config.github.callbackUrl).toBe('string');
			expect(typeof config.session.secret).toBe('string');
			expect(Array.isArray(config.allowedGithubIds)).toBe(true);
			expect(typeof config.redis.url).toBe('string');
		});

		it('allowedGithubIdsが配列として取得できる', () => {
			const config = getEnvConfig();
			expect(Array.isArray(config.allowedGithubIds)).toBe(true);
		});

		it('callbackUrlのデフォルト値が設定される', () => {
			const config = getEnvConfig();
			// GITHUB_CALLBACK_URLが未設定の場合、デフォルト値が使用される
			expect(config.github.callbackUrl).toContain('/auth/callback');
		});
	});

	describe('isAllowedGithubId', () => {
		it('GitHub IDのチェックができる', () => {
			const config = getEnvConfig();

			if (config.allowedGithubIds.length > 0) {
				// ホワイトリストに登録されているIDはtrueを返す
				const firstAllowedId = config.allowedGithubIds[0];
				expect(isAllowedGithubId(firstAllowedId)).toBe(true);

				// 登録されていないIDはfalseを返す
				expect(isAllowedGithubId('99999999')).toBe(false);
			} else {
				// ホワイトリストが空の場合、すべてfalseを返す
				expect(isAllowedGithubId('12345')).toBe(false);
			}
		});
	});
});
