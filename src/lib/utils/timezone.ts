import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * デフォルトタイムゾーン
 */
export const DEFAULT_TIMEZONE = 'Asia/Tokyo';

/**
 * 指定されたタイムゾーンで「今日の開始時刻」を取得
 * @param tz - タイムゾーン (例: 'Asia/Tokyo', 'America/New_York')
 * @returns ISO8601形式の日付開始時刻 (例: '2025-11-07T00:00:00+09:00')
 */
export const getTodayStart = (tz: string): string => {
	return dayjs().tz(tz).startOf('day').format();
};

/**
 * 指定されたタイムゾーンで「特定の日の開始時刻」を取得
 * @param date - 日付文字列 (YYYY-MM-DD) または Date オブジェクト
 * @param tz - タイムゾーン
 * @returns ISO8601形式の日付開始時刻
 */
export const getDateStart = (date: string | Date, tz: string): string => {
	return dayjs(date).tz(tz).startOf('day').format();
};

/**
 * 指定されたタイムゾーンで「今月の開始時刻」を取得
 * @param tz - タイムゾーン
 * @returns ISO8601形式の月開始時刻
 */
export const getMonthStart = (tz: string): string => {
	return dayjs().tz(tz).startOf('month').format();
};

/**
 * タイムゾーンを考慮した日時フォーマット
 * @param date - 日付文字列またはDateオブジェクト
 * @param tz - タイムゾーン
 * @param format - フォーマット形式 (デフォルト: 'YYYY-MM-DD HH:mm:ss')
 * @returns フォーマットされた日時文字列
 */
export const formatInTimezone = (
	date: string | Date,
	tz: string,
	format: string = 'YYYY-MM-DD HH:mm:ss',
): string => {
	return dayjs(date).tz(tz).format(format);
};

/**
 * 指定されたタイムゾーンで「特定の月の開始時刻と終了時刻」を取得
 * @param month - YYYY-MM 形式の月文字列 (例: '2025-10')
 * @param tz - タイムゾーン
 * @returns { from: 月初のISO8601文字列, to: 月末のISO8601文字列 }
 */
export const getMonthRange = (month: string, tz: string): { from: string; to: string } => {
	// 形式チェック: YYYY-MM
	const match = /^(\d{4})-(\d{2})$/.exec(month);
	if (!match) {
		throw new Error(`Invalid month format: ${month}. Expected YYYY-MM.`);
	}

	const year = parseInt(match[1], 10);
	const monthNum = parseInt(match[2], 10);

	// 月初 (指定タイムゾーンの00:00:00)
	// tz.setZoneを使ってタイムゾーンを明示的に設定
	const from = dayjs
		.tz(`${year}-${String(monthNum).padStart(2, '0')}-01`, tz)
		.startOf('day')
		.format();

	// 翌月初 (指定タイムゾーンの00:00:00)
	const to = dayjs
		.tz(`${year}-${String(monthNum).padStart(2, '0')}-01`, tz)
		.add(1, 'month')
		.startOf('month')
		.format();

	return { from, to };
};
