/**
 * YYYY-MM 形式の月文字列から、その月の範囲（UTC）を取得する
 * @param month - YYYY-MM 形式の月文字列（例: '2025-10'）
 * @returns from: 月初の00:00:00.000Z, toExclusive: 翌月初の00:00:00.000Z
 * @throws 不正な形式または存在しない月の場合
 */
export const getMonthRange = (month: string): { from: Date; toExclusive: Date } => {
	// 形式チェック: YYYY-MM
	const match = /^(\d{4})-(\d{2})$/.exec(month);
	if (!match) {
		throw new Error(`Invalid month format: ${month}. Expected YYYY-MM.`);
	}

	const year = parseInt(match[1], 10);
	const monthNum = parseInt(match[2], 10);

	// 月の範囲チェック: 1-12
	if (monthNum < 1 || monthNum > 12) {
		throw new Error(`Invalid month number: ${monthNum}. Must be 01-12.`);
	}

	// 月初（UTC）
	const from = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0));

	// 翌月初（UTC）
	const toExclusive = new Date(Date.UTC(year, monthNum, 1, 0, 0, 0, 0));

	return { from, toExclusive };
};
