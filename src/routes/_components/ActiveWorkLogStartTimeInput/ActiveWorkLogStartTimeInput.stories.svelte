<script lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ActiveWorkLogStartTimeInput from './ActiveWorkLogStartTimeInput.svelte';

	/**
	 * F-001.2: 進行中作業の開始時刻入力コンポーネント
	 *
	 * datetime-local input を使用して、開始時刻を編集できます。
	 */

	const { Story } = defineMeta({
		component: ActiveWorkLogStartTimeInput,
		title: 'Components/ActiveWorkLogStartTimeInput',
		tags: ['autodocs'],
		argTypes: {
			value: {
				control: 'text',
				description: 'UTC ISO文字列の開始時刻',
			},
			min: {
				control: 'text',
				description: '最小値（UTC ISO文字列）',
			},
			max: {
				control: 'text',
				description: '最大値（UTC ISO文字列）',
			},
			disabled: {
				control: 'boolean',
				description: '入力無効フラグ',
			},
			error: {
				control: 'text',
				description: 'エラーメッセージ',
			},
		},
	});
</script>

<Story
	name="Default"
	args={{
		value: new Date().toISOString(),
	}}
/>

<Story
	name="With Min/Max"
	args={{
		value: new Date().toISOString(),
		min: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24時間前
		max: new Date().toISOString(), // 現在時刻
	}}
/>

<Story
	name="With Error"
	args={{
		value: new Date().toISOString(),
		error: '開始時刻が無効です',
	}}
/>

<Story
	name="Disabled"
	args={{
		value: new Date().toISOString(),
		disabled: true,
	}}
/>

<Story
	name="Past Time"
	args={{
		value: new Date('2025-11-19T10:30:00Z').toISOString(),
		min: new Date('2025-11-19T09:00:00Z').toISOString(),
		max: new Date('2025-11-19T12:00:00Z').toISOString(),
	}}
/>
