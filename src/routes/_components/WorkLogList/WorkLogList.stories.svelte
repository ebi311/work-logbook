<script lang="ts" context="module">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import WorkLogList from './WorkLogList.svelte';

	const { Story } = defineMeta({
		component: WorkLogList,
		title: 'Components/WorkLogList',
		tags: ['autodocs'],
		argTypes: {
			items: {
				control: 'object',
				description: '作業ログのアイテム配列'
			},
			serverNow: {
				control: 'text',
				description: 'サーバー時刻（ISO形式）'
			}
		}
	});
</script>

<script lang="ts">
	const serverNow = '2025-10-25T12:00:00.000Z';

	// 終了済み作業のサンプルデータ
	const completedItems = [
		{
			id: '1',
			startedAt: '2025-10-25T09:00:00.000Z',
			endedAt: '2025-10-25T10:30:00.000Z'
		},
		{
			id: '2',
			startedAt: '2025-10-25T11:00:00.000Z',
			endedAt: '2025-10-25T12:00:00.000Z'
		}
	];

	// 進行中の作業を含むサンプルデータ
	const mixedItems = [
		{
			id: '1',
			startedAt: '2025-10-25T09:00:00.000Z',
			endedAt: '2025-10-25T10:30:00.000Z'
		},
		{
			id: '2',
			startedAt: '2025-10-25T11:00:00.000Z',
			endedAt: null // 進行中
		}
	];

	// 多数の作業データ
	const manyItems = Array.from({ length: 10 }, (_, i) => ({
		id: String(i + 1),
		startedAt: `2025-10-${String(25 - i).padStart(2, '0')}T09:00:00.000Z`,
		endedAt: i === 0 ? null : `2025-10-${String(25 - i).padStart(2, '0')}T17:30:00.000Z` // 最初の1件は進行中
	}));
</script>

<!-- デフォルト: 終了済み作業のみ -->
<Story name="Default" args={{ items: completedItems, serverNow }} />

<!-- 空のリスト -->
<Story name="Empty" args={{ items: [], serverNow }} />

<!-- 進行中の作業を含む -->
<Story name="WithActiveWork" args={{ items: mixedItems, serverNow }} />

<!-- 多数の作業 -->
<Story name="ManyItems" args={{ items: manyItems, serverNow }} />

<!-- 1件のみ（終了済み） -->
<Story
	name="SingleCompleted"
	args={{
		items: [
			{
				id: '1',
				startedAt: '2025-10-25T09:00:00.000Z',
				endedAt: '2025-10-25T17:30:00.000Z'
			}
		],
		serverNow
	}}
/>

<!-- 1件のみ（進行中） -->
<Story
	name="SingleActive"
	args={{
		items: [
			{
				id: '1',
				startedAt: '2025-10-25T09:00:00.000Z',
				endedAt: null
			}
		],
		serverNow
	}}
/>
