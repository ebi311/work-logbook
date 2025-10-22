<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import WorkLogStatus from './_components/WorkLogStatus/WorkLogStatus.svelte';
	import WorkLogToggleButton from './_components/WorkLogToggleButton/WorkLogToggleButton.svelte';
	import { enhance } from '$app/forms';

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

	// エラーメッセージ
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	// メッセージ自動消去タイマー
	let messageTimeout: ReturnType<typeof setTimeout> | null = null;

	// メッセージを表示して自動的に消す
	const showMessage = (message: string, type: 'success' | 'error') => {
		if (messageTimeout) {
			clearTimeout(messageTimeout);
		}

		if (type === 'success') {
			successMessage = message;
			errorMessage = null;
		} else {
			errorMessage = message;
			successMessage = null;
		}

		messageTimeout = setTimeout(() => {
			errorMessage = null;
			successMessage = null;
		}, 5000);
	};

	// 作業開始成功時の処理
	const handleStartSuccess = (form: NonNullable<ActionData>) => {
		if (!('workLog' in form) || !form.workLog) return;
		if (form.workLog.endedAt !== null) return; // 型ガード
		currentActive = form.workLog;
		if ('serverNow' in form) {
			currentServerNow = form.serverNow;
		}
		showMessage('作業を開始しました', 'success');
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
		showMessage(`作業を終了しました（${duration}分）`, 'success');
	};

	// エラー処理ハンドラーマップ
	const errorHandlers: Record<string, (form: NonNullable<ActionData>) => void> = {
		ACTIVE_EXISTS: (form) => {
			// 409エラー: 既に進行中の作業がある
			if ('active' in form && 'serverNow' in form && form.active) {
				currentActive = form.active;
				currentServerNow = form.serverNow;
			}
			showMessage('既に作業が進行中です', 'error');
		},
		NO_ACTIVE: (form) => {
			// 404エラー: 進行中の作業がない
			currentActive = undefined;
			if ('serverNow' in form) {
				currentServerNow = form.serverNow;
			}
			showMessage('進行中の作業がありません', 'error');
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
</script>

<div class="mx-auto prose h-full w-xl bg-base-300 py-16">
	<h1>作業記録</h1>

	<!-- メッセージ表示エリア -->
	{#if errorMessage}
		<div class="mb-4 alert alert-error" role="alert">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-6 w-6 shrink-0 stroke-current"
				fill="none"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<span>{errorMessage}</span>
		</div>
	{/if}

	{#if successMessage}
		<div class="mb-4 alert alert-success" role="alert">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-6 w-6 shrink-0 stroke-current"
				fill="none"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<span>{successMessage}</span>
		</div>
	{/if}

	<div class="card bg-base-100">
		<div class="card-body">
			<WorkLogStatus active={currentActive} serverNow={currentServerNow} />
			<form
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
				<WorkLogToggleButton isActive={!!currentActive} {isSubmitting} />
			</form>
		</div>
	</div>
</div>
