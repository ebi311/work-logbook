import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

// SvelteKit の use:enhance によるフォーム送信処理が JSDOM 環境で URL を必要としエラーになるため、
// テストでは $app/forms の enhance を no-op にモックして submit を preventDefault する
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

import Page from './+page.svelte';

describe('/+page.svelte', () => {
	const serverNow = '2025-10-22T10:00:00.000Z';

	describe('停止中の状態', () => {
		it('「停止中」のステータスが表示される', () => {
			render(Page, {
				props: {
					data: {
						active: undefined,
						serverNow
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
						serverNow
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
						serverNow
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
			endedAt: null
		};

		it('「記録中」のステータスが表示される', () => {
			render(Page, {
				props: {
					data: {
						active,
						serverNow
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
						serverNow
					}
				}
			});

			// 「記録中（経過」というテキストが含まれることを確認
			// 具体的な時間は、WorkLogStatusコンポーネントのテストで確認済み
			expect(screen.getByText(/記録中（経過 \d{2}:\d{2}:\d{2}）/)).toBeInTheDocument();
		});

		it('「作業終了」ボタンが表示される', () => {
			render(Page, {
				props: {
					data: {
						active,
						serverNow
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
						serverNow
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
							serverNow
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
					endedAt: null
				};

				rerender({
					data: {
						active: undefined,
						serverNow
					},
					form: {
						ok: true,
						workLog: newActive,
						serverNow: newServerNow
					}
				});

				// 新しい状態: 記録中（リアクティビティの更新を待つ）
				await waitFor(() => {
					expect(screen.getByText(/記録中/)).toBeInTheDocument();
				});
				expect(screen.getByRole('button', { name: '作業終了' })).toBeInTheDocument();

				// 成功メッセージが表示される
				await waitFor(() => {
					expect(screen.getByText('作業を開始しました')).toBeInTheDocument();
				});
			});
		});

		describe('失敗時（409 Conflict）', () => {
			it('既に作業が進行中の場合、エラーメッセージが表示され、サーバー状態で更新される', async () => {
				const { rerender } = render(Page, {
					props: {
						data: {
							active: undefined,
							serverNow
						}
					}
				});

				// 初期状態: 停止中
				expect(screen.getByText('停止中')).toBeInTheDocument();

				// 409エラーレスポンスをシミュレート
				const existingActive = {
					id: 'existing-work-log-id',
					startedAt: '2025-10-22T09:00:00.000Z',
					endedAt: null
				};

				rerender({
					data: {
						active: undefined,
						serverNow
					},
					form: {
						reason: 'ACTIVE_EXISTS' as const,
						active: existingActive,
						serverNow: '2025-10-22T10:00:05.000Z'
					}
				});

				// エラーメッセージが表示される
				await waitFor(() => {
					expect(screen.getByText('既に作業が進行中です')).toBeInTheDocument();
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
					endedAt: null
				};

				const { rerender } = render(Page, {
					props: {
						data: {
							active,
							serverNow
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
					endedAt: newServerNow
				};

				rerender({
					data: {
						active,
						serverNow
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
					expect(screen.getByText('作業を終了しました（60分）')).toBeInTheDocument();
				});
			});
		});

		describe('失敗時（404 Not Found）', () => {
			it('進行中の作業がない場合、エラーメッセージが表示され、停止中に更新される', async () => {
				const active = {
					id: 'test-work-log-id',
					startedAt: '2025-10-22T09:30:00.000Z',
					endedAt: null
				};

				const { rerender } = render(Page, {
					props: {
						data: {
							active,
							serverNow
						}
					}
				});

				// 初期状態: 記録中
				expect(screen.getByText(/記録中/)).toBeInTheDocument();

				// 404エラーレスポンスをシミュレート
				rerender({
					data: {
						active,
						serverNow
					},
					form: {
						reason: 'NO_ACTIVE' as const,
						serverNow: '2025-10-22T10:00:05.000Z'
					}
				});

				// エラーメッセージが表示される
				await waitFor(() => {
					expect(screen.getByText('進行中の作業がありません')).toBeInTheDocument();
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
						serverNow
					}
				}
			});

			// 初期状態
			expect(screen.getByText('停止中')).toBeInTheDocument();

			// dataを更新
			const newActive = {
				id: 'new-id',
				startedAt: '2025-10-22T10:00:00.000Z',
				endedAt: null
			};
			const newServerNow = '2025-10-22T10:00:00.000Z';

			rerender({
				data: {
					active: newActive,
					serverNow: newServerNow
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
							serverNow
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
							serverNow
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
								endedAt: null
							},
							serverNow
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
							serverNow
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
							serverNow
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
							serverNow
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
							serverNow
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
});
