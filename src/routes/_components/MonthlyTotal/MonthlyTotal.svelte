<script lang="ts">
	import { formatDuration } from '$lib/utils/timeFormat';

	type Props = {
		totalSec: number;
		month?: string; // YYYY-MM 形式。未指定の場合は「今月」
	};

	let { totalSec, month }: Props = $props();

	// 月の表示テキストを生成
	const getMonthLabel = (month?: string): string => {
		if (!month) {
			return '今月の合計';
		}

		const [year, monthStr] = month.split('-');
		const monthNum = parseInt(monthStr, 10);
		return `${year}年${monthNum}月の合計`;
	};

	const monthLabel = $derived(getMonthLabel(month));
	const formattedDuration = $derived(formatDuration(totalSec));
</script>

<div class="stat border-0" aria-label={`${monthLabel}: ${formattedDuration}`}>
	<div class="stat-title text-sm">{monthLabel}</div>
	<div class="stat-value text-2xl">{formattedDuration}</div>
</div>
