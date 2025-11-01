import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserTagSuggestions } from '$lib/server/db/workLogs';

/**
 * ユーザーのタグ一覧を取得
 * F-006: タグフィルタ機能のために追加
 * @returns { tags: string[] } - タグ名の配列（使用頻度順）
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	// 認証確認
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	try {
		// クエリパラメータからqとlimitを取得
		const query = url.searchParams.get('q') || '';
		const limit = Number(url.searchParams.get('limit')) || 100;

		// ユーザーのタグ候補を取得（使用頻度順）
		const tagSuggestions = await getUserTagSuggestions(locals.user.id, query, limit);

		// タグ名のみを抽出
		const tags = tagSuggestions.map((s) => s.tag);

		return json({ tags });
	} catch (err) {
		console.error('Failed to get user tags:', err);
		throw error(500, 'Internal Server Error');
	}
};
