<script lang="ts">
	import { formatDate, formatTime, formatDuration } from '$lib/utils/timeFormat';
	import { renderMarkdown } from '$lib/utils/markdown';
	import { onMount } from 'svelte';
	import TagBadge from '../TagBadge/TagBadge.svelte';

	type Props = {
		item: {
			id: string;
			startedAt: string;
			endedAt: string | null;
			description: string;
			tags: string[];
		};
		duration: number | null;
		onClose: () => void;
	};

	let { item, duration, onClose }: Props = $props();

	// Markdownレンダリング
	let renderedHtml = $derived(renderMarkdown(item.description));

	// dialogの参照
	let dialog: HTMLDialogElement | undefined = $state();

	// マウント時にダイアログを開く
	onMount(() => {
		dialog?.showModal();
	});

	// ダイアログを閉じる
	const handleClose = () => {
		dialog?.close();
		onClose();
	};

	// dialogのcloseイベント（Escapeキーとbackdropクリック時）
	const handleDialogClose = () => {
		onClose();
	};
</script>

<!-- DaisyUI Modal with dialog tag -->
<dialog bind:this={dialog} class="modal" onclose={handleDialogClose}>
	<div class="modal-box flex max-h-[80vh] w-11/12 max-w-3xl flex-col">
		<!-- ヘッダー -->
		<div class="mb-4 flex flex-shrink-0 items-start justify-between">
			<h3 id="dialog-title" class="text-lg font-bold">作業詳細</h3>
			<button class="btn btn-circle btn-ghost btn-sm" onclick={handleClose} aria-label="閉じる">
				✕
			</button>
		</div>

		<!-- 作業情報 -->
		<div class="mb-6 flex-shrink-0 space-y-2 text-sm">
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

		<!-- 作業内容 (スクロール可能) -->
		<h4 class="mb-2 text-sm font-semibold text-base-content/60">作業内容:</h4>
		<div class="mb-4 min-h-0 flex-1 overflow-y-auto">
			{#if item.description}
				<div class="prose prose-sm max-w-none">
					{@html renderedHtml}
				</div>
			{:else}
				<p class="text-base-content/40">（作業内容なし）</p>
			{/if}
		</div>

		<!-- タグ -->
		{#if item.tags && item.tags.length > 0}
			<div class="mb-4 flex-shrink-0">
				<h4 class="mb-2 text-sm font-semibold text-base-content/60">タグ:</h4>
				<div class="flex flex-wrap gap-2">
					{#each item.tags as tag}
						<TagBadge {tag} />
					{/each}
				</div>
			</div>
		{/if}

		<!-- アクション -->
		<div class="modal-action flex-shrink-0">
			<button class="btn" onclick={handleClose}>閉じる</button>
		</div>
	</div>
	<!-- 背景クリックでダイアログを閉じる -->
	<form method="dialog" class="modal-backdrop">
		<button type="submit">close</button>
	</form>
</dialog>
