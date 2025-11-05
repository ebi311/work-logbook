<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { getSyncQueue } from '$lib/client/db/syncQueue';

	let pendingCount = $state(0);
	let intervalId: ReturnType<typeof setInterval> | undefined = $state(undefined);

	const updateStatus = async () => {
		try {
			const queue = await getSyncQueue();
			pendingCount = queue.length;
		} catch (error) {
			console.error('Failed to get sync queue:', error);
		}
	};

	onMount(() => {
		updateStatus();
		intervalId = setInterval(updateStatus, 5000);
	});

	onDestroy(() => {
		if (intervalId) {
			clearInterval(intervalId);
		}
	});
</script>

{#if pendingCount > 0}
	<div class="badge gap-2 badge-info" data-testid="sync-status-badge">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="h-4 w-4 animate-spin"
			fill="none"
			viewBox="0 0 24 24"
		>
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
			></circle>
			<path
				class="opacity-75"
				fill="currentColor"
				d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
			></path>
		</svg>
		<span>{pendingCount}件の変更を同期待ち</span>
	</div>
{/if}
