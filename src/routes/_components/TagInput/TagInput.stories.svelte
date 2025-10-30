<script lang="ts">
	import { Meta, Story } from '@storybook/addon-svelte-csf';
	import TagInput from './TagInput.svelte';

	const mockSuggestions = [
		{ tag: '開発', count: 15 },
		{ tag: 'PJ-A', count: 12 },
		{ tag: '会議', count: 8 },
		{ tag: 'レビュー', count: 7 },
		{ tag: '設計', count: 6 },
		{ tag: 'テスト', count: 5 },
		{ tag: 'バグ修正', count: 4 },
		{ tag: 'ドキュメント', count: 3 },
		{ tag: 'リファクタリング', count: 2 },
		{ tag: 'デプロイ', count: 1 }
	];
</script>

<Meta
	title="Components/TagInput"
	component={TagInput}
	argTypes={{
		tags: { control: 'object' },
		suggestions: { control: 'object' },
		placeholder: { control: 'text' },
		maxTags: { control: 'number' },
		maxTagLength: { control: 'number' }
	}}
/>

<Story name="Default">
	{#snippet children()}
		<TagInput />
	{/snippet}
</Story>

<Story name="With Suggestions">
	{#snippet children()}
		<TagInput suggestions={mockSuggestions} />
	{/snippet}
</Story>

<Story name="With Initial Tags">
	{#snippet children()}
		<TagInput tags={['開発', 'PJ-A', '会議']} suggestions={mockSuggestions} />
	{/snippet}
</Story>

<Story name="With Many Tags">
	{#snippet children()}
		<TagInput
			tags={[
				'開発',
				'PJ-A',
				'会議',
				'レビュー',
				'設計',
				'テスト',
				'バグ修正',
				'ドキュメント',
				'リファクタリング',
				'デプロイ'
			]}
			suggestions={mockSuggestions}
		/>
	{/snippet}
</Story>

<Story name="Interactive Demo">
	{#snippet children()}
		<div class="space-y-4">
			<div class="alert alert-info">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					class="h-6 w-6 shrink-0 stroke-current"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					></path>
				</svg>
				<div>
					<h3 class="font-bold">操作方法</h3>
					<ul class="text-sm">
						<li>• タグを入力してスペースまたはEnterで確定</li>
						<li>• 「開」と入力するとサジェストが表示されます</li>
						<li>• ↑↓キーでサジェストを選択、Enterで確定</li>
						<li>• 入力が空の状態でBackspaceを押すと最後のタグを削除</li>
						<li>• バッジの×ボタンでタグを個別に削除できます</li>
					</ul>
				</div>
			</div>
			<TagInput suggestions={mockSuggestions} />
		</div>
	{/snippet}
</Story>
