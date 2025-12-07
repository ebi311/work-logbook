<script lang="ts">
	import { formatDuration } from '$lib/utils/timeFormat';
	import { dayjsLocal } from '$lib/utils/timezone';
	import MonthlyTotal from '../MonthlyTotal/MonthlyTotal.svelte';

	type DailySummaryItem = {
		date: Date; // YYYY-MM-DD
		totalSec: number;
		count: number;
	};

	type DailySummaryData = {
		items: DailySummaryItem[];
		monthlyTotalSec: number;
		month: string; // YYYY-MM
	};

	type Props = {
		/** 日別集計データのPromise */
		dailySummaryData: Promise<DailySummaryData>;
		/** 日付クリック時のコールバック */
		onDateClick: (date: string) => void;
	};

	let { dailySummaryData, onDateClick }: Props = $props();

	// 日付のフォーマット: YYYY-MM-DD → M/D
	const formatDate = (date: Date): string => {
		const day = dayjsLocal(date);
		return day.format('M/D');
	};

	// 行クリックハンドラー
	const handleRowClick = (date: Date) => {
		const dateStr = dayjsLocal(date).format('YYYY-MM-DD');
		onDateClick(dateStr);
	};
</script>

<div class="space-y-4">
	{#await dailySummaryData}
		<!-- ローディング状態 -->
		<div class="flex items-center justify-center py-12">
			<span class="loading loading-lg loading-spinner"></span>
		</div>
	{:then data}
		<!-- 月次合計 -->
		<div class="stats w-full bg-base-100 shadow">
			<MonthlyTotal totalSec={data.monthlyTotalSec} month={data.month} />
		</div>

		{#if data.items.length === 0}
			<!-- 空状態 -->
			<div class="py-12 text-center text-base-content/60">
				<p>この期間に作業記録がありません</p>
			</div>
		{:else}
			<!-- 日別集計テーブル -->
			<div class="overflow-x-auto">
				<table class="table table-zebra">
					<thead>
						<tr>
							<th>日付</th>
							<th>曜日</th>
							<th class="text-right">合計時間</th>
							<th class="text-right">件数</th>
						</tr>
					</thead>
					<tbody>
						{#each data.items as item (item.date)}
							<tr
								class="cursor-pointer hover:bg-base-200"
								onclick={() => handleRowClick(item.date)}
								role="button"
								tabindex="0"
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										handleRowClick(item.date);
									}
								}}
							>
								<td>{formatDate(item.date)}</td>
								<td>
									<span
										class:text-error={dayjsLocal(item.date).day() === 0}
										class:text-info={dayjsLocal(item.date).day() === 6}
									>
										{dayjsLocal(item.date).format('dd')}
									</span>
								</td>
								<td class="text-right font-mono">{formatDuration(item.totalSec)}</td>
								<td class="text-right">{item.count}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{:catch error}
		<!-- エラー状態 -->
		<div class="alert alert-error">
			<span>データの取得に失敗しました: {error.message}</span>
		</div>
	{/await}
</div>
