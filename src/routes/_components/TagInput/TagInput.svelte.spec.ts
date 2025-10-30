import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import TagInput from './TagInput.svelte';

describe('TagInput', () => {
	it('タグを入力してEnterで確定できる', async () => {
		render(TagInput);
		const input = screen.getByPlaceholderText(/開発/);

		await fireEvent.input(input, { target: { value: '開発' } });
		await fireEvent.keyDown(input, { key: 'Enter' });

		// タグが表示されることを確認
		expect(screen.getByText('開発')).toBeInTheDocument();
		// 入力フィールドがクリアされる
		expect(input).toHaveValue('');
	});

	it('スペースでタグが確定される', async () => {
		render(TagInput);
		const input = screen.getByPlaceholderText(/開発/);

		await fireEvent.input(input, { target: { value: '開発' } });
		await fireEvent.keyDown(input, { key: ' ' });

		expect(screen.getByText('開発')).toBeInTheDocument();
		expect(input).toHaveValue('');
	});

	it('複数のタグをスペース区切りで入力できる', async () => {
		render(TagInput);
		const input = screen.getByPlaceholderText(/開発/);

		await fireEvent.input(input, { target: { value: '開発 PJ-A 会議' } });
		await fireEvent.keyDown(input, { key: 'Enter' });

		expect(screen.getByText('開発')).toBeInTheDocument();
		expect(screen.getByText('PJ-A')).toBeInTheDocument();
		expect(screen.getByText('会議')).toBeInTheDocument();
	});

	it('Backspaceで最後のタグが削除される', async () => {
		render(TagInput, { tags: ['開発', 'PJ-A'] });
		const input = screen.getByPlaceholderText(/開発/);

		// 入力が空の状態でBackspace
		await fireEvent.keyDown(input, { key: 'Backspace' });

		expect(screen.getByText('開発')).toBeInTheDocument();
		expect(screen.queryByText('PJ-A')).not.toBeInTheDocument();
	});

	it('タグの削除ボタンをクリックして削除できる', async () => {
		render(TagInput, { tags: ['開発', 'PJ-A'] });

		const deleteButtons = screen.getAllByLabelText('タグを削除');
		await fireEvent.click(deleteButtons[0]); // 最初のタグを削除

		expect(screen.queryByText('開発')).not.toBeInTheDocument();
		expect(screen.getByText('PJ-A')).toBeInTheDocument();
	});

	it('サジェストが表示される', async () => {
		render(TagInput, {
			suggestions: [
				{ tag: '開発', count: 5 },
				{ tag: 'PJ-A', count: 3 }
			]
		});

		const input = screen.getByPlaceholderText(/開発/);
		await fireEvent.input(input, { target: { value: '開' } });

		// サジェストが表示される
		expect(screen.getByText('開発')).toBeInTheDocument();
		expect(screen.getByText('5')).toBeInTheDocument(); // カウント
	});

	it('サジェストをクリックして追加できる', async () => {
		render(TagInput, {
			suggestions: [{ tag: '開発', count: 5 }]
		});

		const input = screen.getByPlaceholderText(/開発/);
		await fireEvent.input(input, { target: { value: '開' } });

		const suggestionButton = screen.getByText('開発');
		await fireEvent.click(suggestionButton);

		expect(screen.getByText('開発')).toBeInTheDocument();
	});

	it('既に追加されているタグはサジェストに表示されない', async () => {
		render(TagInput, {
			tags: ['開発'],
			suggestions: [
				{ tag: '開発', count: 5 },
				{ tag: 'PJ-A', count: 3 }
			]
		});

		const input = screen.getByPlaceholderText(/開発/);
		await fireEvent.input(input, { target: { value: 'P' } });

		// 「開発」は既に追加されているのでサジェストに表示されない
		// 「PJ-A」のみが表示される
		expect(screen.getByText('PJ-A')).toBeInTheDocument();
		expect(screen.queryByText('開発')?.closest('button')).not.toBeInTheDocument();
	});

	it('重複したタグは追加されない', async () => {
		render(TagInput, { tags: ['開発'] });
		const input = screen.getByPlaceholderText(/開発/);

		await fireEvent.input(input, { target: { value: '開発' } });
		await fireEvent.keyDown(input, { key: 'Enter' });

		// タグは1つのまま
		const tags = screen.getAllByText('開発');
		expect(tags).toHaveLength(1);
	});

	it('空のタグは追加されない', async () => {
		render(TagInput);
		const input = screen.getByPlaceholderText(/開発/);

		await fireEvent.input(input, { target: { value: '   ' } });
		await fireEvent.keyDown(input, { key: 'Enter' });

		// タグのカウンターが0のまま
		expect(screen.getByText(/^0\/20$/)).toBeInTheDocument();
	});

	it('ArrowDownでサジェストを選択できる', async () => {
		render(TagInput, {
			suggestions: [
				{ tag: '開発', count: 5 },
				{ tag: 'PJ-A', count: 3 }
			]
		});

		const input = screen.getByPlaceholderText(/開発/);
		await fireEvent.input(input, { target: { value: 'P' } });

		// ArrowDownで選択
		await fireEvent.keyDown(input, { key: 'ArrowDown' });

		// 選択されたサジェストにactiveクラスが付く
		const activeButton = screen.getByText('PJ-A').closest('button');
		expect(activeButton).toHaveClass('active');
	});

	it('タグのカウンターが表示される', () => {
		render(TagInput, { tags: ['開発', 'PJ-A'], maxTags: 20 });
		expect(screen.getByText('2/20')).toBeInTheDocument();
	});

	it('IME変換中はスペースキーでタグが確定されない', async () => {
		render(TagInput);
		const input = screen.getByPlaceholderText(/開発/);

		// IME変換開始
		await fireEvent.compositionStart(input);

		// 変換中に「かい」と入力
		await fireEvent.input(input, { target: { value: 'かい' } });

		// スペースキーを押す（変換のため）
		await fireEvent.keyDown(input, { key: ' ' });

		// タグは確定されない（まだ変換中）
		expect(screen.queryByText('かい')).not.toBeInTheDocument();

		// IME変換終了
		await fireEvent.compositionEnd(input);

		// 確定後にEnterを押す
		await fireEvent.input(input, { target: { value: '開発' } });
		await fireEvent.keyDown(input, { key: 'Enter' });

		// タグが確定される
		expect(screen.getByText('開発')).toBeInTheDocument();
	});
});
