<script lang="ts">
	type Props = {
		label: string;
		id: string;
		name: string;
		value: string;
		disabled?: boolean;
		maxLength?: number;
	};

	let {
		label,
		id,
		name,
		value = $bindable(),
		disabled = false,
		maxLength = 10000,
	}: Props = $props();

	const countId = `${id}-count`;
</script>

<fieldset class="fieldset w-full rounded-box border border-base-300 p-4">
	<label class="label" for={id}>{label}</label>
	<textarea
		{id}
		{name}
		class="textarea-bordered textarea min-h-24 w-full"
		bind:value
		{disabled}
		aria-describedby={countId}
	></textarea>
	<div class="text-end">
		<span id={countId} class="text-xs opacity-60"
			>{value.length} / {maxLength.toLocaleString()}</span
		>
	</div>
</fieldset>
