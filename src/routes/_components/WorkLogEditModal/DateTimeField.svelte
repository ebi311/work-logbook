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

<fieldset class="fieldset w-full rounded-box border border-base-300 p-4">
	<label class="label" for={id}>{label}</label>
	<input
		type="datetime-local"
		{id}
		{name}
		class="input-bordered input w-full"
		bind:value
		{required}
		{disabled}
	/>
</fieldset>
