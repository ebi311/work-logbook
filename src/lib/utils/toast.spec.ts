import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toastSuccess, toastError, toastWarn, toastInfo } from './toast';
import { toast } from '@zerodevx/svelte-toast';

// toast.push をモック
vi.mock('@zerodevx/svelte-toast', () => ({
	toast: {
		push: vi.fn(),
	},
}));

describe('toast utilities', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('toastSuccess', () => {
		it('成功メッセージを正しいスタイルで表示する', () => {
			const message = '作業を開始しました';
			toastSuccess(message);

			expect(toast.push).toHaveBeenCalledWith(message, {
				theme: {
					'--toastBackground': 'oklch(var(--su))',
					'--toastColor': 'oklch(var(--suc))',
					'--toastBarBackground': 'oklch(var(--suc))',
				},
			});
		});
	});

	describe('toastError', () => {
		it('エラーメッセージを正しいスタイルで表示する', () => {
			const message = '削除に失敗しました';
			toastError(message);

			expect(toast.push).toHaveBeenCalledWith(message, {
				theme: {
					'--toastBackground': 'oklch(var(--er))',
					'--toastColor': 'oklch(var(--erc))',
					'--toastBarBackground': 'oklch(var(--erc))',
				},
			});
		});
	});

	describe('toastWarn', () => {
		it('警告メッセージを正しいスタイルで表示する', () => {
			const message = '警告: 処理に時間がかかっています';
			toastWarn(message);

			expect(toast.push).toHaveBeenCalledWith(message, {
				theme: {
					'--toastBackground': 'oklch(var(--wa))',
					'--toastColor': 'oklch(var(--wac))',
					'--toastBarBackground': 'oklch(var(--wac))',
				},
			});
		});
	});

	describe('toastInfo', () => {
		it('情報メッセージを正しいスタイルで表示する', () => {
			const message = '新しい機能が利用可能です';
			toastInfo(message);

			expect(toast.push).toHaveBeenCalledWith(message, {
				theme: {
					'--toastBackground': 'oklch(var(--in))',
					'--toastColor': 'oklch(var(--inc))',
					'--toastBarBackground': 'oklch(var(--inc))',
				},
			});
		});
	});
});
