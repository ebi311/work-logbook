import { error, fail } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { getWorkLogById, updateWorkLog } from '$lib/server/db/workLogs';
import { validateTimeRange, validateDescription } from '$lib/utils/validation';

/**
 * F-004: 作業記録の更新
 */

export type UpdateActionSuccess = {
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

export type UpdateActionFailure = {
	ok: false;
	reason: 'NOT_FOUND' | 'FORBIDDEN' | 'VALIDATION_ERROR';
	message: string;
	errors?: Record<string, string>;
	serverNow: string;
};

/**
 * 作業記録更新アクションの実装
 */
export const handleUpdateAction = async ({ locals, request }: RequestEvent) => {
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
