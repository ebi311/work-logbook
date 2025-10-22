<script lang="ts">
	import type { PageData } from './$types';
	import WorkLogStatus from './_components/WorkLogStatus/WorkLogStatus.svelte';
	import WorkLogToggleButton from './_components/WorkLogToggleButton/WorkLogToggleButton.svelte';
	import { enhance } from '$app/forms';

	type Props = {
		data: PageData;
	};

	let { data }: Props = $props();

	// 現在のactive状態（dataまたはformから）
	let currentActive = $state(data.active);
	let currentServerNow = $state(data.serverNow);

	// フォーム送信中の状態
	let isSubmitting = $state(false);

	// dataが変更されたら状態を同期
	$effect(() => {
		currentActive = data.active;
		currentServerNow = data.serverNow;
	});
</script>

<div class="container">
	<h1>作業記録</h1>

	<div class="work-log-panel">
		<WorkLogStatus active={currentActive} serverNow={currentServerNow} />

		<form
			method="POST"
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

<style>
	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
	}

	h1 {
		font-size: 2rem;
		font-weight: 700;
		margin-bottom: 2rem;
		color: #1f2937;
	}

	.work-log-panel {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding: 2rem;
		background-color: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
	}

	@media (max-width: 640px) {
		.container {
			padding: 1rem;
		}

		h1 {
			font-size: 1.5rem;
			margin-bottom: 1rem;
		}

		.work-log-panel {
			padding: 1rem;
		}
	}
</style>
