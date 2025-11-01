import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { normalizeWorkLogQuery } from './queryNormalizer';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

describe('normalizeWorkLogQuery', () => {
	// 固定された "現在時刻" を使用
	const fixedNow = new Date('2025-10-25T12:00:00Z');

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(fixedNow);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('優先順位: month > date > from/to', () => {
		it('month が指定されている場合、date と from/to は無視される', () => {
			const result = normalizeWorkLogQuery({
				month: '2025-09',
				date: '2025-10-15',
				from: '2025-08-01',
				to: '2025-08-31',
			});

			// 2025-09-01 00:00:00Z 〜 2025-10-01 00:00:00Z
			expect(result.from).toEqual(new Date('2025-09-01T00:00:00Z'));
			expect(result.to).toEqual(new Date('2025-09-30T23:59:59.999Z'));
			expect(result.month).toBe('2025-09');
		});

		it('date が指定されている場合、from/to は無視される', () => {
			const result = normalizeWorkLogQuery({
				date: '2025-10-15',
				from: '2025-08-01',
				to: '2025-08-31',
			});

			// 2025-10-15 00:00:00Z 〜 2025-10-15 23:59:59.999Z
			expect(result.from).toEqual(new Date('2025-10-15T00:00:00Z'));
			expect(result.to).toEqual(new Date('2025-10-15T23:59:59.999Z'));
			expect(result.month).toBeUndefined();
		});

		it('from/to のみ指定されている場合、そのまま使用', () => {
			const result = normalizeWorkLogQuery({
				from: '2025-08-01',
				to: '2025-08-31',
			});

			expect(result.from).toEqual(new Date('2025-08-01T00:00:00Z'));
			expect(result.to).toEqual(new Date('2025-08-31T23:59:59.999Z'));
			expect(result.month).toBeUndefined();
		});

		it('何も指定されていない場合、今月をデフォルトとする', () => {
			const result = normalizeWorkLogQuery({});

			// 2025-10-01 00:00:00Z 〜 2025-10-31 23:59:59.999Z
			expect(result.from).toEqual(new Date('2025-10-01T00:00:00Z'));
			expect(result.to).toEqual(new Date('2025-10-31T23:59:59.999Z'));
			expect(result.month).toBe('2025-10');
		});
	});

	describe('page/size バリデーション', () => {
		it('page が未指定の場合、デフォルトは 1', () => {
			const result = normalizeWorkLogQuery({});

			expect(result.page).toBe(1);
		});

		it('page が 0 以下の場合、1 に丸める', () => {
			const result = normalizeWorkLogQuery({ page: 0 });
			expect(result.page).toBe(1);

			const result2 = normalizeWorkLogQuery({ page: -5 });
			expect(result2.page).toBe(1);
		});

		it('page が正の整数の場合、そのまま使用', () => {
			const result = normalizeWorkLogQuery({ page: 5 });
			expect(result.page).toBe(5);
		});

		it('size が未指定の場合、デフォルトは 20', () => {
			const result = normalizeWorkLogQuery({});

			expect(result.size).toBe(20);
		});

		it('size が 10 未満の場合、10 に丸める', () => {
			const result = normalizeWorkLogQuery({ size: 5 });
			expect(result.size).toBe(10);
		});

		it('size が 100 超の場合、100 に丸める', () => {
			const result = normalizeWorkLogQuery({ size: 150 });
			expect(result.size).toBe(100);
		});

		it('size が 10〜100 の範囲内の場合、そのまま使用', () => {
			const result = normalizeWorkLogQuery({ size: 50 });
			expect(result.size).toBe(50);
		});
	});

	describe('offset 計算', () => {
		it('offset は (page - 1) * size で計算される', () => {
			const result = normalizeWorkLogQuery({ page: 1, size: 20 });
			expect(result.offset).toBe(0);

			const result2 = normalizeWorkLogQuery({ page: 3, size: 20 });
			expect(result2.offset).toBe(40);

			const result3 = normalizeWorkLogQuery({ page: 2, size: 50 });
			expect(result3.offset).toBe(50);
		});
	});

	describe('不正な日付フォーマット', () => {
		it('month が不正な形式の場合、今月をデフォルトとする', () => {
			const result = normalizeWorkLogQuery({ month: 'invalid' });

			// 今月（2025-10）にフォールバック
			expect(result.from).toEqual(new Date('2025-10-01T00:00:00Z'));
			expect(result.to).toEqual(new Date('2025-10-31T23:59:59.999Z'));
			expect(result.month).toBe('2025-10');
		});

		it('date が不正な形式の場合、今月をデフォルトとする', () => {
			const result = normalizeWorkLogQuery({ date: 'not-a-date' });

			expect(result.from).toEqual(new Date('2025-10-01T00:00:00Z'));
			expect(result.to).toEqual(new Date('2025-10-31T23:59:59.999Z'));
			expect(result.month).toBe('2025-10');
		});

		it('from が不正な形式の場合、今月をデフォルトとする', () => {
			const result = normalizeWorkLogQuery({ from: 'bad', to: '2025-10-31' });

			expect(result.from).toEqual(new Date('2025-10-01T00:00:00Z'));
			expect(result.to).toEqual(new Date('2025-10-31T23:59:59.999Z'));
			expect(result.month).toBe('2025-10');
		});

		it('to が不正な形式の場合、今月をデフォルトとする', () => {
			const result = normalizeWorkLogQuery({ from: '2025-10-01', to: 'bad' });

			expect(result.from).toEqual(new Date('2025-10-01T00:00:00Z'));
			expect(result.to).toEqual(new Date('2025-10-31T23:59:59.999Z'));
			expect(result.month).toBe('2025-10');
		});
	});

	describe('from > to の逆転ケース', () => {
		it('from > to の場合、今月をデフォルトとする', () => {
			const result = normalizeWorkLogQuery({ from: '2025-10-31', to: '2025-10-01' });

			expect(result.from).toEqual(new Date('2025-10-01T00:00:00Z'));
			expect(result.to).toEqual(new Date('2025-10-31T23:59:59.999Z'));
			expect(result.month).toBe('2025-10');
		});
	});

	describe('うるう年の処理', () => {
		it('うるう年の2月を正しく処理', () => {
			const result = normalizeWorkLogQuery({ month: '2024-02' });

			// 2024-02-01 00:00:00Z 〜 2024-02-29 23:59:59.999Z
			expect(result.from).toEqual(new Date('2024-02-01T00:00:00Z'));
			expect(result.to).toEqual(new Date('2024-02-29T23:59:59.999Z'));
			expect(result.month).toBe('2024-02');
		});
	});

	describe('年末の処理', () => {
		it('12月を正しく処理', () => {
			const result = normalizeWorkLogQuery({ month: '2025-12' });

			// 2025-12-01 00:00:00Z 〜 2025-12-31 23:59:59.999Z
			expect(result.from).toEqual(new Date('2025-12-01T00:00:00Z'));
			expect(result.to).toEqual(new Date('2025-12-31T23:59:59.999Z'));
			expect(result.month).toBe('2025-12');
		});
	});

	describe('未来の日付', () => {
		it('未来の月を許容', () => {
			const result = normalizeWorkLogQuery({ month: '2026-06' });

			expect(result.from).toEqual(new Date('2026-06-01T00:00:00Z'));
			expect(result.to).toEqual(new Date('2026-06-30T23:59:59.999Z'));
			expect(result.month).toBe('2026-06');
		});
	});

	describe('タグフィルタ', () => {
		it('tags が指定されている場合、そのまま使用', () => {
			const result = normalizeWorkLogQuery({
				month: '2025-10',
				tags: ['backend', 'api'],
			});

			expect(result.tags).toEqual(['backend', 'api']);
		});

		it('tags が未指定の場合、undefined', () => {
			const result = normalizeWorkLogQuery({
				month: '2025-10',
			});

			expect(result.tags).toBeUndefined();
		});

		it('tags が空配列の場合、そのまま使用', () => {
			const result = normalizeWorkLogQuery({
				month: '2025-10',
				tags: [],
			});

			expect(result.tags).toEqual([]);
		});
	});
});
