import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import MessageAlert from './MessageAlert.svelte';

describe('MessageAlert', () => {
	describe('successメッセージ', () => {
		it('成功メッセージが表示される', () => {
			render(MessageAlert, {
				props: {
					message: '作業を開始しました',
					type: 'success'
				}
			});

			expect(screen.getByText('作業を開始しました')).toBeInTheDocument();
		});

		it('alert-successクラスが適用される', () => {
			render(MessageAlert, {
				props: {
					message: 'テストメッセージ',
					type: 'success'
				}
			});

			const alert = screen.getByRole('alert');
			expect(alert).toHaveClass('alert-success');
		});

		it('成功アイコンが表示される', () => {
			const { container } = render(MessageAlert, {
				props: {
					message: 'テストメッセージ',
					type: 'success'
				}
			});

			// Material Symbolsのcheck_circleアイコンが表示されることを確認
			const icon = container.querySelector('.material-symbols-rounded');
			expect(icon).toBeInTheDocument();
			expect(icon?.textContent).toBe('check_circle');
		});
	});

	describe('errorメッセージ', () => {
		it('エラーメッセージが表示される', () => {
			render(MessageAlert, {
				props: {
					message: '既に作業が進行中です',
					type: 'error'
				}
			});

			expect(screen.getByText('既に作業が進行中です')).toBeInTheDocument();
		});

		it('alert-errorクラスが適用される', () => {
			render(MessageAlert, {
				props: {
					message: 'テストメッセージ',
					type: 'error'
				}
			});

			const alert = screen.getByRole('alert');
			expect(alert).toHaveClass('alert-error');
		});

		it('エラーアイコンが表示される', () => {
			const { container } = render(MessageAlert, {
				props: {
					message: 'テストメッセージ',
					type: 'error'
				}
			});

			// Material Symbolsのerrorアイコンが表示されることを確認
			const icon = container.querySelector('.material-symbols-rounded');
			expect(icon).toBeInTheDocument();
			expect(icon?.textContent).toBe('error');
		});
	});

	describe('アクセシビリティ', () => {
		it('role="alert"属性が設定されている', () => {
			render(MessageAlert, {
				props: {
					message: 'テストメッセージ',
					type: 'success'
				}
			});

			expect(screen.getByRole('alert')).toBeInTheDocument();
		});
	});
});
