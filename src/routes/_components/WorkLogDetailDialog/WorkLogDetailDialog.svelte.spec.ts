import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import WorkLogDetailDialog from './WorkLogDetailDialog.svelte';

describe('WorkLogDetailDialog', () => {
	const mockItem = {
		id: 'test-id',
		startedAt: '2025-10-20T10:00:00Z',
		endedAt: '2025-10-20T12:00:00Z',
		description: '# テスト作業\n\n作業内容の説明',
		tags: ['開発', 'テスト'],
	};

	const mockOnClose = vi.fn();
	const mockOnEdit = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		// dialogのメソッドをモック
		HTMLDialogElement.prototype.showModal = vi.fn();
		HTMLDialogElement.prototype.close = vi.fn();
	});

	it('作業詳細が表示される', async () => {
		const { container } = render(WorkLogDetailDialog, {
			props: {
				item: mockItem,
				duration: 7200, // 2時間 = 7200秒
				onClose: mockOnClose,
			},
		});

		// タイトル
		expect(container.textContent).toContain('作業詳細');

		// 作業時間 (formatDurationは"02:00"を返す)
		expect(container.textContent).toContain('02:00');

		// 作業内容
		expect(container.textContent).toContain('作業内容:');
		expect(container.textContent).toContain('テスト作業');

		// タグ
		expect(container.textContent).toContain('タグ:');
		expect(container.textContent).toContain('開発');
		expect(container.textContent).toContain('テスト');
	});

	it('進行中の作業では終了時刻が「進行中」と表示される', () => {
		const activeItem = {
			...mockItem,
			endedAt: null,
		};

		const { container } = render(WorkLogDetailDialog, {
			props: {
				item: activeItem,
				duration: null,
				onClose: mockOnClose,
			},
		});

		expect(container.textContent).toContain('進行中');
		expect(container.textContent).toContain('計測中');
	});

	it('作業内容がない場合は「作業内容なし」と表示される', () => {
		const itemWithoutDescription = {
			...mockItem,
			description: '',
		};

		const { container } = render(WorkLogDetailDialog, {
			props: {
				item: itemWithoutDescription,
				duration: 7200,
				onClose: mockOnClose,
			},
		});

		expect(container.textContent).toContain('（作業内容なし）');
	});

	it('タグがない場合はタグセクションが表示されない', () => {
		const itemWithoutTags = {
			...mockItem,
			tags: [],
		};

		render(WorkLogDetailDialog, {
			props: {
				item: itemWithoutTags,
				duration: 7200,
				onClose: mockOnClose,
			},
		});

		expect(screen.queryByText('タグ:')).not.toBeInTheDocument();
	});

	it('閉じるボタンをクリックするとonCloseが呼ばれる', async () => {
		render(WorkLogDetailDialog, {
			props: {
				item: mockItem,
				duration: 7200,
				onClose: mockOnClose,
			},
		});

		// フッターの「閉じる」ボタンを取得(2つあるため、最後のものを選択)
		const closeButtons = screen.getAllByRole('button', { name: '閉じる', hidden: true });
		const closeButton = closeButtons[closeButtons.length - 1];
		await fireEvent.click(closeButton);

		expect(mockOnClose).toHaveBeenCalledOnce();
	});

	describe('編集ボタン', () => {
		it('oneditが渡されていて、endedAtがnullでない場合、編集ボタンが表示される', () => {
			render(WorkLogDetailDialog, {
				props: {
					item: mockItem,
					duration: 7200,
					onClose: mockOnClose,
					onedit: mockOnEdit,
				},
			});

			const editButton = screen.getByRole('button', { name: '編集', hidden: true });
			expect(editButton).toBeInTheDocument();
		});

		it('oneditが渡されていない場合、編集ボタンは表示されない', () => {
			render(WorkLogDetailDialog, {
				props: {
					item: mockItem,
					duration: 7200,
					onClose: mockOnClose,
				},
			});

			const editButton = screen.queryByRole('button', { name: '編集', hidden: true });
			expect(editButton).not.toBeInTheDocument();
		});

		it('進行中の作業(endedAt === null)の場合、編集ボタンは表示されない', () => {
			const activeItem = {
				...mockItem,
				endedAt: null,
			};

			render(WorkLogDetailDialog, {
				props: {
					item: activeItem,
					duration: null,
					onClose: mockOnClose,
					onedit: mockOnEdit,
				},
			});

			const editButton = screen.queryByRole('button', { name: '編集', hidden: true });
			expect(editButton).not.toBeInTheDocument();
		});

		it('編集ボタンをクリックするとonCloseとoneditが呼ばれる', async () => {
			render(WorkLogDetailDialog, {
				props: {
					item: mockItem,
					duration: 7200,
					onClose: mockOnClose,
					onedit: mockOnEdit,
				},
			});

			const editButton = screen.getByRole('button', { name: '編集', hidden: true });
			await fireEvent.click(editButton);

			expect(mockOnClose).toHaveBeenCalledOnce();
			expect(mockOnEdit).toHaveBeenCalledWith(mockItem);
		});
	});
});
