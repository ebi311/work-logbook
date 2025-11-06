/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 成功ハンドラーのテスト
 *
 * 注: 異常系テストでは型安全性を無視するため、no-explicit-anyを無効化しています
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	createHandleStartSuccess,
	createHandleStopSuccess,
	createHandleSwitchSuccess,
	type SuccessHandlerDependencies,
} from './successHandlers';
import * as workLogsDb from '../db/workLogs';

// モックの設定
vi.mock('../db/workLogs', () => ({
	saveWorkLogFromServer: vi.fn(),
}));

describe('successHandlers', () => {
	let deps: SuccessHandlerDependencies;

	beforeEach(() => {
		vi.clearAllMocks();

		// 共通の依存関係モック
		deps = {
			setCurrentActive: vi.fn(),
			setTags: vi.fn(),
			setCurrentServerNow: vi.fn(),
			showSuccessToast: vi.fn(),
			listDataPromise: Promise.resolve({ items: [{ id: 'test-id' }] }),
		};
	});

	describe('createHandleStartSuccess', () => {
		it('作業開始成功時の処理を正しく実行する', async () => {
			// Arrange
			const handleStartSuccess = createHandleStartSuccess(deps);
			const form = {
				ok: true as const,
				workLog: {
					id: 'work-1',
					startedAt: '2025-11-05T10:00:00Z',
					endedAt: null,
					description: '開発作業',
					tags: ['開発', 'フロントエンド'],
				},
				serverNow: '2025-11-05T10:00:05Z',
			};

			vi.mocked(workLogsDb.saveWorkLogFromServer).mockResolvedValue();

			// Act
			await handleStartSuccess(form);

			// Assert
			expect(deps.setCurrentActive).toHaveBeenCalledWith({
				id: 'work-1',
				startedAt: '2025-11-05T10:00:00Z',
				endedAt: null,
				description: '開発作業',
				tags: ['開発', 'フロントエンド'],
			});

			expect(deps.setCurrentServerNow).toHaveBeenCalledWith('2025-11-05T10:00:05Z');

			expect(workLogsDb.saveWorkLogFromServer).toHaveBeenCalledWith({
				id: 'work-1',
				userId: 'offline-user',
				startedAt: '2025-11-05T10:00:00Z',
				endedAt: null,
				description: '開発作業',
				tags: ['開発', 'フロントエンド'],
			});

			expect(deps.showSuccessToast).toHaveBeenCalledWith('作業を開始しました');
		});

		it('workLogがない場合は何もしない', async () => {
			// Arrange
			const handleStartSuccess = createHandleStartSuccess(deps);
			const form = {
				ok: true as const,
			} as any; // 型安全性を無視（異常系テスト）

			// Act
			await handleStartSuccess(form);

			// Assert
			expect(deps.setCurrentActive).not.toHaveBeenCalled();
			expect(deps.showSuccessToast).not.toHaveBeenCalled();
		});

		it('endedAtがnullでない場合は何もしない', async () => {
			// Arrange
			const handleStartSuccess = createHandleStartSuccess(deps);
			const form = {
				ok: true as const,
				workLog: {
					id: 'work-1',
					startedAt: '2025-11-05T10:00:00Z',
					endedAt: '2025-11-05T11:00:00Z',
					description: '開発作業',
					tags: [],
				},
				serverNow: '2025-11-05T10:00:05Z',
				durationSec: 3600,
			};

			// Act
			await handleStartSuccess(form);

			// Assert
			expect(deps.setCurrentActive).not.toHaveBeenCalled();
			expect(deps.showSuccessToast).not.toHaveBeenCalled();
		});

		it('IndexedDB保存エラーでも処理を継続する', async () => {
			// Arrange
			const handleStartSuccess = createHandleStartSuccess(deps);
			const form = {
				ok: true as const,
				workLog: {
					id: 'work-1',
					startedAt: '2025-11-05T10:00:00Z',
					endedAt: null,
					description: '開発作業',
					tags: [],
				},
				serverNow: '2025-11-05T10:00:05Z',
			};

			vi.mocked(workLogsDb.saveWorkLogFromServer).mockRejectedValue(new Error('DB Error'));

			// Act
			await handleStartSuccess(form);

			// Assert
			expect(deps.setCurrentActive).toHaveBeenCalled();
			expect(deps.showSuccessToast).toHaveBeenCalledWith('作業を開始しました');
		});
	});

	describe('createHandleStopSuccess', () => {
		it('作業終了成功時の処理を正しく実行する', async () => {
			// Arrange
			const handleStopSuccess = createHandleStopSuccess(deps);
			const form = {
				ok: true as const,
				workLog: {
					id: 'work-1',
					startedAt: '2025-11-05T10:00:00Z',
					endedAt: '2025-11-05T11:00:00Z',
					description: '開発作業',
					tags: ['開発'],
				},
				durationSec: 3600, // 60分
				serverNow: '2025-11-05T11:00:05Z',
			};

			vi.mocked(workLogsDb.saveWorkLogFromServer).mockResolvedValue();

			// Act
			await handleStopSuccess(form);

			// Assert
			expect(deps.setCurrentActive).toHaveBeenCalledWith(undefined);
			expect(deps.setTags).toHaveBeenCalledWith([]);
			expect(deps.setCurrentServerNow).toHaveBeenCalledWith('2025-11-05T11:00:05Z');

			expect(workLogsDb.saveWorkLogFromServer).toHaveBeenCalledWith({
				id: 'work-1',
				userId: 'offline-user',
				startedAt: '2025-11-05T10:00:00Z',
				endedAt: '2025-11-05T11:00:00Z',
				description: '開発作業',
				tags: ['開発'],
			});

			expect(deps.showSuccessToast).toHaveBeenCalledWith('作業を終了しました(60分)');
		});

		it('durationSecがない場合は0分として表示する', async () => {
			// Arrange
			const handleStopSuccess = createHandleStopSuccess(deps);
			const form = {
				ok: true as const,
				workLog: {
					id: 'work-1',
					startedAt: '2025-11-05T10:00:00Z',
					endedAt: '2025-11-05T10:05:00Z',
					description: '開発作業',
					tags: [],
				},
				durationSec: 0,
				serverNow: '2025-11-05T10:05:05Z',
			};

			vi.mocked(workLogsDb.saveWorkLogFromServer).mockResolvedValue();

			// Act
			await handleStopSuccess(form);

			// Assert
			expect(deps.showSuccessToast).toHaveBeenCalledWith('作業を終了しました(0分)');
		});

		it('workLogがない場合は何もしない', async () => {
			// Arrange
			const handleStopSuccess = createHandleStopSuccess(deps);
			const form = {
				ok: true as const,
				serverNow: '2025-11-05T10:05:05Z',
				durationSec: 0,
			} as unknown; // 型安全性を無視（異常系テスト）

			// Act
			await handleStopSuccess(form as any);

			// Assert
			expect(deps.setCurrentActive).not.toHaveBeenCalled();
			expect(deps.showSuccessToast).not.toHaveBeenCalled();
		});
	});

	describe('createHandleSwitchSuccess', () => {
		it('作業切り替え成功時の処理を正しく実行する', async () => {
			// Arrange
			const handleSwitchSuccess = createHandleSwitchSuccess(deps);
			const form = {
				ok: true as const,
				started: {
					id: 'work-2',
					startedAt: '2025-11-05T11:00:00Z',
					endedAt: null,
					description: 'レビュー作業',
					tags: ['レビュー'],
				},
				stopped: {
					id: 'work-1',
					startedAt: '2025-11-05T10:00:00Z',
					endedAt: '2025-11-05T11:00:00Z',
					description: '開発作業',
					tags: ['開発'],
					durationSec: 3600,
				},
				serverNow: '2025-11-05T11:00:05Z',
			};

			vi.mocked(workLogsDb.saveWorkLogFromServer).mockResolvedValue();

			// Act
			await handleSwitchSuccess(form);

			// Assert
			expect(deps.setCurrentActive).toHaveBeenCalledWith({
				id: 'work-2',
				startedAt: '2025-11-05T11:00:00Z',
				endedAt: null,
				description: 'レビュー作業',
				tags: ['レビュー'],
			});

			expect(deps.setCurrentServerNow).toHaveBeenCalledWith('2025-11-05T11:00:05Z');

			// 終了した作業の保存を確認
			expect(workLogsDb.saveWorkLogFromServer).toHaveBeenCalledWith({
				id: 'work-1',
				userId: 'offline-user',
				startedAt: '2025-11-05T10:00:00Z',
				endedAt: '2025-11-05T11:00:00Z',
				description: '開発作業',
				tags: ['開発'],
			});

			// 開始した作業の保存を確認
			expect(workLogsDb.saveWorkLogFromServer).toHaveBeenCalledWith({
				id: 'work-2',
				userId: 'offline-user',
				startedAt: '2025-11-05T11:00:00Z',
				endedAt: null,
				description: 'レビュー作業',
				tags: ['レビュー'],
			});

			expect(deps.showSuccessToast).toHaveBeenCalledWith('作業を切り替えました(60分)');
			// setTagsは呼ばれない（タグは保持）
			expect(deps.setTags).not.toHaveBeenCalled();
		});

		it('startedがない場合は何もしない', async () => {
			// Arrange
			const handleSwitchSuccess = createHandleSwitchSuccess(deps);
			const form = {
				ok: true as const,
				stopped: {
					id: 'work-1',
					startedAt: '2025-11-05T10:00:00Z',
					endedAt: '2025-11-05T11:00:00Z',
					description: '開発作業',
					tags: [],
					durationSec: 3600,
				},
				serverNow: '2025-11-05T11:00:05Z',
			} as unknown; // 型安全性を無視（異常系テスト）

			// Act
			await handleSwitchSuccess(form as any);

			// Assert
			expect(deps.setCurrentActive).not.toHaveBeenCalled();
			expect(deps.showSuccessToast).not.toHaveBeenCalled();
		});

		it('stoppedがない場合は何もしない', async () => {
			// Arrange
			const handleSwitchSuccess = createHandleSwitchSuccess(deps);
			const form = {
				ok: true as const,
				started: {
					id: 'work-2',
					startedAt: '2025-11-05T11:00:00Z',
					endedAt: null,
					description: 'レビュー作業',
					tags: [],
				},
				serverNow: '2025-11-05T11:00:05Z',
			} as unknown; // 型安全性を無視（異常系テスト）

			// Act
			await handleSwitchSuccess(form as any);

			// Assert
			expect(deps.setCurrentActive).not.toHaveBeenCalled();
			expect(deps.showSuccessToast).not.toHaveBeenCalled();
		});

		it('durationSecがない場合は0分として表示する', async () => {
			// Arrange
			const handleSwitchSuccess = createHandleSwitchSuccess(deps);
			const form = {
				ok: true as const,
				started: {
					id: 'work-2',
					startedAt: '2025-11-05T11:00:00Z',
					endedAt: null,
					description: 'レビュー作業',
					tags: [],
				},
				stopped: {
					id: 'work-1',
					startedAt: '2025-11-05T10:00:00Z',
					endedAt: '2025-11-05T11:00:00Z',
					description: '開発作業',
					tags: [],
					durationSec: 0,
				},
				serverNow: '2025-11-05T11:00:05Z',
			};

			vi.mocked(workLogsDb.saveWorkLogFromServer).mockResolvedValue();

			// Act
			await handleSwitchSuccess(form);

			// Assert
			expect(deps.showSuccessToast).toHaveBeenCalledWith('作業を切り替えました(0分)');
		});
	});
});
