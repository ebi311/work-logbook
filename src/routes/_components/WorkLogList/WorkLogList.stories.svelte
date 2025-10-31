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
				description: '作業ログのアイテム配列',
				tags: [],
			},
			serverNow: {
				control: 'text',
				description: 'サーバー時刻（ISO形式）',
				tags: [],
			},
		},
	});
</script>

<script lang="ts">
	const serverNow = '2025-10-25T12:00:00.000Z';

	// コールバック関数（Storybook用）
	const handleEdit = (item: {
		id: string;
		startedAt: string;
		endedAt: string | null;
		description: string;
	}) => {
		console.log('Edit clicked:', item);
		alert(`編集: ${item.description}`);
	};

	const handleDelete = (item: {
		id: string;
		startedAt: string;
		endedAt: string | null;
		description: string;
	}) => {
		console.log('Delete clicked:', item);
		alert(`削除: ${item.description}`);
	};

	// 終了済み作業のサンプルデータ
	const completedItems = [
		{
			id: '1',
			startedAt: '2025-10-25T09:00:00.000Z',
			endedAt: '2025-10-25T10:30:00.000Z',
			description: 'データベース設計の見直しとスキーマ変更',
			tags: [],
		},
		{
			id: '2',
			startedAt: '2025-10-25T11:00:00.000Z',
			endedAt: '2025-10-25T12:00:00.000Z',
			description: 'コードレビュー対応',
			tags: [],
		},
	];

	// 進行中の作業を含むサンプルデータ
	const mixedItems = [
		{
			id: '1',
			startedAt: '2025-10-25T09:00:00.000Z',
			endedAt: '2025-10-25T10:30:00.000Z',
			description: 'バグ修正: ログイン画面でのエラーハンドリング改善',
			tags: [],
		},
		{
			id: '2',
			startedAt: '2025-10-25T11:00:00.000Z',
			endedAt: null, // 進行中
			description:
				'新機能開発: ユーザー設定画面の実装中。レスポンシブデザイン対応とアクセシビリティの考慮を行っています。',
			tags: [],
		},
	];

	// 多数の作業データ
	const manyItems = Array.from({ length: 10 }, (_, i) => ({
		id: String(i + 1),
		startedAt: `2025-10-${String(25 - i).padStart(2, '0')}T09:00:00.000Z`,
		endedAt: i === 0 ? null : `2025-10-${String(25 - i).padStart(2, '0')}T17:30:00.000Z`, // 最初の1件は進行中
		description:
			i % 3 === 0
				? `タスク${i + 1}: これは長めの作業内容説明です。複数行にわたる場合の表示確認のため、意図的に長いテキストを入れています。`
				: i % 3 === 1
					? `タスク${i + 1}`
					: '',
		tags: [],
	}));
</script>

<!-- デフォルト: 終了済み作業のみ -->
<Story
	name="Default"
	args={{ items: completedItems, serverNow, onedit: handleEdit, ondelete: handleDelete }}
/>

<!-- 空のリスト -->
<Story name="Empty" args={{ items: [], serverNow }} />

<!-- 進行中の作業を含む -->
<Story
	name="WithActiveWork"
	args={{ items: mixedItems, serverNow, onedit: handleEdit, ondelete: handleDelete }}
/>

<!-- 多数の作業 -->
<Story
	name="ManyItems"
	args={{ items: manyItems, serverNow, onedit: handleEdit, ondelete: handleDelete }}
/>

<!-- 1件のみ（終了済み） -->
<Story
	name="SingleCompleted"
	args={{
		items: [
			{
				id: '1',
				startedAt: '2025-10-25T09:00:00.000Z',
				endedAt: '2025-10-25T17:30:00.000Z',
				description: 'テスト実装とドキュメント作成',
				tags: [],
			},
		],
		serverNow,
		onedit: handleEdit,
		ondelete: handleDelete,
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
				endedAt: null,
				description: '機能開発中',
				tags: [],
			},
		],
		serverNow,
	}}
/>
