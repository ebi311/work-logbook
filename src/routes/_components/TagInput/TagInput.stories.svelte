<script lang="ts" context="module">
	import { defineMeta } from '@storybook/addon-svelte-csf';
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

	const { Story } = defineMeta({
		title: 'Components/TagInput',
		component: TagInput,
		tags: ['autodocs'],
		argTypes: {
			tags: {
				control: 'object',
				description: '表示するタグの配列'
			},
			suggestions: {
				control: 'object',
				description: 'サジェストのリスト（tag と count を持つオブジェクトの配列）'
			},
			placeholder: {
				control: 'text',
				description: '入力フィールドのプレースホルダー'
			},
			maxTags: {
				control: 'number',
				description: '最大タグ数'
			},
			maxTagLength: {
				control: 'number',
				description: 'タグの最大文字数'
			}
		}
	});
</script>

<!-- デフォルト表示 -->
<Story name="Default" />

<!-- サジェスト付き -->
<Story name="WithSuggestions" args={{ suggestions: mockSuggestions }} />

<!-- 初期タグあり -->
<Story
	name="WithInitialTags"
	args={{
		tags: ['開発', 'PJ-A', '会議'],
		suggestions: mockSuggestions
	}}
/>

<!-- 多数のタグ -->
<Story
	name="WithManyTags"
	args={{
		tags: [
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
		],
		suggestions: mockSuggestions
	}}
/>

<!-- インタラクティブデモ -->
<Story name="InteractiveDemo">
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
</Story>
