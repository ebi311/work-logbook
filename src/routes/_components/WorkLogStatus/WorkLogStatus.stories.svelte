<script lang="ts" context="module">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import WorkLogStatus from './WorkLogStatus.svelte';

	const { Story } = defineMeta({
		title: 'Components/WorkLogStatus',
		component: WorkLogStatus,
		tags: ['autodocs'],
		argTypes: {
			active: {
				control: 'object',
				description: 'アクティブな作業ログ'
			},
			serverNow: {
				control: 'text',
				description: 'サーバーの現在時刻（ISO 8601形式）'
			}
		}
	});
</script>

<script lang="ts">
	// 現在時刻を取得
	const now = new Date().toISOString();
	// 時間計算用のヘルパー関数（Arrow function）
	const getTimeAgo = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000).toISOString();

	// 1時間前
	const oneHourAgo = getTimeAgo(60);
	// 30分前
	const thirtyMinutesAgo = getTimeAgo(30);
	// 5分前
	const fiveMinutesAgo = getTimeAgo(5);
</script>

<!-- 停止中 -->
<Story
	name="Stopped"
	args={{
		active: undefined,
		serverNow: now
	}}
/>

<!-- 記録開始直後（0秒） -->
<Story
	name="JustStarted"
	args={{
		active: {
			id: 'test-id-1',
			startedAt: now
		},
		serverNow: now
	}}
/>

<!-- 5分経過 -->
<Story
	name="FiveMinutes"
	args={{
		active: {
			id: 'test-id-2',
			startedAt: fiveMinutesAgo
		},
		serverNow: now
	}}
/>

<!-- 30分経過 -->
<Story
	name="ThirtyMinutes"
	args={{
		active: {
			id: 'test-id-3',
			startedAt: thirtyMinutesAgo
		},
		serverNow: now
	}}
/>

<!-- 1時間経過 -->
<Story
	name="OneHour"
	args={{
		active: {
			id: 'test-id-4',
			startedAt: oneHourAgo
		},
		serverNow: now
	}}
/>

<!-- タイマー動作確認用（リアルタイム更新） -->
<Story
	name="LiveTimer"
	args={{
		active: {
			id: 'test-id-5',
			startedAt: new Date(Date.now() - 10 * 1000).toISOString() // 10秒前
		},
		serverNow: now
	}}
/>
