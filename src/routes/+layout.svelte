<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { SvelteToast, type SvelteToastOptions } from '@zerodevx/svelte-toast';
	import NetworkStatus from '$lib/components/NetworkStatus/NetworkStatus.svelte';
	import SyncStatus from '$lib/components/SyncStatus/SyncStatus.svelte';
	import { setupAutoSync } from '$lib/client/sync/trigger';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';

	const toastOptions: SvelteToastOptions = {
		duration: 3000,
	};

	let { children } = $props();

	// タイムゾーンをサーバーに送信
	const sendTimezone = async () => {
		try {
			const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
			await fetch('/api/timezone', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ timezone }),
			});
		} catch (error) {
			console.error('Failed to send timezone:', error);
		}
	};

	// ウィンドウがフォーカスされたときにデータを更新
	const handleWindowFocus = async () => {
		await invalidateAll();
		console.log('[Focus] ウィンドウがフォーカスされました - データを更新');
	};

	// タブがアクティブになったときにデータを更新
	const handleVisibilityChange = async () => {
		if (document.visibilityState === 'visible') {
			await invalidateAll();
			console.log('[Visibility] タブがアクティブになりました - データを更新');
		}
	};

	// オンライン復帰時の自動同期を設定
	onMount(() => {
		// タイムゾーンを送信
		sendTimezone();

		const cleanup = setupAutoSync();
		return cleanup;
	});
</script>

<svelte:window onfocus={handleWindowFocus} />
<svelte:document onvisibilitychange={handleVisibilityChange} />

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
