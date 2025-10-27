<script lang="ts">
	import { formatDate, formatTime, formatDuration } from '$lib/utils/timeFormat';
	import { renderMarkdown } from '$lib/utils/markdown';

	type Props = {
		item: {
			id: string;
			startedAt: string;
			endedAt: string | null;
			description: string;
		};
		duration: number | null;
		onClose: () => void;
	};

	let { item, duration, onClose }: Props = $props();

	// Markdownレンダリング
	let renderedHtml = $derived(renderMarkdown(item.description));

	// Escapeキーでダイアログを閉じる
	const handleKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			onClose();
		}
	};

	// 背景クリックでダイアログを閉じる
	const handleBackdropClick = (e: MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- モーダル背景 -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
	onclick={handleBackdropClick}
	role="presentation"
>
	<!-- ダイアログ -->
	<div
		class="modal-box max-h-[80vh] w-11/12 max-w-3xl overflow-y-auto"
		role="dialog"
		aria-labelledby="dialog-title"
		aria-modal="true"
	>
		<!-- ヘッダー -->
		<div class="mb-4 flex items-start justify-between">
			<h3 id="dialog-title" class="text-lg font-bold">作業詳細</h3>
			<button class="btn btn-circle btn-ghost btn-sm" onclick={onClose} aria-label="閉じる">
				✕
			</button>
		</div>

		<!-- 作業情報 -->
		<div class="mb-6 space-y-2 text-sm">
			<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
				<span class="font-semibold text-base-content/60">日付:</span>
				<span>{formatDate(item.startedAt)}</span>

				<span class="font-semibold text-base-content/60">開始:</span>
				<span>{formatTime(item.startedAt)}</span>

				<span class="font-semibold text-base-content/60">終了:</span>
				<span>{item.endedAt ? formatTime(item.endedAt) : '進行中'}</span>

				<span class="font-semibold text-base-content/60">作業時間:</span>
				<span>{duration !== null ? formatDuration(duration) : '計測中'}</span>
			</div>
		</div>

		<!-- 作業内容 -->
		<div class="mb-4">
			<h4 class="mb-2 text-sm font-semibold text-base-content/60">作業内容:</h4>
			{#if item.description}
				<div class="prose prose-sm max-w-none">
					{@html renderedHtml}
				</div>
			{:else}
				<p class="text-base-content/40">（作業内容なし）</p>
			{/if}
		</div>

		<!-- アクション -->
		<div class="modal-action">
			<button class="btn" onclick={onClose}>閉じる</button>
		</div>
	</div>
</div>

<style>
	/* Markdownコンテンツのスタイル調整 */
	:global(.prose) {
		color: inherit;
	}
	:global(.prose p) {
		margin-top: 0.5em;
		margin-bottom: 0.5em;
	}
	:global(.prose h1),
	:global(.prose h2),
	:global(.prose h3),
	:global(.prose h4),
	:global(.prose h5),
	:global(.prose h6) {
		margin-top: 1em;
		margin-bottom: 0.5em;
		font-weight: 600;
	}
	:global(.prose code) {
		background-color: hsl(var(--b3));
		padding: 0.125rem 0.25rem;
		border-radius: 0.25rem;
		font-size: 0.875em;
	}
	:global(.prose pre) {
		background-color: hsl(var(--b3));
		padding: 1rem;
		border-radius: 0.5rem;
		overflow-x: auto;
	}
	:global(.prose pre code) {
		background-color: transparent;
		padding: 0;
	}
	:global(.prose a) {
		color: hsl(var(--p));
		text-decoration: underline;
	}
	:global(.prose ul),
	:global(.prose ol) {
		margin-top: 0.5em;
		margin-bottom: 0.5em;
		padding-left: 1.5em;
	}
	:global(.prose li) {
		margin-top: 0.25em;
		margin-bottom: 0.25em;
	}
	:global(.prose blockquote) {
		border-left: 4px solid hsl(var(--b3));
		padding-left: 1rem;
		margin-left: 0;
		font-style: italic;
		color: hsl(var(--bc) / 0.6);
	}
	:global(.prose table) {
		width: 100%;
		border-collapse: collapse;
		margin-top: 1em;
		margin-bottom: 1em;
	}
	:global(.prose th),
	:global(.prose td) {
		border: 1px solid hsl(var(--b3));
		padding: 0.5rem;
		text-align: left;
	}
	:global(.prose th) {
		background-color: hsl(var(--b3));
		font-weight: 600;
	}
</style>
