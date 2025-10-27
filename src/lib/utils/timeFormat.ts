import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

/**
 * 秒数を HH:mm 形式にフォーマット
 * @param seconds 秒数
 * @returns HH:mm 形式の文字列（例: "01:30", "12:05"）
 */
export const formatDuration = (seconds: number): string => {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);

	const hoursStr = String(hours).padStart(2, '0');
	const minutesStr = String(minutes).padStart(2, '0');

	return `${hoursStr}:${minutesStr}`;
};

/**
 * ISO文字列をローカル日付形式にフォーマット
 * @param isoString ISO8601形式の日時文字列
 * @returns YYYY-MM-DD 形式の文字列
 */
export const formatDate = (isoString: string): string => {
	return dayjs(isoString).format('YYYY-MM-DD');
};

/**
 * ISO文字列をローカル時刻形式にフォーマット
 * @param isoString ISO8601形式の日時文字列
 * @returns HH:mm 形式の文字列
 */
export const formatTime = (isoString: string): string => {
	return dayjs(isoString).format('HH:mm');
};

/**
 * 開始時刻と終了時刻から作業時間（秒）を計算
 * @param startedAt 開始時刻（ISO）
 * @param endedAt 終了時刻（ISO）またはnull
 * @param _serverNow サーバー時刻（ISO）- 予約パラメータ（将来進行中の作業時間計算に使用）
 * @returns 作業時間（秒）またはnull（進行中の場合）
 */
export const calculateDuration = (
	startedAt: string,
	endedAt: string | null,
	_serverNow: string
): number | null => {
	// 進行中の作業の場合はnullを返す
	if (endedAt === null) {
		return null;
	}

	const start = dayjs(startedAt);
	const end = dayjs(endedAt);

	// 秒単位で差分を計算
	return end.diff(start, 'second');
};

/**
 * DateオブジェクトをHTML datetime-local 入力用の形式に変換
 * @param date Dateオブジェクト
 * @returns YYYY-MM-DDTHH:mm 形式の文字列
 */
export const toDatetimeLocal = (date: Date): string => {
	return dayjs(date).format('YYYY-MM-DDTHH:mm');
};
