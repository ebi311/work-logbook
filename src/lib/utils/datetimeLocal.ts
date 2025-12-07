/**
 * F-001.2: datetime-local 変換ユーティリティ
 *
 * HTML の datetime-local input は、ブラウザのローカルタイムゾーンで
 * YYYY-MM-DDTHH:mm 形式の文字列を扱う。
 * サーバーとの通信は UTC ISO 文字列で行うため、変換が必要。
 */

import dayjs from 'dayjs';
import 'dayjs/locale/ja';

dayjs.locale('ja');
/**
 * UTC ISO文字列または Date オブジェクトを datetime-local input 用の文字列に変換
 * @param value - UTC ISO文字列または Date オブジェクト
 * @returns YYYY-MM-DDTHH:mm 形式の文字列（ローカルタイムゾーン）
 */
export const toLocalDateTimeInputValue = (value: string | Date): string => {
	return dayjs(value).format('YYYY-MM-DDTHH:mm');
};

/**
 * datetime-local input の文字列を UTC ISO文字列に変換
 * @param localValue - YYYY-MM-DDTHH:mm 形式の文字列（ローカルタイムゾーン）
 * @returns UTC ISO文字列
 */
export const fromLocalDateTimeInputValue = (localValue: string): string => {
	if (!localValue) {
		// 空文字列の場合は現在時刻を返す
		return new Date().toISOString();
	}

	// ローカルタイムゾーンで解釈される
	const date = new Date(localValue);
	return date.toISOString();
};
