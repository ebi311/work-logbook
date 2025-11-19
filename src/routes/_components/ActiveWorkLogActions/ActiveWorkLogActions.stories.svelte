<script lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ActiveWorkLogActions from './ActiveWorkLogActions.svelte';

	/**
	 * F-001.2: 進行中作業のアクションボタン群
	 *
	 * 「作業開始/終了」「切り替え」「作業中変更」ボタンを提供します。
	 */

	const { Story } = defineMeta({
		component: ActiveWorkLogActions,
		title: 'Components/ActiveWorkLogActions',
		tags: ['autodocs'],
		argTypes: {
			isActive: {
				control: 'boolean',
				description: '進行中かどうか',
			},
			isSubmitting: {
				control: 'boolean',
				description: '送信中かどうか',
			},
		},
	});
</script>

<Story
	name="Stopped"
	args={{
		isActive: false,
		isSubmitting: false,
	}}
/>

<Story
	name="Active"
	args={{
		isActive: true,
		isSubmitting: false,
	}}
/>

<Story
	name="Submitting (Stopped)"
	args={{
		isActive: false,
		isSubmitting: true,
	}}
/>

<Story
	name="Submitting (Active)"
	args={{
		isActive: true,
		isSubmitting: true,
	}}
/>
