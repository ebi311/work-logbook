<script lang="ts">
	/**
	 * 作業記録用タグ入力コンポーネント
	 *
	 * TagInputコンポーネントをラップし、フォーム送信用の隠しフィールドを含みます。
	 */
	import TagInput from '../TagInput/TagInput.svelte';

	type Props = {
		/** タグの配列 */
		tags: string[];
		/** タグのサジェスト候補 */
		suggestions?: { tag: string; count: number }[];
		/** プレースホルダー */
		placeholder?: string;
	};

	let { tags = $bindable([]), suggestions = [], placeholder = '例: 開発 PJ-A' }: Props = $props();
</script>

<div class="form-control flex w-full flex-col">
	<TagInput bind:tags {suggestions} {placeholder} />
	<!-- 隠しフィールドでタグを送信 -->
	{#each tags as tag}
		<input type="hidden" name="tags" value={tag} />
	{/each}
</div>
