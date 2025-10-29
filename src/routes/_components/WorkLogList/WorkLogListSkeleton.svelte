<script lang="ts">
	type Props = {
		rows?: number; // デフォルト: 5
	};

	let { rows = 5 }: Props = $props();
</script>

<div class="overflow-x-auto" role="region" aria-label="読み込み中">
	<!-- ヘッダー -->
	<div class="worklog-header-grid border-b-2 border-base-content/20 font-semibold">
		<div>日付</div>
		<div class="text-right">開始</div>
		<div class="text-right">終了</div>
		<div class="text-right">作業時間</div>
		<div></div>
	</div>

	<!-- スケルトン行 -->
	<div class="space-y-2 py-2">
		{#each Array(rows) as _, i (i)}
			<div class="rounded border-b border-base-content/10 p-3">
				<div class="worklog-header-grid">
					<div class="row-span-2">
						<div class="h-4 w-full skeleton"></div>
					</div>
					<div class="text-right">
						<div class="h-4 w-full skeleton"></div>
					</div>
					<div class="text-right">
						<div class="h-4 w-full skeleton"></div>
					</div>
					<div class="text-right">
						<div class="h-4 w-full skeleton"></div>
					</div>
					<div class="row-span-2"></div>
					<!-- 2行目: 作業内容 -->
					<div class="col-span-3 mt-2">
						<div class="h-4 w-3/4 skeleton"></div>
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>
