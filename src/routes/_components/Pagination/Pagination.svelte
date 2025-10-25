<script lang="ts">
	type Props = {
		currentPage: number;
		hasNext: boolean;
		size: number;
	};

	const { currentPage, hasNext, size }: Props = $props();

	const prevPage = $derived(currentPage - 1);
	const nextPage = $derived(currentPage + 1);
	const isPrevDisabled = $derived(currentPage === 1);
	const isNextDisabled = $derived(!hasNext);

	const prevHref = $derived(`?page=${prevPage}&size=${size}`);
	const nextHref = $derived(`?page=${nextPage}&size=${size}`);
</script>

<div class="join" role="navigation" aria-label="ページネーション">
	{#if isPrevDisabled}
		<button class="btn join-item btn-sm" disabled aria-label="前のページ">
			<span aria-hidden="true">«</span>
		</button>
	{:else}
		<a href={prevHref} class="btn join-item btn-sm" aria-label="前のページ">
			<span aria-hidden="true">«</span>
		</a>
	{/if}

	<span class="no-animation btn join-item cursor-default btn-sm">
		ページ {currentPage}
	</span>

	{#if isNextDisabled}
		<button class="btn join-item btn-sm" disabled aria-label="次のページ">
			<span aria-hidden="true">»</span>
		</button>
	{:else}
		<a href={nextHref} class="btn join-item btn-sm" aria-label="次のページ">
			<span aria-hidden="true">»</span>
		</a>
	{/if}
</div>
