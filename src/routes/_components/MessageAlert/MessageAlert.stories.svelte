<script lang="ts">
	import MessageAlert from './MessageAlert.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();
</script>

<div class="p-8">
	<h1 class="mb-8 text-2xl font-bold">MessageAlert Component</h1>

	<div class="space-y-8">
		<section>
			<h2 class="mb-4 text-xl font-semibold">Success Messages</h2>
			<div class="space-y-4">
				<MessageAlert message="作業を開始しました" type="success" />
				<MessageAlert message="作業を終了しました（60分）" type="success" />
				<MessageAlert message="データを保存しました" type="success" />
			</div>
		</section>

		<section>
			<h2 class="mb-4 text-xl font-semibold">Error Messages</h2>
			<div class="space-y-4">
				<MessageAlert message="既に作業が進行中です" type="error" />
				<MessageAlert message="進行中の作業がありません" type="error" />
				<MessageAlert message="エラーが発生しました" type="error" />
			</div>
		</section>

		<section>
			<h2 class="mb-4 text-xl font-semibold">Long Messages</h2>
			<div class="space-y-4">
				<MessageAlert
					message="これは非常に長いメッセージです。複数行にわたる可能性があり、レイアウトが適切に処理されることを確認するために使用されます。"
					type="success"
				/>
				<MessageAlert
					message="エラー: サーバーとの接続に失敗しました。ネットワーク接続を確認してから、もう一度お試しください。"
					type="error"
				/>
			</div>
		</section>
	</div>

	{@render children?.()}
</div>
