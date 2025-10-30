<script lang="ts" context="module">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import WorkLogToggleButton from './WorkLogToggleButton.svelte';

	const { Story } = defineMeta({
		title: 'Components/WorkLogToggleButton',
		component: WorkLogToggleButton,
		tags: ['autodocs'],
		argTypes: {
			isActive: {
				control: 'boolean',
				description: '作業中かどうか',
			},
			isSubmitting: {
				control: 'boolean',
				description: '送信中かどうか',
			},
		},
	});
</script>

<!-- 停止中 -->
<Story
	name="Inactive"
	args={{
		isActive: false,
		isSubmitting: false,
	}}
/>

<!-- 停止中（送信中） -->
<Story
	name="Inactive Submitting"
	args={{
		isActive: false,
		isSubmitting: true,
	}}
/>

<!-- 記録中 -->
<Story
	name="Active"
	args={{
		isActive: true,
		isSubmitting: false,
	}}
/>

<!-- 記録中（送信中） -->
<Story
	name="Active Submitting"
	args={{
		isActive: true,
		isSubmitting: true,
	}}
/>
