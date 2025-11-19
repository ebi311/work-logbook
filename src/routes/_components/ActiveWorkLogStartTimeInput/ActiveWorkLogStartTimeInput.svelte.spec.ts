import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import ActiveWorkLogStartTimeInput from './ActiveWorkLogStartTimeInput.svelte';

/**
 * F-001.2: ActiveWorkLogStartTimeInput コンポーネントのテスト
 */

describe('ActiveWorkLogStartTimeInput', () => {
	describe('基本表示', () => {
		it('datetime-local input が表示される', () => {
			const { container } = render(ActiveWorkLogStartTimeInput, {
				props: {
					value: '2025-11-19T10:30:00Z',
				},
			});

			const input = container.querySelector('input[type="datetime-local"]');
			expect(input).toBeTruthy();
		});

		it('ラベルが表示される', () => {
			const { getByText } = render(ActiveWorkLogStartTimeInput, {
				props: {
					value: '2025-11-19T10:30:00Z',
				},
			});

			expect(getByText('開始時刻')).toBeTruthy();
		});

		it('UTC ISO文字列がローカル datetime-local 形式に変換される', () => {
			const { container } = render(ActiveWorkLogStartTimeInput, {
				props: {
					value: '2025-11-19T10:30:00Z',
				},
			});

			const input = container.querySelector('input[type="datetime-local"]') as HTMLInputElement;
			expect(input.value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
		});
	});

	describe('min/max 属性', () => {
		it('min 属性がローカル datetime-local 形式で設定される', () => {
			const { container } = render(ActiveWorkLogStartTimeInput, {
				props: {
					value: '2025-11-19T10:30:00Z',
					min: '2025-11-19T09:00:00Z',
				},
			});

			const input = container.querySelector('input[type="datetime-local"]') as HTMLInputElement;
			expect(input.min).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
		});

		it('max 属性がローカル datetime-local 形式で設定される', () => {
			const { container } = render(ActiveWorkLogStartTimeInput, {
				props: {
					value: '2025-11-19T10:30:00Z',
					max: '2025-11-19T11:00:00Z',
				},
			});

			const input = container.querySelector('input[type="datetime-local"]') as HTMLInputElement;
			expect(input.max).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
		});

		it('min と max が両方設定される', () => {
			const { container } = render(ActiveWorkLogStartTimeInput, {
				props: {
					value: '2025-11-19T10:30:00Z',
					min: '2025-11-19T09:00:00Z',
					max: '2025-11-19T11:00:00Z',
				},
			});

			const input = container.querySelector('input[type="datetime-local"]') as HTMLInputElement;
			expect(input.min).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
			expect(input.max).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
		});
	});

	describe('disabled 属性', () => {
		it('disabled が true の場合、入力が無効になる', () => {
			const { container } = render(ActiveWorkLogStartTimeInput, {
				props: {
					value: '2025-11-19T10:30:00Z',
					disabled: true,
				},
			});

			const input = container.querySelector('input[type="datetime-local"]') as HTMLInputElement;
			expect(input.disabled).toBe(true);
		});

		it('disabled が false の場合、入力が有効', () => {
			const { container } = render(ActiveWorkLogStartTimeInput, {
				props: {
					value: '2025-11-19T10:30:00Z',
					disabled: false,
				},
			});

			const input = container.querySelector('input[type="datetime-local"]') as HTMLInputElement;
			expect(input.disabled).toBe(false);
		});
	});

	describe('エラー表示', () => {
		it('error が指定されている場合、エラーメッセージが表示される', () => {
			const { getByText, container } = render(ActiveWorkLogStartTimeInput, {
				props: {
					value: '2025-11-19T10:30:00Z',
					error: '開始時刻が無効です',
				},
			});

			expect(getByText('開始時刻が無効です')).toBeTruthy();

			// input に input-error クラスが付与される
			const input = container.querySelector('input[type="datetime-local"]');
			expect(input?.classList.contains('input-error')).toBe(true);
		});

		it('error がない場合、エラーメッセージは表示されない', () => {
			const { container } = render(ActiveWorkLogStartTimeInput, {
				props: {
					value: '2025-11-19T10:30:00Z',
				},
			});

			const errorText = container.querySelector('.label-text-alt.text-error');
			expect(errorText).toBeNull();
		});
	});
});
