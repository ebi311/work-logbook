<script lang="ts">
	import classNames from 'classnames';

	/**
	 * F-001.2: 進行中作業のアクションボタン群
	 *
	 * 「作業開始/終了」「切り替え」「作業中変更」ボタンを提供します。
	 */

	type Props = {
		/** 進行中かどうか */
		isActive: boolean;
		/** 送信中かどうか */
		isSubmitting: boolean;
		/** 開始/終了ボタンの要素（キーボードショートカット用） */
		toggleButtonElement?: HTMLButtonElement | null;
	};

	let { isActive, isSubmitting, toggleButtonElement = $bindable() }: Props = $props();

	// 開始/終了ボタンのテキスト
	const toggleButtonText = $derived(isActive ? '作業終了' : '作業開始');

	// 開始/終了ボタンのフォームアクション
	const toggleFormAction = $derived(isActive ? '?/stop' : '?/start');

	// 開始/終了ボタンのクラス
	const toggleButtonClass = $derived(() => {
		return classNames('btn', 'btn-lg', {
			'btn-primary': !isActive,
			'btn-secondary': isActive,
		});
	});

	// 切り替えボタンのクラス
	const switchButtonClass = $derived(() => {
		return classNames('btn', 'btn-lg', 'btn-accent');
	});

	// 作業中変更ボタンのクラス
	const adjustButtonClass = $derived(() => {
		return classNames('btn', 'btn-lg', 'btn-outline', 'btn-info');
	});
</script>

<div class="flex w-full flex-wrap gap-2">
	<!-- 作業開始/終了ボタン -->
	<button
		bind:this={toggleButtonElement}
		type="submit"
		formaction={toggleFormAction}
		disabled={isSubmitting}
		aria-busy={isSubmitting}
		class={toggleButtonClass()}
		class:active={isActive}
		class:submitting={isSubmitting}
	>
		{toggleButtonText}
	</button>

	{#if isActive}
		<!-- 切り替えボタン -->
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

		<!-- 作業中変更ボタン -->
		<button
			type="submit"
			formaction="?/adjustActive"
			disabled={isSubmitting}
			aria-busy={isSubmitting}
			class={adjustButtonClass()}
			class:submitting={isSubmitting}
			title="開始時刻、作業内容、タグを変更します"
		>
			作業中変更
		</button>
	{/if}
</div>
