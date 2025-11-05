/**
 * セキュリティヘッダーを生成する
 * 環境に応じて適切なヘッダーを返す
 *
 * 注意: CSP (Content-Security-Policy) は svelte.config.js で設定されているため、
 * ここでは設定しない
 */

type SecurityHeaders = Record<string, string>;

/**
 * セキュリティヘッダーを取得（CSP以外）
 */
export const getSecurityHeaders = (): SecurityHeaders => {
	const isDevelopment = process.env.NODE_ENV === 'development';

	const headers: SecurityHeaders = {
		'X-Frame-Options': 'DENY',
		'X-Content-Type-Options': 'nosniff',
		'Referrer-Policy': 'strict-origin-when-cross-origin',
		'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
	};

	// 本番環境のみ HSTS を追加
	if (!isDevelopment) {
		headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
	}

	return headers;
};
