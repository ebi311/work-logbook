/**
 * セキュリティヘッダーを生成する
 * 環境に応じて適切なヘッダーを返す
 */

type SecurityHeaders = Record<string, string>;

/**
 * Content Security Policy (CSP) を生成
 * @param isDevelopment 開発環境かどうか
 * @param nonce リクエストごとのユニークな値（インラインスクリプト・スタイル用）
 */
const generateCSP = (isDevelopment: boolean, nonce: string): string => {
	const directives: string[] = [
		"default-src 'self'",
		isDevelopment
			? `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'`
			: `script-src 'self' 'nonce-${nonce}'`,
		`style-src 'self' 'nonce-${nonce}'`,
		"img-src 'self' data: https:",
		"font-src 'self' data:",
		isDevelopment ? "connect-src 'self' ws://localhost:*" : "connect-src 'self'",
		"frame-ancestors 'none'",
		"base-uri 'self'",
		"form-action 'self' https://github.com",
	];

	return directives.join('; ');
};

/**
 * セキュリティヘッダーを取得
 * @param nonce リクエストごとのユニークな値（CSP用）
 */
export const getSecurityHeaders = (nonce: string): SecurityHeaders => {
	const isDevelopment = process.env.NODE_ENV === 'development';

	const headers: SecurityHeaders = {
		'Content-Security-Policy': generateCSP(isDevelopment, nonce),
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
