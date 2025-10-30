<script lang="ts">
	/**
	 * タグバッジコンポーネント
	 *
	 * タグを表示するためのバッジコンポーネント。
	 * オプションで削除ボタンを表示できる。
	 */

	export let tag: string;
	export let onRemove: (() => void) | undefined = undefined;

	/**
	 * タグ名から色を生成する
	 * ハッシュ値を使ってカラーパレットから色を選択
	 */
	const getColorClass = (tag: string): string => {
		// シンプルなハッシュ関数
		let hash = 0;
		for (let i = 0; i < tag.length; i++) {
			hash = tag.charCodeAt(i) + ((hash << 5) - hash);
		}

		// daisyUI のカラーパレット
		const colors = [
			'badge-primary',
			'badge-secondary',
			'badge-accent',
			'badge-info',
			'badge-success',
			'badge-warning'
		];

		return colors[Math.abs(hash) % colors.length];
	};

	$: colorClass = getColorClass(tag);
</script>

<div class="badge {colorClass} gap-1">
	<span>{tag}</span>
	{#if onRemove}
		<button type="button" class="btn btn-ghost btn-xs" aria-label="タグを削除" on:click={onRemove}>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="2"
				stroke="currentColor"
				class="h-3 w-3"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	{/if}
</div>
