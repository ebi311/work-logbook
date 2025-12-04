/**
 * フォームレスポンス処理ハンドラー
 *
 * @module lib/client/handlers/formResponseHandler
 */

import type { ActionData } from '../../../routes/$types';

/**
 * フォームレスポンス処理のオプション
 */
export interface FormResponseHandlerOptions {
	/** start成功時のハンドラー */
	onStartSuccess: (form: NonNullable<ActionData>) => void;
	/** stop成功時のハンドラー */
	onStopSuccess: (form: NonNullable<ActionData>) => void;
	/** switch成功時のハンドラー */
	onSwitchSuccess: (form: NonNullable<ActionData>) => void;
	/** adjustActive成功時のハンドラー */
	onAdjustActiveSuccess: (form: NonNullable<ActionData>) => void;
	/** エラー時のハンドラーマップ */
	errorHandlers: Record<string, (form: NonNullable<ActionData>) => void>;
}

/**
 * 成功レスポンスの型ガード
 */
const isSuccessResponse = (
	form: NonNullable<ActionData>,
): form is NonNullable<ActionData> & { ok: true } => {
	return 'ok' in form && form.ok === true;
};

/**
 * switch成功レスポンスの型ガード
 */
const isSwitchSuccess = (form: NonNullable<ActionData>): boolean => {
	return 'started' in form && 'stopped' in form;
};

/**
 * start成功レスポンスの型ガード
 */
const isStartSuccess = (form: NonNullable<ActionData>): boolean => {
	return (
		'workLog' in form &&
		form.workLog !== null &&
		typeof form.workLog === 'object' &&
		'endedAt' in form.workLog &&
		form.workLog.endedAt === null
	);
};

/**
 * stop成功レスポンスの型ガード
 */
const isStopSuccess = (form: NonNullable<ActionData>): boolean => {
	return 'durationSec' in form;
};

/**
 * adjustActive成功レスポンスの型ガード
 */
const isAdjustActiveSuccess = (form: NonNullable<ActionData>): boolean => {
	return (
		'workLog' in form &&
		form.workLog !== null &&
		typeof form.workLog === 'object' &&
		'updatedAt' in form.workLog
	);
};

/**
 * エラーレスポンスの型ガード
 */
const isErrorResponse = (
	form: NonNullable<ActionData>,
): form is NonNullable<ActionData> & { reason: string } => {
	return 'reason' in form && typeof form.reason === 'string';
};

/**
 * 成功レスポンスを処理
 */
const handleSuccessResponse = (
	form: NonNullable<ActionData>,
	options: FormResponseHandlerOptions,
): void => {
	// switch 成功時の処理
	if (isSwitchSuccess(form)) {
		options.onSwitchSuccess(form);
		return;
	}

	// workLogが存在しない場合は処理しない
	if (!('workLog' in form)) {
		return;
	}

	// start 成功時の処理
	if (isStartSuccess(form)) {
		options.onStartSuccess(form);
		return;
	}

	// stop 成功時の処理
	if (isStopSuccess(form)) {
		options.onStopSuccess(form);
		return;
	}

	// adjustActive 成功時の処理
	if (isAdjustActiveSuccess(form)) {
		options.onAdjustActiveSuccess(form);
		return;
	}

	// update 成功時は、モーダルから onupdated コールバックで処理される
};

/**
 * エラーレスポンスを処理
 */
const handleErrorResponse = (
	form: NonNullable<ActionData> & { reason: string },
	options: FormResponseHandlerOptions,
): void => {
	const handler = options.errorHandlers[form.reason];
	if (handler) {
		handler(form);
	}
};

/**
 * フォームレスポンス処理ハンドラーを作成
 *
 * ## 処理フロー
 * 1. formがnullの場合は何もしない
 * 2. 成功レスポンスの場合、アクション種別に応じた処理を実行
 * 3. エラーレスポンスの場合、エラーハンドラーを実行
 *
 * @param options - フォームレスポンス処理のオプション
 * @returns フォームレスポンス処理関数
 *
 * @example
 * ```ts
 * const processFormResponse = createFormResponseHandler({
 *   onStartSuccess: (form) => { ... },
 *   onStopSuccess: (form) => { ... },
 *   onSwitchSuccess: (form) => { ... },
 *   errorHandlers: { ACTIVE_EXISTS: (form) => { ... } }
 * });
 *
 * $effect(() => {
 *   processFormResponse(form);
 * });
 * ```
 */
export const createFormResponseHandler = (options: FormResponseHandlerOptions) => {
	return (form: ActionData | undefined): void => {
		// formがnullの場合は何もしない
		if (!form) {
			return;
		}

		// 成功レスポンスの処理
		if (isSuccessResponse(form)) {
			handleSuccessResponse(form, options);
			return;
		}

		// エラーレスポンスの処理
		if (isErrorResponse(form)) {
			handleErrorResponse(form, options);
			return;
		}
	};
};
