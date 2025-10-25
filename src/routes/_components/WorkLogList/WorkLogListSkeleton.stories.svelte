<script lang="ts" context="module">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import WorkLogListSkeleton from './WorkLogListSkeleton.svelte';

	const { Story } = defineMeta({
		component: WorkLogListSkeleton,
		title: 'Components/WorkLogListSkeleton',
		tags: ['autodocs'],
		argTypes: {
			rows: {
				control: { type: 'number', min: 1, max: 20 },
				description: '表示するスケルトン行数'
			}
		}
	});
</script>

<!-- デフォルト: 5行 -->
<Story name="Default" args={{ rows: 5 }} />

<!-- 3行 -->
<Story name="ThreeRows" args={{ rows: 3 }} />

<!-- 10行 -->
<Story name="TenRows" args={{ rows: 10 }} />

<!-- 1行 -->
<Story name="SingleRow" args={{ rows: 1 }} />
