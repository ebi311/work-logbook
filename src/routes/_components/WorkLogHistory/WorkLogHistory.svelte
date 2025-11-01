<script lang="ts">
	import TagInput from '../TagInput/TagInput.svelte';
	import WorkLogListSkeleton from '../WorkLogList/WorkLogListSkeleton.svelte';
	import MonthlyTotal from '../MonthlyTotal/MonthlyTotal.svelte';
	import Pagination from '../Pagination/Pagination.svelte';
	import WorkLogList from '../WorkLogList/WorkLogList.svelte';

	type ListItem = {
		id: string;
		startedAt: string;
		endedAt: string | null;
		description: string;
		tags: string[];
	};

	type ListData = {
		items: ListItem[];
		page: number;
		size: number;
		hasNext: boolean;
		monthlyTotalSec: number;
	};

	type Props = {
		/** 一覧データのPromise */
		listDataPromise: Promise<ListData>;
		/** フィルタ用タグ */
		filterTags: string[];
		/** 現在選択中の月 (YYYY-MM形式) */
		currentMonth?: string;
		/** 現在選択中の日付 (YYYY-MM-DD形式) */
		currentDate?: string;
		/** タグサジェスト */
		tagSuggestions: { tag: string; count: number }[];
		/** サーバー時刻 */
		serverNow: string;
		/** フィルタタグ変更ハンドラー */
		onFilterTagsChange: (tags: string[]) => void;
		/** 日付フィルタ変更ハンドラー */
		onDateFilterChange: (filter: { month?: string; date?: string }) => void;
		/** タグクリックハンドラー */
		onTagClick: (tag: string) => void;
		/** 編集ハンドラー */
		onEdit: (item: ListItem) => void;
		/** 削除ハンドラー */
		onDelete: (item: ListItem) => void;
	};

	let {
		listDataPromise,
		filterTags,
		currentMonth,
		currentDate,
		tagSuggestions,
		serverNow,
		onFilterTagsChange,
		onDateFilterChange,
		onTagClick,
		onEdit,
		onDelete,
	}: Props = $props();

	// 過去12ヶ月分の選択肢を生成
	const generateMonthOptions = (): string[] => {
		const months: string[] = [];
		const now = new Date();

		for (let i = 0; i < 12; i++) {
			const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
			const month = date.toISOString().slice(0, 7); // YYYY-MM
			months.push(month);
		}

		return months;
	};

	const monthOptions = $state(generateMonthOptions());

	// 今日の日付（YYYY-MM-DD）
	const todayString = new Date().toISOString().slice(0, 10);

	// 今月（YYYY-MM）
	const currentMonthString = new Date().toISOString().slice(0, 7);

	// 月選択ハンドラー
	const handleMonthChange = (e: Event) => {
		const target = e.target as HTMLSelectElement;
		const value = target.value;

		if (value === '') {
			// 「すべての月」を選択 → フィルタ解除
			onDateFilterChange({});
		} else {
			onDateFilterChange({ month: value });
		}
	};
</script>

<div class="card mb-8 border border-neutral-300 bg-base-100">
	<div class="card-body">
		<h2 class="card-title">作業履歴</h2>

		<!-- F-006: フィルタバー -->
		<div class="mb-4 rounded-lg bg-base-200 p-4">
			<h3 class="mb-3 text-sm font-semibold">絞り込み</h3>

			<!-- 日付フィルタ -->
			<div class="mb-3 flex gap-2">
				<select
					class="select-bordered select select-sm"
					value={currentMonth ?? ''}
					onchange={handleMonthChange}
					aria-label="月を選択"
				>
					<option value="">すべての月</option>
					{#each monthOptions as month}
						<option value={month}>{month}</option>
					{/each}
				</select>

				<button
					class="btn btn-outline btn-sm"
					onclick={() => onDateFilterChange({ date: todayString })}
				>
					今日
				</button>

				<button
					class="btn btn-outline btn-sm"
					onclick={() => onDateFilterChange({ month: currentMonthString })}
				>
					今月
				</button>
			</div>

			<!-- タグフィルタ -->
			<TagInput
				tags={filterTags}
				suggestions={tagSuggestions}
				placeholder="タグで絞り込み..."
				on:change={(e) => onFilterTagsChange(e.detail)}
			/>
		</div>

		{#await listDataPromise}
			<!-- ローディング中 -->
			<WorkLogListSkeleton rows={5} />
		{:then listData}
			<div class="grid grid-cols-[1fr_auto] items-end">
				<MonthlyTotal totalSec={listData.monthlyTotalSec} />
				<Pagination currentPage={listData.page} hasNext={listData.hasNext} size={listData.size} />
			</div>
			<!-- データ表示 -->
			<WorkLogList
				items={listData.items}
				{serverNow}
				onedit={onEdit}
				ondelete={onDelete}
				ontagclick={onTagClick}
			/>
			<!-- フッター: 月次合計とページネーション -->
		{:catch error}
			<!-- エラー表示 -->
			<div class="alert alert-error">
				<span>データの読み込みに失敗しました</span>
			</div>
		{/await}
	</div>
</div>
