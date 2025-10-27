<script lang="ts" context="module">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import WorkLogEditModal from './WorkLogEditModal.svelte';
	import { WorkLog } from '../../../models/workLog';

	const { Story } = defineMeta({
		title: 'Components/WorkLogEditModal',
		component: WorkLogEditModal,
		tags: ['autodocs'],
		argTypes: {
			workLog: {
				control: 'object',
				description: '編集対象の作業記録'
			},
			open: {
				control: 'boolean',
				description: 'モーダルの開閉状態'
			},
			onclose: {
				action: 'close',
				description: 'モーダルを閉じる際のコールバック'
			},
			onupdated: {
				action: 'updated',
				description: '更新成功時のコールバック'
			}
		}
	});
</script>

<script lang="ts">
	const mockWorkLog = WorkLog.from({
		id: '550e8400-e29b-41d4-a716-446655440000',
		userId: '550e8400-e29b-41d4-a716-446655440001',
		startedAt: new Date('2024-10-27T09:00:00.000Z'),
		endedAt: new Date('2024-10-27T10:00:00.000Z'),
		description: '# サンプル作業\n\n- タスク1を実装\n- テストを追加\n- ドキュメントを更新',
		createdAt: new Date('2024-10-27T08:00:00.000Z'),
		updatedAt: new Date('2024-10-27T08:00:00.000Z')
	});

	const longDescriptionWorkLog = WorkLog.from({
		id: '550e8400-e29b-41d4-a716-446655440002',
		userId: '550e8400-e29b-41d4-a716-446655440001',
		startedAt: new Date('2024-10-27T09:00:00.000Z'),
		endedAt: new Date('2024-10-27T10:00:00.000Z'),
		description: '長い作業内容\n'.repeat(50),
		createdAt: new Date('2024-10-27T08:00:00.000Z'),
		updatedAt: new Date('2024-10-27T08:00:00.000Z')
	});

	const emptyDescriptionWorkLog = WorkLog.from({
		id: '550e8400-e29b-41d4-a716-446655440003',
		userId: '550e8400-e29b-41d4-a716-446655440001',
		startedAt: new Date('2024-10-27T09:00:00.000Z'),
		endedAt: new Date('2024-10-27T10:00:00.000Z'),
		description: '',
		createdAt: new Date('2024-10-27T08:00:00.000Z'),
		updatedAt: new Date('2024-10-27T08:00:00.000Z')
	});

	const noop = () => {};
</script>

<!-- デフォルト: 開いた状態 -->
<Story
	name="Default"
	args={{
		workLog: mockWorkLog,
		open: true,
		onclose: noop,
		onupdated: noop
	}}
/>

<!-- 閉じた状態 -->
<Story
	name="Closed"
	args={{
		workLog: mockWorkLog,
		open: false,
		onclose: noop
	}}
/>

<!-- 長い作業内容 -->
<Story
	name="LongDescription"
	args={{
		workLog: longDescriptionWorkLog,
		open: true,
		onclose: noop
	}}
/>

<!-- 作業内容なし -->
<Story
	name="EmptyDescription"
	args={{
		workLog: emptyDescriptionWorkLog,
		open: true,
		onclose: noop
	}}
/>
