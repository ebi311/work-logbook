import { error, fail } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { getActiveWorkLog, updateActiveWorkLog, getPreviousEndedAt } from '$lib/server/db/workLogs';
import { validateDescription } from '$lib/utils/validation';
import { normalizeTags } from '../../models/workLog';

/**
 * F-001.2: 進行中作業の調整
 */

export type AdjustActiveActionSuccess = {
	ok: true;
	workLog: {
		id: string;
		startedAt: string;
		endedAt: null;
		description: string;
		tags: string[];
		updatedAt: string;
	};
	serverNow: string;
};

export type AdjustActiveActionFailure = {
	ok: false;
	reason: 'NO_ACTIVE' | 'NOT_FOUND' | 'VALIDATION_ERROR' | 'CONFLICT_STOPPED' | 'INTERNAL_ERROR';
	message: string;
	errors?: Record<string, string>;
	serverNow: string;
};

/**
 * バリデーションを実行
 */
const validateAdjustment = (
	activeWorkLog: Awaited<ReturnType<typeof getActiveWorkLog>>,
	previousEndedAt: Date | null,
	serverNow: Date,
	newStartedAt: Date,
	description: string,
): Record<string, string> => {
	const errors: Record<string, string> = {};

	if (!activeWorkLog) {
		return errors;
	}

	// WorkLog ドメインモデルでバリデーション
	const adjustmentResult = activeWorkLog.validateAdjustment({
		previousEndedAt: previousEndedAt ?? undefined,
		serverNow,
		newStartedAt,
	});

	if (!adjustmentResult.valid) {
		errors.startedAt = adjustmentResult.error!;
	}

	// 作業内容のバリデーション
	const descriptionResult = validateDescription(description);
	if (!descriptionResult.valid) {
		errors.description = descriptionResult.error!;
	}

	return errors;
};

/**
 * FormDataをパースして正規化されたタグを取得
 */
const parseFormData = (formData: FormData) => {
	const workLogId = formData.get('workLogId') as string;
	const startedAtStr = formData.get('startedAt') as string;
	const description = (formData.get('description') as string) || '';
	const tagsStr = (formData.get('tags') as string) || '';

	// タグをパース（スペース区切り）
	const tagsArray = tagsStr
		.split(/\s+/)
		.map((tag) => tag.trim())
		.filter((tag) => tag.length > 0);

	// タグの正規化
	const normalizedTags = normalizeTags(tagsArray);

	return {
		workLogId,
		startedAtStr,
		description,
		normalizedTags,
	};
};

/**
 * DB更新を実行してレスポンスを構築
 */
const updateAndBuildResponse = async (
	userId: string,
	workLogId: string,
	newStartedAt: Date,
	description: string,
	normalizedTags: string[],
	serverNow: Date,
): Promise<AdjustActiveActionSuccess | ReturnType<typeof fail>> => {
	// DB更新
	const updatedWorkLog = await updateActiveWorkLog(userId, workLogId, {
		startedAt: newStartedAt,
		description,
		tags: normalizedTags,
	});

	if (!updatedWorkLog) {
		// 更新に失敗（進行中でなくなった、またはユーザー不一致）
		return fail(409, {
			ok: false,
			reason: 'CONFLICT_STOPPED',
			message: '作業が既に終了されています',
			serverNow: serverNow.toISOString(),
		} satisfies AdjustActiveActionFailure);
	}

	return {
		ok: true,
		workLog: {
			id: updatedWorkLog.id,
			startedAt: updatedWorkLog.startedAt.toISOString(),
			endedAt: null,
			description: updatedWorkLog.description,
			tags: updatedWorkLog.tags || [],
			updatedAt: updatedWorkLog.updatedAt.toISOString(),
		},
		serverNow: serverNow.toISOString(),
	} satisfies AdjustActiveActionSuccess;
};

/**
 * 進行中作業の調整アクションの実装
 */
export const handleAdjustActiveAction = async ({ locals, request }: RequestEvent) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const userId = locals.user.id;
	const serverNow = new Date();

	try {
		// FormDataから取得してパース
		const formData = await request.formData();
		let parsedData;
		try {
			parsedData = parseFormData(formData);
		} catch (err) {
			return fail(400, {
				ok: false,
				reason: 'VALIDATION_ERROR',
				message: err instanceof Error ? err.message : 'タグが無効です',
				errors: {
					tags: err instanceof Error ? err.message : 'タグが無効です',
				},
				serverNow: serverNow.toISOString(),
			} satisfies AdjustActiveActionFailure);
		}

		const { workLogId, startedAtStr, description, normalizedTags } = parsedData;

		// 進行中の作業を取得
		const activeWorkLog = await getActiveWorkLog(userId);

		if (!activeWorkLog) {
			return fail(404, {
				ok: false,
				reason: 'NO_ACTIVE',
				message: '進行中の作業が見つかりません',
				serverNow: serverNow.toISOString(),
			} satisfies AdjustActiveActionFailure);
		}

		// workLogId が一致しているか確認（concurrency 対策）
		if (activeWorkLog.id !== workLogId) {
			return fail(409, {
				ok: false,
				reason: 'CONFLICT_STOPPED',
				message: '進行中の作業が変更されています',
				serverNow: serverNow.toISOString(),
			} satisfies AdjustActiveActionFailure);
		}

		// 新しい開始時刻をパース
		const newStartedAt = new Date(startedAtStr);

		// 最新の完了作業の終了時刻を取得
		const previousEndedAt = await getPreviousEndedAt(userId);

		// バリデーション
		const errors = validateAdjustment(
			activeWorkLog,
			previousEndedAt,
			serverNow,
			newStartedAt,
			description,
		);

		// エラーがあれば返す
		if (Object.keys(errors).length > 0) {
			return fail(400, {
				ok: false,
				reason: 'VALIDATION_ERROR',
				message: 'バリデーションエラー',
				errors,
				serverNow: serverNow.toISOString(),
			} satisfies AdjustActiveActionFailure);
		}

		// DB更新してレスポンスを構築
		return await updateAndBuildResponse(
			userId,
			workLogId,
			newStartedAt,
			description,
			normalizedTags,
			serverNow,
		);
	} catch (err) {
		console.error('[adjustActive] Internal error:', err);
		return fail(500, {
			ok: false,
			reason: 'INTERNAL_ERROR',
			message: 'サーバーエラーが発生しました',
			serverNow: serverNow.toISOString(),
		} satisfies AdjustActiveActionFailure);
	}
};
