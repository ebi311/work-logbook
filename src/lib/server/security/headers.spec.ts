import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getSecurityHeaders } from './headers';

describe('getSecurityHeaders', () => {
	const originalEnv = process.env.NODE_ENV;

	afterEach(() => {
		process.env.NODE_ENV = originalEnv;
	});

	describe('本番環境', () => {
		beforeEach(() => {
			process.env.NODE_ENV = 'production';
		});

		it('HSTS ヘッダーを含む', () => {
			const headers = getSecurityHeaders();
			expect(headers['Strict-Transport-Security']).toBe('max-age=31536000; includeSubDomains');
		});

		it('CSPヘッダーを含まない（SvelteKitが管理）', () => {
			const headers = getSecurityHeaders();
			expect(headers['Content-Security-Policy']).toBeUndefined();
		});
	});

	describe('開発環境', () => {
		beforeEach(() => {
			process.env.NODE_ENV = 'development';
		});

		it('HSTS ヘッダーを含まない', () => {
			const headers = getSecurityHeaders();
			expect(headers['Strict-Transport-Security']).toBeUndefined();
		});

		it('CSPヘッダーを含まない（SvelteKitが管理）', () => {
			const headers = getSecurityHeaders();
			expect(headers['Content-Security-Policy']).toBeUndefined();
		});
	});

	describe('共通ヘッダー', () => {
		it('X-Frame-Options を DENY に設定', () => {
			const headers = getSecurityHeaders();
			expect(headers['X-Frame-Options']).toBe('DENY');
		});

		it('X-Content-Type-Options を nosniff に設定', () => {
			const headers = getSecurityHeaders();
			expect(headers['X-Content-Type-Options']).toBe('nosniff');
		});

		it('Referrer-Policy を設定', () => {
			const headers = getSecurityHeaders();
			expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
		});

		it('Permissions-Policy を設定', () => {
			const headers = getSecurityHeaders();
			expect(headers['Permissions-Policy']).toContain('geolocation=()');
			expect(headers['Permissions-Policy']).toContain('microphone=()');
			expect(headers['Permissions-Policy']).toContain('camera=()');
		});
	});
});
