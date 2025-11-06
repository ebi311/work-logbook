import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import DescriptionInput from './DescriptionInput.svelte';

describe('DescriptionInput', () => {
	describe('基本的な表示', () => {
		it('ラベルが表示される', () => {
			render(DescriptionInput, { props: { value: '' } });
			expect(screen.getByText('作業内容(Markdown対応)')).toBeInTheDocument();
		});

		it('textareaが表示される', () => {
			render(DescriptionInput, { props: { value: '' } });
			const textarea = screen.getByRole('textbox', { name: '作業内容(Markdown対応)' });
			expect(textarea).toBeInTheDocument();
		});

		it('デフォルトのプレースホルダーが表示される', () => {
			render(DescriptionInput, { props: { value: '' } });
			const textarea = screen.getByPlaceholderText('作業内容を入力...');
			expect(textarea).toBeInTheDocument();
		});

		it('カスタムプレースホルダーが表示される', () => {
			render(DescriptionInput, { props: { value: '', placeholder: 'カスタム' } });
			const textarea = screen.getByPlaceholderText('カスタム');
			expect(textarea).toBeInTheDocument();
		});

		it('name属性が"description"である', () => {
			render(DescriptionInput, { props: { value: '' } });
			const textarea = screen.getByRole('textbox', { name: '作業内容(Markdown対応)' });
			expect(textarea).toHaveAttribute('name', 'description');
		});

		it('id属性が"description"である', () => {
			render(DescriptionInput, { props: { value: '' } });
			const textarea = screen.getByRole('textbox', { name: '作業内容(Markdown対応)' });
			expect(textarea).toHaveAttribute('id', 'description');
		});

		it('rows属性が3である', () => {
			render(DescriptionInput, { props: { value: '' } });
			const textarea = screen.getByRole('textbox', { name: '作業内容(Markdown対応)' });
			expect(textarea).toHaveAttribute('rows', '3');
		});
	});

	describe('値のバインディング', () => {
		it('初期値が表示される', () => {
			render(DescriptionInput, { props: { value: 'テスト作業' } });
			const textarea = screen.getByRole('textbox', { name: '作業内容(Markdown対応)' });
			expect(textarea).toHaveValue('テスト作業');
		});

		it('入力した値が反映される', async () => {
			const user = userEvent.setup();
			render(DescriptionInput, { props: { value: '' } });

			const textarea = screen.getByRole('textbox', { name: '作業内容(Markdown対応)' });
			await user.type(textarea, 'テスト入力');

			expect(textarea).toHaveValue('テスト入力');
		});

		it('複数行の入力が可能', async () => {
			const user = userEvent.setup();
			render(DescriptionInput, { props: { value: '' } });

			const textarea = screen.getByRole('textbox', { name: '作業内容(Markdown対応)' });
			await user.type(textarea, '1行目{Enter}2行目{Enter}3行目');

			expect(textarea).toHaveValue('1行目\n2行目\n3行目');
		});
	});

	describe('無効化状態', () => {
		it('disabled=falseの場合、入力可能', () => {
			render(DescriptionInput, { props: { value: '', disabled: false } });
			const textarea = screen.getByRole('textbox', { name: '作業内容(Markdown対応)' });
			expect(textarea).not.toBeDisabled();
		});

		it('disabled=trueの場合、入力不可', () => {
			render(DescriptionInput, { props: { value: '', disabled: true } });
			const textarea = screen.getByRole('textbox', { name: '作業内容(Markdown対応)' });
			expect(textarea).toBeDisabled();
		});

		it('無効化時は入力できない', async () => {
			const user = userEvent.setup();
			render(DescriptionInput, { props: { value: '', disabled: true } });

			const textarea = screen.getByRole('textbox', { name: '作業内容(Markdown対応)' });
			await user.type(textarea, 'テスト');

			// disabled状態では入力されない
			expect(textarea).toHaveValue('');
		});
	});
});
