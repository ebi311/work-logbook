import { describe, it, expect } from 'vitest';
import { generateNonce } from './nonce';

describe('generateNonce', () => {
	it('32文字の16進数文字列を生成する', () => {
		const nonce = generateNonce();
		expect(nonce).toHaveLength(32);
		expect(nonce).toMatch(/^[0-9a-f]{32}$/);
	});

	it('呼び出すたびに異なる値を生成する', () => {
		const nonce1 = generateNonce();
		const nonce2 = generateNonce();
		const nonce3 = generateNonce();

		expect(nonce1).not.toBe(nonce2);
		expect(nonce2).not.toBe(nonce3);
		expect(nonce1).not.toBe(nonce3);
	});

	it('大量に生成しても重複しない（統計的確認）', () => {
		const nonces = new Set<string>();
		const count = 1000;

		for (let i = 0; i < count; i++) {
			nonces.add(generateNonce());
		}

		// すべて一意であることを確認
		expect(nonces.size).toBe(count);
	});
});
