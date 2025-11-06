/**
 * フィルタ状態
 */
export type FilterState = {
	/** フィルタ用のタグ */
	tags: string[];
	/** 月フィルタ (YYYY-MM形式) */
	month: string | undefined;
	/** 日付フィルタ (YYYY-MM-DD形式) */
	date: string | undefined;
};

/**
 * URLパラメータからフィルタ状態を読み取る
 */
export const readFiltersFromUrl = (url: URL): FilterState => {
	const tagsParam = url.searchParams.get('tags');
	const tags = tagsParam ? tagsParam.split(',').filter(Boolean) : [];

	const month = url.searchParams.get('month') ?? undefined;
	const date = url.searchParams.get('date') ?? undefined;

	return { tags, month, date };
};

/**
 * タグフィルタ用のURL文字列を生成
 */
export const buildTagFilterUrl = (newTags: string[], currentUrl: URL): string => {
	const url = new URL(currentUrl);

	if (newTags.length > 0) {
		url.searchParams.set('tags', newTags.join(','));
	} else {
		url.searchParams.delete('tags');
	}

	// ページをリセット
	url.searchParams.set('page', '1');

	return url.toString();
};

/**
 * 日付フィルタ用のURL文字列を生成
 */
export const buildDateFilterUrl = (
	filter: { month?: string; date?: string },
	currentUrl: URL,
): string => {
	const url = new URL(currentUrl);

	// 既存の日付パラメータをクリア
	url.searchParams.delete('month');
	url.searchParams.delete('date');
	url.searchParams.delete('from');
	url.searchParams.delete('to');

	// 新しいフィルタを設定
	if (filter.month) {
		url.searchParams.set('month', filter.month);
	} else if (filter.date) {
		url.searchParams.set('date', filter.date);
	}

	// ページをリセット
	url.searchParams.set('page', '1');

	return url.toString();
};

/**
 * タグをフィルタに追加するためのURL文字列を生成（重複チェック付き）
 */
export const buildAddTagToFilterUrl = (
	tag: string,
	currentTags: string[],
	currentUrl: URL,
): string | null => {
	// 既に選択されている場合はnullを返す
	if (currentTags.includes(tag)) {
		return null;
	}

	// 新しいタグを追加
	const newTags = [...currentTags, tag];
	return buildTagFilterUrl(newTags, currentUrl);
};
