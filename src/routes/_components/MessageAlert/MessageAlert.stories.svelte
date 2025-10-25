<script lang="ts" context="module">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import MessageAlert from './MessageAlert.svelte';

	const { Story } = defineMeta({
		component: MessageAlert,
		title: 'Components/MessageAlert',
		tags: ['autodocs'],
		argTypes: {
			message: {
				control: 'text',
				description: 'メッセージ内容'
			},
			type: {
				control: 'select',
				options: ['success', 'error'],
				description: 'メッセージタイプ'
			}
		}
	});
</script>

<!-- Success Message -->
<Story
	name="Success"
	args={{
		message: '作業を開始しました',
		type: 'success'
	}}
/>

<!-- Error Message -->
<Story
	name="Error"
	args={{
		message: '既に作業が進行中です',
		type: 'error'
	}}
/>

<!-- Long Success Message -->
<Story
	name="LongSuccess"
	args={{
		message:
			'これは非常に長いメッセージです。複数行にわたる可能性があり、レイアウトが適切に処理されることを確認するために使用されます。',
		type: 'success'
	}}
/>

<!-- Long Error Message -->
<Story
	name="LongError"
	args={{
		message:
			'エラー: サーバーとの接続に失敗しました。ネットワーク接続を確認してから、もう一度お試しください。',
		type: 'error'
	}}
/>

<!-- Work Started -->
<Story
	name="WorkStarted"
	args={{
		message: '作業を終了しました（60分）',
		type: 'success'
	}}
/>

<!-- No Active Work -->
<Story
	name="NoActiveWork"
	args={{
		message: '進行中の作業がありません',
		type: 'error'
	}}
/>
