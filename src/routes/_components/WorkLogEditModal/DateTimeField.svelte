<script lang="ts">
	type Props = {
		label: string;
		id: string;
		name: string;
		value: string;
		disabled?: boolean;
		required?: boolean;
		onchange?: (value: string) => void;
	};

	let {
		label,
		id,
		name,
		value = $bindable(),
		disabled = false,
		required = false
	}: Props = $props();
</script>

<div class="form-control">
	<label class="label" for={id}>
		<span class="label-text">{label}</span>
	</label>
	<input
		type="datetime-local"
		{id}
		{name}
		class="input-bordered input"
		bind:value
		{required}
		{disabled}
	/>
</div>
