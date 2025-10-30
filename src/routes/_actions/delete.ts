import { error, fail } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { getWorkLogById, deleteWorkLog } from '$lib/server/db/workLogs';

/**
 * F-004: 作業記録の削除
 */

export type DeleteActionSuccess = {
	ok: true;
	deletedId: string;
	serverNow: string;
};

export type DeleteActionFailure = {
	ok: false;
	reason: 'NOT_FOUND' | 'FORBIDDEN';
	message: string;
	serverNow: string;
};

/**
 * 作業記録削除アクションの実装
 */
export const handleDeleteAction = async ({ locals, request }: RequestEvent) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const userId = locals.user.id;
	const serverNow = new Date();

	try {
		// FormDataから取得
		const formData = await request.formData();
		const id = formData.get('id') as string;

		// 作業記録を取得
		const workLog = await getWorkLogById(id);

		if (!workLog) {
			return fail(404, {
				ok: false,
				reason: 'NOT_FOUND',
				message: '作業記録が見つかりません',
				serverNow: serverNow.toISOString(),
			} satisfies DeleteActionFailure);
		}

		// 権限チェック
		if (workLog.userId !== userId) {
			return fail(403, {
				ok: false,
				reason: 'FORBIDDEN',
				message: 'この操作を実行する権限がありません',
				serverNow: serverNow.toISOString(),
			} satisfies DeleteActionFailure);
		}

		// データベースから削除
		const deleted = await deleteWorkLog(id, userId);

		if (!deleted) {
			return fail(404, {
				ok: false,
				reason: 'NOT_FOUND',
				message: '作業記録が見つかりません',
				serverNow: serverNow.toISOString(),
			} satisfies DeleteActionFailure);
		}

		return {
			ok: true,
			deletedId: id,
			serverNow: serverNow.toISOString(),
		} satisfies DeleteActionSuccess;
	} catch (err) {
		console.error('Failed to delete work log:', err);
		throw error(500, 'Internal Server Error');
	}
};
