import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import WorkLogList from './WorkLogList.svelte';

describe('WorkLogList', () => {
	const serverNow = '2025-10-25T12:00:00.000Z';

	describe('基本表示', () => {
		it('ヘッダーが正しく表示される', () => {
			const items = [
				{
					id: '1',
					startedAt: '2025-10-25T09:00:00.000Z',
					endedAt: '2025-10-25T10:30:00.000Z',
					description: 'テスト',
				},
			];

			render(WorkLogList, {
				props: {
					items,
					serverNow,
				},
			});

			expect(screen.getByText('日付')).toBeInTheDocument();
			expect(screen.getByText('開始')).toBeInTheDocument();
			expect(screen.getByText('終了')).toBeInTheDocument();
			expect(screen.getByText('作業時間')).toBeInTheDocument();
		});

		it('空配列の場合は「データがありません」メッセージを表示', () => {
			render(WorkLogList, {
				props: {
					items: [],
					serverNow,
				},
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
					description: '',
				},
			];

			const { container } = render(WorkLogList, {
				props: {
					items,
					serverNow,
				},
			});

			// データが表示されることを確認
			const dataItems = container.querySelectorAll('[data-active]');
			expect(dataItems.length).toBe(1);
		});

		it('進行中の作業は終了時刻が「—」で表示される', () => {
			const items = [
				{
					id: '1',
					startedAt: '2025-10-25T09:00:00.000Z',
					endedAt: null,
					description: '',
				},
			];

			render(WorkLogList, {
				props: {
					items,
					serverNow,
				},
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
					description: '',
				},
				{
					id: '2',
					startedAt: '2025-10-25T11:00:00.000Z',
					endedAt: '2025-10-25T12:00:00.000Z',
					description: '',
				},
				{
					id: '3',
					startedAt: '2025-10-25T13:00:00.000Z',
					endedAt: null,
					description: '',
				},
			];

			const { container } = render(WorkLogList, {
				props: {
					items,
					serverNow,
				},
			});

			// 3つのデータアイテムが表示されることを確認
			const dataItems = container.querySelectorAll('[data-active]');
			expect(dataItems.length).toBe(3);
		});

		it('作業内容がある場合は正しく表示される', () => {
			const items = [
				{
					id: '1',
					startedAt: '2025-10-25T09:00:00.000Z',
					endedAt: '2025-10-25T10:30:00.000Z',
					description: 'テスト作業内容',
				},
			];

			render(WorkLogList, {
				props: {
					items,
					serverNow,
				},
			});

			expect(screen.getByText('テスト作業内容')).toBeInTheDocument();
		});

		it('作業内容が空の場合は「—」が表示される', () => {
			const items = [
				{
					id: '1',
					startedAt: '2025-10-25T09:00:00.000Z',
					endedAt: '2025-10-25T10:30:00.000Z',
					description: '',
				},
			];

			render(WorkLogList, {
				props: {
					items,
					serverNow,
				},
			});

			// 作業内容欄の「—」を確認
			const dashes = screen.getAllByText('—');
			expect(dashes.length).toBeGreaterThan(0);
		});
	});

	describe('アクセシビリティ', () => {
		it('作業履歴一覧にaria-labelが設定されている', () => {
			render(WorkLogList, {
				props: {
					items: [],
					serverNow,
				},
			});

			const region = screen.getByRole('region');
			expect(region).toHaveAttribute('aria-label', '作業履歴一覧');
		});
	});

	describe('進行中作業のハイライト', () => {
		it('進行中の作業行に特別なクラスが適用される', () => {
			const items = [
				{
					id: '1',
					startedAt: '2025-10-25T09:00:00.000Z',
					endedAt: '2025-10-25T10:30:00.000Z',
					description: '',
				},
				{
					id: '2',
					startedAt: '2025-10-25T11:00:00.000Z',
					endedAt: null,
					description: '',
				},
			];

			const { container } = render(WorkLogList, {
				props: {
					items,
					serverNow,
				},
			});

			// 進行中の作業行に特別なクラスがあることを確認
			const activeRow = container.querySelector('[data-active="true"]');
			expect(activeRow).toBeInTheDocument();
		});
	});

	describe('インタラクション', () => {
		it('行はクリック可能である', () => {
			const items = [
				{
					id: '1',
					startedAt: '2025-10-25T09:00:00.000Z',
					endedAt: '2025-10-25T10:30:00.000Z',
					description: 'テスト作業',
				},
			];

			const { container } = render(WorkLogList, {
				props: {
					items,
					serverNow,
				},
			});

			const button = container.querySelector('[role="button"]');
			expect(button).toBeInTheDocument();
			expect(button).toHaveAttribute('tabindex', '0');
		});

		it('行にカーソルを当てるとホバースタイルが適用される', () => {
			const items = [
				{
					id: '1',
					startedAt: '2025-10-25T09:00:00.000Z',
					endedAt: '2025-10-25T10:30:00.000Z',
					description: 'テスト作業',
				},
			];

			const { container } = render(WorkLogList, {
				props: {
					items,
					serverNow,
				},
			});

			const button = container.querySelector('[role="button"]');
			expect(button).toHaveClass('cursor-pointer');
		});
	});

	describe('ボタン表示', () => {
		it('完了した作業には編集ボタンと削除ボタンが表示される', () => {
			const items = [
				{
					id: '1',
					startedAt: '2025-10-25T09:00:00.000Z',
					endedAt: '2025-10-25T10:30:00.000Z',
					description: 'テスト作業',
				},
			];

			render(WorkLogList, {
				props: {
					items,
					serverNow,
				},
			});

			const editButton = screen.getByLabelText('編集');
			const deleteButton = screen.getByLabelText('削除');

			expect(editButton).toBeInTheDocument();
			expect(deleteButton).toBeInTheDocument();
			expect(deleteButton).toHaveClass('btn-error');
		});

		it('進行中の作業には編集ボタンと削除ボタンが表示されない', () => {
			const items = [
				{
					id: '1',
					startedAt: '2025-10-25T09:00:00.000Z',
					endedAt: null,
					description: 'テスト作業',
				},
			];

			render(WorkLogList, {
				props: {
					items,
					serverNow,
				},
			});

			const editButton = screen.queryByLabelText('編集');
			const deleteButton = screen.queryByLabelText('削除');

			expect(editButton).not.toBeInTheDocument();
			expect(deleteButton).not.toBeInTheDocument();
		});

		it('複数の完了した作業がある場合、それぞれに編集ボタンと削除ボタンが表示される', () => {
			const items = [
				{
					id: '1',
					startedAt: '2025-10-25T09:00:00.000Z',
					endedAt: '2025-10-25T10:30:00.000Z',
					description: 'テスト作業1',
				},
				{
					id: '2',
					startedAt: '2025-10-25T11:00:00.000Z',
					endedAt: '2025-10-25T12:00:00.000Z',
					description: 'テスト作業2',
				},
			];

			render(WorkLogList, {
				props: {
					items,
					serverNow,
				},
			});

			const editButtons = screen.getAllByLabelText('編集');
			const deleteButtons = screen.getAllByLabelText('削除');

			expect(editButtons).toHaveLength(2);
			expect(deleteButtons).toHaveLength(2);
		});
	});
});
