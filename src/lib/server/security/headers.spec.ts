import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getSecurityHeaders } from './headers';

describe('getSecurityHeaders', () => {
	const originalEnv = process.env.NODE_ENV;
	const testNonce = 'a1b2c3d4e5f67890a1b2c3d4e5f67890';

	afterEach(() => {
		process.env.NODE_ENV = originalEnv;
	});

	describe('本番環境', () => {
		beforeEach(() => {
			process.env.NODE_ENV = 'production';
		});

		it('厳格なCSPヘッダーを返す', () => {
			const headers = getSecurityHeaders(testNonce);
			const csp = headers['Content-Security-Policy'];

			expect(csp).toContain("default-src 'self'");
			expect(csp).toContain(`script-src 'self' 'nonce-${testNonce}'`);
			expect(csp).toContain(`style-src 'self' 'nonce-${testNonce}'`);
			expect(csp).toContain("frame-ancestors 'none'");
			expect(csp).toContain("form-action 'self' https://github.com");
		});

		it('HSTS ヘッダーを含む', () => {
			const headers = getSecurityHeaders(testNonce);
			expect(headers['Strict-Transport-Security']).toBe('max-age=31536000; includeSubDomains');
		});

		it('unsafe-inline を含まない', () => {
			const headers = getSecurityHeaders(testNonce);
			const csp = headers['Content-Security-Policy'];
			expect(csp).not.toContain('unsafe-inline');
		});

		it('unsafe-eval を含まない', () => {
			const headers = getSecurityHeaders(testNonce);
			const csp = headers['Content-Security-Policy'];
			expect(csp).not.toContain('unsafe-eval');
		});

		it('localhost の WebSocket を許可しない', () => {
			const headers = getSecurityHeaders(testNonce);
			const csp = headers['Content-Security-Policy'];
			expect(csp).not.toContain('ws://localhost');
		});
	});

	describe('開発環境', () => {
		beforeEach(() => {
			process.env.NODE_ENV = 'development';
		});

		it('緩和されたCSPヘッダーを返す', () => {
			const headers = getSecurityHeaders(testNonce);
			const csp = headers['Content-Security-Policy'];

			expect(csp).toContain(`script-src 'self' 'nonce-${testNonce}' 'unsafe-eval'`);
			expect(csp).toContain("connect-src 'self' ws://localhost:*");
		});

		it('unsafe-inline を含まない', () => {
			const headers = getSecurityHeaders(testNonce);
			const csp = headers['Content-Security-Policy'];
			expect(csp).not.toContain('unsafe-inline');
		});

		it('HSTS ヘッダーを含まない', () => {
			const headers = getSecurityHeaders(testNonce);
			expect(headers['Strict-Transport-Security']).toBeUndefined();
		});
	});

	describe('共通ヘッダー', () => {
		it('X-Frame-Options を DENY に設定', () => {
			const headers = getSecurityHeaders(testNonce);
			expect(headers['X-Frame-Options']).toBe('DENY');
		});

		it('X-Content-Type-Options を nosniff に設定', () => {
			const headers = getSecurityHeaders(testNonce);
			expect(headers['X-Content-Type-Options']).toBe('nosniff');
		});

		it('Referrer-Policy を設定', () => {
			const headers = getSecurityHeaders(testNonce);
			expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
		});

		it('Permissions-Policy を設定', () => {
			const headers = getSecurityHeaders(testNonce);
			expect(headers['Permissions-Policy']).toContain('geolocation=()');
			expect(headers['Permissions-Policy']).toContain('microphone=()');
			expect(headers['Permissions-Policy']).toContain('camera=()');
		});
	});

	describe('CSP ディレクティブの詳細', () => {
		it('img-src に data: と https: を含む', () => {
			const headers = getSecurityHeaders(testNonce);
			const csp = headers['Content-Security-Policy'];
			expect(csp).toContain("img-src 'self' data: https:");
		});

		it('font-src に data: を含む', () => {
			const headers = getSecurityHeaders(testNonce);
			const csp = headers['Content-Security-Policy'];
			expect(csp).toContain("font-src 'self' data:");
		});

		it('base-uri を self に制限', () => {
			const headers = getSecurityHeaders(testNonce);
			const csp = headers['Content-Security-Policy'];
			expect(csp).toContain("base-uri 'self'");
		});

		it('nonce が正しく含まれる', () => {
			const headers = getSecurityHeaders(testNonce);
			const csp = headers['Content-Security-Policy'];
			expect(csp).toContain(`nonce-${testNonce}`);
		});
	});
});
