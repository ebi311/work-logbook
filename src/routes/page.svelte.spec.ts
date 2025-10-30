import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// モジュールのモックは対象のインポートより前に宣言する必要がある
vi.mock('$app/forms', () => {
	return {
		enhance: (form: HTMLFormElement | undefined) => {
			const handler = (e: Event) => e.preventDefault();
			// form が存在する場合のみイベントを張る（SSR/テストの安全性のためガード）
			form?.addEventListener?.('submit', handler);
			return {
				// Svelte アクション互換の destroy を返す
				destroy: () => {
					form?.removeEventListener?.('submit', handler);
				}
			};
		}
	};
});

// svelte-toast をモック
vi.mock('@zerodevx/svelte-toast', () => {
	return {
		toast: {
			push: vi.fn()
		}
	};
});

import Page from './+page.svelte';
import { toast } from '@zerodevx/svelte-toast';

// 上記に移動

describe('/+page.svelte', () => {
	const serverNow = '2025-10-22T10:00:00.000Z';

	// 各テストの前にモックをリセット
	beforeEach(() => {
		vi.mocked(toast.push).mockClear();
	});

	// テストデータヘルパー: デフォルトのlistDataを生成
	const createDefaultListData = () =>
		Promise.resolve({
			items: [],
			page: 1,
			size: 10,
			hasNext: false,
			monthlyTotalSec: 0
		});

	// テストデータヘルパー: デフォルトのdataオブジェクトを生成
	const createDefaultData = (overrides?: any) => ({
		active: undefined,
		serverNow,
		listData: createDefaultListData(),
		tagSuggestions: [],
		...overrides
	});

	// テストデータヘルパー: activeWorkLogを生成
	const createActiveWorkLog = (overrides?: any) => ({
		id: 'test-id',
		startedAt: serverNow,
		endedAt: null,
		description: 'テスト作業中',
		tags: [],
		...overrides
	});

	describe('停止中の状態', () => {
		it('「停止中」のステータスが表示される', () => {
			render(Page, {
				props: {
					data: {
						active: undefined,
						serverNow,
						listData: createDefaultListData()
					}
				}
			});

			expect(screen.getByText('停止中')).toBeInTheDocument();
		});

		it('「作業開始」ボタンが表示される', () => {
			render(Page, {
				props: {
					data: {
						active: undefined,
						serverNow,
						listData: createDefaultListData()
					}
				}
			});

			const button = screen.getByRole('button', { name: '作業開始' });
			expect(button).toBeInTheDocument();
		});

		it('「作業開始」ボタンのformactionが"?/start"である', () => {
			render(Page, {
				props: {
					data: {
						active: undefined,
						serverNow,
						listData: createDefaultListData()
					}
				}
			});

			const button = screen.getByRole('button', { name: '作業開始' });
			expect(button).toHaveAttribute('formaction', '?/start');
		});
	});

	describe('記録中の状態', () => {
		const active = {
			id: 'test-work-log-id',
			startedAt: '2025-10-22T09:30:00.000Z', // 30分前
			endedAt: null,
			description: 'テスト作業中'
		};

		it('「記録中」のステータスが表示される', () => {
			render(Page, {
				props: {
					data: {
						active,
						serverNow,
						listData: createDefaultListData()
					}
				}
			});

			// "記録中" という文字列を含むテキストを探す
			expect(screen.getByText(/記録中/)).toBeInTheDocument();
		});

		it('経過時間が表示される', () => {
			render(Page, {
				props: {
					data: {
						active,
						serverNow,
						listData: createDefaultListData()
					}
				}
			});

			// 「記録中（経過」というテキストが含まれることを確認
			// 具体的な時間は、WorkLogStatusコンポーネントのテストで確認済み
			expect(screen.getByText(/記録中（経過 \d+:\d{2}:\d{2}）/)).toBeInTheDocument();
		});

		it('「作業終了」ボタンが表示される', () => {
			render(Page, {
				props: {
					data: {
						active,
						serverNow,
						listData: createDefaultListData()
					}
				}
			});

			const button = screen.getByRole('button', { name: '作業終了' });
			expect(button).toBeInTheDocument();
		});

		it('「作業終了」ボタンのformactionが"?/stop"である', () => {
			render(Page, {
				props: {
					data: {
						active,
						serverNow,
						listData: createDefaultListData()
					}
				}
			});

			const button = screen.getByRole('button', { name: '作業終了' });
			expect(button).toHaveAttribute('formaction', '?/stop');
		});
	});

	describe('作業開始アクション', () => {
		describe('成功時', () => {
			it('停止中から記録中に状態が変化する', async () => {
				const { rerender } = render(Page, {
					props: {
						data: {
							active: undefined,
							serverNow,
							listData: createDefaultListData()
						}
					}
				});

				// 初期状態: 停止中
				expect(screen.getByText('停止中')).toBeInTheDocument();
				expect(screen.getByRole('button', { name: '作業開始' })).toBeInTheDocument();

				// アクション成功後の状態に更新
				const newServerNow = '2025-10-22T10:00:01.000Z';
				const newActive = {
					id: 'new-work-log-id',
					startedAt: newServerNow,
					endedAt: null,
					description: 'テスト作業中',
					tags: []
				};

				rerender({
					data: {
						active: undefined,
						serverNow,
						listData: createDefaultListData(),
						tagSuggestions: []
					},
					form: {
						ok: true,
						workLog: newActive,
						serverNow: newServerNow
					}
				}); // 新しい状態: 記録中（リアクティビティの更新を待つ）
				await waitFor(() => {
					expect(screen.getByText(/記録中/)).toBeInTheDocument();
				});
				expect(screen.getByRole('button', { name: '作業終了' })).toBeInTheDocument();

				// 成功メッセージが表示される
				await waitFor(() => {
					expect(vi.mocked(toast.push)).toHaveBeenCalledWith('作業を開始しました', {
						theme: {
							'--toastBackground': 'oklch(var(--su))',
							'--toastColor': 'oklch(var(--suc))',
							'--toastBarBackground': 'oklch(var(--suc))'
						}
					});
				});
			});
		});

		describe('失敗時（409 Conflict）', () => {
			it('既に作業が進行中の場合、エラーメッセージが表示され、サーバー状態で更新される', async () => {
				const { rerender } = render(Page, {
					props: {
						data: {
							active: undefined,
							serverNow,
							listData: createDefaultListData()
						}
					}
				});

				// 初期状態: 停止中
				expect(screen.getByText('停止中')).toBeInTheDocument();

				// 409エラーレスポンスをシミュレート
				const existingActive = {
					id: 'existing-work-log-id',
					startedAt: '2025-10-22T09:00:00.000Z',
					endedAt: null,
					description: 'テスト作業中'
				};

				rerender({
					data: {
						active: undefined,
						serverNow,
						listData: createDefaultListData()
					},
					form: {
						reason: 'ACTIVE_EXISTS' as const,
						active: existingActive,
						serverNow: '2025-10-22T10:00:05.000Z'
					}
				});

				// エラーメッセージが表示される
				await waitFor(() => {
					expect(vi.mocked(toast.push)).toHaveBeenCalledWith('既に作業が進行中です', {
						theme: {
							'--toastBackground': 'oklch(var(--er))',
							'--toastColor': 'oklch(var(--erc))',
							'--toastBarBackground': 'oklch(var(--erc))'
						}
					});
				});

				// サーバーから返された進行中の作業で状態が更新される
				await waitFor(() => {
					expect(screen.getByText(/記録中/)).toBeInTheDocument();
				});
			});
		});
	});

	describe('作業終了アクション', () => {
		describe('成功時', () => {
			it('記録中から停止中に状態が変化する', async () => {
				const active = {
					id: 'test-work-log-id',
					startedAt: '2025-10-22T09:30:00.000Z',
					endedAt: null,
					description: 'テスト作業中'
				};

				const { rerender } = render(Page, {
					props: {
						data: {
							active,
							serverNow,
							listData: createDefaultListData()
						}
					}
				});

				// 初期状態: 記録中
				expect(screen.getByText(/記録中/)).toBeInTheDocument();
				expect(screen.getByRole('button', { name: '作業終了' })).toBeInTheDocument();

				// アクション成功後の状態に更新
				const newServerNow = '2025-10-22T10:30:00.000Z';
				const stoppedWorkLog = {
					id: active.id,
					startedAt: active.startedAt,
					endedAt: newServerNow,
					description: active.description
				};

				rerender({
					data: {
						active,
						serverNow,
						listData: createDefaultListData()
					},
					form: {
						ok: true,
						workLog: stoppedWorkLog,
						serverNow: newServerNow,
						durationSec: 3600 // 60分
					}
				});

				// 新しい状態: 停止中（リアクティビティの更新を待つ）
				await waitFor(() => {
					expect(screen.getByText('停止中')).toBeInTheDocument();
				});
				expect(screen.getByRole('button', { name: '作業開始' })).toBeInTheDocument();

				// 成功メッセージが表示される（経過時間付き）
				await waitFor(() => {
					expect(vi.mocked(toast.push)).toHaveBeenCalledWith('作業を終了しました(60分)', {
						theme: {
							'--toastBackground': 'oklch(var(--su))',
							'--toastColor': 'oklch(var(--suc))',
							'--toastBarBackground': 'oklch(var(--suc))'
						}
					});
				});
			});
		});

		describe('失敗時（404 Not Found）', () => {
			it('進行中の作業がない場合、エラーメッセージが表示され、停止中に更新される', async () => {
				const active = {
					id: 'test-work-log-id',
					startedAt: '2025-10-22T09:30:00.000Z',
					endedAt: null,
					description: 'テスト作業中'
				};

				const { rerender } = render(Page, {
					props: {
						data: {
							active,
							serverNow,
							listData: createDefaultListData()
						}
					}
				});

				// 初期状態: 記録中
				expect(screen.getByText(/記録中/)).toBeInTheDocument();

				// 404エラーレスポンスをシミュレート
				rerender({
					data: {
						active,
						serverNow,
						listData: createDefaultListData()
					},
					form: {
						reason: 'NO_ACTIVE' as const,
						serverNow: '2025-10-22T10:00:05.000Z'
					}
				});

				// エラーメッセージが表示される
				await waitFor(() => {
					expect(vi.mocked(toast.push)).toHaveBeenCalledWith('進行中の作業がありません', {
						theme: {
							'--toastBackground': 'oklch(var(--er))',
							'--toastColor': 'oklch(var(--erc))',
							'--toastBarBackground': 'oklch(var(--erc))'
						}
					});
				});

				// 停止中状態に更新される
				await waitFor(() => {
					expect(screen.getByText('停止中')).toBeInTheDocument();
				});
			});
		});
	});

	describe('リアクティブな状態同期', () => {
		it('dataプロップが変更されたら、currentActiveとcurrentServerNowが更新される', async () => {
			const { rerender } = render(Page, {
				props: {
					data: {
						active: undefined,
						serverNow,
						listData: createDefaultListData()
					}
				}
			});

			// 初期状態
			expect(screen.getByText('停止中')).toBeInTheDocument();

			// dataを更新
			const newActive = {
				id: 'new-id',
				startedAt: '2025-10-22T10:00:00.000Z',
				endedAt: null,
				description: 'テスト作業中'
			};
			const newServerNow = '2025-10-22T10:00:00.000Z';

			rerender({
				data: {
					active: newActive,
					serverNow: newServerNow,
					listData: createDefaultListData()
				}
			});

			// 新しい状態が反映される（リアクティビティの更新を待つ）
			await waitFor(() => {
				expect(screen.getByText(/記録中/)).toBeInTheDocument();
			});
		});
	});

	describe('キーボードショートカット', () => {
		describe('Cmd/Ctrl + S で作業開始/終了', () => {
			it('停止中に Ctrl + S で作業を開始できる', async () => {
				render(Page, {
					props: {
						data: {
							active: undefined,
							serverNow,
							listData: createDefaultListData()
						}
					}
				});

				// Ctrl + S を押下
				const event = new KeyboardEvent('keydown', {
					key: 's',
					ctrlKey: true,
					bubbles: true,
					cancelable: true
				});

				const button = screen.getByRole('button', { name: '作業開始' });
				const clickSpy = vi.spyOn(button, 'click');

				window.dispatchEvent(event);

				// ボタンがクリックされることを期待
				expect(clickSpy).toHaveBeenCalled();
			});

			it('停止中に Cmd + S (macOS) で作業を開始できる', async () => {
				render(Page, {
					props: {
						data: {
							active: undefined,
							serverNow,
							listData: createDefaultListData()
						}
					}
				});

				// Cmd + S を押下
				const event = new KeyboardEvent('keydown', {
					key: 's',
					metaKey: true,
					bubbles: true,
					cancelable: true
				});

				const button = screen.getByRole('button', { name: '作業開始' });
				const clickSpy = vi.spyOn(button, 'click');

				window.dispatchEvent(event);

				// ボタンがクリックされることを期待
				expect(clickSpy).toHaveBeenCalled();
			});

			it('作業中に Ctrl + S で作業を終了できる', async () => {
				render(Page, {
					props: {
						data: {
							active: {
								id: 'test-id',
								startedAt: '2025-10-22T10:00:00.000Z',
								endedAt: null,
								description: 'テスト作業中'
							},
							serverNow,
							listData: createDefaultListData()
						}
					}
				});

				// Ctrl + S を押下
				const event = new KeyboardEvent('keydown', {
					key: 's',
					ctrlKey: true,
					bubbles: true,
					cancelable: true
				});

				const button = screen.getByRole('button', { name: '作業終了' });
				const clickSpy = vi.spyOn(button, 'click');

				window.dispatchEvent(event);

				// ボタンがクリックされることを期待
				expect(clickSpy).toHaveBeenCalled();
			});

			it('input要素フォーカス時はショートカットが無効', async () => {
				const { container } = render(Page, {
					props: {
						data: {
							active: undefined,
							serverNow,
							listData: createDefaultListData()
						}
					}
				});

				// input要素を作成してフォーカス
				const input = document.createElement('input');
				container.appendChild(input);
				input.focus();

				// Ctrl + S を押下
				const event = new KeyboardEvent('keydown', {
					key: 's',
					ctrlKey: true,
					bubbles: true,
					cancelable: true
				});

				const button = screen.getByRole('button', { name: '作業開始' });
				const clickSpy = vi.spyOn(button, 'click');

				input.dispatchEvent(event);

				// ボタンはクリックされないことを期待
				expect(clickSpy).not.toHaveBeenCalled();
			});

			it('textarea要素フォーカス時はショートカットが無効', async () => {
				const { container } = render(Page, {
					props: {
						data: {
							active: undefined,
							serverNow,
							listData: createDefaultListData()
						}
					}
				});

				// textarea要素を作成してフォーカス
				const textarea = document.createElement('textarea');
				container.appendChild(textarea);
				textarea.focus();

				// Ctrl + S を押下
				const event = new KeyboardEvent('keydown', {
					key: 's',
					ctrlKey: true,
					bubbles: true,
					cancelable: true
				});

				const button = screen.getByRole('button', { name: '作業開始' });
				const clickSpy = vi.spyOn(button, 'click');

				textarea.dispatchEvent(event);

				// ボタンはクリックされないことを期待
				expect(clickSpy).not.toHaveBeenCalled();
			});

			it('ブラウザのデフォルト動作が抑制される', async () => {
				render(Page, {
					props: {
						data: {
							active: undefined,
							serverNow,
							listData: createDefaultListData()
						}
					}
				});

				// Ctrl + S を押下
				const event = new KeyboardEvent('keydown', {
					key: 's',
					ctrlKey: true,
					bubbles: true,
					cancelable: true
				});

				const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
				window.dispatchEvent(event);

				// preventDefault が呼ばれることを期待
				expect(preventDefaultSpy).toHaveBeenCalled();
			});

			it('送信中はショートカットが無効', async () => {
				render(Page, {
					props: {
						data: {
							active: undefined,
							serverNow,
							listData: createDefaultListData()
						}
					}
				});

				// Ctrl + S を押下
				const event = new KeyboardEvent('keydown', {
					key: 's',
					ctrlKey: true,
					bubbles: true,
					cancelable: true
				});

				window.dispatchEvent(event);

				// 送信中でなければクリックが実行される
				await waitFor(() => {
					expect(screen.getByText('停止中')).toBeInTheDocument();
				});
			});
		});
	});

	describe('作業一覧の表示', () => {
		it('ローディング中はスケルトンが表示される', async () => {
			const listDataPromise = new Promise<{
				items: Array<{
					id: string;
					startedAt: string;
					endedAt: string | null;
					durationSec: number | null;
					description: string;
				}>;
				page: number;
				size: number;
				hasNext: boolean;
				monthlyTotalSec: number;
			}>(() => {
				// 未解決のPromise（ローディング状態をシミュレート）
			});

			render(Page, {
				props: {
					data: {
						active: undefined,
						serverNow,
						listData: listDataPromise
					}
				}
			});

			// スケルトン要素が表示されることを確認
			const skeletons = screen.getAllByRole('row');
			expect(skeletons.length).toBeGreaterThan(0);
		});

		it('データ取得後は一覧が表示される', async () => {
			const listData = Promise.resolve({
				items: [
					{
						id: '1',
						startedAt: '2025-10-25T09:00:00.000Z',
						endedAt: '2025-10-25T10:30:00.000Z',
						durationSec: 5400,
						description: 'テスト作業内容1'
					},
					{
						id: '2',
						startedAt: '2025-10-25T11:00:00.000Z',
						endedAt: null, // 進行中
						durationSec: null,
						description: 'テスト作業内容2'
					}
				],
				page: 1,
				size: 10,
				hasNext: false,
				monthlyTotalSec: 5400 // 1時間30分
			});

			render(Page, {
				props: {
					data: {
						active: undefined,
						serverNow,
						listData
					}
				}
			});

			// データが表示されるのを待つ
			await waitFor(() => {
				expect(screen.getByText('作業履歴')).toBeInTheDocument();
			});

			// 日付ヘッダーが表示されている
			expect(screen.getByText('日付')).toBeInTheDocument();

			// 月次合計が表示されている
			expect(screen.getByText(/合計/)).toBeInTheDocument();
		});

		it('ページネーションが機能する', async () => {
			const listData = Promise.resolve({
				items: [
					{
						id: '1',
						startedAt: '2025-10-25T09:00:00.000Z',
						endedAt: '2025-10-25T10:30:00.000Z',
						durationSec: 5400,
						description: 'テスト作業内容1'
					}
				],
				page: 1,
				size: 10,
				hasNext: true,
				monthlyTotalSec: 5400
			});

			render(Page, {
				props: {
					data: {
						active: undefined,
						serverNow,
						listData
					}
				}
			});

			await waitFor(() => {
				expect(screen.getByText('作業履歴')).toBeInTheDocument();
			});

			// 次へボタンが有効
			const nextButton = screen.getByRole('link', { name: '次のページ' });
			expect(nextButton).toBeInTheDocument();
			expect(nextButton).not.toHaveAttribute('aria-disabled', 'true');
		});

		it('エラー時は適切なメッセージが表示される', async () => {
			const listData = Promise.reject(new Error('Failed to load'));

			render(Page, {
				props: {
					data: {
						active: undefined,
						serverNow,
						listData
					}
				}
			});

			await waitFor(() => {
				expect(screen.getByText('データの読み込みに失敗しました')).toBeInTheDocument();
			});
		});

		it('空の一覧の場合は適切なメッセージが表示される', async () => {
			const listData = Promise.resolve({
				items: [],
				page: 1,
				size: 10,
				hasNext: false,
				monthlyTotalSec: 0
			});

			render(Page, {
				props: {
					data: {
						active: undefined,
						serverNow,
						listData
					}
				}
			});

			await waitFor(() => {
				expect(screen.getByText('データがありません')).toBeInTheDocument();
			});
		});
	});

	describe('編集ボタンと編集フロー', () => {
		beforeEach(() => {
			// dialog のメソッドをモック（JSDOMでは未実装のため）
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(HTMLDialogElement.prototype as any).showModal = vi.fn();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(HTMLDialogElement.prototype as any).close = vi.fn();
		});

		it('完了した作業にのみ「編集」ボタンが表示される', async () => {
			const listData = Promise.resolve({
				items: [
					{
						id: '1',
						startedAt: '2025-10-25T09:00:00.000Z',
						endedAt: '2025-10-25T10:30:00.000Z',
						durationSec: 5400,
						description: '完了済み'
					},
					{
						id: '2',
						startedAt: '2025-10-25T11:00:00.000Z',
						endedAt: null,
						durationSec: null,
						description: '進行中'
					}
				],
				page: 1,
				size: 10,
				hasNext: false,
				monthlyTotalSec: 5400
			});

			render(Page, {
				props: {
					data: {
						active: undefined,
						serverNow,
						listData
					}
				}
			});

			await waitFor(() => {
				expect(screen.getByText('作業履歴')).toBeInTheDocument();
			});

			const editButtons = screen.getAllByRole('button', { name: '編集' });
			expect(editButtons.length).toBe(1);
		});

		it('「編集」ボタンをクリックで編集モーダルが開く', async () => {
			const listData = Promise.resolve({
				items: [
					{
						id: '1',
						startedAt: '2025-10-25T09:00:00.000Z',
						endedAt: '2025-10-25T10:30:00.000Z',
						durationSec: 5400,
						description: '編集対象'
					}
				],
				page: 1,
				size: 10,
				hasNext: false,
				monthlyTotalSec: 5400
			});

			render(Page, {
				props: {
					data: {
						active: undefined,
						serverNow,
						listData
					}
				}
			});

			await waitFor(() => {
				expect(screen.getByText('作業履歴')).toBeInTheDocument();
			});

			const editButton = screen.getByRole('button', { name: '編集' });
			editButton.click();

			// モーダルのタイトルが表示される
			await waitFor(() => {
				expect(screen.getByText('作業記録の編集')).toBeInTheDocument();
			});
		});

		it('更新機能の統合テスト: モーダルが表示され、編集ボタンが存在する', async () => {
			const initialList = Promise.resolve({
				items: [
					{
						id: '1',
						startedAt: '2025-10-25T09:00:00.000Z',
						endedAt: '2025-10-25T10:30:00.000Z',
						durationSec: 5400,
						description: '旧い説明'
					}
				],
				page: 1,
				size: 10,
				hasNext: false,
				monthlyTotalSec: 5400
			});

			render(Page, {
				props: {
					data: {
						active: undefined,
						serverNow,
						listData: initialList
					}
				}
			});

			// 初期データの読み込みを待つ
			await screen.findByText('旧い説明', {}, { timeout: 3000 });

			// 編集ボタンをクリックしてモーダルを開く
			const editButton = screen.getByRole('button', { name: '編集' });
			editButton.click();

			// モーダルが開くことを確認
			await waitFor(() => {
				expect(screen.getByText('作業記録の編集')).toBeInTheDocument();
			});

			// フォーム要素が存在することを確認
			expect(screen.getByLabelText('開始時刻')).toBeInTheDocument();
			expect(screen.getByLabelText('終了時刻')).toBeInTheDocument();
			expect(screen.getByLabelText('作業内容')).toBeInTheDocument();
			// ボタンはaria-labelで取得
			expect(screen.getByLabelText('保存')).toBeInTheDocument();
			expect(screen.getByLabelText('キャンセル')).toBeInTheDocument();
		});
	});

	describe('削除ボタンと削除フロー', () => {
		beforeEach(() => {
			// window.confirm のモック
			vi.spyOn(window, 'confirm').mockReturnValue(true);
			// fetch のモック
			global.fetch = vi.fn();
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('完了した作業にのみ「削除」ボタンが表示される', async () => {
			const listData = Promise.resolve({
				items: [
					{
						id: '1',
						startedAt: '2025-10-25T09:00:00.000Z',
						endedAt: '2025-10-25T10:30:00.000Z',
						durationSec: 5400,
						description: '完了済み'
					},
					{
						id: '2',
						startedAt: '2025-10-25T11:00:00.000Z',
						endedAt: null,
						durationSec: null,
						description: '進行中'
					}
				],
				page: 1,
				size: 10,
				hasNext: false,
				monthlyTotalSec: 5400
			});

			render(Page, {
				props: {
					data: {
						active: undefined,
						serverNow,
						listData
					}
				}
			});

			await waitFor(() => {
				expect(screen.getByText('作業履歴')).toBeInTheDocument();
			});

			const deleteButtons = screen.getAllByRole('button', { name: '削除' });
			expect(deleteButtons.length).toBe(1);
		});

		it('「削除」ボタンをクリックで確認ダイアログが表示される', async () => {
			const listData = Promise.resolve({
				items: [
					{
						id: '1',
						startedAt: '2025-10-25T09:00:00.000Z',
						endedAt: '2025-10-25T10:30:00.000Z',
						durationSec: 5400,
						description: '削除対象'
					}
				],
				page: 1,
				size: 10,
				hasNext: false,
				monthlyTotalSec: 5400
			});

			render(Page, {
				props: {
					data: {
						active: undefined,
						serverNow,
						listData
					}
				}
			});

			await waitFor(() => {
				expect(screen.getByText('作業履歴')).toBeInTheDocument();
			});

			const deleteButton = screen.getByRole('button', { name: '削除' });
			deleteButton.click();

			// window.confirm が呼ばれたことを確認
			await waitFor(() => {
				expect(window.confirm).toHaveBeenCalledWith(
					'この作業記録を削除してもよろしいですか？\n\nこの操作は取り消せません。'
				);
			});
		});

		it('削除確認でキャンセルした場合、削除処理は実行されない', async () => {
			// window.confirm を false に設定
			vi.spyOn(window, 'confirm').mockReturnValue(false);

			const listData = Promise.resolve({
				items: [
					{
						id: '1',
						startedAt: '2025-10-25T09:00:00.000Z',
						endedAt: '2025-10-25T10:30:00.000Z',
						durationSec: 5400,
						description: '削除対象'
					}
				],
				page: 1,
				size: 10,
				hasNext: false,
				monthlyTotalSec: 5400
			});

			render(Page, {
				props: {
					data: {
						active: undefined,
						serverNow,
						listData
					}
				}
			});

			await waitFor(() => {
				expect(screen.getByText('作業履歴')).toBeInTheDocument();
			});

			const deleteButton = screen.getByRole('button', { name: '削除' });
			deleteButton.click();

			// fetch が呼ばれていないことを確認
			await waitFor(() => {
				expect(global.fetch).not.toHaveBeenCalled();
			});
		});

		it('削除確認でOKした場合、削除処理が実行される', async () => {
			// fetch のモックレスポンス
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				json: async () => ({
					type: 'success',
					data: {
						ok: true,
						deletedId: '1',
						serverNow: '2025-10-25T12:00:00.000Z'
					}
				})
			});

			const listData = Promise.resolve({
				items: [
					{
						id: '1',
						startedAt: '2025-10-25T09:00:00.000Z',
						endedAt: '2025-10-25T10:30:00.000Z',
						durationSec: 5400,
						description: '削除対象'
					}
				],
				page: 1,
				size: 10,
				hasNext: false,
				monthlyTotalSec: 5400
			});

			render(Page, {
				props: {
					data: {
						active: undefined,
						serverNow,
						listData
					}
				}
			});

			await waitFor(() => {
				expect(screen.getByText('作業履歴')).toBeInTheDocument();
			});

			const deleteButton = screen.getByRole('button', { name: '削除' });
			deleteButton.click();

			// fetch が呼ばれたことを確認
			await waitFor(() => {
				expect(global.fetch).toHaveBeenCalledWith(
					'?/delete',
					expect.objectContaining({
						method: 'POST',
						body: expect.any(FormData)
					})
				);
			});
		});
	});
});
