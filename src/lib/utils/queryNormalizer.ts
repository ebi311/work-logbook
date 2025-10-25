import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { getMonthRange } from './dateRange';
import { z } from 'zod';

dayjs.extend(utc);

/**
 * クエリパラメータのスキーマ
 */
export const WorkLogQueryParamsSchema = z.object({
	month: z
		.string()
		.regex(/^\d{4}-\d{2}$/)
		.optional(), // YYYY-MM
	date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(), // YYYY-MM-DD
	from: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(), // YYYY-MM-DD
	to: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(), // YYYY-MM-DD
	page: z.number().int().positive().optional(),
	size: z.number().int().min(10).max(100).optional()
});

/**
 * クエリパラメータの型定義
 */
export type WorkLogQueryParams = z.infer<typeof WorkLogQueryParamsSchema>;

/**
 * 正規化後のクエリスキーマ
 */
export const NormalizedWorkLogQuerySchema = z.object({
	from: z.date(),
	to: z.date(),
	page: z.number().int().positive(),
	size: z.number().int().min(10).max(100),
	offset: z.number().int().nonnegative(),
	month: z
		.string()
		.regex(/^\d{4}-\d{2}$/)
		.optional()
});

/**
 * 正規化後のクエリ型
 */
export type NormalizedWorkLogQuery = z.infer<typeof NormalizedWorkLogQuerySchema>;

/**
 * 文字列を UTC の日付の開始時刻に変換
 */
const parseStartOfDay = (dateStr: string): Date | null => {
	const parsed = dayjs.utc(dateStr, 'YYYY-MM-DD', true);
	return parsed.isValid() ? parsed.startOf('day').toDate() : null;
};

/**
 * 文字列を UTC の日付の終了時刻に変換（23:59:59.999）
 */
const parseEndOfDay = (dateStr: string): Date | null => {
	const parsed = dayjs.utc(dateStr, 'YYYY-MM-DD', true);
	return parsed.isValid() ? parsed.endOf('day').toDate() : null;
};

/**
 * 今月の範囲を取得
 */
const getCurrentMonth = (): { from: Date; to: Date; month: string } => {
	const now = dayjs.utc();
	const month = now.format('YYYY-MM');
	const from = now.startOf('month').toDate();
	const to = now.endOf('month').toDate();
	return { from, to, month };
};

/**
 * month パラメータから日付範囲を解決
 */
const resolveMonthRange = (month: string): { from: Date; to: Date; month: string } | null => {
	// Zodでバリデーション
	const validation = z
		.string()
		.regex(/^\d{4}-\d{2}$/)
		.safeParse(month);
	if (!validation.success) return null;

	try {
		const range = getMonthRange(month);
		const from = range.from;
		// toExclusive を endOf day に変換
		const to = dayjs.utc(range.toExclusive).subtract(1, 'millisecond').toDate();
		return { from, to, month };
	} catch {
		return null;
	}
};

/**
 * date パラメータから日付範囲を解決
 */
const resolveDateRange = (date: string): { from: Date; to: Date } | null => {
	const dateFrom = parseStartOfDay(date);
	const dateTo = parseEndOfDay(date);
	return dateFrom && dateTo ? { from: dateFrom, to: dateTo } : null;
};

/**
 * from/to パラメータから日付範囲を解決
 */
const resolveFromToRange = (from?: string, to?: string): { from: Date; to: Date } | null => {
	const fromDate = from ? parseStartOfDay(from) : null;
	const toDate = to ? parseEndOfDay(to) : null;
	// 両方が有効で、from <= to の場合のみ
	return fromDate && toDate && fromDate <= toDate ? { from: fromDate, to: toDate } : null;
};

/**
 * 日付範囲を解決（month > date > from/to > デフォルト）
 */
const resolveQueryDateRange = (
	params: WorkLogQueryParams
): { from: Date; to: Date; month?: string } => {
	// 1. month が指定されている場合（最優先）
	if (params.month) {
		const monthRange = resolveMonthRange(params.month);
		if (monthRange) return monthRange;
	}

	// 2. date が指定されている場合
	if (params.date) {
		const dateRange = resolveDateRange(params.date);
		if (dateRange) return dateRange;
	}

	// 3. from/to が指定されている場合
	if (params.from || params.to) {
		const fromToRange = resolveFromToRange(params.from, params.to);
		if (fromToRange) return fromToRange;
	}

	// 4. デフォルト: 今月
	return getCurrentMonth();
};

/**
 * クエリパラメータを正規化
 * 優先順位: month > date > from/to > デフォルト（今月）
 */
export const normalizeWorkLogQuery = (params: WorkLogQueryParams): NormalizedWorkLogQuery => {
	// 日付範囲を解決
	const { from, to, month } = resolveQueryDateRange(params);

	// page/size のバリデーション
	const page = Math.max(1, params.page ?? 1);
	const size = Math.max(10, Math.min(100, params.size ?? 20));
	const offset = (page - 1) * size;

	return {
		from,
		to,
		page,
		size,
		offset,
		month
	};
};
