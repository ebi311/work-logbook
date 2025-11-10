import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/svelte';
import Layout from './+layout.svelte';

// $app/navigation をモック
vi.mock('$app/navigation', () => {
	return {
		invalidateAll: vi.fn(),
	};
});

// @zerodevx/svelte-toast をモック
vi.mock('@zerodevx/svelte-toast', () => {
	return {
		SvelteToast: vi.fn(),
	};
});

// NetworkStatus と SyncStatus をモック
vi.mock('$lib/components/NetworkStatus/NetworkStatus.svelte', () => {
	return {
		default: vi.fn(),
	};
});

vi.mock('$lib/components/SyncStatus/SyncStatus.svelte', () => {
	return {
		default: vi.fn(),
	};
});

// setupAutoSync をモック
vi.mock('$lib/client/sync/trigger', () => {
	return {
		setupAutoSync: vi.fn(() => vi.fn()),
	};
});

describe('+layout.svelte', () => {
	let fetchMock: ReturnType<typeof vi.fn>;
	let consoleLogSpy: ReturnType<typeof vi.spyOn>;
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		// fetch をモック
		fetchMock = vi.fn().mockResolvedValue({ ok: true });
		global.fetch = fetchMock;

		// console.log と console.error をスパイ
		consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		// Intl.DateTimeFormat をモック
		vi.spyOn(Intl, 'DateTimeFormat').mockReturnValue({
			resolvedOptions: () => ({ timeZone: 'Asia/Tokyo' }),
		} as Intl.DateTimeFormat);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('タイムゾーン送信', () => {
		it('コンポーネントがマウントされたときにタイムゾーンを送信する', async () => {
			render(Layout);

			await waitFor(() => {
				expect(fetchMock).toHaveBeenCalledWith('/api/timezone', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ timezone: 'Asia/Tokyo' }),
				});
			});
		});

		it('タイムゾーン送信に失敗してもエラーをログに記録する', async () => {
			const error = new Error('Network error');
			fetchMock.mockRejectedValue(error);

			render(Layout);

			await waitFor(() => {
				expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to send timezone:', error);
			});
		});
	});

	describe('ウィンドウフォーカスイベント', () => {
		it('ウィンドウがフォーカスされたときにinvalidateAllが呼ばれる', async () => {
			const { invalidateAll } = await import('$app/navigation');
			const mockInvalidateAll = vi.mocked(invalidateAll);

			render(Layout);

			// ウィンドウのフォーカスイベントを発火
			window.dispatchEvent(new Event('focus'));

			await waitFor(() => {
				expect(mockInvalidateAll).toHaveBeenCalled();
				expect(consoleLogSpy).toHaveBeenCalledWith(
					'[Focus] ウィンドウがフォーカスされました - データを更新',
				);
			});
		});
	});

	describe('タブの可視性変更イベント', () => {
		it('タブがアクティブになったときにinvalidateAllが呼ばれる', async () => {
			const { invalidateAll } = await import('$app/navigation');
			const mockInvalidateAll = vi.mocked(invalidateAll);

			// visibilityState を 'visible' に設定
			Object.defineProperty(document, 'visibilityState', {
				writable: true,
				configurable: true,
				value: 'visible',
			});

			render(Layout);

			// visibilitychange イベントを発火
			document.dispatchEvent(new Event('visibilitychange'));

			await waitFor(() => {
				expect(mockInvalidateAll).toHaveBeenCalled();
				expect(consoleLogSpy).toHaveBeenCalledWith(
					'[Visibility] タブがアクティブになりました - データを更新',
				);
			});
		});

		it('タブが非アクティブのときはinvalidateAllが呼ばれない', async () => {
			const { invalidateAll } = await import('$app/navigation');
			const mockInvalidateAll = vi.mocked(invalidateAll);
			mockInvalidateAll.mockClear();

			// visibilityState を 'hidden' に設定
			Object.defineProperty(document, 'visibilityState', {
				writable: true,
				configurable: true,
				value: 'hidden',
			});

			render(Layout);

			// visibilitychange イベントを発火
			document.dispatchEvent(new Event('visibilitychange'));

			// 少し待機
			await new Promise((resolve) => setTimeout(resolve, 100));

			// invalidateAll は呼ばれない
			expect(mockInvalidateAll).not.toHaveBeenCalledWith();
			expect(consoleLogSpy).not.toHaveBeenCalledWith(
				'[Visibility] タブがアクティブになりました - データを更新',
			);
		});
	});

	describe('自動同期のセットアップ', () => {
		it('コンポーネントがマウントされたときにsetupAutoSyncが呼ばれる', async () => {
			const { setupAutoSync } = await import('$lib/client/sync/trigger');
			const mockSetupAutoSync = vi.mocked(setupAutoSync);

			render(Layout);

			await waitFor(() => {
				expect(mockSetupAutoSync).toHaveBeenCalled();
			});
		});
	});
});
