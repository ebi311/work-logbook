import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import WorkLogStatus from './WorkLogStatus.svelte';

describe('WorkLogStatus', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	describe('停止中の表示', () => {
		it('activeがundefinedの場合「停止中」を表示する', () => {
			render(WorkLogStatus, {
				props: {
					active: undefined,
					serverNow: '2025-10-22T10:00:00.000Z'
				}
			});

			const element = screen.getByText('停止中');
			expect(element).toBeInTheDocument();
		});
	});

	describe('記録中の表示', () => {
		it('activeがある場合「記録中」を表示する', () => {
			const serverNow = '2025-10-22T10:00:00.000Z';
			vi.setSystemTime(new Date(serverNow));

			render(WorkLogStatus, {
				props: {
					active: {
						id: 'test-id',
						startedAt: '2025-10-22T10:00:00.000Z'
					},
					serverNow
				}
			});

			const element = screen.getByText(/記録中/);
			expect(element).toBeInTheDocument();
		});

		it('経過時間が00:00:00で表示される（開始直後）', () => {
			const serverNow = '2025-10-22T10:00:00.000Z';
			vi.setSystemTime(new Date(serverNow));

			render(WorkLogStatus, {
				props: {
					active: {
						id: 'test-id',
						startedAt: '2025-10-22T10:00:00.000Z'
					},
					serverNow
				}
			});

			const element = screen.getByText('記録中（経過 00:00:00）');
			expect(element).toBeInTheDocument();
		});

		it('経過時間が00:01:00で表示される（1分後）', () => {
			const serverNow = '2025-10-22T10:01:00.000Z';
			vi.setSystemTime(new Date(serverNow));

			render(WorkLogStatus, {
				props: {
					active: {
						id: 'test-id',
						startedAt: '2025-10-22T10:00:00.000Z'
					},
					serverNow
				}
			});

			const element = screen.getByText('記録中（経過 00:01:00）');
			expect(element).toBeInTheDocument();
		});

		it('経過時間が01:23:45で表示される（1時間23分45秒後）', () => {
			const serverNow = '2025-10-22T11:23:45.000Z';
			vi.setSystemTime(new Date(serverNow));

			render(WorkLogStatus, {
				props: {
					active: {
						id: 'test-id',
						startedAt: '2025-10-22T10:00:00.000Z'
					},
					serverNow
				}
			});

			const element = screen.getByText('記録中（経過 01:23:45）');
			expect(element).toBeInTheDocument();
		});
	});

	describe('タイマー更新', () => {
		it('1秒後にタイマーが更新される', async () => {
			const startedAt = '2025-10-22T10:00:00.000Z';
			const serverNow = '2025-10-22T10:00:00.000Z';

			// 現在時刻をモック
			const mockDate = new Date(serverNow);
			vi.setSystemTime(mockDate);

			render(WorkLogStatus, {
				props: {
					active: {
						id: 'test-id',
						startedAt
					},
					serverNow
				}
			});

			// 初期表示
			const initialElement = screen.getByText('記録中（経過 00:00:00）');
			expect(initialElement).toBeInTheDocument();

			// 500ms進めて、システム時刻を0.5秒進める
			vi.setSystemTime(new Date(mockDate.getTime() + 500));
			await vi.advanceTimersByTimeAsync(500);

			// もう500ms進めて、合計1秒にする
			vi.setSystemTime(new Date(mockDate.getTime() + 1000));
			await vi.advanceTimersByTimeAsync(500);

			// 更新されたかチェック
			const updatedElement = screen.getByText('記録中（経過 00:00:01）');
			expect(updatedElement).toBeInTheDocument();
		});

		it('タイマーが定期的に更新される', async () => {
			const startedAt = '2025-10-22T10:00:00.000Z';
			const serverNow = '2025-10-22T10:00:00.000Z';

			const mockDate = new Date(serverNow);
			vi.setSystemTime(mockDate);

			render(WorkLogStatus, {
				props: {
					active: {
						id: 'test-id',
						startedAt
					},
					serverNow
				}
			});

			// 初期表示
			expect(screen.getByText('記録中（経過 00:00:00）')).toBeInTheDocument();

			// 2秒進める
			vi.setSystemTime(new Date(mockDate.getTime() + 2000));
			await vi.advanceTimersByTimeAsync(2000);

			// タイマーが更新されて、初期状態(00:00:00)ではないことを確認
			const updatedText = screen.getByText(/記録中（経過 00:00:0[2-4]）/);
			expect(updatedText).toBeInTheDocument();
		});
	});

	describe('クリーンアップ', () => {
		it('コンポーネントがアンマウントされたときにタイマーがクリアされる', () => {
			const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

			const { unmount } = render(WorkLogStatus, {
				props: {
					active: {
						id: 'test-id',
						startedAt: '2025-10-22T10:00:00.000Z'
					},
					serverNow: '2025-10-22T10:00:00.000Z'
				}
			});

			unmount();

			expect(clearIntervalSpy).toHaveBeenCalled();
		});
	});
});
