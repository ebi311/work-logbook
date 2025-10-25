<script lang="ts">
	type Props = {
		rows?: number; // デフォルト: 5
	};

	let { rows = 5 }: Props = $props();
</script>

<div class="overflow-x-auto">
	<table class="table-compact table w-full table-zebra" aria-label="読み込み中">
		<thead>
			<tr>
				<th scope="col">日付</th>
				<th scope="col">開始</th>
				<th scope="col">終了</th>
				<th scope="col">作業時間</th>
			</tr>
		</thead>
		<tbody>
			{#each Array(rows) as _, i (i)}
				<tr>
					<td>
						<div class="skeleton h-4 w-24"></div>
					</td>
					<td>
						<div class="skeleton h-4 w-16"></div>
					</td>
					<td>
						<div class="skeleton h-4 w-16"></div>
					</td>
					<td>
						<div class="skeleton h-4 w-16"></div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
