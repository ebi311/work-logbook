<script lang="ts">
	type Props = {
		isActive: boolean;
		isSubmitting: boolean;
	};

	let { isActive, isSubmitting }: Props = $props();

	// ボタンのテキスト
	const buttonText = $derived(isActive ? '作業終了' : '作業開始');

	// フォームアクション
	const formAction = $derived(isActive ? '?/stop' : '?/start');
</script>

<button
	type="submit"
	formaction={formAction}
	disabled={isSubmitting}
	aria-busy={isSubmitting}
	class="work-log-toggle-button"
	class:active={isActive}
	class:submitting={isSubmitting}
>
	{buttonText}
</button>

<style>
	.work-log-toggle-button {
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
		font-weight: 600;
		border: 2px solid #333;
		border-radius: 0.5rem;
		background-color: #fff;
		color: #333;
		cursor: pointer;
		transition: all 0.2s ease-in-out;
	}

	.work-log-toggle-button:hover:not(:disabled) {
		background-color: #333;
		color: #fff;
	}

	.work-log-toggle-button.active {
		background-color: #dc2626;
		border-color: #dc2626;
		color: #fff;
	}

	.work-log-toggle-button.active:hover:not(:disabled) {
		background-color: #b91c1c;
		border-color: #b91c1c;
	}

	.work-log-toggle-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.work-log-toggle-button:focus-visible {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}
</style>
