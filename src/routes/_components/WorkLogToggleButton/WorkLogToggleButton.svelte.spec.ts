import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import WorkLogToggleButton from './WorkLogToggleButton.svelte';

describe('WorkLogToggleButton', () => {
	describe('停止中の状態', () => {
		it('「作業開始」ボタンが表示される', () => {
			render(WorkLogToggleButton, {
				props: {
					isActive: false,
					isSubmitting: false
				}
			});

			const button = screen.getByRole('button', { name: '作業開始' });
			expect(button).toBeInTheDocument();
		});

		it('formaction属性が"?/start"である', () => {
			render(WorkLogToggleButton, {
				props: {
					isActive: false,
					isSubmitting: false
				}
			});

			const button = screen.getByRole('button', { name: '作業開始' });
			expect(button).toHaveAttribute('formaction', '?/start');
		});

		it('ボタンが有効である', () => {
			render(WorkLogToggleButton, {
				props: {
					isActive: false,
					isSubmitting: false
				}
			});

			const button = screen.getByRole('button', { name: '作業開始' });
			expect(button).not.toBeDisabled();
		});
	});

	describe('記録中の状態', () => {
		it('「作業終了」ボタンが表示される', () => {
			render(WorkLogToggleButton, {
				props: {
					isActive: true,
					isSubmitting: false
				}
			});

			const button = screen.getByRole('button', { name: '作業終了' });
			expect(button).toBeInTheDocument();
		});

		it('formaction属性が"?/stop"である', () => {
			render(WorkLogToggleButton, {
				props: {
					isActive: true,
					isSubmitting: false
				}
			});

			const button = screen.getByRole('button', { name: '作業終了' });
			expect(button).toHaveAttribute('formaction', '?/stop');
		});

		it('ボタンが有効である', () => {
			render(WorkLogToggleButton, {
				props: {
					isActive: true,
					isSubmitting: false
				}
			});

			const button = screen.getByRole('button', { name: '作業終了' });
			expect(button).not.toBeDisabled();
		});
	});

	describe('送信中の状態（停止中から開始）', () => {
		it('「作業開始」ボタンが無効化される', () => {
			render(WorkLogToggleButton, {
				props: {
					isActive: false,
					isSubmitting: true
				}
			});

			const button = screen.getByRole('button', { name: '作業開始' });
			expect(button).toBeDisabled();
		});

		it('aria-busy属性がtrueである', () => {
			render(WorkLogToggleButton, {
				props: {
					isActive: false,
					isSubmitting: true
				}
			});

			const button = screen.getByRole('button', { name: '作業開始' });
			expect(button).toHaveAttribute('aria-busy', 'true');
		});
	});

	describe('送信中の状態（記録中から終了）', () => {
		it('「作業終了」ボタンが無効化される', () => {
			render(WorkLogToggleButton, {
				props: {
					isActive: true,
					isSubmitting: true
				}
			});

			const button = screen.getByRole('button', { name: '作業終了' });
			expect(button).toBeDisabled();
		});

		it('aria-busy属性がtrueである', () => {
			render(WorkLogToggleButton, {
				props: {
					isActive: true,
					isSubmitting: true
				}
			});

			const button = screen.getByRole('button', { name: '作業終了' });
			expect(button).toHaveAttribute('aria-busy', 'true');
		});
	});
});
