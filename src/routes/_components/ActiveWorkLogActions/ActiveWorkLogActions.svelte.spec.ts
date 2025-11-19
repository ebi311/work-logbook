import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import ActiveWorkLogActions from './ActiveWorkLogActions.svelte';

/**
 * F-001.2: ActiveWorkLogActions コンポーネントのテスト
 */

describe('ActiveWorkLogActions', () => {
	describe('停止中（isActive=false）', () => {
		it('「作業開始」ボタンが表示される', () => {
			const { getByText } = render(ActiveWorkLogActions, {
				props: {
					isActive: false,
					isSubmitting: false,
				},
			});

			const button = getByText('作業開始');
			expect(button).toBeTruthy();
			expect(button.getAttribute('formaction')).toBe('?/start');
		});

		it('「切り替え」ボタンは表示されない', () => {
			const { queryByText } = render(ActiveWorkLogActions, {
				props: {
					isActive: false,
					isSubmitting: false,
				},
			});

			expect(queryByText('切り替え')).toBeNull();
		});

		it('「作業中変更」ボタンは表示されない', () => {
			const { queryByText } = render(ActiveWorkLogActions, {
				props: {
					isActive: false,
					isSubmitting: false,
				},
			});

			expect(queryByText('作業中変更')).toBeNull();
		});
	});

	describe('進行中（isActive=true）', () => {
		it('「作業終了」ボタンが表示される', () => {
			const { getByText } = render(ActiveWorkLogActions, {
				props: {
					isActive: true,
					isSubmitting: false,
				},
			});

			const button = getByText('作業終了');
			expect(button).toBeTruthy();
			expect(button.getAttribute('formaction')).toBe('?/stop');
		});

		it('「切り替え」ボタンが表示される', () => {
			const { getByText } = render(ActiveWorkLogActions, {
				props: {
					isActive: true,
					isSubmitting: false,
				},
			});

			const button = getByText('切り替え');
			expect(button).toBeTruthy();
			expect(button.getAttribute('formaction')).toBe('?/switch');
		});

		it('「作業中変更」ボタンが表示される', () => {
			const { getByText } = render(ActiveWorkLogActions, {
				props: {
					isActive: true,
					isSubmitting: false,
				},
			});

			const button = getByText('作業中変更');
			expect(button).toBeTruthy();
			expect(button.getAttribute('formaction')).toBe('?/adjustActive');
		});

		it('すべてのボタンが有効', () => {
			const { getByText } = render(ActiveWorkLogActions, {
				props: {
					isActive: true,
					isSubmitting: false,
				},
			});

			expect((getByText('作業終了') as HTMLButtonElement).disabled).toBe(false);
			expect((getByText('切り替え') as HTMLButtonElement).disabled).toBe(false);
			expect((getByText('作業中変更') as HTMLButtonElement).disabled).toBe(false);
		});
	});

	describe('送信中（isSubmitting=true）', () => {
		it('すべてのボタンが無効になる（停止中）', () => {
			const { getByText } = render(ActiveWorkLogActions, {
				props: {
					isActive: false,
					isSubmitting: true,
				},
			});

			expect((getByText('作業開始') as HTMLButtonElement).disabled).toBe(true);
		});

		it('すべてのボタンが無効になる（進行中）', () => {
			const { getByText } = render(ActiveWorkLogActions, {
				props: {
					isActive: true,
					isSubmitting: true,
				},
			});

			expect((getByText('作業終了') as HTMLButtonElement).disabled).toBe(true);
			expect((getByText('切り替え') as HTMLButtonElement).disabled).toBe(true);
			expect((getByText('作業中変更') as HTMLButtonElement).disabled).toBe(true);
		});

		it('aria-busy 属性が設定される', () => {
			const { getByText } = render(ActiveWorkLogActions, {
				props: {
					isActive: true,
					isSubmitting: true,
				},
			});

			expect(getByText('作業終了').getAttribute('aria-busy')).toBe('true');
			expect(getByText('切り替え').getAttribute('aria-busy')).toBe('true');
			expect(getByText('作業中変更').getAttribute('aria-busy')).toBe('true');
		});
	});

	describe('CSS クラス', () => {
		it('作業開始ボタンは btn-primary クラスを持つ', () => {
			const { getByText } = render(ActiveWorkLogActions, {
				props: {
					isActive: false,
					isSubmitting: false,
				},
			});

			expect(getByText('作業開始').classList.contains('btn-primary')).toBe(true);
		});

		it('作業終了ボタンは btn-secondary クラスを持つ', () => {
			const { getByText } = render(ActiveWorkLogActions, {
				props: {
					isActive: true,
					isSubmitting: false,
				},
			});

			expect(getByText('作業終了').classList.contains('btn-secondary')).toBe(true);
		});

		it('切り替えボタンは btn-accent クラスを持つ', () => {
			const { getByText } = render(ActiveWorkLogActions, {
				props: {
					isActive: true,
					isSubmitting: false,
				},
			});

			expect(getByText('切り替え').classList.contains('btn-accent')).toBe(true);
		});

		it('作業中変更ボタンは btn-outline btn-info クラスを持つ', () => {
			const { getByText } = render(ActiveWorkLogActions, {
				props: {
					isActive: true,
					isSubmitting: false,
				},
			});

			const button = getByText('作業中変更');
			expect(button.classList.contains('btn-outline')).toBe(true);
			expect(button.classList.contains('btn-info')).toBe(true);
		});
	});
});
