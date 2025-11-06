import { error } from '@sveltejs/kit';
import type { ServerLoad, Actions } from '@sveltejs/kit';
import {
	getActiveWorkLog,
	listWorkLogs,
	aggregateMonthlyWorkLogDuration,
	aggregateDailyWorkLogDuration,
	getUserTagSuggestions,
} from '$lib/server/db/workLogs';
import { normalizeWorkLogQuery } from '$lib/utils/queryNormalizer';
import { handleStartAction } from './_actions/start';
import { handleStopAction } from './_actions/stop';
import { handleSwitchAction } from './_actions/switch';
import { handleUpdateAction } from './_actions/update';
import { handleDeleteAction } from './_actions/delete';

/**
 * URLからクエリパラメータをパース
 */
const parseQueryParams = (url: URL) => {
	// タグフィルタの取得（カンマ区切り）
	const tagsParam = url.searchParams.get('tags');
	const tags = tagsParam
		? tagsParam
				.split(',')
				.map((t) => t.trim())
				.filter((t) => t.length > 0 && t.length <= 100)
				.slice(0, 10) // 最大10個
		: undefined;

	return {
		month: url.searchParams.get('month') ?? undefined,
		date: url.searchParams.get('date') ?? undefined,
		from: url.searchParams.get('from') ?? undefined,
		to: url.searchParams.get('to') ?? undefined,
		page: url.searchParams.get('page') ? parseInt(url.searchParams.get('page')!, 10) : undefined,
		size: url.searchParams.get('size') ? parseInt(url.searchParams.get('size')!, 10) : undefined,
		tags,
	};
};

/**
 * 作業一覧と月次合計を取得(並列実行)
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
		tags?: string[];
	},
) => {
	const fetchStart = Date.now();
	console.log('[PERF] fetchListData - starting parallel fetch', {
		timestamp: new Date().toISOString(),
		params: { from: normalized.from, to: normalized.to, tags: normalized.tags },
	});

	// 並列で取得
	const monthForAggregate = normalized.month ?? new Date().toISOString().slice(0, 7);
	const todayDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

	const parallelStart = Date.now();
	const [{ items: dbItems, hasNext }, monthlyTotalSec, dailyTotalSec] = await Promise.all([
		listWorkLogs(userId, {
			from: normalized.from,
			to: normalized.to,
			tags: normalized.tags,
			limit: normalized.size,
			offset: normalized.offset,
		}),
		aggregateMonthlyWorkLogDuration(userId, { month: monthForAggregate }),
		aggregateDailyWorkLogDuration(userId, { date: todayDate }),
	]);
	console.log('[PERF] fetchListData - parallel DB queries completed', {
		duration: Date.now() - parallelStart,
		timestamp: new Date().toISOString(),
		dbItemsCount: dbItems.length,
		monthlyTotalSec,
		dailyTotalSec,
	});

	// アイテムを変換
	const transformStart = Date.now();
	const items: WorkLogItem[] = dbItems.map((item) => {
		const durationSec = item.endedAt
			? Math.floor((item.endedAt.getTime() - item.startedAt.getTime()) / 1000)
			: null;

		return {
			id: item.id,
			startedAt: item.startedAt.toISOString(),
			endedAt: item.endedAt ? item.endedAt.toISOString() : null,
			durationSec,
			description: item.description,
			tags: item.tags || [],
		};
	});
	console.log('[PERF] fetchListData - data transformation completed', {
		duration: Date.now() - transformStart,
		timestamp: new Date().toISOString(),
	});

	console.log('[PERF] fetchListData - total duration', {
		duration: Date.now() - fetchStart,
		timestamp: new Date().toISOString(),
	});

	return {
		items,
		page: normalized.page,
		size: normalized.size,
		hasNext,
		monthlyTotalSec,
		dailyTotalSec,
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
	tags: string[];
};

type WorkLogItem = {
	id: string;
	startedAt: string;
	endedAt: string | null;
	durationSec: number | null;
	description: string;
	tags: string[];
};

type LoadData = {
	active?: ActiveWorkLog;
	serverNow: string;
	// F-005/F-006: 一覧と月次合計(Promiseでストリーミング)
	listData: Promise<{
		items: WorkLogItem[];
		page: number;
		size: number;
		hasNext: boolean;
		monthlyTotalSec: number;
		dailyTotalSec: number;
	}>;
	// F-003: タグ候補
	tagSuggestions: { tag: string; count: number }[];
};

export const load: ServerLoad = async ({ locals, url }) => {
	const startTime = Date.now();
	console.log('[PERF] load started', { timestamp: new Date().toISOString() });

	// 認証チェック
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const userId = locals.user.id;
	console.log('[PERF] auth check completed', {
		elapsed: Date.now() - startTime,
		timestamp: new Date().toISOString(),
	});

	try {
		// クエリパラメータを正規化
		const queryParams = parseQueryParams(url);
		const normalized = normalizeWorkLogQuery(queryParams);
		console.log('[PERF] query params normalized', {
			elapsed: Date.now() - startTime,
			timestamp: new Date().toISOString(),
			normalized,
		});

		// 軽量なデータ: 進行中の作業とサーバー時刻(即座に返す)
		const activeWorkLogStart = Date.now();
		const activeWorkLog = await getActiveWorkLog(userId);
		console.log('[PERF] getActiveWorkLog completed', {
			elapsed: Date.now() - startTime,
			duration: Date.now() - activeWorkLogStart,
			timestamp: new Date().toISOString(),
		});

		const serverNow = new Date().toISOString();

		// F-003: タグ候補を取得(最大20件)
		const tagSuggestionsStart = Date.now();
		const tagSuggestions = await getUserTagSuggestions(userId, '', 20);
		console.log('[PERF] getUserTagSuggestions completed', {
			elapsed: Date.now() - startTime,
			duration: Date.now() - tagSuggestionsStart,
			timestamp: new Date().toISOString(),
			count: tagSuggestions.length,
		});

		// 重いデータ: 一覧と月次合計(Promiseのまま返してストリーミング)
		const listDataStart = Date.now();
		console.log('[PERF] fetchListData started (streaming)', {
			elapsed: Date.now() - startTime,
			timestamp: new Date().toISOString(),
		});
		const listData = fetchListData(userId, normalized).then((result) => {
			console.log('[PERF] fetchListData completed', {
				elapsed: Date.now() - startTime,
				duration: Date.now() - listDataStart,
				timestamp: new Date().toISOString(),
				itemCount: result.items.length,
			});
			return result;
		});

		// レスポンス構築(軽量データ + Promise)
		const response: LoadData = {
			serverNow,
			listData,
			tagSuggestions, // F-003: タグ候補を追加
		};

		if (activeWorkLog) {
			response.active = {
				id: activeWorkLog.id,
				startedAt: activeWorkLog.startedAt.toISOString(),
				endedAt: null,
				description: activeWorkLog.description,
				tags: activeWorkLog.tags || [],
			};
		}

		console.log('[PERF] load response ready (before streaming)', {
			elapsed: Date.now() - startTime,
			timestamp: new Date().toISOString(),
		});

		return response;
	} catch (err) {
		console.error('[PERF] load failed', {
			elapsed: Date.now() - startTime,
			timestamp: new Date().toISOString(),
		});
		console.error('Failed to load work log:', err);
		throw error(500, 'Internal Server Error');
	}
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
	},

	switch: async (event) => {
		try {
			return await handleSwitchAction(event);
		} catch (err) {
			console.error('Failed to switch work log:', err);
			throw error(500, 'Internal Server Error');
		}
	},

	update: async (event) => {
		try {
			return await handleUpdateAction(event);
		} catch (err) {
			console.error('Failed to update work log:', err);
			throw error(500, 'Internal Server Error');
		}
	},

	delete: async (event) => {
		try {
			return await handleDeleteAction(event);
		} catch (err) {
			console.error('Failed to delete work log:', err);
			throw error(500, 'Internal Server Error');
		}
	},
};
