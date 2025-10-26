<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { SvelteToast, type SvelteToastOptions } from '@zerodevx/svelte-toast';

	const toastOptions: SvelteToastOptions = {
		duration: 3000
	};

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}

<SvelteToast options={toastOptions} />
