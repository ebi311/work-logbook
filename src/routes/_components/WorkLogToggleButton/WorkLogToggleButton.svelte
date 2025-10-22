<script lang="ts">
	import classNames from 'classnames';

	type Props = {
		isActive: boolean;
		isSubmitting: boolean;
	};

	let { isActive, isSubmitting }: Props = $props();

	// ボタンのテキスト
	const buttonText = $derived(isActive ? '作業終了' : '作業開始');

	// フォームアクション
	const formAction = $derived(isActive ? '?/stop' : '?/start');

	// ボタンのクラス（Tailwind CSSを使用）
	const buttonClass = $derived(() => {
		let classes = classNames('btn', 'btn-lg', {
			'btn-primary': !isActive,
			'btn-secondary': isActive
		});
		return classes;
	});
</script>

<button
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
