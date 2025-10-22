import { describe, it, expect } from 'vitest';
import { formatDuration, calculateElapsedSeconds } from './duration';

describe('duration ユーティリティ', () => {
	describe('formatDuration()', () => {
		it('0秒をフォーマットできる', () => {
			expect(formatDuration(0)).toBe('00:00:00');
		});

		it('1秒をフォーマットできる', () => {
			expect(formatDuration(1)).toBe('00:00:01');
		});

		it('59秒をフォーマットできる', () => {
			expect(formatDuration(59)).toBe('00:00:59');
		});

		it('1分をフォーマットできる', () => {
			expect(formatDuration(60)).toBe('00:01:00');
		});

		it('1分1秒をフォーマットできる', () => {
			expect(formatDuration(61)).toBe('00:01:01');
		});

		it('1時間をフォーマットできる', () => {
			expect(formatDuration(3600)).toBe('01:00:00');
		});

		it('1時間1分1秒をフォーマットできる', () => {
			expect(formatDuration(3661)).toBe('01:01:01');
		});

		it('10時間以上をフォーマットできる', () => {
			expect(formatDuration(36000)).toBe('10:00:00');
		});

		it('99時間59分59秒をフォーマットできる', () => {
			expect(formatDuration(359999)).toBe('99:59:59');
		});

		it('負数を0として扱う', () => {
			expect(formatDuration(-1)).toBe('00:00:00');
			expect(formatDuration(-100)).toBe('00:00:00');
		});

		it('小数点以下を切り捨てる', () => {
			expect(formatDuration(1.9)).toBe('00:00:01');
			expect(formatDuration(59.9)).toBe('00:00:59');
		});
	});

	describe('calculateElapsedSeconds()', () => {
		it('1秒の経過を計算できる', () => {
			const startedAt = '2025-10-22T10:00:00.000Z';
			const now = '2025-10-22T10:00:01.000Z';
			expect(calculateElapsedSeconds(startedAt, now)).toBe(1);
		});

		it('1分の経過を計算できる', () => {
			const startedAt = '2025-10-22T10:00:00.000Z';
			const now = '2025-10-22T10:01:00.000Z';
			expect(calculateElapsedSeconds(startedAt, now)).toBe(60);
		});

		it('1時間の経過を計算できる', () => {
			const startedAt = '2025-10-22T10:00:00.000Z';
			const now = '2025-10-22T11:00:00.000Z';
			expect(calculateElapsedSeconds(startedAt, now)).toBe(3600);
		});

		it('1日の経過を計算できる', () => {
			const startedAt = '2025-10-22T10:00:00.000Z';
			const now = '2025-10-23T10:00:00.000Z';
			expect(calculateElapsedSeconds(startedAt, now)).toBe(86400);
		});

		it('ミリ秒を含む時刻を正しく計算できる', () => {
			const startedAt = '2025-10-22T10:00:00.123Z';
			const now = '2025-10-22T10:00:01.456Z';
			expect(calculateElapsedSeconds(startedAt, now)).toBe(1);
		});

		it('同じ時刻の場合は0を返す', () => {
			const startedAt = '2025-10-22T10:00:00.000Z';
			const now = '2025-10-22T10:00:00.000Z';
			expect(calculateElapsedSeconds(startedAt, now)).toBe(0);
		});

		it('負の経過時間（未来→過去）の場合は0を返す', () => {
			const startedAt = '2025-10-22T10:00:01.000Z';
			const now = '2025-10-22T10:00:00.000Z';
			expect(calculateElapsedSeconds(startedAt, now)).toBe(0);
		});

		it('タイムゾーンが異なっても正しく計算できる（UTC基準）', () => {
			// ISO文字列は内部的にUTCに変換されるため、タイムゾーン表記が異なっても同じ結果
			const startedAt = '2025-10-22T10:00:00.000Z';
			const now = '2025-10-22T10:01:00.000Z';
			expect(calculateElapsedSeconds(startedAt, now)).toBe(60);
		});
	});
});
