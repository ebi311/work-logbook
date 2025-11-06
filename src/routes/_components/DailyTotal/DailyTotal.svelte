<script lang="ts">
	import { formatDuration } from '$lib/utils/timeFormat';

	type Props = {
		totalSec: number;
		date?: string; // YYYY-MM-DD 形式。未指定の場合は「今日」
	};

	let { totalSec, date }: Props = $props();

	// 日付の表示テキストを生成
	const getDateLabel = (date?: string): string => {
		if (!date) {
			return '今日の合計';
		}

		const [year, month, day] = date.split('-');
		const monthNum = parseInt(month, 10);
		const dayNum = parseInt(day, 10);
		return `${year}年${monthNum}月${dayNum}日の合計`;
	};

	const dateLabel = $derived(getDateLabel(date));
	const formattedDuration = $derived(formatDuration(totalSec));
</script>

<div class="stat border-0" aria-label={`${dateLabel}: ${formattedDuration}`}>
	<div class="stat-title text-sm">{dateLabel}</div>
	<div class="stat-value text-2xl">{formattedDuration}</div>
</div>
