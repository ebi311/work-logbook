import { describe, it, expect } from 'vitest';
import { validateTimeRange, validateDescription, isFutureDate } from './validation';

describe('validation ユーティリティ', () => {
	describe('validateTimeRange()', () => {
		it('TC1: 正常系 - 開始 < 終了の場合、{ valid: true } を返す', () => {
			const startedAt = new Date('2025-10-20T12:00:00.000Z');
			const endedAt = new Date('2025-10-20T13:00:00.000Z');

			const result = validateTimeRange(startedAt, endedAt);

			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('TC2: 異常系 - 開始 >= 終了の場合（同じ時刻）', () => {
			const startedAt = new Date('2025-10-20T12:00:00.000Z');
			const endedAt = new Date('2025-10-20T12:00:00.000Z');

			const result = validateTimeRange(startedAt, endedAt);

			expect(result.valid).toBe(false);
			expect(result.error).toBe('開始時刻は終了時刻より前である必要があります');
		});

		it('TC2-2: 異常系 - 開始 > 終了の場合', () => {
			const startedAt = new Date('2025-10-20T13:00:00.000Z');
			const endedAt = new Date('2025-10-20T12:00:00.000Z');

			const result = validateTimeRange(startedAt, endedAt);

			expect(result.valid).toBe(false);
			expect(result.error).toBe('開始時刻は終了時刻より前である必要があります');
		});

		it('TC3: 異常系 - 開始が未来の日時', () => {
			const futureDate = new Date(Date.now() + 1000 * 60 * 60); // 1時間後
			const endedAt = new Date(Date.now() + 1000 * 60 * 60 * 2); // 2時間後

			const result = validateTimeRange(futureDate, endedAt);

			expect(result.valid).toBe(false);
			expect(result.error).toBe('未来の時刻は設定できません');
		});

		it('TC4: 異常系 - 終了が未来の日時', () => {
			const startedAt = new Date('2025-10-20T12:00:00.000Z');
			const futureDate = new Date(Date.now() + 1000 * 60 * 60); // 1時間後

			const result = validateTimeRange(startedAt, futureDate);

			expect(result.valid).toBe(false);
			expect(result.error).toBe('未来の時刻は設定できません');
		});
	});

	describe('validateDescription()', () => {
		it('TC5: 正常系 - 10,000文字以内の場合、{ valid: true } を返す', () => {
			const description = 'テスト作業内容';

			const result = validateDescription(description);

			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('TC5-2: 正常系 - 空文字列の場合', () => {
			const description = '';

			const result = validateDescription(description);

			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('TC5-3: 正常系 - ちょうど10,000文字の場合', () => {
			const description = 'a'.repeat(10000);

			const result = validateDescription(description);

			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('TC6: 異常系 - 10,000文字超の場合', () => {
			const description = 'a'.repeat(10001);

			const result = validateDescription(description);

			expect(result.valid).toBe(false);
			expect(result.error).toBe('作業内容は10,000文字以内で入力してください');
		});
	});

	describe('isFutureDate()', () => {
		it('TC7: 未来の日時の場合、true を返す', () => {
			const futureDate = new Date(Date.now() + 1000 * 60 * 60); // 1時間後

			const result = isFutureDate(futureDate);

			expect(result).toBe(true);
		});

		it('TC8: 過去の日時の場合、false を返す', () => {
			const pastDate = new Date('2025-10-20T12:00:00.000Z');

			const result = isFutureDate(pastDate);

			expect(result).toBe(false);
		});

		it('TC8-2: 現在時刻（境界値）の場合、false を返す', () => {
			const now = new Date();

			const result = isFutureDate(now);

			expect(result).toBe(false);
		});
	});
});
