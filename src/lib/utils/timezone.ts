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
