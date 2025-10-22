<script lang="ts">
	type Props = {
		message: string;
		type: 'success' | 'error';
	};

	let { message, type }: Props = $props();

	const iconName = type === 'error' ? 'error' : 'check_circle';
</script>

<div class="mb-4 alert alert-{type}" role="alert">
	<span class="material-symbols-rounded text-2xl">{iconName}</span>
	<span>{message}</span>
</div>
