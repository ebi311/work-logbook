<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import WorkLogStatus from './_components/WorkLogStatus/WorkLogStatus.svelte';
	import WorkLogToggleButton from './_components/WorkLogToggleButton/WorkLogToggleButton.svelte';
	import MessageAlert from './_components/MessageAlert/MessageAlert.svelte';
	import KeyboardShortcutHelp from './_components/KeyboardShortcutHelp/KeyboardShortcutHelp.svelte';
	import WorkLogList from './_components/WorkLogList/WorkLogList.svelte';
	import WorkLogListSkeleton from './_components/WorkLogList/WorkLogListSkeleton.svelte';
	import MonthlyTotal from './_components/MonthlyTotal/MonthlyTotal.svelte';
	import Pagination from './_components/Pagination/Pagination.svelte';
	import { enhance } from '$app/forms';
	import { toast } from '@zerodevx/svelte-toast';

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

			if (form.workLog.endedAt === null) {
				handleStartSuccess(form);
			} else {
				handleStopSuccess(form);
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
</script>

<div class="mx-auto prose h-full w-xl bg-base-300 py-16">
	<h1>作業記録</h1>

	<div class="card mb-8 border border-neutral-300 bg-base-100">
		<div class="card-body">
			<WorkLogStatus active={currentActive} serverNow={currentServerNow} />
			<form
				bind:this={formElement}
				method="POST"
				class="card-actions"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ result, update }) => {
						isSubmitting = false;
						await update();
					};
				}}
			>
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

			{#await data.listData}
				<!-- ローディング中 -->
				<WorkLogListSkeleton rows={5} />
			{:then listData}
				<!-- データ表示 -->
				<WorkLogList items={listData.items} serverNow={currentServerNow} />

				<!-- フッター: 月次合計とページネーション -->
				<div class="mt-4 card-actions items-center justify-between">
					<MonthlyTotal totalSec={listData.monthlyTotalSec} />
					<Pagination currentPage={listData.page} hasNext={listData.hasNext} size={listData.size} />
				</div>
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
