<script lang="ts" context="module">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import TagBadge from './TagBadge.svelte';

	const { Story } = defineMeta({
		title: 'Components/TagBadge',
		component: TagBadge,
		tags: ['autodocs'],
		argTypes: {
			tag: {
				control: 'text',
				description: 'タグのテキスト'
			},
			onRemove: {
				action: 'remove',
				description: '削除ボタンのクリックハンドラ（未定義の場合、削除ボタンは表示されない）'
			}
		}
	});
</script>

<!-- デフォルト表示（削除ボタンなし） -->
<Story name="Default" args={{ tag: '開発' }} />

<!-- 削除ボタン付き -->
<Story
	name="WithRemoveButton"
	args={{
		tag: '開発',
		onRemove: () => console.log('Remove 開発')
	}}
/>

<!-- 複数のタグ（削除ボタンなし） -->
<Story name="MultipleTags">
	<div class="flex flex-wrap gap-2">
		<TagBadge tag="開発" />
		<TagBadge tag="PJ-A" />
		<TagBadge tag="会議" />
		<TagBadge tag="レビュー" />
		<TagBadge tag="設計" />
		<TagBadge tag="テスト" />
	</div>
</Story>

<!-- 複数のタグ（削除ボタン付き） -->
<Story name="MultipleTagsWithRemove">
	<div class="flex flex-wrap gap-2">
		<TagBadge tag="開発" onRemove={() => console.log('Remove 開発')} />
		<TagBadge tag="PJ-A" onRemove={() => console.log('Remove PJ-A')} />
		<TagBadge tag="会議" onRemove={() => console.log('Remove 会議')} />
		<TagBadge tag="レビュー" onRemove={() => console.log('Remove レビュー')} />
	</div>
</Story>

<!-- 長いタグ名 -->
<Story name="LongTagName">
	<TagBadge tag="とても長いタグ名の例です最大100文字まで許可されています" />
</Story>
