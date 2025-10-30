import { error, fail } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { getActiveWorkLog, stopWorkLog, saveWorkLogTags } from '$lib/server/db/workLogs';
import { normalizeTags } from '../../models/workLog';

/**
 * F-001: 作業終了
 * F-003: タグ付き
 */

export type StopActionSuccess = {
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

export type StopActionFailure = {
	reason: 'NO_ACTIVE';
	serverNow: string;
};

/**
 * 作業終了アクションの実装
 */
export const handleStopAction = async ({ locals, request }: RequestEvent) => {
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
