import { error, fail } from '@sveltejs/kit';
import type { ServerLoad, Actions } from '@sveltejs/kit';
import { getActiveWorkLog, createWorkLog } from '$lib/server/db/workLogs';

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

/**
 * F-001: 作業開始
 */

type StartActionSuccess = {
	ok: true;
	workLog: {
		id: string;
		startedAt: string;
		endedAt: null;
	};
	serverNow: string;
};

type StartActionFailure = {
	reason: 'ACTIVE_EXISTS';
	active: {
		id: string;
		startedAt: string;
		endedAt: null;
	};
	serverNow: string;
};

export const actions: Actions = {
	start: async ({ locals }) => {
		// 認証チェック
		if (!locals.user) {
			throw error(401, 'Unauthorized');
		}

		const userId = locals.user.id;
		const serverNow = new Date();

		try {
			// 進行中の作業を確認
			const activeWorkLog = await getActiveWorkLog(userId);

			if (activeWorkLog) {
				// 既に進行中の作業がある
				return fail(409, {
					reason: 'ACTIVE_EXISTS',
					active: {
						id: activeWorkLog.id,
						startedAt: activeWorkLog.startedAt.toISOString(),
						endedAt: null
					},
					serverNow: serverNow.toISOString()
				} satisfies StartActionFailure);
			}

			// 新規作業を開始
			const workLog = await createWorkLog(userId, serverNow);

			return {
				ok: true,
				workLog: {
					id: workLog.id,
					startedAt: workLog.startedAt.toISOString(),
					endedAt: null
				},
				serverNow: serverNow.toISOString()
			} satisfies StartActionSuccess;
		} catch (err) {
			console.error('Failed to start work log:', err);
			throw error(500, 'Internal Server Error');
		}
	}
};
