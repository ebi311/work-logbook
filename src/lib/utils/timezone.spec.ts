import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	getTodayStart,
	getDateStart,
	getMonthStart,
	formatInTimezone,
	getMonthRange,
	DEFAULT_TIMEZONE,
} from './timezone';

describe('timezone utilities', () => {
	beforeEach(() => {
		// 現在時刻を固定: 2025-11-07 15:30:45 JST
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2025-11-07T15:30:45+09:00'));
	});

	describe('getTodayStart', () => {
		it('JST で今日の開始時刻を取得', () => {
			const result = getTodayStart('Asia/Tokyo');
			expect(result).toBe('2025-11-07T00:00:00+09:00');
		});

		it('UTC で今日の開始時刻を取得', () => {
			const result = getTodayStart('UTC');
			// 2025-11-07 15:30:45 JST = 2025-11-07 06:30:45 UTC
			// UTC の今日の開始 = 2025-11-07T00:00:00Z
			expect(result).toBe('2025-11-07T00:00:00Z');
		});
		it('ニューヨークで今日の開始時刻を取得', () => {
			const result = getTodayStart('America/New_York');
			// 2025-11-07 15:30:45 JST = 2025-11-07 01:30:45 EST
			// EST の今日の開始 = 2025-11-07T00:00:00-05:00
			expect(result).toBe('2025-11-07T00:00:00-05:00');
		});
	});

	describe('getDateStart', () => {
		it('文字列形式の日付から開始時刻を取得', () => {
			const result = getDateStart('2025-10-15', 'Asia/Tokyo');
			expect(result).toBe('2025-10-15T00:00:00+09:00');
		});

		it('Date オブジェクトから開始時刻を取得', () => {
			const date = new Date('2025-10-15T12:34:56+09:00');
			const result = getDateStart(date, 'Asia/Tokyo');
			expect(result).toBe('2025-10-15T00:00:00+09:00');
		});

		it('異なるタイムゾーンで日付の開始時刻を取得', () => {
			const result = getDateStart('2025-10-15', 'America/New_York');
			// 日付文字列 '2025-10-15' はローカルタイムゾーンとして解釈され、
			// それをAmerica/New_Yorkに変換すると前日になる場合がある
			expect(result).toBe('2025-10-14T00:00:00-04:00'); // EDT
		});
	});
	describe('getMonthStart', () => {
		it('JST で今月の開始時刻を取得', () => {
			const result = getMonthStart('Asia/Tokyo');
			expect(result).toBe('2025-11-01T00:00:00+09:00');
		});

		it('UTC で今月の開始時刻を取得', () => {
			const result = getMonthStart('UTC');
			expect(result).toBe('2025-11-01T00:00:00Z');
		});

		it('月をまたぐタイムゾーン差を考慮', () => {
			// 2025-11-01 00:00 JST = 2025-10-31 15:00 UTC
			vi.setSystemTime(new Date('2025-11-01T00:30:00+09:00'));
			const resultJST = getMonthStart('Asia/Tokyo');
			const resultUTC = getMonthStart('UTC');

			expect(resultJST).toBe('2025-11-01T00:00:00+09:00');
			// UTC では 10/31 15:00 なので、UTC の今月 = 10月
			expect(resultUTC).toBe('2025-10-01T00:00:00Z');
		});
	});

	describe('formatInTimezone', () => {
		it('デフォルトフォーマットで日時を表示', () => {
			const date = '2025-11-07T15:30:45+09:00';
			const result = formatInTimezone(date, 'Asia/Tokyo');
			expect(result).toBe('2025-11-07 15:30:45');
		});

		it('カスタムフォーマットで日時を表示', () => {
			const date = '2025-11-07T15:30:45+09:00';
			const result = formatInTimezone(date, 'Asia/Tokyo', 'YYYY/MM/DD HH:mm');
			expect(result).toBe('2025/11/07 15:30');
		});

		it('異なるタイムゾーンで日時を表示', () => {
			const date = '2025-11-07T15:30:45+09:00';
			// JST 15:30 = UTC 06:30
			const result = formatInTimezone(date, 'UTC', 'YYYY-MM-DD HH:mm:ss');
			expect(result).toBe('2025-11-07 06:30:45');
		});

		it('Date オブジェクトをフォーマット', () => {
			const date = new Date('2025-11-07T15:30:45+09:00');
			const result = formatInTimezone(date, 'Asia/Tokyo', 'MM/DD HH:mm');
			expect(result).toBe('11/07 15:30');
		});
	});

	describe('DEFAULT_TIMEZONE', () => {
		it('デフォルトタイムゾーンは Asia/Tokyo', () => {
			expect(DEFAULT_TIMEZONE).toBe('Asia/Tokyo');
		});
	});

	describe('getMonthRange', () => {
		it('JST で指定月の範囲を取得', () => {
			const result = getMonthRange('2025-10', 'Asia/Tokyo');
			expect(result.from).toBe('2025-10-01T00:00:00+09:00');
			expect(result.to).toBe('2025-11-01T00:00:00+09:00');
		});

		it('UTC で指定月の範囲を取得', () => {
			const result = getMonthRange('2025-10', 'UTC');
			expect(result.from).toBe('2025-10-01T00:00:00Z');
			expect(result.to).toBe('2025-11-01T00:00:00Z');
		});

		it('12月の範囲を取得(翌年1月になる)', () => {
			const result = getMonthRange('2025-12', 'Asia/Tokyo');
			expect(result.from).toBe('2025-12-01T00:00:00+09:00');
			expect(result.to).toBe('2026-01-01T00:00:00+09:00');
		});

		it('異なるタイムゾーンで月の範囲を取得', () => {
			const result = getMonthRange('2025-10', 'America/New_York');
			// EDT (UTC-4)
			expect(result.from).toBe('2025-10-01T00:00:00-04:00');
			expect(result.to).toBe('2025-11-01T00:00:00-04:00');
		});

		it('不正な形式の場合はエラー', () => {
			expect(() => getMonthRange('2025/10', 'Asia/Tokyo')).toThrow('Invalid month format: 2025/10');
			expect(() => getMonthRange('202510', 'Asia/Tokyo')).toThrow('Invalid month format');
		});
	});
});
