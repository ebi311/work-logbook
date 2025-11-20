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
		if (form.workLog.endedAt !== null) return; // 型ガード

		// 状態を更新
		deps.setCurrentActive(form.workLog as ActiveWorkLog);

		if ('serverNow' in form) {
			deps.setCurrentServerNow(form.serverNow as string);
		}

		// サーバーからのデータをIndexedDBに保存
		try {
			await deps.listDataPromise; // データの読み込みを待つ
			const userId = 'offline-user'; // TODO: 適切なuserIdを取得

			await saveWorkLogFromServer({
				id: form.workLog.id,
				userId,
				startedAt: form.workLog.startedAt,
				endedAt: null,
				description: form.workLog.description || '',
				tags: form.workLog.tags || [],
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
		if (!('workLog' in form) || !form.workLog) return;

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

			await saveWorkLogFromServer({
				id: form.workLog.id,
				userId,
				startedAt: form.workLog.startedAt,
				endedAt: form.workLog.endedAt,
				description: form.workLog.description || '',
				tags: form.workLog.tags || [],
			});
		} catch (error) {
			console.error('Failed to save to IndexedDB:', error);
		}

		deps.showSuccessToast(`作業を終了しました(${duration}分)`);
	};
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
	if (form.stopped) {
		await saveWorkLogFromServer({
			id: form.stopped.id,
			userId,
			startedAt: form.stopped.startedAt,
			endedAt: form.stopped.endedAt,
			description: form.stopped.description || '',
			tags: form.stopped.tags || [],
		});
	}

	// 開始した作業を保存
	if (form.started) {
		await saveWorkLogFromServer({
			id: form.started.id,
			userId,
			startedAt: form.started.startedAt,
			endedAt: null,
			description: form.started.description || '',
			tags: form.started.tags || [],
		});
	}
};

/**
 * 作業切り替え成功時の処理を作成
 */
export const createHandleSwitchSuccess = (deps: SuccessHandlerDependencies) => {
	return async (form: NonNullable<ActionData>) => {
		if (!('started' in form) || !form.started) return;
		if (!('stopped' in form) || !form.stopped) return;

		// 状態を更新（タグはクリアしない - 新しい作業のタグを保持）
		deps.setCurrentActive(form.started as ActiveWorkLog);

		const duration =
			'stopped' in form && form.stopped && 'durationSec' in form.stopped
				? Math.floor((form.stopped.durationSec as number) / 60)
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
 * adjustActive アクションの成功時処理を作成
 * F-001.2: 進行中作業の調整機能
 */
export const createHandleAdjustActiveSuccess = (deps: SuccessHandlerDependencies) => {
	return async (form: NonNullable<ActionData>) => {
		if (!('workLog' in form) || !form.workLog) return;

		const workLog = form.workLog as ActiveWorkLog;

		// 状態を更新
		deps.setCurrentActive(workLog);
		deps.setTags(workLog.tags);

		if ('serverNow' in form) {
			deps.setCurrentServerNow(form.serverNow as string);
		}

		// サーバーからのデータをIndexedDBに保存
		try {
			await saveWorkLogFromServer(workLog, deps.listDataPromise);
		} catch (error) {
			console.error('Failed to save to IndexedDB:', error);
		}

		deps.showSuccessToast('作業内容を更新しました');
	};
};
