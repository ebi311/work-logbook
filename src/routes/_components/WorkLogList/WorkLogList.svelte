<script lang="ts">
	import { formatDate, formatTime, formatDuration, calculateDuration } from '$lib/utils/timeFormat';
	import classNames from 'classnames';
	import { fade } from 'svelte/transition';

	type Props = {
		items: Array<{
			id: string;
			startedAt: string; // ISO
			endedAt: string | null; // ISO
			description: string; // 作業内容
		}>;
		serverNow: string; // ISO（進行中の作業時間計算用）
	};

	let { items, serverNow }: Props = $props();

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
			{
				'bg-accent text-accent-content': item.endedAt === null
			}
		)
	);
</script>

<div class="overflow-x-auto" role="region" aria-label="作業履歴一覧">
	{#if items.length === 0}
		<div class="py-8 text-center text-base-content/60">データがありません</div>
	{:else}
		<!-- ヘッダー -->
		<div
			class="grid grid-cols-[6em_1fr_1fr_1fr] gap-2 border-b-2 border-base-content/10 px-3 py-2 text-sm font-semibold"
		>
			<div>日付</div>
			<div class="text-right">開始</div>
			<div class="text-right">終了</div>
			<div class="text-right">作業時間</div>
		</div>

		<!-- データ行 -->
		<div class="space-y-2 py-2">
			{#each items as item (item.id)}
				{@const isActive = item.endedAt === null}
				{@const duration = calculateDuration(item.startedAt, item.endedAt, serverNow)}
				<div data-active={isActive} class={itemClass(item)} transition:fade>
					<!-- 1行目: 日付・時刻・作業時間 -->
					<div class="grid grid-cols-[6em_1fr_1fr_1fr] gap-2 text-sm">
						<div class="row-span-2">{formatDate(item.startedAt)}</div>
						<div class="text-right">{formatTime(item.startedAt)}</div>
						<div class="text-right">{item.endedAt ? formatTime(item.endedAt) : '—'}</div>
						<div class="text-right">{duration !== null ? formatDuration(duration) : '—'}</div>
						<!-- 2行目: 作業内容 -->
						<div class="col-span-3 mt-2 text-sm text-base-content/80">
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

<style>
	.grid-item {
		display: grid;
		grid-template-rows: auto auto;
	}
</style>
