import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import WorkLogToggleButton from './WorkLogToggleButton.svelte';

describe('WorkLogToggleButton', () => {
	describe('作業が進行中でない場合', () => {
		it('作業開始ボタンのみが表示される', () => {
			render(WorkLogToggleButton, {
				props: {
					isActive: false,
					isSubmitting: false,
				},
			});

			const startButton = screen.getByRole('button', { name: '作業開始' });
			expect(startButton).toBeInTheDocument();
			expect(startButton).toHaveAttribute('formaction', '?/start');
			expect(startButton).not.toBeDisabled();

			// 切り替えボタンは表示されない
			const switchButton = screen.queryByRole('button', { name: '切り替え' });
			expect(switchButton).not.toBeInTheDocument();
		});

		it('送信中の場合、ボタンが無効になる', () => {
			render(WorkLogToggleButton, {
				props: {
					isActive: false,
					isSubmitting: true,
				},
			});

			const startButton = screen.getByRole('button', { name: '作業開始' });
			expect(startButton).toBeDisabled();
			expect(startButton).toHaveAttribute('aria-busy', 'true');
		});
	});

	describe('作業が進行中の場合', () => {
		it('作業終了ボタンと切り替えボタンが表示される', () => {
			render(WorkLogToggleButton, {
				props: {
					isActive: true,
					isSubmitting: false,
				},
			});

			const stopButton = screen.getByRole('button', { name: '作業終了' });
			expect(stopButton).toBeInTheDocument();
			expect(stopButton).toHaveAttribute('formaction', '?/stop');
			expect(stopButton).not.toBeDisabled();

			const switchButton = screen.getByRole('button', { name: '切り替え' });
			expect(switchButton).toBeInTheDocument();
			expect(switchButton).toHaveAttribute('formaction', '?/switch');
			expect(switchButton).not.toBeDisabled();
			expect(switchButton).toHaveAttribute('title', '現在の作業を終了して、新しい作業を開始します');
		});

		it('送信中の場合、両方のボタンが無効になる', () => {
			render(WorkLogToggleButton, {
				props: {
					isActive: true,
					isSubmitting: true,
				},
			});

			const stopButton = screen.getByRole('button', { name: '作業終了' });
			expect(stopButton).toBeDisabled();

			const switchButton = screen.getByRole('button', { name: '切り替え' });
			expect(switchButton).toBeDisabled();
		});
	});

	describe('ボタンスタイル', () => {
		it('作業開始ボタンは btn-primary クラスを持つ', () => {
			render(WorkLogToggleButton, {
				props: {
					isActive: false,
					isSubmitting: false,
				},
			});

			const startButton = screen.getByRole('button', { name: '作業開始' });
			expect(startButton).toHaveClass('btn-primary');
		});

		it('作業終了ボタンは btn-secondary クラスを持つ', () => {
			render(WorkLogToggleButton, {
				props: {
					isActive: true,
					isSubmitting: false,
				},
			});

			const stopButton = screen.getByRole('button', { name: '作業終了' });
			expect(stopButton).toHaveClass('btn-secondary');
		});

		it('切り替えボタンは btn-accent クラスを持つ', () => {
			render(WorkLogToggleButton, {
				props: {
					isActive: true,
					isSubmitting: false,
				},
			});

			const switchButton = screen.getByRole('button', { name: '切り替え' });
			expect(switchButton).toHaveClass('btn-accent');
		});
	});
});
