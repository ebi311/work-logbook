<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import type { WorkLog } from '../models/workLog';
	import WorkLogStatus from './_components/WorkLogStatus/WorkLogStatus.svelte';
	import WorkLogToggleButton from './_components/WorkLogToggleButton/WorkLogToggleButton.svelte';
	import KeyboardShortcutHelp from './_components/KeyboardShortcutHelp/KeyboardShortcutHelp.svelte';
	import WorkLogList from './_components/WorkLogList/WorkLogList.svelte';
	import WorkLogListSkeleton from './_components/WorkLogList/WorkLogListSkeleton.svelte';
	import MonthlyTotal from './_components/MonthlyTotal/MonthlyTotal.svelte';
	import Pagination from './_components/Pagination/Pagination.svelte';
	import { enhance } from '$app/forms';
	import { toast } from '@zerodevx/svelte-toast';
	import WorkLogEditModal from './_components/WorkLogEditModal/WorkLogEditModal.svelte';
	import { invalidate, invalidateAll, refreshAll } from '$app/navigation';
	import { page } from '$app/state';

	type Props = {
		data: PageData;
		form?: ActionData;
	};

	let { data, form }: Props = $props();

	// 現在のactive状態（dataまたはformから）
	let currentActive = $state(data.active);
	let currentServerNow = $state(data.serverNow);

	// フォーム送信中の状態
	let isSubmitting = $state(false);

	// フォームとボタンへの参照
	let formElement: HTMLFormElement | null = $state(null);
	let toggleButtonElement: HTMLButtonElement | null = $state(null);

	// 作業内容の入力値（currentActiveが変更されたら同期）
	let description = $state('');
	$effect(() => {
		description = currentActive?.description || '';
	});

	// 作業開始成功時の処理
	const handleStartSuccess = (form: NonNullable<ActionData>) => {
		if (!('workLog' in form) || !form.workLog) return;
		if (form.workLog.endedAt !== null) return; // 型ガード
		currentActive = form.workLog;
		if ('serverNow' in form) {
			currentServerNow = form.serverNow;
		}
		// showMessage('作業を開始しました', 'success');
		toast.push('作業を開始しました', {
			theme: {
				'--toastBarBackground': 'green'
			}
		});
	};

	// 作業終了成功時の処理
	const handleStopSuccess = (form: NonNullable<ActionData>) => {
		if (!('workLog' in form) || !form.workLog) return;
		currentActive = undefined;
		const duration =
			'durationSec' in form && typeof form.durationSec === 'number'
				? Math.floor(form.durationSec / 60)
				: 0;
		if ('serverNow' in form) {
			currentServerNow = form.serverNow;
		}
		// showMessage(`作業を終了しました（${duration}分）`, 'success');
		toast.push(`作業を終了しました（${duration}分）`, {
			theme: {
				'--toastBarBackground': 'green'
			}
		});
	};

	// エラー処理ハンドラーマップ
	const errorHandlers: Record<string, (form: NonNullable<ActionData>) => void> = {
		ACTIVE_EXISTS: (form) => {
			// 409エラー: 既に進行中の作業がある
			if ('active' in form && 'serverNow' in form && form.active) {
				currentActive = form.active;
				currentServerNow = form.serverNow;
			}
			// showMessage('既に作業が進行中です', 'error');
			toast.push('既に作業が進行中です', {
				theme: {
					'--toastBarBackground': 'red'
				}
			});
		},
		NO_ACTIVE: (form) => {
			// 404エラー: 進行中の作業がない
			currentActive = undefined;
			if ('serverNow' in form) {
				currentServerNow = form.serverNow;
			}
			// showMessage('進行中の作業がありません', 'error');
			toast.push('進行中の作業がありません', {
				theme: {
					'--toastBarBackground': 'red'
				}
			});
		}
	};

	// dataが変更されたら状態を同期
	$effect(() => {
		currentActive = data.active;
		currentServerNow = data.serverNow;
	});

	// formアクション結果を処理
	$effect(() => {
		if (!form) return;

		// 成功時
		if ('ok' in form && form.ok) {
			if (!('workLog' in form)) return;

			if (form.workLog?.endedAt === null) {
				handleStartSuccess(form);
			} else {
				// durationSec が存在するのは stop 成功時
				if ('durationSec' in form) {
					handleStopSuccess(form);
				}
				// update 成功時は、モーダルから onupdated コールバックで処理される
			}
			return;
		}

		// エラー時
		if (!('reason' in form) || typeof form.reason !== 'string') return;

		const handler = errorHandlers[form.reason];
		if (handler) {
			handler(form);
		}
	});

	// キーボードショートカットのハンドラー
	const handleKeyDown = (event: KeyboardEvent) => {
		// Cmd/Ctrl + S
		if ((event.metaKey || event.ctrlKey) && event.key === 's') {
			// 入力フィールドにフォーカスがある場合は無効
			const target = event.target as HTMLElement;
			if (
				target &&
				typeof target.matches === 'function' &&
				target.matches('input, textarea, [contenteditable="true"]')
			) {
				return;
			}

			// ブラウザのデフォルト動作（保存ダイアログ）を抑制
			event.preventDefault();

			// トグルボタンをクリック
			if (toggleButtonElement && !isSubmitting) {
				// ボタンにハイライト効果を追加
				toggleButtonElement.classList.add('keyboard-triggered');
				setTimeout(() => {
					toggleButtonElement?.classList.remove('keyboard-triggered');
				}, 300);

				// ボタンをクリック
				toggleButtonElement.click();
			}
		}
	};

	// キーボードイベントリスナーの登録・解除
	$effect(() => {
		window.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	});

	// ===== 作業一覧（編集反映用のローカル状態） =====
	type ListItem = {
		id: string;
		startedAt: string;
		endedAt: string | null;
		description: string;
	};
	type ListData = {
		items: ListItem[];
		page: number;
		size: number;
		hasNext: boolean;
		monthlyTotalSec: number;
	};

	let listDataPromise = $derived<Promise<ListData>>(data.listData as Promise<ListData>);

	// ===== 編集モーダルの状態 =====
	let editOpen = $state(false);
	let editTarget: {
		id: string;
		startedAt: Date;
		endedAt: Date | null;
		description: string;
	} | null = $state(null);

	const openEditModal = (item: ListItem) => {
		if (item.endedAt === null) return; // 進行中は編集不可
		editTarget = {
			id: item.id,
			startedAt: new Date(item.startedAt),
			endedAt: item.endedAt ? new Date(item.endedAt) : null,
			description: item.description
		};
		editOpen = true;
	};

	const handleEditClose = () => {
		editOpen = false;
		editTarget = null;
	};

	const handleEditUpdate = async () => {
		console.log('handleEditUpdate called');
		await refreshAll();
	};

	// F-004: 削除処理
	const handleDeleteClick = async (item: ListItem) => {
		// ブラウザ標準の確認ダイアログ
		const confirmed = window.confirm(
			'この作業記録を削除してもよろしいですか？\n\nこの操作は取り消せません。'
		);

		if (!confirmed) {
			return; // キャンセルされた場合は何もしない
		}

		// 削除アクションを実行
		const formData = new FormData();
		formData.set('id', item.id);

		try {
			const response = await fetch('?/delete', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.type === 'success') {
				// 削除成功
				toast.push('作業記録を削除しました', {
					theme: {
						'--toastBackground': 'oklch(var(--su))',
						'--toastColor': 'oklch(var(--suc))',
						'--toastBarBackground': 'oklch(var(--suc))'
					}
				});
				// データを再取得
				await refreshAll();
			} else {
				// 削除失敗
				const errorMessage = '削除に失敗しました';
				toast.push(errorMessage, {
					theme: {
						'--toastBackground': 'oklch(var(--er))',
						'--toastColor': 'oklch(var(--erc))',
						'--toastBarBackground': 'oklch(var(--erc))'
					}
				});
			}
		} catch (error) {
			console.error('Delete error:', error);
			toast.push('削除中にエラーが発生しました', {
				theme: {
					'--toastBackground': 'oklch(var(--er))',
					'--toastColor': 'oklch(var(--erc))',
					'--toastBarBackground': 'oklch(var(--erc))'
				}
			});
		}
	};
</script>

<div class="mx-auto prose h-full w-xl bg-base-300 py-16">
	<h1>作業記録</h1>

	<div class="card mb-8 border border-neutral-300 bg-base-100">
		<div class="card-body">
			<WorkLogStatus active={currentActive} serverNow={currentServerNow} />
			<form
				bind:this={formElement}
				method="POST"
				class="card-actions flex-col gap-4"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ result, update }) => {
						isSubmitting = false;
						await update();
					};
				}}
			>
				<!-- 作業内容入力フィールド -->
				<div class="form-control flex w-full flex-col">
					<label for="description" class="label">
						<span class="label-text">作業内容（Markdown対応）</span>
					</label>
					<textarea
						id="description"
						name="description"
						bind:value={description}
						placeholder="作業内容を入力..."
						class="textarea-bordered textarea w-full font-mono text-sm"
						rows="3"
						disabled={isSubmitting}
					></textarea>
				</div>

				<WorkLogToggleButton
					bind:buttonElement={toggleButtonElement}
					isActive={!!currentActive}
					{isSubmitting}
				/>
			</form>
		</div>
	</div>

	<!-- 作業一覧セクション -->
	<div class="card mb-8 border border-neutral-300 bg-base-100">
		<div class="card-body">
			<h2 class="card-title">作業履歴</h2>

			{#await listDataPromise}
				<!-- ローディング中 -->
				<WorkLogListSkeleton rows={5} />
			{:then listData}
				<div class="grid grid-cols-[1fr_auto] items-end">
					<MonthlyTotal totalSec={listData.monthlyTotalSec} />
					<Pagination currentPage={listData.page} hasNext={listData.hasNext} size={listData.size} />
				</div>
				<!-- データ表示 -->
				<WorkLogList
					items={listData.items}
					serverNow={currentServerNow}
					onedit={(item) => openEditModal(item)}
					ondelete={(item) => handleDeleteClick(item)}
				/>

				<!-- フッター: 月次合計とページネーション -->
			{:catch error}
				<!-- エラー表示 -->
				<div class="alert alert-error">
					<span>データの読み込みに失敗しました</span>
				</div>
			{/await}
		</div>
	</div>

	<!-- キーボードショートカットヘルプ -->
	<KeyboardShortcutHelp />

	<!-- 編集モーダル -->
	{#if editTarget}
		<WorkLogEditModal
			workLog={editTarget}
			bind:open={editOpen}
			onclose={handleEditClose}
			onupdated={handleEditUpdate}
		/>
	{/if}
</div>

<style>
	:global(.keyboard-triggered) {
		animation: keyboard-pulse 300ms ease-in-out;
	}

	@keyframes keyboard-pulse {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.05);
			box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
		}
	}
</style>
