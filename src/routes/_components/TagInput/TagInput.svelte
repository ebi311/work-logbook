<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import TagBadge from '../TagBadge/TagBadge.svelte';

	/**
	 * タグ入力コンポーネント
	 *
	 * サジェスト機能付きのタグ入力フィールド。
	 * スペースやEnterでタグを確定、Backspaceで最後のタグを削除。
	 */

	export let tags: string[] = [];
	export let suggestions: { tag: string; count: number }[] = [];
	export let placeholder = '例: 開発 PJ-A';
	export let maxTags = 20;
	export let maxTagLength = 100;

	const dispatch = createEventDispatcher<{
		change: string[];
	}>();

	let inputValue = '';
	let showSuggestions = false;
	let selectedIndex = -1;

	/**
	 * タグを追加
	 */
	const addTag = (tag: string) => {
		const trimmed = tag.trim();

		// バリデーション
		if (!trimmed) return;
		if (trimmed.length > maxTagLength) {
			alert(`タグは${maxTagLength}文字以内で入力してください`);
			return;
		}
		if (tags.includes(trimmed)) {
			// 既に存在する場合はスキップ
			inputValue = '';
			return;
		}
		if (tags.length >= maxTags) {
			alert(`タグは${maxTags}個まで追加できます`);
			return;
		}

		// タグを追加
		tags = [...tags, trimmed];
		inputValue = '';
		showSuggestions = false;
		selectedIndex = -1;

		// イベント発火
		dispatch('change', tags);
	};

	/**
	 * タグを削除
	 */
	const removeTag = (index: number) => {
		tags = tags.filter((_, i) => i !== index);
		dispatch('change', tags);
	};

	/**
	 * 入力イベント
	 */
	const handleInput = (e: Event) => {
		const target = e.target as HTMLInputElement;
		inputValue = target.value;

		// サジェストを表示
		if (inputValue.trim()) {
			showSuggestions = true;
			selectedIndex = -1;
		} else {
			showSuggestions = false;
		}
	};

	/**
	 * キーボードイベント
	 */
	const handleKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
				addTag(filteredSuggestions[selectedIndex].tag);
			} else if (inputValue.includes(' ')) {
				// スペースが含まれている場合、分割して追加
				const newTags = inputValue.split(/\s+/).filter((t) => t.trim());
				newTags.forEach((tag) => addTag(tag));
			} else {
				addTag(inputValue);
			}
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (showSuggestions && filteredSuggestions.length > 0) {
				selectedIndex = Math.min(selectedIndex + 1, filteredSuggestions.length - 1);
			}
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (showSuggestions) {
				selectedIndex = Math.max(selectedIndex - 1, -1);
			}
		} else if (e.key === 'Escape') {
			showSuggestions = false;
			selectedIndex = -1;
		} else if (e.key === ' ' && inputValue.trim()) {
			// スペースでタグを確定
			e.preventDefault();
			addTag(inputValue);
		} else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
			// 入力が空でBackspaceを押すと最後のタグを削除
			removeTag(tags.length - 1);
		}
	};

	/**
	 * フィルタリングされたサジェスト
	 */
	$: filteredSuggestions = inputValue.trim()
		? suggestions
				.filter((s) => s.tag.toLowerCase().includes(inputValue.toLowerCase()))
				.filter((s) => !tags.includes(s.tag)) // 既に追加されているタグは除外
				.slice(0, 10) // 最大10件
		: [];
</script>

<div class="form-control">
	<label class="label" for="tag-input">
		<span class="label-text">タグ</span>
		<span class="label-text-alt">{tags.length}/{maxTags}</span>
	</label>

	<!-- タグバッジ表示 -->
	{#if tags.length > 0}
		<div class="mb-2 flex flex-wrap gap-1">
			{#each tags as tag, i}
				<TagBadge {tag} onRemove={() => removeTag(i)} />
			{/each}
		</div>
	{/if}

	<!-- 入力フィールド -->
	<div class="relative">
		<input
			id="tag-input"
			type="text"
			class="input-bordered input w-full"
			{placeholder}
			bind:value={inputValue}
			on:input={handleInput}
			on:keydown={handleKeydown}
			on:blur={() => {
				// 少し遅延させてクリックイベントを処理できるようにする
				setTimeout(() => {
					showSuggestions = false;
				}, 200);
			}}
		/>

		<!-- サジェスト -->
		{#if showSuggestions && filteredSuggestions.length > 0}
			<ul class="menu absolute z-10 mt-1 w-full rounded-box bg-base-200 shadow-lg">
				{#each filteredSuggestions as suggestion, i}
					<li>
						<button
							type="button"
							class:active={i === selectedIndex}
							on:click={() => addTag(suggestion.tag)}
						>
							<span class="flex-1">{suggestion.tag}</span>
							<span class="badge badge-ghost badge-sm">{suggestion.count}</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<!-- ヘルプテキスト -->
	<div class="label">
		<span class="label-text-alt">スペースまたはEnterで確定、Backspaceで削除</span>
	</div>
</div>
