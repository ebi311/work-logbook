import { saveWorkLogOffline, updateWorkLogOffline } from '../db/workLogs';
import { requestSync } from '../sync/trigger';

/**
 * アクティブな作業記録の型
 * (+page.server.ts の ActiveWorkLog と同じ構造)
 */
export type ActiveWorkLog = {
	id: string;
	startedAt: string;
	endedAt: null;
	description: string;
	tags: string[];
};

/**
 * オフラインアクションの実行結果
 */
export type OfflineActionResult = {
	/** 実行成功フラグ */
	success: boolean;
	/** 更新された現在のactive状態（undefinedの場合は終了済み） */
	currentActive?: ActiveWorkLog;
	/** 作業時間（分） */
	duration?: number;
	/** 成功メッセージ */
	message?: string;
	/** エラーメッセージ */
	error?: string;
};

/**
 * オフラインアクションの実行コンテキスト
 */
export type OfflineActionContext = {
	/** 現在のactive状態 */
	currentActive?: ActiveWorkLog;
	/** 作業内容 */
	description: string;
	/** タグ */
	tags: string[];
	/** ユーザーID */
	userId: string;
};

/**
 * 作業時間を計算（分単位）
 */
const calculateDuration = (startTime: string, endTime: string): number => {
	return Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000);
};

/**
 * オフライン時の作業開始処理
 */
const executeStart = async (context: OfflineActionContext): Promise<OfflineActionResult> => {
	const startTime = new Date();

	const id = await saveWorkLogOffline({
		userId: context.userId,
		startAt: startTime.toISOString(),
		endAt: null,
		description: context.description,
		tags: context.tags,
	});

	const currentActive: ActiveWorkLog = {
		id,
		startedAt: startTime.toISOString(),
		endedAt: null,
		description: context.description,
		tags: context.tags,
	};

	requestSync();

	return {
		success: true,
		currentActive,
		message: '作業を開始しました（オフライン）',
	};
};

/**
 * オフライン時の作業終了処理
 */
const executeStop = async (context: OfflineActionContext): Promise<OfflineActionResult> => {
	if (!context.currentActive) {
		return {
			success: false,
			error: '進行中の作業がありません',
		};
	}

	const endTime = new Date().toISOString();

	await updateWorkLogOffline(context.currentActive.id, {
		endAt: endTime,
		description: context.description,
		tags: context.tags,
	});

	const duration = calculateDuration(context.currentActive.startedAt, endTime);

	requestSync();

	return {
		success: true,
		currentActive: undefined,
		duration,
		message: `作業を終了しました（オフライン、${duration}分）`,
	};
};

/**
 * オフライン時の作業切り替え処理
 */
const executeSwitch = async (context: OfflineActionContext): Promise<OfflineActionResult> => {
	if (!context.currentActive) {
		return {
			success: false,
			error: '進行中の作業がありません',
		};
	}

	const endTime = new Date().toISOString();
	const oldId = context.currentActive.id;

	// 既存の作業を終了
	await updateWorkLogOffline(oldId, {
		endAt: endTime,
		description: context.currentActive.description,
		tags: context.currentActive.tags,
	});

	// 新しい作業を開始
	const newId = await saveWorkLogOffline({
		userId: context.userId,
		startAt: endTime,
		endAt: null,
		description: context.description,
		tags: context.tags,
	});

	const duration = calculateDuration(context.currentActive.startedAt, endTime);

	const currentActive: ActiveWorkLog = {
		id: newId,
		startedAt: endTime,
		endedAt: null,
		description: context.description,
		tags: context.tags,
	};

	requestSync();

	return {
		success: true,
		currentActive,
		duration,
		message: `作業を切り替えました（オフライン、${duration}分）`,
	};
};

/**
 * オフライン時のアクション実行
 *
 * @param actionName - アクション名 ('start' | 'stop' | 'switch')
 * @param context - 実行コンテキスト
 * @returns 実行結果
 */
export const executeOfflineAction = async (
	actionName: 'start' | 'stop' | 'switch',
	context: OfflineActionContext,
): Promise<OfflineActionResult> => {
	try {
		switch (actionName) {
			case 'start':
				return await executeStart(context);
			case 'stop':
				return await executeStop(context);
			case 'switch':
				return await executeSwitch(context);
			default:
				return {
					success: false,
					error: `不明なアクション: ${actionName}`,
				};
		}
	} catch (error) {
		console.error('Offline action error:', error);
		return {
			success: false,
			error: 'オフライン操作でエラーが発生しました',
		};
	}
};
