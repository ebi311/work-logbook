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
		/** タグサジェスト */
		tagSuggestions: { tag: string; count: number }[];
		/** サーバー時刻 */
		serverNow: string;
		/** フィルタタグ変更ハンドラー */
		onFilterTagsChange: (tags: string[]) => void;
		/** 編集ハンドラー */
		onEdit: (item: ListItem) => void;
		/** 削除ハンドラー */
		onDelete: (item: ListItem) => void;
	};

	let {
		listDataPromise,
		filterTags,
		tagSuggestions,
		serverNow,
		onFilterTagsChange,
		onEdit,
		onDelete,
	}: Props = $props();
</script>

<div class="card mb-8 border border-neutral-300 bg-base-100">
	<div class="card-body">
		<h2 class="card-title">作業履歴</h2>

		<!-- F-006: フィルタバー -->
		<div class="mb-4 rounded-lg bg-base-200 p-4">
			<h3 class="mb-3 text-sm font-semibold">絞り込み</h3>
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
			<WorkLogList items={listData.items} {serverNow} onedit={onEdit} ondelete={onDelete} />

			<!-- フッター: 月次合計とページネーション -->
		{:catch error}
			<!-- エラー表示 -->
			<div class="alert alert-error">
				<span>データの読み込みに失敗しました</span>
			</div>
		{/await}
	</div>
</div>
