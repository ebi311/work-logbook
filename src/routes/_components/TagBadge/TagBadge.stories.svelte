<script lang="ts">
	import { Meta, Story } from '@storybook/addon-svelte-csf';
	import TagBadge from './TagBadge.svelte';
</script>

<Meta
	title="Components/TagBadge"
	component={TagBadge}
	argTypes={{
		tag: { control: 'text' },
		onRemove: { action: 'remove' }
	}}
/>

<Story name="Default" args={{ tag: '開発' }}>
	{#snippet children(args: { tag: string })}
		<TagBadge {...args} />
	{/snippet}
</Story>

<Story name="With Remove Button" args={{ tag: '開発', onRemove: () => {} }}>
	{#snippet children(args: { tag: string; onRemove: () => void })}
		<TagBadge {...args} />
	{/snippet}
</Story>

<Story name="Multiple Tags">
	{#snippet children()}
		<div class="flex flex-wrap gap-2">
			<TagBadge tag="開発" />
			<TagBadge tag="PJ-A" />
			<TagBadge tag="会議" />
			<TagBadge tag="レビュー" />
			<TagBadge tag="設計" />
			<TagBadge tag="テスト" />
		</div>
	{/snippet}
</Story>

<Story name="Multiple Tags with Remove">
	{#snippet children()}
		<div class="flex flex-wrap gap-2">
			<TagBadge tag="開発" onRemove={() => console.log('Remove 開発')} />
			<TagBadge tag="PJ-A" onRemove={() => console.log('Remove PJ-A')} />
			<TagBadge tag="会議" onRemove={() => console.log('Remove 会議')} />
			<TagBadge tag="レビュー" onRemove={() => console.log('Remove レビュー')} />
		</div>
	{/snippet}
</Story>

<Story name="Long Tag Name">
	{#snippet children()}
		<TagBadge tag="とても長いタグ名の例です最大100文字まで許可されています" />
	{/snippet}
</Story>
