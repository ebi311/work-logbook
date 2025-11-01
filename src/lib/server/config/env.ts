/**
 * 環境変数の設定と検証
 * NF-001: GitHub OAuth認証
 */

import {
	GITHUB_CLIENT_ID,
	GITHUB_CLIENT_SECRET,
	GITHUB_CALLBACK_URL,
	SESSION_SECRET,
	ALLOWED_GITHUB_IDS,
	REDIS_URL,
} from '$env/static/private';

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
	if (!GITHUB_CLIENT_ID) {
		throw new Error('GITHUB_CLIENT_ID is not set');
	}

	if (!GITHUB_CLIENT_SECRET) {
		throw new Error('GITHUB_CLIENT_SECRET is not set');
	}

	const githubCallbackUrl = GITHUB_CALLBACK_URL || 'http://localhost:5173/auth/callback';

	// セッション設定
	if (!SESSION_SECRET) {
		throw new Error('SESSION_SECRET is not set');
	}

	// 許可されたGitHub IDのリスト
	const allowedGithubIdsStr = ALLOWED_GITHUB_IDS || '';
	const allowedGithubIds = allowedGithubIdsStr
		.split(',')
		.map((id) => id.trim())
		.filter((id) => id.length > 0);

	// Redis URL
	if (!REDIS_URL) {
		throw new Error('REDIS_URL is not set');
	}

	return {
		github: {
			clientId: GITHUB_CLIENT_ID,
			clientSecret: GITHUB_CLIENT_SECRET,
			callbackUrl: githubCallbackUrl,
		},
		session: {
			secret: SESSION_SECRET,
		},
		allowedGithubIds,
		redis: {
			url: REDIS_URL,
		},
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
