<script lang="ts">
	import { formatDate, formatTime, formatDuration, calculateDuration } from '$lib/utils/timeFormat';
	import classNames from 'classnames';
	import { fade } from 'svelte/transition';
	import WorkLogDetailDialog from '../WorkLogDetailDialog/WorkLogDetailDialog.svelte';

	type Props = {
		items: Array<{
			id: string;
			startedAt: string; // ISO
			endedAt: string | null; // ISO
			description: string; // 作業内容
		}>;
		serverNow: string; // ISO（進行中の作業時間計算用）
		onedit?: (item: Props['items'][number]) => void;
		ondelete?: (item: Props['items'][number]) => void;
	};

	let { items, serverNow, onedit, ondelete }: Props = $props();

	// 選択されたアイテム
	let selectedItem: (typeof items)[0] | null = $state(null);
	let selectedDuration: number | null = $state(null);

	// アイテムクリック
	const handleItemClick = (item: (typeof items)[0]) => {
		selectedItem = item;
		selectedDuration = calculateDuration(item.startedAt, item.endedAt, serverNow);
	};

	// 編集ボタン
	const handleEditClick = (item: (typeof items)[0]) => {
		onedit?.(item);
	};

	// 削除ボタン
	const handleDeleteClick = (item: (typeof items)[0]) => {
		ondelete?.(item);
	};

	// ダイアログを閉じる
	const closeDialog = () => {
		selectedItem = null;
		selectedDuration = null;
	};

	// アイテムのクラス
	let itemClass = $derived((item: { endedAt: string | null }) =>
		classNames(
			'grid-item',
			'transition-colors',
			'duration-300',
			'rounded',
			'p-3',
			'border-b',
			'border-base-content/10',
			'cursor-pointer',
			'hover:bg-accent/10',
			{
				'bg-accent text-accent-content hover:bg-accent/90': item.endedAt === null
			}
		)
	);
</script>

<div class="overflow-x-auto" role="region" aria-label="作業履歴一覧">
	{#if items.length === 0}
		<div class="py-8 text-center text-base-content/60">データがありません</div>
	{:else}
		<!-- ヘッダー -->
		<div class="worklog-header-grid border-b-2 border-base-content/20 font-semibold">
			<div>日付</div>
			<div class="text-right">開始</div>
			<div class="text-right">終了</div>
			<div class="text-right">作業時間</div>
			<div></div>
		</div>

		<!-- データ行 -->
		<div class="space-y-2 py-2">
			{#each items as item (item.id)}
				{@const isActive = item.endedAt === null}
				{@const duration = calculateDuration(item.startedAt, item.endedAt, serverNow)}
				<div
					data-active={isActive}
					class={itemClass(item)}
					transition:fade
					onclick={() => handleItemClick(item)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							handleItemClick(item);
						}
					}}
					role="button"
					tabindex="0"
					aria-label={`${formatDate(item.startedAt)}の作業詳細を表示`}
				>
					<!-- 1行目: 日付・時刻・作業時間 -->
					<div class="worklog-header-grid">
						<div class="row-span-2">{formatDate(item.startedAt)}</div>
						<div class="text-right">{formatTime(item.startedAt)}</div>
						<div class="text-right">{item.endedAt ? formatTime(item.endedAt) : '—'}</div>
						<div class="text-right">{duration !== null ? formatDuration(duration) : '—'}</div>
						<div class="row-span-2 flex flex-col items-center justify-center gap-1">
							{#if !isActive}
								<!-- 完了済みのみ 編集ボタン -->
								<button
									type="button"
									class="btn btn-ghost btn-xs"
									onclick={(e) => {
										e.stopPropagation();
										handleEditClick(item);
									}}
									aria-label="編集"
								>
									✏️
								</button>
								<!-- 完了済みのみ 削除ボタン -->
								<button
									type="button"
									class="btn btn-ghost btn-xs btn-error"
									onclick={(e) => {
										e.stopPropagation();
										handleDeleteClick(item);
									}}
									aria-label="削除"
								>
									🗑️
								</button>
							{/if}
						</div>
						<!-- 2行目: 作業内容 -->
						<div class="col-span-3 mt-2 flex items-start justify-between gap-2 text-sm">
							{#if item.description}
								<div class="line-clamp-2">{item.description}</div>
							{:else}
								<span class="text-base-content/40">—</span>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- ダイアログ -->
{#if selectedItem}
	<WorkLogDetailDialog item={selectedItem} duration={selectedDuration} onClose={closeDialog} />
{/if}

<style>
	.grid-item {
		display: grid;
		grid-template-rows: auto auto;
	}
</style>
