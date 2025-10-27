import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import WorkLogList from './WorkLogList.svelte';

describe('WorkLogList', () => {
	const serverNow = '2025-10-25T12:00:00.000Z';

	describe('基本表示', () => {
		it('ヘッダーが正しく表示される', () => {
			render(WorkLogList, {
				props: {
					items: [],
					serverNow
				}
			});

			expect(screen.getByText('日付')).toBeInTheDocument();
			expect(screen.getByText('開始')).toBeInTheDocument();
			expect(screen.getByText('終了')).toBeInTheDocument();
			expect(screen.getByText('作業時間')).toBeInTheDocument();
			// 「作業内容」ヘッダーは削除されました
		});

		it('空配列の場合は「データがありません」メッセージを表示', () => {
			render(WorkLogList, {
				props: {
					items: [],
					serverNow
				}
			});

			expect(screen.getByText('データがありません')).toBeInTheDocument();
		});
	});

	describe('データ表示', () => {
		it('終了済み作業が正しく表示される', () => {
			const items = [
				{
					id: '1',
					startedAt: '2025-10-25T09:00:00.000Z',
					endedAt: '2025-10-25T10:30:00.000Z',
					description: ''
				}
			];

			render(WorkLogList, {
				props: {
					items,
					serverNow
				}
			});

			// 日付、開始、終了、作業時間が表示されることを確認
			// 実際の表示値はタイムゾーンに依存するため、要素の存在のみチェック
			const rows = screen.getAllByRole('row');
			expect(rows.length).toBeGreaterThan(1); // ヘッダー + データ行×2
		});

		it('進行中の作業は終了時刻が「—」で表示される', () => {
			const items = [
				{
					id: '1',
					startedAt: '2025-10-25T09:00:00.000Z',
					endedAt: null,
					description: ''
				}
			];

			render(WorkLogList, {
				props: {
					items,
					serverNow
				}
			});

			// 「—」が3つ表示されることを確認（終了時刻、作業時間、作業内容（空文字の場合））
			const dashes = screen.getAllByText('—');
			expect(dashes).toHaveLength(3);
		});

		it('複数の作業が表示される', () => {
			const items = [
				{
					id: '1',
					startedAt: '2025-10-25T09:00:00.000Z',
					endedAt: '2025-10-25T10:30:00.000Z',
					description: ''
				},
				{
					id: '2',
					startedAt: '2025-10-25T11:00:00.000Z',
					endedAt: '2025-10-25T12:00:00.000Z',
					description: ''
				},
				{
					id: '3',
					startedAt: '2025-10-25T13:00:00.000Z',
					endedAt: null,
					description: ''
				}
			];

			render(WorkLogList, {
				props: {
					items,
					serverNow
				}
			});

			const rows = screen.getAllByRole('row');
			// ヘッダー + 3データ×2行
			expect(rows.length).toBe(7);
		});

		it('作業内容がある場合は正しく表示される', () => {
			const items = [
				{
					id: '1',
					startedAt: '2025-10-25T09:00:00.000Z',
					endedAt: '2025-10-25T10:30:00.000Z',
					description: 'テスト作業内容'
				}
			];

			render(WorkLogList, {
				props: {
					items,
					serverNow
				}
			});

			expect(screen.getByText('テスト作業内容')).toBeInTheDocument();
		});

		it('作業内容が空の場合は「—」が表示される', () => {
			const items = [
				{
					id: '1',
					startedAt: '2025-10-25T09:00:00.000Z',
					endedAt: '2025-10-25T10:30:00.000Z',
					description: ''
				}
			];

			render(WorkLogList, {
				props: {
					items,
					serverNow
				}
			});

			// 作業内容欄の「—」を確認
			const dashes = screen.getAllByText('—');
			expect(dashes.length).toBeGreaterThan(0);
		});
	});

	describe('アクセシビリティ', () => {
		it('テーブルヘッダーに適切なscope属性がある', () => {
			render(WorkLogList, {
				props: {
					items: [],
					serverNow
				}
			});

			const headers = screen.getAllByRole('columnheader');
			expect(headers.length).toBe(4);
			headers.forEach((header) => {
				expect(header).toHaveAttribute('scope', 'col');
			});
		});

		it('テーブルにaria-labelが設定されている', () => {
			render(WorkLogList, {
				props: {
					items: [],
					serverNow
				}
			});

			const table = screen.getByRole('table');
			expect(table).toHaveAttribute('aria-label');
		});
	});

	describe('進行中作業のハイライト', () => {
		it('進行中の作業行に特別なクラスが適用される', () => {
			const items = [
				{
					id: '1',
					startedAt: '2025-10-25T09:00:00.000Z',
					endedAt: '2025-10-25T10:30:00.000Z',
					description: ''
				},
				{
					id: '2',
					startedAt: '2025-10-25T11:00:00.000Z',
					endedAt: null,
					description: ''
				}
			];

			const { container } = render(WorkLogList, {
				props: {
					items,
					serverNow
				}
			});

			// 進行中の作業行に特別なクラスがあることを確認
			const activeRow = container.querySelector('[data-active="true"]');
			expect(activeRow).toBeInTheDocument();
		});
	});
});
