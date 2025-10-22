import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
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
});
