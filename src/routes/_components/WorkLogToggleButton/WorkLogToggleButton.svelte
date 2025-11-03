<script lang="ts">
	import classNames from 'classnames';

	type Props = {
		isActive: boolean;
		isSubmitting: boolean;
		buttonElement?: HTMLButtonElement | null;
	};

	let { isActive, isSubmitting, buttonElement = $bindable() }: Props = $props();

	// ボタンのテキスト
	const buttonText = $derived(isActive ? '作業終了' : '作業開始');

	// フォームアクション
	const formAction = $derived(isActive ? '?/stop' : '?/start');

	// ボタンのクラス（Tailwind CSSを使用）
	const buttonClass = $derived(() => {
		let classes = classNames('btn', 'btn-lg', {
			'btn-primary': !isActive,
			'btn-secondary': isActive,
		});
		return classes;
	});

	// 切り替えボタンのクラス
	const switchButtonClass = $derived(() => {
		return classNames('btn', 'btn-lg', 'btn-accent');
	});
</script>

<div class="flex w-full gap-2">
	<button
		bind:this={buttonElement}
		type="submit"
		formaction={formAction}
		disabled={isSubmitting}
		aria-busy={isSubmitting}
		class={buttonClass()}
		class:active={isActive}
		class:submitting={isSubmitting}
	>
		{buttonText}
	</button>

	{#if isActive}
		<button
			type="submit"
			formaction="?/switch"
			disabled={isSubmitting}
			aria-busy={isSubmitting}
			class={switchButtonClass()}
			class:submitting={isSubmitting}
			title="現在の作業を終了して、新しい作業を開始します"
		>
			切り替え
		</button>
	{/if}
</div>
