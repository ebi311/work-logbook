<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { SvelteToast, type SvelteToastOptions } from '@zerodevx/svelte-toast';
	import NetworkStatus from '$lib/components/NetworkStatus/NetworkStatus.svelte';
	import SyncStatus from '$lib/components/SyncStatus/SyncStatus.svelte';
	import { setupAutoSync } from '$lib/client/sync/trigger';
	import { onMount } from 'svelte';

	const toastOptions: SvelteToastOptions = {
		duration: 3000,
	};

	let { children } = $props();

	// オンライン復帰時の自動同期を設定
	onMount(() => {
		const cleanup = setupAutoSync();
		return cleanup;
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- オフライン状態の警告 -->
<div class="fixed top-0 right-0 left-0 z-50">
	<NetworkStatus />
</div>

<!-- 同期状態の表示 -->
<div class="fixed right-4 bottom-4 z-50">
	<SyncStatus />
</div>

{@render children?.()}

<SvelteToast options={toastOptions} />
