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
		tags: string[];
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

const parseTags = (tagsStr: string): string[] =>
	tagsStr
		.split(/\s+/)
		.map((tag) => tag.trim())
		.filter((tag) => tag.length > 0);

const collectUpdateErrors = (
	startedAt: Date,
	endedAt: Date,
	description: string,
	tags: string[],
): Record<string, string> => {
	const errors: Record<string, string> = {};

	const timeRangeResult = validateTimeRange(startedAt, endedAt);
	if (!timeRangeResult.valid) {
		errors.time = timeRangeResult.error!;
	}

	const descriptionResult = validateDescription(description);
	if (!descriptionResult.valid) {
		errors.description = descriptionResult.error!;
	}

	if (tags.length > 20) {
		errors.tags = 'タグは最大20個までです';
	}

	for (const tag of tags) {
		if (tag.length > 100) {
			errors.tags = 'タグ名は100文字以内にしてください';
			break;
		}
	}

	return errors;
};

const failUpdate = (
	status: number,
	payload: Omit<UpdateActionFailure, 'ok' | 'serverNow'>,
	serverNow: Date,
) =>
	fail(status, {
		ok: false,
		...payload,
		serverNow: serverNow.toISOString(),
	} satisfies UpdateActionFailure);

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
		const formData = await request.formData();
		const id = formData.get('id') as string;
		const description = (formData.get('description') as string) || '';
		const tags = parseTags((formData.get('tags') as string) || '');
		const startedAt = new Date(formData.get('startedAt') as string);
		const endedAt = new Date(formData.get('endedAt') as string);

		const workLog = await getWorkLogById(id);
		if (!workLog) {
			return failUpdate(
				404,
				{ reason: 'NOT_FOUND', message: '作業記録が見つかりません' },
				serverNow,
			);
		}
		if (workLog.userId !== userId) {
			return failUpdate(
				403,
				{ reason: 'FORBIDDEN', message: 'この操作を実行する権限がありません' },
				serverNow,
			);
		}

		const errors = collectUpdateErrors(startedAt, endedAt, description, tags);
		if (Object.keys(errors).length > 0) {
			return failUpdate(
				400,
				{ reason: 'VALIDATION_ERROR', message: 'バリデーションエラー', errors },
				serverNow,
			);
		}

		const updatedWorkLog = await updateWorkLog(id, {
			startedAt,
			endedAt,
			description,
			tags,
		});
		if (!updatedWorkLog) {
			return failUpdate(
				404,
				{ reason: 'NOT_FOUND', message: '作業記録が見つかりません' },
				serverNow,
			);
		}

		return {
			ok: true,
			workLog: {
				id: updatedWorkLog.id,
				userId: updatedWorkLog.userId,
				startedAt: updatedWorkLog.startedAt.toISOString(),
				endedAt: updatedWorkLog.endedAt!.toISOString(),
				description: updatedWorkLog.description,
				tags: updatedWorkLog.tags || [],
				updatedAt: updatedWorkLog.updatedAt.toISOString(),
			},
			serverNow: serverNow.toISOString(),
		} satisfies UpdateActionSuccess;
	} catch (err) {
		console.error('Failed to update work log:', err);
		throw error(500, 'Internal Server Error');
	}
};
