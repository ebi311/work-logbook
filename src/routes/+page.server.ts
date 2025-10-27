import { error, fail } from '@sveltejs/kit';
import type { ServerLoad, Actions, RequestEvent } from '@sveltejs/kit';
import {
	getActiveWorkLog,
	createWorkLog,
	stopWorkLog,
	listWorkLogs,
	aggregateMonthlyWorkLogDuration
} from '$lib/server/db/workLogs';
import { normalizeWorkLogQuery } from '$lib/utils/queryNormalizer';

/**
 * URLからクエリパラメータをパース
 */
const parseQueryParams = (url: URL) => {
	return {
		month: url.searchParams.get('month') ?? undefined,
		date: url.searchParams.get('date') ?? undefined,
		from: url.searchParams.get('from') ?? undefined,
		to: url.searchParams.get('to') ?? undefined,
		page: url.searchParams.get('page') ? parseInt(url.searchParams.get('page')!, 10) : undefined,
		size: url.searchParams.get('size') ? parseInt(url.searchParams.get('size')!, 10) : undefined
	};
};

/**
 * 作業一覧と月次合計を取得（並列実行）
 */
const fetchListData = async (
	userId: string,
	normalized: {
		from: Date;
		to: Date;
		page: number;
		size: number;
		offset: number;
		month?: string;
	}
) => {
	// 並列で取得
	const monthForAggregate = normalized.month ?? new Date().toISOString().slice(0, 7);

	const [{ items: dbItems, hasNext }, monthlyTotalSec] = await Promise.all([
		listWorkLogs(userId, {
			from: normalized.from,
			to: normalized.to,
			limit: normalized.size,
			offset: normalized.offset
		}),
		aggregateMonthlyWorkLogDuration(userId, { month: monthForAggregate })
	]);

	// アイテムを変換
	const items: WorkLogItem[] = dbItems.map((item) => {
		const durationSec = item.endedAt
			? Math.floor((item.endedAt.getTime() - item.startedAt.getTime()) / 1000)
			: null;

		return {
			id: item.id,
			startedAt: item.startedAt.toISOString(),
			endedAt: item.endedAt ? item.endedAt.toISOString() : null,
			durationSec,
			description: item.description
		};
	});

	return {
		items,
		page: normalized.page,
		size: normalized.size,
		hasNext,
		monthlyTotalSec
	};
};

/**
 * F-001: 初期状態取得
 * F-005/F-006: 作業一覧と月次合計
 *
 * ページ初期ロード時に、ユーザーの進行中の作業状態、一覧、月次合計、サーバー時刻を取得する。
 */

type ActiveWorkLog = {
	id: string;
	startedAt: string;
	endedAt: null;
	description: string;
};

type WorkLogItem = {
	id: string;
	startedAt: string;
	endedAt: string | null;
	durationSec: number | null;
	description: string;
};

type LoadData = {
	active?: ActiveWorkLog;
	serverNow: string;
	// F-005/F-006: 一覧と月次合計（Promiseでストリーミング）
	listData: Promise<{
		items: WorkLogItem[];
		page: number;
		size: number;
		hasNext: boolean;
		monthlyTotalSec: number;
	}>;
};

export const load: ServerLoad = async ({ locals, url }) => {
	// 認証チェック
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const userId = locals.user.id;

	try {
		// クエリパラメータを正規化
		const queryParams = parseQueryParams(url);
		const normalized = normalizeWorkLogQuery(queryParams);

		// 軽量なデータ: 進行中の作業とサーバー時刻（即座に返す）
		const activeWorkLog = await getActiveWorkLog(userId);
		const serverNow = new Date().toISOString();

		// 重いデータ: 一覧と月次合計（Promiseのまま返してストリーミング）
		const listData = fetchListData(userId, normalized);

		// レスポンス構築（軽量データ + Promise）
		const response: LoadData = {
			serverNow,
			listData
		};

		if (activeWorkLog) {
			response.active = {
				id: activeWorkLog.id,
				startedAt: activeWorkLog.startedAt.toISOString(),
				endedAt: null,
				description: activeWorkLog.description
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
		description: string;
	};
	serverNow: string;
};

type StartActionFailure = {
	reason: 'ACTIVE_EXISTS';
	active: {
		id: string;
		startedAt: string;
		endedAt: null;
		description: string;
	};
	serverNow: string;
};

/**
 * 作業開始アクションの実装
 */
const handleStartAction = async ({ locals, request }: RequestEvent) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const userId = locals.user.id;
	const serverNow = new Date();

	// FormDataから description を取得
	const formData = await request.formData();
	const description = (formData.get('description') as string) || '';

	// 進行中の作業を確認
	const activeWorkLog = await getActiveWorkLog(userId);

	if (activeWorkLog) {
		// 既に進行中の作業がある
		return fail(409, {
			reason: 'ACTIVE_EXISTS',
			active: {
				id: activeWorkLog.id,
				startedAt: activeWorkLog.startedAt.toISOString(),
				endedAt: null,
				description: activeWorkLog.description
			},
			serverNow: serverNow.toISOString()
		} satisfies StartActionFailure);
	}

	// 新規作業を開始
	const workLog = await createWorkLog(userId, serverNow, description);

	return {
		ok: true,
		workLog: {
			id: workLog.id,
			startedAt: workLog.startedAt.toISOString(),
			endedAt: null,
			description: workLog.description
		},
		serverNow: serverNow.toISOString()
	} satisfies StartActionSuccess;
};

/**
 * F-001: 作業終了
 */

type StopActionSuccess = {
	ok: true;
	workLog: {
		id: string;
		startedAt: string;
		endedAt: string;
		description: string;
	};
	serverNow: string;
	durationSec: number;
};

type StopActionFailure = {
	reason: 'NO_ACTIVE';
	serverNow: string;
};

/**
 * 作業終了アクションの実装
 */
const handleStopAction = async ({ locals, request }: RequestEvent) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const userId = locals.user.id;
	const serverNow = new Date();

	// FormDataから description を取得
	const formData = await request.formData();
	const description = (formData.get('description') as string) || '';

	// 進行中の作業を取得
	const activeWorkLog = await getActiveWorkLog(userId);

	if (!activeWorkLog) {
		// 進行中の作業がない
		return fail(404, {
			reason: 'NO_ACTIVE',
			serverNow: serverNow.toISOString()
		} satisfies StopActionFailure);
	}

	// 作業を終了
	const stoppedWorkLog = await stopWorkLog(activeWorkLog.id, serverNow, description);

	if (!stoppedWorkLog) {
		// 更新失敗（既に終了済み）
		return fail(404, {
			reason: 'NO_ACTIVE',
			serverNow: serverNow.toISOString()
		} satisfies StopActionFailure);
	}

	// 作業時間を計算
	const durationSec = stoppedWorkLog.getDuration();

	// endedAtが設定されているはずだが、型安全のためチェック
	if (durationSec === null) {
		console.error('stoppedWorkLog.getDuration() returned null');
		throw error(500, 'Internal Server Error');
	}

	return {
		ok: true,
		workLog: {
			id: stoppedWorkLog.id,
			startedAt: stoppedWorkLog.startedAt.toISOString(),
			endedAt: stoppedWorkLog.endedAt!.toISOString(),
			description: stoppedWorkLog.description
		},
		serverNow: serverNow.toISOString(),
		durationSec
	} satisfies StopActionSuccess;
};

export const actions: Actions = {
	start: async (event) => {
		try {
			return await handleStartAction(event);
		} catch (err) {
			console.error('Failed to start work log:', err);
			throw error(500, 'Internal Server Error');
		}
	},

	stop: async (event) => {
		try {
			return await handleStopAction(event);
		} catch (err) {
			console.error('Failed to stop work log:', err);
			throw error(500, 'Internal Server Error');
		}
	}
};
