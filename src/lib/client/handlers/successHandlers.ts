import { saveWorkLogFromServer } from '../db/workLogs';
import type { ActionData } from '../../../routes/$types';

/**
 * 成功ハンドラーの依存関係
 */
export type SuccessHandlerDependencies = {
	/** currentActiveの状態更新関数 */
	setCurrentActive: (active: ActiveWorkLog | undefined) => void;
	/** tagsの状態更新関数 */
	setTags: (tags: string[]) => void;
	/** currentServerNowの状態更新関数 */
	setCurrentServerNow: (serverNow: string) => void;
	/** トースト成功メッセージ表示関数 */
	showSuccessToast: (message: string) => void;
	/** PageDataのlistDataプロミス */
	listDataPromise: Promise<{
		items: Array<{ id: string }>;
	}>;
};

/**
 * アクティブな作業記録の型（サーバーから返される形式）
 */
export type ActiveWorkLog = {
	id: string;
	startedAt: string;
	endedAt: null;
	description: string;
	tags: string[];
};

/**
 * 作業記録の型（サーバーから返される形式、終了済み）
 */
export type CompletedWorkLog = {
	id: string;
	startedAt: string;
	endedAt: string;
	description: string;
	tags: string[];
};

/**
 * 作業開始成功時の処理を作成
 */
export const createHandleStartSuccess = (deps: SuccessHandlerDependencies) => {
	return async (form: NonNullable<ActionData>) => {
		if (!('workLog' in form) || !form.workLog) return;
		if (
			typeof form.workLog !== 'object' ||
			!('endedAt' in form.workLog) ||
			form.workLog.endedAt !== null
		)
			return;

		// 状態を更新
		deps.setCurrentActive(form.workLog as ActiveWorkLog);

		if ('serverNow' in form) {
			deps.setCurrentServerNow(form.serverNow as string);
		}

		// サーバーからのデータをIndexedDBに保存
		try {
			await deps.listDataPromise; // データの読み込みを待つ
			const userId = 'offline-user'; // TODO: 適切なuserIdを取得
			const workLog = form.workLog as ActiveWorkLog;

			await saveWorkLogFromServer({
				id: workLog.id,
				userId,
				startedAt: workLog.startedAt,
				endedAt: null,
				description: workLog.description || '',
				tags: workLog.tags || [],
			});
		} catch (error) {
			console.error('Failed to save to IndexedDB:', error);
		}

		deps.showSuccessToast('作業を開始しました');
	};
};

/**
 * 作業終了成功時の処理を作成
 */
export const createHandleStopSuccess = (deps: SuccessHandlerDependencies) => {
	return async (form: NonNullable<ActionData>) => {
		if (!('workLog' in form) || !form.workLog || typeof form.workLog !== 'object') return;

		// 状態を更新
		deps.setCurrentActive(undefined);
		deps.setTags([]); // タグをクリア

		const duration =
			'durationSec' in form && typeof form.durationSec === 'number'
				? Math.floor(form.durationSec / 60)
				: 0;

		if ('serverNow' in form) {
			deps.setCurrentServerNow(form.serverNow as string);
		}

		// サーバーからのデータをIndexedDBに保存
		try {
			await deps.listDataPromise; // データの読み込みを待つ
			const userId = 'offline-user'; // TODO: 適切なuserIdを取得
			const workLog = form.workLog as CompletedWorkLog;

			await saveWorkLogFromServer({
				id: workLog.id,
				userId,
				startedAt: workLog.startedAt,
				endedAt: workLog.endedAt,
				description: workLog.description || '',
				tags: workLog.tags || [],
			});
		} catch (error) {
			console.error('Failed to save to IndexedDB:', error);
		}

		deps.showSuccessToast(`作業を終了しました(${duration}分)`);
	};
};

/**
 * 終了した作業をIndexedDBに保存
 */
const saveStoppedWorkLog = async (stopped: CompletedWorkLog, userId: string) => {
	await saveWorkLogFromServer({
		id: stopped.id,
		userId,
		startedAt: stopped.startedAt,
		endedAt: stopped.endedAt,
		description: stopped.description || '',
		tags: stopped.tags || [],
	});
};

/**
 * 開始した作業をIndexedDBに保存
 */
const saveStartedWorkLog = async (started: ActiveWorkLog, userId: string) => {
	await saveWorkLogFromServer({
		id: started.id,
		userId,
		startedAt: started.startedAt,
		endedAt: null,
		description: started.description || '',
		tags: started.tags || [],
	});
};

/**
 * 作業切り替え成功時のIndexedDB保存処理
 */
const saveSwitchWorkLogsToIndexedDB = async (
	form: NonNullable<ActionData>,
	listDataPromise: Promise<{ items: Array<{ id: string }> }>,
) => {
	if (!('started' in form) || !('stopped' in form)) return;

	await listDataPromise; // データの読み込みを待つ
	const userId = 'offline-user'; // TODO: 適切なuserIdを取得

	// 終了した作業を保存
	if (form.stopped && typeof form.stopped === 'object') {
		await saveStoppedWorkLog(form.stopped as CompletedWorkLog, userId);
	}

	// 開始した作業を保存
	if (form.started && typeof form.started === 'object') {
		await saveStartedWorkLog(form.started as ActiveWorkLog, userId);
	}
};

/**
 * 作業切り替えのフォームデータを検証
 */
const validateSwitchFormData = (
	form: NonNullable<ActionData>,
): { started: ActiveWorkLog; stopped: CompletedWorkLog } | null => {
	if (!('started' in form) || !form.started || typeof form.started !== 'object') return null;
	if (!('stopped' in form) || !form.stopped || typeof form.stopped !== 'object') return null;

	return {
		started: form.started as ActiveWorkLog,
		stopped: form.stopped as CompletedWorkLog,
	};
};

/**
 * 作業切り替え成功時の処理を作成
 */
export const createHandleSwitchSuccess = (deps: SuccessHandlerDependencies) => {
	return async (form: NonNullable<ActionData>) => {
		const validated = validateSwitchFormData(form);
		if (!validated) return;

		const { started, stopped } = validated;

		// 状態を更新（タグはクリアしない - 新しい作業のタグを保持）
		deps.setCurrentActive(started);

		const stoppedWithDuration = stopped as CompletedWorkLog & { durationSec?: number };
		const duration =
			'durationSec' in stoppedWithDuration && typeof stoppedWithDuration.durationSec === 'number'
				? Math.floor(stoppedWithDuration.durationSec / 60)
				: 0;

		if ('serverNow' in form) {
			deps.setCurrentServerNow(form.serverNow as string);
		}

		// サーバーからのデータをIndexedDBに保存（開始と終了の両方）
		try {
			await saveSwitchWorkLogsToIndexedDB(form, deps.listDataPromise);
		} catch (error) {
			console.error('Failed to save to IndexedDB:', error);
		}

		deps.showSuccessToast(`作業を切り替えました(${duration}分)`);
	};
};

/**
 * adjustActive作業のIndexedDB保存処理
 */
const saveAdjustActiveToIndexedDB = async (
	workLog: ActiveWorkLog,
	listDataPromise: Promise<{ items: Array<{ id: string }> }>,
) => {
	await listDataPromise; // データの読み込みを待つ
	const userId = 'offline-user'; // TODO: 適切なuserIdを取得

	await saveWorkLogFromServer({
		id: workLog.id,
		userId,
		startedAt: workLog.startedAt,
		endedAt: null,
		description: workLog.description,
		tags: workLog.tags,
	});
};

/**
 * adjustActive アクションの成功時処理を作成
 * F-001.2: 進行中作業の調整機能
 */
export const createHandleAdjustActiveSuccess = (deps: SuccessHandlerDependencies) => {
	return async (form: NonNullable<ActionData>) => {
		if (!('workLog' in form) || !form.workLog || typeof form.workLog !== 'object') return;

		const workLog = form.workLog as ActiveWorkLog;

		// 状態を更新
		deps.setCurrentActive(workLog);
		deps.setTags(workLog.tags);

		if ('serverNow' in form) {
			deps.setCurrentServerNow(form.serverNow as string);
		}

		// サーバーからのデータをIndexedDBに保存
		try {
			await saveAdjustActiveToIndexedDB(workLog, deps.listDataPromise);
		} catch (error) {
			console.error('Failed to save to IndexedDB:', error);
		}
		deps.showSuccessToast('作業内容を更新しました');
	};
};
