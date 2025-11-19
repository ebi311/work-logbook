import { describe, it, expect } from 'vitest';
import { toLocalDateTimeInputValue, fromLocalDateTimeInputValue } from './datetimeLocal';

/**
 * F-001.2: datetime-local 変換ユーティリティのテスト
 */

describe('datetimeLocal utilities', () => {
	describe('toLocalDateTimeInputValue', () => {
		it('UTC ISO文字列をローカル datetime-local 形式に変換できる', () => {
			// 2025-11-19T10:30:00Z (UTC)
			const isoString = '2025-11-19T10:30:00.000Z';
			const result = toLocalDateTimeInputValue(isoString);

			// ローカルタイムゾーンに依存するため、形式のみチェック
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
		});

		it('Date オブジェクトをローカル datetime-local 形式に変換できる', () => {
			const date = new Date('2025-11-19T10:30:00Z');
			const result = toLocalDateTimeInputValue(date);

			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
		});

		it('ミリ秒が切り捨てられる', () => {
			const isoString = '2025-11-19T10:30:45.999Z';
			const result = toLocalDateTimeInputValue(isoString);

			// 秒まで含まれている（ミリ秒は datetime-local では扱わない）
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
		});

		it('タイムゾーンオフセットが考慮される', () => {
			// JST (UTC+9) の環境で 2025-11-19T10:30:00Z は 2025-11-19T19:30 になる
			const isoString = '2025-11-19T10:30:00Z';
			const date = new Date(isoString);
			const result = toLocalDateTimeInputValue(date);

			// ローカル時刻を手動計算
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');
			const hours = String(date.getHours()).padStart(2, '0');
			const minutes = String(date.getMinutes()).padStart(2, '0');
			const expected = `${year}-${month}-${day}T${hours}:${minutes}`;

			expect(result).toBe(expected);
		});
	});

	describe('fromLocalDateTimeInputValue', () => {
		it('datetime-local 形式をUTC ISO文字列に変換できる', () => {
			const localValue = '2025-11-19T19:30';
			const result = fromLocalDateTimeInputValue(localValue);

			// ISO形式であることを確認
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
		});

		it('往復変換で元の Date と同じ時刻になる', () => {
			const originalDate = new Date('2025-11-19T10:30:00Z');
			const localValue = toLocalDateTimeInputValue(originalDate);
			const isoString = fromLocalDateTimeInputValue(localValue);
			const convertedDate = new Date(isoString);

			// ミリ秒は datetime-local では扱わないため、秒までの比較
			expect(Math.floor(convertedDate.getTime() / 1000)).toBe(
				Math.floor(originalDate.getTime() / 1000),
			);
		});

		it('空文字列の場合は現在時刻のISO文字列を返す', () => {
			const result = fromLocalDateTimeInputValue('');

			// ISO形式であることを確認
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

			// 現在時刻付近であることを確認（1秒以内）
			const now = Date.now();
			const resultTime = new Date(result).getTime();
			expect(Math.abs(now - resultTime)).toBeLessThan(1000);
		});
	});

	describe('相互変換', () => {
		it('toLocalDateTimeInputValue と fromLocalDateTimeInputValue は逆変換の関係', () => {
			const isoString = '2025-11-19T10:30:00.000Z';
			const localValue = toLocalDateTimeInputValue(isoString);
			const backToIso = fromLocalDateTimeInputValue(localValue);

			// ミリ秒は切り捨てられるため、秒までの比較
			const original = new Date(isoString);
			const converted = new Date(backToIso);
			expect(Math.floor(converted.getTime() / 1000)).toBe(Math.floor(original.getTime() / 1000));
		});
	});
});
