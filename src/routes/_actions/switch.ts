import { error, fail } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import {
	getActiveWorkLog,
	stopWorkLog,
	createWorkLog,
	saveWorkLogTags,
} from '$lib/server/db/workLogs';
import { normalizeTags } from '../../models/workLog';

/**
 * F-001.1: 作業切り替え
 * 進行中の作業を終了し、同時に新しい作業を開始する
 */

export type SwitchActionSuccess = {
	ok: true;
	stopped: {
		id: string;
		startedAt: string;
		endedAt: string;
		description: string;
		tags: string[];
		durationSec: number;
	};
	started: {
		id: string;
		startedAt: string;
		endedAt: null;
		description: string;
		tags: string[];
	};
	serverNow: string;
};

export type SwitchActionFailure = {
	reason: 'NO_ACTIVE';
	serverNow: string;
};

/**
 * 作業切り替えアクションの実装
 */
export const handleSwitchAction = async ({ locals, request }: RequestEvent) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const userId = locals.user.id;
	const serverNow = new Date();

	// FormDataから description と tags を取得
	const formData = await request.formData();
	const description = (formData.get('description') as string) || '';
	// タグは複数の同名フィールドとして送信される
	const tags = formData.getAll('tags').filter((t): t is string => typeof t === 'string');

	// タグの正規化とバリデーション
	let normalizedTags: string[] = [];
	try {
		normalizedTags = normalizeTags(tags);
	} catch (err) {
		return fail(400, {
			ok: false,
			reason: 'INVALID_TAGS',
			message: err instanceof Error ? err.message : 'タグが無効です',
			serverNow: serverNow.toISOString(),
		});
	}

	// 進行中の作業を取得
	const activeWorkLog = await getActiveWorkLog(userId);

	if (!activeWorkLog) {
		// 進行中の作業がない
		return fail(404, {
			reason: 'NO_ACTIVE',
			serverNow: serverNow.toISOString(),
		} satisfies SwitchActionFailure);
	}

	// 現在の作業を終了
	const stoppedWorkLog = await stopWorkLog(activeWorkLog.id, serverNow, description);

	if (!stoppedWorkLog) {
		// 更新失敗（既に終了済み）
		return fail(404, {
			reason: 'NO_ACTIVE',
			serverNow: serverNow.toISOString(),
		} satisfies SwitchActionFailure);
	}

	// 古い作業のタグを保存
	const oldTags = activeWorkLog.tags || [];
	await saveWorkLogTags(stoppedWorkLog.id, oldTags);

	// 作業時間を計算
	const durationSec = stoppedWorkLog.getDuration();

	if (durationSec === null) {
		console.error('stoppedWorkLog.getDuration() returned null');
		throw error(500, 'Internal Server Error');
	}

	// 新しい作業を開始
	const newWorkLog = await createWorkLog(userId, serverNow, description);

	// 新しい作業のタグを保存
	if (normalizedTags.length > 0) {
		await saveWorkLogTags(newWorkLog.id, normalizedTags);
	}

	return {
		ok: true,
		stopped: {
			id: stoppedWorkLog.id,
			startedAt: stoppedWorkLog.startedAt.toISOString(),
			endedAt: stoppedWorkLog.endedAt!.toISOString(),
			description: stoppedWorkLog.description,
			tags: oldTags,
			durationSec,
		},
		started: {
			id: newWorkLog.id,
			startedAt: newWorkLog.startedAt.toISOString(),
			endedAt: null,
			description: newWorkLog.description,
			tags: normalizedTags,
		},
		serverNow: serverNow.toISOString(),
	} satisfies SwitchActionSuccess;
};
