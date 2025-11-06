import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import WorkLogTagInput from './WorkLogTagInput.svelte';

describe('WorkLogTagInput', () => {
	describe('基本的な表示', () => {
		it('TagInputコンポーネントが表示される', () => {
			render(WorkLogTagInput, { props: { tags: [] } });
			// TagInputのinput要素が存在する
			const input = screen.getByRole('textbox');
			expect(input).toBeInTheDocument();
		});

		it('デフォルトのプレースホルダーが表示される', () => {
			render(WorkLogTagInput, { props: { tags: [] } });
			expect(screen.getByPlaceholderText('例: 開発 PJ-A')).toBeInTheDocument();
		});

		it('カスタムプレースホルダーが表示される', () => {
			render(WorkLogTagInput, { props: { tags: [], placeholder: 'カスタム' } });
			expect(screen.getByPlaceholderText('カスタム')).toBeInTheDocument();
		});
	});

	describe('タグの表示', () => {
		it('タグが表示される', () => {
			render(WorkLogTagInput, { props: { tags: ['開発', 'テスト'] } });
			expect(screen.getByText('開発')).toBeInTheDocument();
			expect(screen.getByText('テスト')).toBeInTheDocument();
		});

		it('タグが空の場合、タグバッジは表示されない', () => {
			const { container } = render(WorkLogTagInput, { props: { tags: [] } });
			// badge クラスを持つ要素がない
			const badges = container.querySelectorAll('.badge');
			expect(badges.length).toBe(0);
		});
	});

	describe('隠しフィールドの生成', () => {
		it('タグごとに隠しフィールドが生成される', () => {
			const { container } = render(WorkLogTagInput, { props: { tags: ['開発', 'テスト'] } });
			const hiddenInputs = container.querySelectorAll('input[type="hidden"][name="tags"]');

			expect(hiddenInputs.length).toBe(2);
			expect(hiddenInputs[0]).toHaveValue('開発');
			expect(hiddenInputs[1]).toHaveValue('テスト');
		});

		it('タグが空の場合、隠しフィールドは生成されない', () => {
			const { container } = render(WorkLogTagInput, { props: { tags: [] } });
			const hiddenInputs = container.querySelectorAll('input[type="hidden"][name="tags"]');

			expect(hiddenInputs.length).toBe(0);
		});

		it('タグが追加されると隠しフィールドも追加される', async () => {
			const user = userEvent.setup();
			const { container } = render(WorkLogTagInput, { props: { tags: [] } });

			const input = screen.getByRole('textbox');
			await user.type(input, '新規タグ{Enter}');

			const hiddenInputs = container.querySelectorAll('input[type="hidden"][name="tags"]');
			expect(hiddenInputs.length).toBe(1);
			expect(hiddenInputs[0]).toHaveValue('新規タグ');
		});

		it('タグが削除されると隠しフィールドも削除される', async () => {
			const user = userEvent.setup();
			const { container } = render(WorkLogTagInput, { props: { tags: ['開発'] } });

			// 削除ボタンをクリック (aria-labelで検索)
			const deleteButton = screen.getByRole('button', { name: 'タグを削除' });
			await user.click(deleteButton);

			const hiddenInputs = container.querySelectorAll('input[type="hidden"][name="tags"]');
			expect(hiddenInputs.length).toBe(0);
		});
	});
});
