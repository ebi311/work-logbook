<script lang="ts">
	import { formatDate, formatTime, formatDuration, calculateDuration } from '$lib/utils/timeFormat';
	import classNames from 'classnames';
	import { fade } from 'svelte/transition';

	type Props = {
		items: Array<{
			id: string;
			startedAt: string; // ISO
			endedAt: string | null; // ISO
		}>;
		serverNow: string; // ISO（進行中の作業時間計算用）
	};

	let { items, serverNow }: Props = $props();

	// 行のクラス
	let rowClass = $derived((item: { endedAt: string | null }) =>
		classNames('transition-colors', 'duration-300', {
			'bg-accent text-accent-content': item.endedAt === null
		})
	);
</script>

<div class="overflow-x-auto">
	<table class="table-compact table w-full table-zebra" aria-label="作業履歴一覧">
		<thead>
			<tr>
				<th scope="col">日付</th>
				<th scope="col">開始</th>
				<th scope="col">終了</th>
				<th scope="col">作業時間</th>
			</tr>
		</thead>
		<tbody>
			{#if items.length === 0}
				<tr>
					<td colspan="4" class="text-center text-base-content/60">データがありません</td>
				</tr>
			{:else}
				{#each items as item (item.id)}
					{@const isActive = item.endedAt === null}
					{@const duration = calculateDuration(item.startedAt, item.endedAt, serverNow)}
					<tr data-active={isActive} class={rowClass(item)} transition:fade>
						<td>{formatDate(item.startedAt)}</td>
						<td>{formatTime(item.startedAt)}</td>
						<td>{item.endedAt ? formatTime(item.endedAt) : '—'}</td>
						<td>{duration !== null ? formatDuration(duration) : '—'}</td>
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>
