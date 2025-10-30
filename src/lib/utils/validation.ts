/**
 * バリデーションユーティリティ
 * F-004: 作業記録の編集機能のバリデーション
 */

/**
 * バリデーション結果の型
 */
export type ValidationResult = {
	valid: boolean;
	error?: string;
};

/**
 * 時刻の範囲をバリデーション
 * - 開始時刻が終了時刻より前であること
 * - 未来の時刻でないこと
 *
 * @param startedAt - 開始時刻
 * @param endedAt - 終了時刻
 * @returns バリデーション結果
 */
export const validateTimeRange = (startedAt: Date, endedAt: Date): ValidationResult => {
	// 未来の時刻チェック
	if (isFutureDate(startedAt) || isFutureDate(endedAt)) {
		return {
			valid: false,
			error: '未来の時刻は設定できません',
		};
	}

	// 開始時刻が終了時刻より前であることをチェック
	if (startedAt >= endedAt) {
		return {
			valid: false,
			error: '開始時刻は終了時刻より前である必要があります',
		};
	}

	return { valid: true };
};

/**
 * 作業内容の文字数をバリデーション
 * - 10,000文字以内であること
 *
 * @param description - 作業内容
 * @returns バリデーション結果
 */
export const validateDescription = (description: string): ValidationResult => {
	const MAX_LENGTH = 10000;

	if (description.length > MAX_LENGTH) {
		return {
			valid: false,
			error: '作業内容は10,000文字以内で入力してください',
		};
	}

	return { valid: true };
};

/**
 * 指定された日時が未来かどうかを判定
 *
 * @param date - チェック対象の日時
 * @returns 未来の日時の場合true
 */
export const isFutureDate = (date: Date): boolean => {
	return date.getTime() > Date.now();
};
