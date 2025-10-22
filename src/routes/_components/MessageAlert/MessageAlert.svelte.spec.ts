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

			// チェックマークのSVGパスが存在することを確認
			const svg = container.querySelector('svg');
			expect(svg).toBeInTheDocument();
			const path = svg?.querySelector('path[d*="M9 12l2 2 4-4"]');
			expect(path).toBeInTheDocument();
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

			// Xマークのサークル付きSVGパスが存在することを確認
			const svg = container.querySelector('svg');
			expect(svg).toBeInTheDocument();
			const path = svg?.querySelector('path[d*="M10 14l2-2"]');
			expect(path).toBeInTheDocument();
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
