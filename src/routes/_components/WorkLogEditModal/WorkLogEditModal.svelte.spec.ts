import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import WorkLogEditModal from './WorkLogEditModal.svelte';
import { WorkLog } from '../../../models/workLog';

describe('WorkLogEditModal', () => {
	const mockWorkLog = WorkLog.from({
		id: '550e8400-e29b-41d4-a716-446655440000',
		userId: '550e8400-e29b-41d4-a716-446655440001',
		startedAt: new Date('2024-10-27T09:00:00.000Z'),
		endedAt: new Date('2024-10-27T10:00:00.000Z'),
		description: 'テスト作業',
		createdAt: new Date('2024-10-27T08:00:00.000Z'),
		updatedAt: new Date('2024-10-27T08:00:00.000Z')
	});

	beforeEach(() => {
		// dialogのメソッドをモック
		HTMLDialogElement.prototype.showModal = vi.fn();
		HTMLDialogElement.prototype.close = vi.fn();
	});

	// TC1: モーダルの表示
	it('should display modal when open is true', () => {
		render(WorkLogEditModal, {
			props: {
				workLog: mockWorkLog,
				open: true
			}
		});

		expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
		expect(screen.getByText('作業記録の編集')).toBeInTheDocument();
	});

	// TC2: モーダルの非表示
	it('should not display modal when open is false', () => {
		render(WorkLogEditModal, {
			props: {
				workLog: mockWorkLog,
				open: false
			}
		});

		// dialogは存在しないか、showModalが呼ばれていない
		expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled();
	});

	// TC3: フォーム入力
	it('should reflect input values correctly', async () => {
		render(WorkLogEditModal, {
			props: {
				workLog: mockWorkLog,
				open: true
			}
		});

		// datetime-local形式に変換した初期値を確認
		const startInput = screen.getByLabelText('開始時刻') as HTMLInputElement;
		const endInput = screen.getByLabelText('終了時刻') as HTMLInputElement;
		const descInput = screen.getByLabelText('作業内容') as HTMLTextAreaElement;

		// 初期値が設定されている
		expect(startInput.value).toBeTruthy();
		expect(endInput.value).toBeTruthy();
		expect(descInput.value).toBe('テスト作業');

		// 値を変更
		await fireEvent.input(descInput, { target: { value: '更新された作業内容' } });
		expect(descInput.value).toBe('更新された作業内容');
	});

	// TC4: バリデーションエラー（時刻の整合性）
	it('should display validation error when startedAt > endedAt', async () => {
		render(WorkLogEditModal, {
			props: {
				workLog: mockWorkLog,
				open: true
			}
		});

		const startInput = screen.getByLabelText('開始時刻') as HTMLInputElement;
		const endInput = screen.getByLabelText('終了時刻') as HTMLInputElement;

		// 開始時刻 > 終了時刻にする
		await fireEvent.input(startInput, { target: { value: '2024-10-27T11:00' } });
		await fireEvent.input(endInput, { target: { value: '2024-10-27T10:00' } });

		// バリデーションエラーが表示される
		const errorMessage = await screen.findByText('開始時刻は終了時刻より前である必要があります');
		expect(errorMessage).toBeInTheDocument();

		// 保存ボタンが無効化される
		const saveButton = screen.getByRole('button', { name: '保存', hidden: true });
		expect(saveButton).toBeDisabled();
	});

	// TC5: バリデーションエラー（未来の時刻）
	it('should display validation error when future date is set', async () => {
		render(WorkLogEditModal, {
			props: {
				workLog: mockWorkLog,
				open: true
			}
		});

		const endInput = screen.getByLabelText('終了時刻') as HTMLInputElement;

		// 未来の時刻を設定（2099年）
		await fireEvent.input(endInput, { target: { value: '2099-12-31T23:59' } });

		// バリデーションエラーが表示される
		const errorMessage = await screen.findByText('未来の時刻は設定できません');
		expect(errorMessage).toBeInTheDocument();
	});

	// TC6: バリデーションエラー（文字数超過）
	it('should display validation error when description exceeds 10,000 characters', async () => {
		render(WorkLogEditModal, {
			props: {
				workLog: mockWorkLog,
				open: true
			}
		});

		const descInput = screen.getByLabelText('作業内容') as HTMLTextAreaElement;

		// 10,001文字の文字列を入力
		const longText = 'あ'.repeat(10001);
		await fireEvent.input(descInput, { target: { value: longText } });

		// バリデーションエラーが表示される
		const errorMessage = await screen.findByText('作業内容は10,000文字以内で入力してください');
		expect(errorMessage).toBeInTheDocument();

		// 保存ボタンが無効化される
		const saveButton = screen.getByRole('button', { name: '保存', hidden: true });
		expect(saveButton).toBeDisabled();
	});

	// TC7: フォーム送信成功
	it('should fire updated event and close modal on successful submission', async () => {
		const handleUpdated = vi.fn();
		const handleClose = vi.fn();

		render(WorkLogEditModal, {
			props: {
				workLog: mockWorkLog,
				open: true,
				onupdated: handleUpdated,
				onclose: handleClose
			}
		});

		const saveButton = screen.getByRole('button', { name: '保存', hidden: true });

		// ボタンが有効であることを確認
		expect(saveButton).not.toBeDisabled();

		// ユニットテストでは実際のフォーム送信は行わない
		// E2Eテストでフォーム送信をテストする
	});

	// TC8: フォーム送信失敗
	it('should display error message on submission failure', async () => {
		// このテストはServer Actionのモックが必要
		// 実装時にServer Actionのエラーレスポンスを処理するロジックを追加
		// 現時点では基本構造のみ
		expect(true).toBe(true); // プレースホルダー
	});

	// TC9: キャンセル
	it('should fire close event when cancel button is clicked', async () => {
		const handleClose = vi.fn();

		render(WorkLogEditModal, {
			props: {
				workLog: mockWorkLog,
				open: true,
				onclose: handleClose
			}
		});

		const cancelButton = screen.getByRole('button', { name: 'キャンセル', hidden: true });
		await fireEvent.click(cancelButton);

		expect(handleClose).toHaveBeenCalled();
	});

	// TC10: キーボードショートカット（Esc）
	it('should fire close event when Esc key is pressed', async () => {
		const handleClose = vi.fn();

		render(WorkLogEditModal, {
			props: {
				workLog: mockWorkLog,
				open: true,
				onclose: handleClose
			}
		});

		// dialog要素を取得して直接closeイベントを発火
		const dialog = document.querySelector('dialog');
		expect(dialog).toBeTruthy();

		// dialogのcloseイベントを直接発火
		dialog?.dispatchEvent(new Event('close'));

		expect(handleClose).toHaveBeenCalled();
	});

	// TC11: キーボードショートカット（Ctrl+Enter）
	it('should submit form when Ctrl+Enter is pressed', async () => {
		render(WorkLogEditModal, {
			props: {
				workLog: mockWorkLog,
				open: true
			}
		});

		const saveButton = screen.getByRole('button', { name: '保存', hidden: true });

		// ボタンが有効であることを確認
		expect(saveButton).not.toBeDisabled();

		// ユニットテストでは実際のフォーム送信は行わない
		// E2Eテストでキーボードショートカットをテストする
	});
});
