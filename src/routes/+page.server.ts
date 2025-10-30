import { error, fail } from '@sveltejs/kit';
import type { ServerLoad, Actions, RequestEvent } from '@sveltejs/kit';
import {
	getActiveWorkLog,
	stopWorkLog,
	listWorkLogs,
	aggregateMonthlyWorkLogDuration,
	getWorkLogById,
	updateWorkLog,
	deleteWorkLog,
	saveWorkLogTags,
	getUserTagSuggestions
} from '$lib/server/db/workLogs';
import { normalizeWorkLogQuery } from '$lib/utils/queryNormalizer';
import { validateTimeRange, validateDescription } from '$lib/utils/validation';
import { normalizeTags } from '../models/workLog';
import { handleStartAction } from './_actions/start';

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
	// テスト用の遅延（2秒）
	if (process.env.NODE_ENV === 'development') {
		await new Promise<void>((resolve) => setTimeout(() => resolve(), 2000));
	}
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
	// F-003: タグ候補
	tagSuggestions?: string[];
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

		// F-003: タグ候補を取得（最大20件）
		const tagSuggestions = await getUserTagSuggestions(userId, '', 20);

		// 重いデータ: 一覧と月次合計（Promiseのまま返してストリーミング）
		const listData = fetchListData(userId, normalized);

		// レスポンス構築（軽量データ + Promise）
		const response: LoadData = {
			serverNow,
			listData,
			tagSuggestions // F-003: タグ候補を追加
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
 * F-001: 作業終了
 * F-003: タグ付き
 */

type StopActionSuccess = {
	ok: true;
	workLog: {
		id: string;
		startedAt: string;
		endedAt: string;
		description: string;
		tags?: string[]; // F-003: オプショナルなタグ配列
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

	// FormDataから description と tags を取得
	const formData = await request.formData();
	const description = (formData.get('description') as string) || '';
	const tagsString = (formData.get('tags') as string) || '';
	const tags = tagsString
		.split(/\s+/)
		.map((t) => t.trim())
		.filter((t) => t.length > 0);

	// タグの正規化とバリデーション
	let normalizedTags: string[] = [];
	try {
		normalizedTags = normalizeTags(tags);
	} catch (err) {
		return fail(400, {
			ok: false,
			reason: 'INVALID_TAGS',
			message: err instanceof Error ? err.message : 'タグが無効です',
			serverNow: serverNow.toISOString()
		});
	}

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

	// タグを保存（F-003）
	await saveWorkLogTags(stoppedWorkLog.id, normalizedTags);

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
			description: stoppedWorkLog.description,
			tags: normalizedTags // F-003: タグを含める
		},
		serverNow: serverNow.toISOString(),
		durationSec
	} satisfies StopActionSuccess;
};

/**
 * F-004: 作業記録の更新
 */

type UpdateActionSuccess = {
	ok: true;
	workLog: {
		id: string;
		userId: string;
		startedAt: string;
		endedAt: string;
		description: string;
		updatedAt: string;
	};
	serverNow: string;
};

type UpdateActionFailure = {
	ok: false;
	reason: 'NOT_FOUND' | 'FORBIDDEN' | 'VALIDATION_ERROR';
	message: string;
	errors?: Record<string, string>;
	serverNow: string;
};

/**
 * 作業記録更新アクションの実装
 */
const handleUpdateAction = async ({ locals, request }: RequestEvent) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const userId = locals.user.id;
	const serverNow = new Date();

	try {
		// FormDataから取得
		const formData = await request.formData();
		const id = formData.get('id') as string;
		const startedAtStr = formData.get('startedAt') as string;
		const endedAtStr = formData.get('endedAt') as string;
		const description = (formData.get('description') as string) || '';

		// 作業記録を取得
		const workLog = await getWorkLogById(id);

		if (!workLog) {
			return fail(404, {
				ok: false,
				reason: 'NOT_FOUND',
				message: '作業記録が見つかりません',
				serverNow: serverNow.toISOString()
			} satisfies UpdateActionFailure);
		}

		// 権限チェック
		if (workLog.userId !== userId) {
			return fail(403, {
				ok: false,
				reason: 'FORBIDDEN',
				message: 'この操作を実行する権限がありません',
				serverNow: serverNow.toISOString()
			} satisfies UpdateActionFailure);
		}

		// 日時パース
		const startedAt = new Date(startedAtStr);
		const endedAt = new Date(endedAtStr);

		// バリデーション
		const errors: Record<string, string> = {};

		// 時刻の整合性チェック
		const timeRangeResult = validateTimeRange(startedAt, endedAt);
		if (!timeRangeResult.valid) {
			errors.time = timeRangeResult.error!;
		}

		// 作業内容の文字数チェック
		const descriptionResult = validateDescription(description);
		if (!descriptionResult.valid) {
			errors.description = descriptionResult.error!;
		}

		// バリデーションエラーがある場合
		if (Object.keys(errors).length > 0) {
			return fail(400, {
				ok: false,
				reason: 'VALIDATION_ERROR',
				message: 'バリデーションエラー',
				errors,
				serverNow: serverNow.toISOString()
			} satisfies UpdateActionFailure);
		}

		// データベース更新
		const updatedWorkLog = await updateWorkLog(id, {
			startedAt,
			endedAt,
			description
		});

		if (!updatedWorkLog) {
			return fail(404, {
				ok: false,
				reason: 'NOT_FOUND',
				message: '作業記録が見つかりません',
				serverNow: serverNow.toISOString()
			} satisfies UpdateActionFailure);
		}

		return {
			ok: true,
			workLog: {
				id: updatedWorkLog.id,
				userId: updatedWorkLog.userId,
				startedAt: updatedWorkLog.startedAt.toISOString(),
				endedAt: updatedWorkLog.endedAt!.toISOString(),
				description: updatedWorkLog.description,
				updatedAt: updatedWorkLog.updatedAt.toISOString()
			},
			serverNow: serverNow.toISOString()
		} satisfies UpdateActionSuccess;
	} catch (err) {
		console.error('Failed to update work log:', err);
		throw error(500, 'Internal Server Error');
	}
};

/**
 * F-004: 作業記録の削除
 */

type DeleteActionSuccess = {
	ok: true;
	deletedId: string;
	serverNow: string;
};

type DeleteActionFailure = {
	ok: false;
	reason: 'NOT_FOUND' | 'FORBIDDEN';
	message: string;
	serverNow: string;
};

/**
 * 作業記録削除アクションの実装
 */
const handleDeleteAction = async ({ locals, request }: RequestEvent) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const userId = locals.user.id;
	const serverNow = new Date();

	try {
		// FormDataから取得
		const formData = await request.formData();
		const id = formData.get('id') as string;

		// 作業記録を取得
		const workLog = await getWorkLogById(id);

		if (!workLog) {
			return fail(404, {
				ok: false,
				reason: 'NOT_FOUND',
				message: '作業記録が見つかりません',
				serverNow: serverNow.toISOString()
			} satisfies DeleteActionFailure);
		}

		// 権限チェック
		if (workLog.userId !== userId) {
			return fail(403, {
				ok: false,
				reason: 'FORBIDDEN',
				message: 'この操作を実行する権限がありません',
				serverNow: serverNow.toISOString()
			} satisfies DeleteActionFailure);
		}

		// データベースから削除
		const deleted = await deleteWorkLog(id, userId);

		if (!deleted) {
			return fail(404, {
				ok: false,
				reason: 'NOT_FOUND',
				message: '作業記録が見つかりません',
				serverNow: serverNow.toISOString()
			} satisfies DeleteActionFailure);
		}

		return {
			ok: true,
			deletedId: id,
			serverNow: serverNow.toISOString()
		} satisfies DeleteActionSuccess;
	} catch (err) {
		console.error('Failed to delete work log:', err);
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
	}
};
