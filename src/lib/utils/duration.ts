import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

// durationプラグインを有効化
dayjs.extend(duration);

/**
 * 秒数をHH:MM:SS形式の文字列に変換する
 *
 * @param seconds - 経過秒数
 * @returns HH:MM:SS形式の文字列（例: "01:23:45"）
 *
 * @example
 * formatDuration(0) // "00:00:00"
 * formatDuration(3661) // "01:01:01"
 * formatDuration(86400) // "24:00:00"
 */
export const formatDuration = (seconds: number): string => {
	// 負数は0として扱う
	if (seconds < 0) {
		seconds = 0;
	}

	// 小数点以下を切り捨て
	seconds = Math.floor(seconds);

	// dayjsのdurationを使用してフォーマット
	const d = dayjs.duration(seconds, 'seconds');

	// HH:MM:SS形式でフォーマット
	// 24時間以上の場合も正しく表示するため、時間は手動で計算
	const hours = Math.floor(d.asHours());
	const formatted = d.format('mm:ss');
	const hh = String(hours).padStart(2, '0');

	return `${hh}:${formatted}`;
};

/**
 * 開始時刻とサーバー時刻から経過秒数を計算する
 *
 * @param startedAt - 開始時刻（ISO文字列）
 * @param now - 現在のサーバー時刻（ISO文字列）
 * @returns 経過秒数（整数）。負の場合は0を返す
 *
 * @example
 * calculateElapsedSeconds('2025-10-22T10:00:00.000Z', '2025-10-22T10:01:00.000Z') // 60
 * calculateElapsedSeconds('2025-10-22T10:00:00.000Z', '2025-10-22T10:00:00.000Z') // 0
 */
export const calculateElapsedSeconds = (startedAt: string, now: string): number => {
	const startTime = dayjs(startedAt);
	const currentTime = dayjs(now);

	// 秒単位の差分を計算
	const diffSec = currentTime.diff(startTime, 'second');

	// 負の場合は0を返す
	return Math.max(0, diffSec);
};
