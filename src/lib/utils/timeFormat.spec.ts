import { describe, it, expect } from 'vitest';
import {
	formatDuration,
	formatDate,
	formatTime,
	calculateDuration,
	toDatetimeLocal,
} from './timeFormat';

describe('timeFormat', () => {
	describe('formatDuration', () => {
		it('1時間1分1秒（3661秒）を "01:01" にフォーマット', () => {
			expect(formatDuration(3661)).toBe('01:01');
		});

		it('0秒を "00:00" にフォーマット', () => {
			expect(formatDuration(0)).toBe('00:00');
		});

		it('23時間59分59秒（86399秒）を "23:59" にフォーマット', () => {
			expect(formatDuration(86399)).toBe('23:59');
		});

		it('1時間30分（5400秒）を "01:30" にフォーマット', () => {
			expect(formatDuration(5400)).toBe('01:30');
		});

		it('30秒を "00:00" にフォーマット（分未満は切り捨て）', () => {
			expect(formatDuration(30)).toBe('00:00');
		});

		it('24時間以上（86400秒）を "24:00" にフォーマット', () => {
			expect(formatDuration(86400)).toBe('24:00');
		});

		it('100時間（360000秒）を "100:00" にフォーマット', () => {
			expect(formatDuration(360000)).toBe('100:00');
		});
	});

	describe('formatDate', () => {
		it('ISO文字列をYYYY-MM-DD形式にフォーマット', () => {
			const isoString = '2025-10-25T12:30:00.000Z';
			const result = formatDate(isoString);
			// ローカルタイムゾーンに依存するため、形式のみチェック
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		});

		it('異なる日付でも正しくフォーマット', () => {
			const isoString = '2025-01-01T00:00:00.000Z';
			const result = formatDate(isoString);
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		});
	});

	describe('formatTime', () => {
		it('ISO文字列をHH:mm形式にフォーマット', () => {
			const isoString = '2025-10-25T12:30:00.000Z';
			const result = formatTime(isoString);
			// ローカルタイムゾーンに依存するため、形式のみチェック
			expect(result).toMatch(/^\d{2}:\d{2}$/);
		});

		it('深夜0時を正しくフォーマット', () => {
			const isoString = '2025-10-25T00:00:00.000Z';
			const result = formatTime(isoString);
			expect(result).toMatch(/^\d{2}:\d{2}$/);
		});

		it('23時台を正しくフォーマット', () => {
			const isoString = '2025-10-25T23:59:00.000Z';
			const result = formatTime(isoString);
			expect(result).toMatch(/^\d{2}:\d{2}$/);
		});
	});

	describe('calculateDuration', () => {
		it('終了済み作業の作業時間を計算（秒単位）', () => {
			const startedAt = '2025-10-25T10:00:00.000Z';
			const endedAt = '2025-10-25T11:30:00.000Z';
			const serverNow = '2025-10-25T12:00:00.000Z';

			const result = calculateDuration(startedAt, endedAt, serverNow);
			expect(result).toBe(5400); // 1.5時間 = 5400秒
		});

		it('進行中作業（endedAt=null）の場合はnullを返す', () => {
			const startedAt = '2025-10-25T10:00:00.000Z';
			const endedAt = null;
			const serverNow = '2025-10-25T12:00:00.000Z';

			const result = calculateDuration(startedAt, endedAt, serverNow);
			expect(result).toBeNull();
		});

		it('1秒の作業時間を正しく計算', () => {
			const startedAt = '2025-10-25T10:00:00.000Z';
			const endedAt = '2025-10-25T10:00:01.000Z';
			const serverNow = '2025-10-25T12:00:00.000Z';

			const result = calculateDuration(startedAt, endedAt, serverNow);
			expect(result).toBe(1);
		});

		it('24時間の作業時間を正しく計算', () => {
			const startedAt = '2025-10-25T00:00:00.000Z';
			const endedAt = '2025-10-26T00:00:00.000Z';
			const serverNow = '2025-10-26T12:00:00.000Z';

			const result = calculateDuration(startedAt, endedAt, serverNow);
			expect(result).toBe(86400); // 24時間 = 86400秒
		});
	});

	describe('toDatetimeLocal', () => {
		it('DateオブジェクトをYYYY-MM-DDTHH:mm形式にフォーマット', () => {
			const date = new Date('2024-10-27T09:30:00.000Z');
			const result = toDatetimeLocal(date);
			// datetime-local形式（YYYY-MM-DDTHH:mm）
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
		});

		it('異なる日付でも正しくフォーマット', () => {
			const date = new Date('2024-01-01T00:00:00.000Z');
			const result = toDatetimeLocal(date);
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
		});

		it('深夜0時を正しくフォーマット', () => {
			const date = new Date('2024-12-31T23:59:00.000Z');
			const result = toDatetimeLocal(date);
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
		});
	});
});
