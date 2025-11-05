import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import { isOnline } from './status';

describe('network/status', () => {
	describe('isOnline', () => {
		it('ストアの値を設定できる', () => {
			isOnline.set(false);
			expect(get(isOnline)).toBe(false);

			isOnline.set(true);
			expect(get(isOnline)).toBe(true);
		});

		it('ストアを購読できる', () => {
			let currentValue: boolean | undefined;
			const unsubscribe = isOnline.subscribe((value) => {
				currentValue = value;
			});

			expect(currentValue).toBeDefined();
			unsubscribe();
		});
	});
});
