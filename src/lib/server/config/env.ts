/**
 * 環境変数の設定と検証
 * NF-001: GitHub OAuth認証
 */

// 環境変数の型定義
export interface EnvConfig {
	github: {
		clientId: string;
		clientSecret: string;
		callbackUrl: string;
	};
	session: {
		secret: string;
	};
	allowedGithubIds: string[];
	redis: {
		url: string;
	};
}

/**
 * 環境変数を取得して検証する
 * @throws {Error} 必須の環境変数が未設定の場合
 */
export const getEnvConfig = (): EnvConfig => {
	// GitHub OAuth設定
	const githubClientId = process.env.GITHUB_CLIENT_ID;
	if (!githubClientId) {
		throw new Error('GITHUB_CLIENT_ID is not set');
	}

	const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
	if (!githubClientSecret) {
		throw new Error('GITHUB_CLIENT_SECRET is not set');
	}

	const githubCallbackUrl =
		process.env.GITHUB_CALLBACK_URL || 'http://localhost:5173/auth/callback';

	// セッション設定
	const sessionSecret = process.env.SESSION_SECRET;
	if (!sessionSecret) {
		throw new Error('SESSION_SECRET is not set');
	}

	// 許可されたGitHub IDのリスト
	const allowedGithubIdsStr = process.env.ALLOWED_GITHUB_IDS || '';
	const allowedGithubIds = allowedGithubIdsStr
		.split(',')
		.map((id) => id.trim())
		.filter((id) => id.length > 0);

	// Redis URL
	const redisUrl = process.env.HEROKU_REDIS_URL;
	if (!redisUrl) {
		throw new Error('HEROKU_REDIS_URL is not set');
	}

	return {
		github: {
			clientId: githubClientId,
			clientSecret: githubClientSecret,
			callbackUrl: githubCallbackUrl
		},
		session: {
			secret: sessionSecret
		},
		allowedGithubIds,
		redis: {
			url: redisUrl
		}
	};
};

/**
 * 指定されたGitHub IDが許可されているかチェック
 * @param githubId チェックするGitHub ID
 * @returns 許可されている場合true
 */
export const isAllowedGithubId = (githubId: string): boolean => {
	const config = getEnvConfig();
	return config.allowedGithubIds.includes(githubId);
};
