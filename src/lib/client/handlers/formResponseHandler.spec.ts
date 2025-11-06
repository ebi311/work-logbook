import { describe, it, expect, vi } from 'vitest';
import { createFormResponseHandler } from './formResponseHandler';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('formResponseHandler', () => {
	describe('createFormResponseHandler', () => {
		describe('formがnullの場合', () => {
			it('何も処理しない', () => {
				const onStartSuccess = vi.fn();
				const onStopSuccess = vi.fn();
				const onSwitchSuccess = vi.fn();
				const errorHandlers = {};

				const handler = createFormResponseHandler({
					onStartSuccess,
					onStopSuccess,
					onSwitchSuccess,
					errorHandlers,
				});

				handler(undefined as any);

				expect(onStartSuccess).not.toHaveBeenCalled();
				expect(onStopSuccess).not.toHaveBeenCalled();
				expect(onSwitchSuccess).not.toHaveBeenCalled();
			});
		});

		describe('start成功レスポンスの処理', () => {
			it('onStartSuccessが呼ばれる', () => {
				const onStartSuccess = vi.fn();
				const onStopSuccess = vi.fn();
				const onSwitchSuccess = vi.fn();

				const handler = createFormResponseHandler({
					onStartSuccess,
					onStopSuccess,
					onSwitchSuccess,
					errorHandlers: {},
				});

				const form = {
					ok: true,
					workLog: {
						id: 'test-id',
						startedAt: new Date().toISOString(),
						endedAt: null,
						description: 'テスト',
						tags: [],
					},
					serverNow: new Date().toISOString(),
				};

				handler(form as any);

				expect(onStartSuccess).toHaveBeenCalledWith(form);
				expect(onStopSuccess).not.toHaveBeenCalled();
				expect(onSwitchSuccess).not.toHaveBeenCalled();
			});
		});

		describe('stop成功レスポンスの処理', () => {
			it('onStopSuccessが呼ばれる', () => {
				const onStartSuccess = vi.fn();
				const onStopSuccess = vi.fn();
				const onSwitchSuccess = vi.fn();

				const handler = createFormResponseHandler({
					onStartSuccess,
					onStopSuccess,
					onSwitchSuccess,
					errorHandlers: {},
				});

				const form = {
					ok: true,
					workLog: {
						id: 'test-id',
						startedAt: new Date().toISOString(),
						endedAt: new Date().toISOString(),
						description: 'テスト',
						tags: [],
					},
					durationSec: 100,
					serverNow: new Date().toISOString(),
				};

				handler(form as any);

				expect(onStopSuccess).toHaveBeenCalledWith(form);
				expect(onStartSuccess).not.toHaveBeenCalled();
				expect(onSwitchSuccess).not.toHaveBeenCalled();
			});
		});

		describe('switch成功レスポンスの処理', () => {
			it('onSwitchSuccessが呼ばれる', () => {
				const onStartSuccess = vi.fn();
				const onStopSuccess = vi.fn();
				const onSwitchSuccess = vi.fn();

				const handler = createFormResponseHandler({
					onStartSuccess,
					onStopSuccess,
					onSwitchSuccess,
					errorHandlers: {},
				});

				const form = {
					ok: true,
					started: {
						id: 'new-id',
						startedAt: new Date().toISOString(),
						endedAt: null,
						description: '新規作業',
						tags: [],
					},
					stopped: {
						id: 'old-id',
						startedAt: new Date().toISOString(),
						endedAt: new Date().toISOString(),
						description: '前の作業',
						tags: [],
					},
					serverNow: new Date().toISOString(),
				};

				handler(form as any);

				expect(onSwitchSuccess).toHaveBeenCalledWith(form);
				expect(onStartSuccess).not.toHaveBeenCalled();
				expect(onStopSuccess).not.toHaveBeenCalled();
			});
		});

		describe('update成功レスポンスの処理', () => {
			it('workLogがあるがdurationSecがない場合、何も呼ばれない(モーダルで処理)', () => {
				const onStartSuccess = vi.fn();
				const onStopSuccess = vi.fn();
				const onSwitchSuccess = vi.fn();

				const handler = createFormResponseHandler({
					onStartSuccess,
					onStopSuccess,
					onSwitchSuccess,
					errorHandlers: {},
				});

				const form = {
					ok: true,
					workLog: {
						id: 'test-id',
						startedAt: new Date().toISOString(),
						endedAt: new Date().toISOString(),
						description: 'テスト',
						tags: [],
					},
					serverNow: new Date().toISOString(),
				};

				handler(form as any);

				// update成功時はモーダルから処理されるため、ここでは何も呼ばれない
				expect(onStartSuccess).not.toHaveBeenCalled();
				expect(onStopSuccess).not.toHaveBeenCalled();
				expect(onSwitchSuccess).not.toHaveBeenCalled();
			});
		});

		describe('workLogが存在しない成功レスポンス', () => {
			it('何も処理しない', () => {
				const onStartSuccess = vi.fn();
				const onStopSuccess = vi.fn();
				const onSwitchSuccess = vi.fn();

				const handler = createFormResponseHandler({
					onStartSuccess,
					onStopSuccess,
					onSwitchSuccess,
					errorHandlers: {},
				});

				const form = {
					ok: true,
					serverNow: new Date().toISOString(),
				};

				handler(form as any);

				expect(onStartSuccess).not.toHaveBeenCalled();
				expect(onStopSuccess).not.toHaveBeenCalled();
				expect(onSwitchSuccess).not.toHaveBeenCalled();
			});
		});

		describe('エラーレスポンスの処理', () => {
			it('ACTIVE_EXISTSエラー時、対応するハンドラーが呼ばれる', () => {
				const errorHandler = vi.fn();

				const handler = createFormResponseHandler({
					onStartSuccess: vi.fn(),
					onStopSuccess: vi.fn(),
					onSwitchSuccess: vi.fn(),
					errorHandlers: {
						ACTIVE_EXISTS: errorHandler,
					},
				});

				const form = {
					reason: 'ACTIVE_EXISTS',
					active: {
						id: 'existing-id',
						startedAt: new Date().toISOString(),
						endedAt: null,
						description: '既存の作業',
						tags: [],
					},
					serverNow: new Date().toISOString(),
				};

				handler(form as any);

				expect(errorHandler).toHaveBeenCalledWith(form);
			});

			it('NO_ACTIVEエラー時、対応するハンドラーが呼ばれる', () => {
				const errorHandler = vi.fn();

				const handler = createFormResponseHandler({
					onStartSuccess: vi.fn(),
					onStopSuccess: vi.fn(),
					onSwitchSuccess: vi.fn(),
					errorHandlers: {
						NO_ACTIVE: errorHandler,
					},
				});

				const form = {
					reason: 'NO_ACTIVE',
					serverNow: new Date().toISOString(),
				};

				handler(form as any);

				expect(errorHandler).toHaveBeenCalledWith(form);
			});

			it('未定義のエラー理由の場合、何も処理しない', () => {
				const handler = createFormResponseHandler({
					onStartSuccess: vi.fn(),
					onStopSuccess: vi.fn(),
					onSwitchSuccess: vi.fn(),
					errorHandlers: {},
				});

				const form = {
					reason: 'UNKNOWN_ERROR',
					serverNow: new Date().toISOString(),
				};

				// エラーが発生しないことを確認
				expect(() => handler(form as any)).not.toThrow();
			});
		});

		describe('不正なレスポンス形式', () => {
			it('okもreasonもない場合、何も処理しない', () => {
				const onStartSuccess = vi.fn();
				const onStopSuccess = vi.fn();
				const onSwitchSuccess = vi.fn();

				const handler = createFormResponseHandler({
					onStartSuccess,
					onStopSuccess,
					onSwitchSuccess,
					errorHandlers: {},
				});

				const form = {
					serverNow: new Date().toISOString(),
				};

				handler(form as any);

				expect(onStartSuccess).not.toHaveBeenCalled();
				expect(onStopSuccess).not.toHaveBeenCalled();
				expect(onSwitchSuccess).not.toHaveBeenCalled();
			});
		});
	});
});
