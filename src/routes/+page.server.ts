import { error } from '@sveltejs/kit';
import type { ServerLoad } from '@sveltejs/kit';
import { getActiveWorkLog } from '$lib/server/db/workLogs';

/**
 * F-001: 初期状態取得
 * 
 * ページ初期ロード時に、ユーザーの進行中の作業状態とサーバー時刻を取得する。
 */

type ActiveWorkLog = {
	id: string;
	startedAt: string;
	endedAt: null;
};

type LoadData = {
	active?: ActiveWorkLog;
	serverNow: string;
};

export const load: ServerLoad = async ({ locals }) => {
	// 認証チェック
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const userId = locals.user.id;

	try {
		// 進行中の作業を取得
		const activeWorkLog = await getActiveWorkLog(userId);

		// サーバー時刻
		const serverNow = new Date().toISOString();

		// レスポンス構築
		const response: LoadData = {
			serverNow
		};

		if (activeWorkLog) {
			response.active = {
				id: activeWorkLog.id,
				startedAt: activeWorkLog.startedAt.toISOString(),
				endedAt: null
			};
		}

		return response;
	} catch (err) {
		console.error('Failed to load work log:', err);
		throw error(500, 'Internal Server Error');
	}
};
