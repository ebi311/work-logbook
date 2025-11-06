/**
 * 削除処理ハンドラー
 *
 * @module lib/client/delete/deleteHandler
 */

/**
 * 削除ハンドラーのオプション
 */
export interface DeleteHandlerOptions {
	/** オンライン状態 */
	isOnline: boolean;
	/** オフライン削除関数 */
	deleteOffline: (id: string) => Promise<void>;
	/** 成功時のコールバック (wasOffline: オフライン時の削除かどうか) */
	onSuccess: (wasOffline: boolean) => void;
	/** エラー時のコールバック */
	onError: (message: string, error?: unknown) => void;
}

/**
 * 削除確認ダイアログのメッセージ
 */
const CONFIRM_MESSAGE = 'この作業記録を削除してもよろしいですか？\n\nこの操作は取り消せません。';

/**
 * 削除処理のハンドラーを作成
 *
 * ## 処理フロー
 * 1. 確認ダイアログを表示
 * 2. キャンセルされた場合は処理を中止
 * 3. オフライン時はIndexedDBから削除
 * 4. オンライン時はサーバーに削除リクエストを送信
 *
 * @param options - 削除ハンドラーのオプション
 * @returns 削除処理関数
 *
 * @example
 * ```ts
 * const handleDelete = createDeleteHandler({
 *   isOnline: true,
 *   deleteOffline: async (id) => { await db.delete(id); },
 *   onSuccess: (wasOffline) => { console.log('Deleted', wasOffline); },
 *   onError: (msg, err) => { console.error(msg, err); }
 * });
 *
 * await handleDelete('work-log-id');
 * ```
 */
export const createDeleteHandler = (options: DeleteHandlerOptions) => {
	return async (id: string): Promise<void> => {
		// 確認ダイアログを表示
		const confirmed = window.confirm(CONFIRM_MESSAGE);

		if (!confirmed) {
			return; // キャンセルされた場合は何もしない
		}

		// オフライン時の処理
		if (!options.isOnline) {
			try {
				await options.deleteOffline(id);
				options.onSuccess(true); // wasOffline=true
			} catch (error) {
				console.error('Offline delete error:', error);
				options.onError('オフライン削除でエラーが発生しました', error);
			}
			return;
		}

		// オンライン時: サーバーに削除リクエストを送信
		const formData = new FormData();
		formData.set('id', id);

		try {
			const response = await fetch('?/delete', {
				method: 'POST',
				body: formData,
			});

			const result = await response.json();

			if (result.type === 'success') {
				// 削除成功
				options.onSuccess(false); // wasOffline=false
			} else {
				// 削除失敗
				options.onError('削除に失敗しました');
			}
		} catch (error) {
			console.error('Delete error:', error);
			options.onError('削除中にエラーが発生しました', error);
		}
	};
};
