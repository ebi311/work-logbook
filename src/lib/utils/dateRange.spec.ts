import { describe, it, expect } from 'vitest';
import { getMonthRange } from './dateRange';

describe('getMonthRange', () => {
	it('通常の月（2025-10）の範囲を正しく返す', () => {
		const { from, toExclusive } = getMonthRange('2025-10');

		expect(from.toISOString()).toBe('2025-10-01T00:00:00.000Z');
		expect(toExclusive.toISOString()).toBe('2025-11-01T00:00:00.000Z');
	});

	it('年初の月（2025-01）の範囲を正しく返す', () => {
		const { from, toExclusive } = getMonthRange('2025-01');

		expect(from.toISOString()).toBe('2025-01-01T00:00:00.000Z');
		expect(toExclusive.toISOString()).toBe('2025-02-01T00:00:00.000Z');
	});

	it('年末の月（2025-12）の範囲を正しく返し、翌年1月初にまたぐ', () => {
		const { from, toExclusive } = getMonthRange('2025-12');

		expect(from.toISOString()).toBe('2025-12-01T00:00:00.000Z');
		expect(toExclusive.toISOString()).toBe('2026-01-01T00:00:00.000Z');
	});

	it('うるう年の2月（2024-02）は29日まで、toExclusiveは3月初', () => {
		const { from, toExclusive } = getMonthRange('2024-02');

		expect(from.toISOString()).toBe('2024-02-01T00:00:00.000Z');
		expect(toExclusive.toISOString()).toBe('2024-03-01T00:00:00.000Z');
	});

	it('平年の2月（2025-02）は28日まで、toExclusiveは3月初', () => {
		const { from, toExclusive } = getMonthRange('2025-02');

		expect(from.toISOString()).toBe('2025-02-01T00:00:00.000Z');
		expect(toExclusive.toISOString()).toBe('2025-03-01T00:00:00.000Z');
	});

	it('不正な形式（YYYY-MM以外）では例外を投げる', () => {
		expect(() => getMonthRange('2025/10')).toThrow();
		expect(() => getMonthRange('202510')).toThrow();
		expect(() => getMonthRange('invalid')).toThrow();
	});

	it('存在しない月（13月など）では例外を投げる', () => {
		expect(() => getMonthRange('2025-13')).toThrow();
		expect(() => getMonthRange('2025-00')).toThrow();
	});
});
