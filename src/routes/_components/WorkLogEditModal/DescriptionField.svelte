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
		maxLength = 10000
	}: Props = $props();

	const countId = `${id}-count`;
</script>

<div class="form-control">
	<label class="label" for={id}>
		<span class="label-text">{label}</span>
	</label>
	<textarea
		{id}
		{name}
		class="textarea-bordered textarea min-h-32"
		bind:value
		{disabled}
		aria-describedby={countId}
	></textarea>
	<div class="label">
		<span id={countId} class="label-text-alt">{value.length} / {maxLength.toLocaleString()}</span>
	</div>
</div>
