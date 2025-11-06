/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDeleteHandler } from './deleteHandler';

describe('delete/deleteHandler', () => {
	describe('createDeleteHandler', () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let confirmSpy: any;
		let deleteOfflineMock: ReturnType<typeof vi.fn>;
		let onSuccessMock: ReturnType<typeof vi.fn>;
		let onErrorMock: ReturnType<typeof vi.fn>;

		beforeEach(() => {
			confirmSpy = vi.spyOn(window, 'confirm');
			deleteOfflineMock = vi.fn();
			onSuccessMock = vi.fn();
			onErrorMock = vi.fn();
		});

		afterEach(() => {
			confirmSpy.mockRestore();
		});

		describe('確認ダイアログ', () => {
			it('確認ダイアログでOKを押すと削除処理が実行される', async () => {
				confirmSpy.mockReturnValue(true);
				deleteOfflineMock.mockResolvedValue(undefined);

				const handler = createDeleteHandler({
					isOnline: false,
					deleteOffline: deleteOfflineMock,
					onSuccess: onSuccessMock,
					onError: onErrorMock,
				});

				await handler('test-id');

				expect(confirmSpy).toHaveBeenCalledWith(
					'この作業記録を削除してもよろしいですか？\n\nこの操作は取り消せません。',
				);
				expect(deleteOfflineMock).toHaveBeenCalledWith('test-id');
				expect(onSuccessMock).toHaveBeenCalledWith(true); // wasOffline=true
			});

			it('確認ダイアログでキャンセルすると削除処理が実行されない', async () => {
				confirmSpy.mockReturnValue(false);

				const handler = createDeleteHandler({
					isOnline: false,
					deleteOffline: deleteOfflineMock,
					onSuccess: onSuccessMock,
					onError: onErrorMock,
				});

				await handler('test-id');

				expect(confirmSpy).toHaveBeenCalled();
				expect(deleteOfflineMock).not.toHaveBeenCalled();
				expect(onSuccessMock).not.toHaveBeenCalled();
				expect(onErrorMock).not.toHaveBeenCalled();
			});
		});

		describe('オフライン時の削除', () => {
			it('オフライン時にIndexedDBから削除する', async () => {
				confirmSpy.mockReturnValue(true);
				deleteOfflineMock.mockResolvedValue(undefined);

				const handler = createDeleteHandler({
					isOnline: false,
					deleteOffline: deleteOfflineMock,
					onSuccess: onSuccessMock,
					onError: onErrorMock,
				});

				await handler('test-id');

				expect(deleteOfflineMock).toHaveBeenCalledWith('test-id');
				expect(onSuccessMock).toHaveBeenCalledWith(true); // wasOffline=true
				expect(onErrorMock).not.toHaveBeenCalled();
			});

			it('オフライン削除でエラーが発生した場合、エラーコールバックを呼ぶ', async () => {
				confirmSpy.mockReturnValue(true);
				const error = new Error('DB Error');
				deleteOfflineMock.mockRejectedValue(error);

				const handler = createDeleteHandler({
					isOnline: false,
					deleteOffline: deleteOfflineMock,
					onSuccess: onSuccessMock,
					onError: onErrorMock,
				});

				await handler('test-id');

				expect(deleteOfflineMock).toHaveBeenCalledWith('test-id');
				expect(onSuccessMock).not.toHaveBeenCalled();
				expect(onErrorMock).toHaveBeenCalledWith('オフライン削除でエラーが発生しました', error);
			});
		});

		describe('オンライン時の削除', () => {
			let fetchMock: ReturnType<typeof vi.fn>;

			beforeEach(() => {
				fetchMock = vi.fn();
				global.fetch = fetchMock;
			});

			it('オンライン時にサーバーに削除リクエストを送信する', async () => {
				confirmSpy.mockReturnValue(true);
				fetchMock.mockResolvedValue({
					json: async () => ({ type: 'success' }),
				});

				const handler = createDeleteHandler({
					isOnline: true,
					deleteOffline: deleteOfflineMock,
					onSuccess: onSuccessMock,
					onError: onErrorMock,
				});

				await handler('test-id');

				expect(fetchMock).toHaveBeenCalledWith('?/delete', {
					method: 'POST',
					body: expect.any(FormData),
				});

				// FormDataの内容を確認
				const callArgs = fetchMock.mock.calls[0];
				const formData = callArgs[1].body as FormData;
				expect(formData.get('id')).toBe('test-id');

				expect(onSuccessMock).toHaveBeenCalledWith(false); // wasOffline=false
				expect(onErrorMock).not.toHaveBeenCalled();
			});

			it('サーバーからエラーレスポンスが返った場合、エラーコールバックを呼ぶ', async () => {
				confirmSpy.mockReturnValue(true);
				fetchMock.mockResolvedValue({
					json: async () => ({ type: 'error' }),
				});

				const handler = createDeleteHandler({
					isOnline: true,
					deleteOffline: deleteOfflineMock,
					onSuccess: onSuccessMock,
					onError: onErrorMock,
				});

				await handler('test-id');

				expect(onSuccessMock).not.toHaveBeenCalled();
				expect(onErrorMock).toHaveBeenCalledWith('削除に失敗しました');
			});

			it('fetch中にエラーが発生した場合、エラーコールバックを呼ぶ', async () => {
				confirmSpy.mockReturnValue(true);
				const error = new Error('Network Error');
				fetchMock.mockRejectedValue(error);

				const handler = createDeleteHandler({
					isOnline: true,
					deleteOffline: deleteOfflineMock,
					onSuccess: onSuccessMock,
					onError: onErrorMock,
				});

				await handler('test-id');

				expect(onSuccessMock).not.toHaveBeenCalled();
				expect(onErrorMock).toHaveBeenCalledWith('削除中にエラーが発生しました', error);
			});
		});

		describe('オンライン状態の切り替え', () => {
			it('オンライン状態に応じて適切な処理が実行される', async () => {
				confirmSpy.mockReturnValue(true);
				deleteOfflineMock.mockResolvedValue(undefined);

				// オフライン時
				const offlineHandler = createDeleteHandler({
					isOnline: false,
					deleteOffline: deleteOfflineMock,
					onSuccess: onSuccessMock,
					onError: onErrorMock,
				});

				await offlineHandler('test-id-1');
				expect(deleteOfflineMock).toHaveBeenCalledWith('test-id-1');
				expect(onSuccessMock).toHaveBeenCalledWith(true);

				// リセット
				deleteOfflineMock.mockClear();
				onSuccessMock.mockClear();

				// オンライン時
				const fetchMock = vi.fn().mockResolvedValue({
					json: async () => ({ type: 'success' }),
				});
				global.fetch = fetchMock;

				const onlineHandler = createDeleteHandler({
					isOnline: true,
					deleteOffline: deleteOfflineMock,
					onSuccess: onSuccessMock,
					onError: onErrorMock,
				});

				await onlineHandler('test-id-2');
				expect(deleteOfflineMock).not.toHaveBeenCalled();
				expect(fetchMock).toHaveBeenCalled();
				expect(onSuccessMock).toHaveBeenCalledWith(false);
			});
		});
	});
});
