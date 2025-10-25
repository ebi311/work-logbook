<script lang="ts" context="module">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Pagination from './Pagination.svelte';

	const { Story } = defineMeta({
		title: 'Components/Pagination',
		component: Pagination,
		tags: ['autodocs'],
		argTypes: {
			currentPage: {
				control: 'number',
				description: '現在のページ番号'
			},
			hasNext: {
				control: 'boolean',
				description: '次のページが存在するかどうか'
			},
			size: {
				control: 'number',
				description: '1ページあたりのアイテム数'
			}
		}
	});
</script>

<!-- 最初のページ（前へボタン無効） -->
<Story
	name="FirstPage"
	args={{
		currentPage: 1,
		hasNext: true,
		size: 10
	}}
/>

<!-- 中間のページ（両方のボタンが有効） -->
<Story
	name="MiddlePage"
	args={{
		currentPage: 5,
		hasNext: true,
		size: 10
	}}
/>

<!-- 最後のページ（次へボタン無効） -->
<Story
	name="LastPage"
	args={{
		currentPage: 10,
		hasNext: false,
		size: 10
	}}
/>

<!-- 2ページ目 -->
<Story
	name="SecondPage"
	args={{
		currentPage: 2,
		hasNext: true,
		size: 10
	}}
/>

<!-- サイズが異なる場合 -->
<Story
	name="DifferentSize"
	args={{
		currentPage: 3,
		hasNext: true,
		size: 20
	}}
/>

<!-- 1ページのみ（両方のボタンが無効） -->
<Story
	name="OnlyOnePage"
	args={{
		currentPage: 1,
		hasNext: false,
		size: 10
	}}
/>
