import { error, fail } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { getActiveWorkLog, createWorkLog, saveWorkLogTags } from '$lib/server/db/workLogs';
import { normalizeTags } from '../../models/workLog';

/**
 * F-001: 作業開始
 * F-003: タグ付き
 */

export type StartActionSuccess = {
	ok: true;
	workLog: {
		id: string;
		startedAt: string;
		endedAt: null;
		description: string;
		tags?: string[]; // F-003: オプショナルなタグ配列
	};
	serverNow: string;
};

export type StartActionFailure = {
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
export const handleStartAction = async ({ locals, request }: RequestEvent) => {
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

	// タグを保存（F-003）
	if (normalizedTags.length > 0) {
		await saveWorkLogTags(workLog.id, normalizedTags);
	}

	return {
		ok: true,
		workLog: {
			id: workLog.id,
			startedAt: workLog.startedAt.toISOString(),
			endedAt: null,
			description: workLog.description,
			tags: normalizedTags // F-003: タグを含める
		},
		serverNow: serverNow.toISOString()
	} satisfies StartActionSuccess;
};
