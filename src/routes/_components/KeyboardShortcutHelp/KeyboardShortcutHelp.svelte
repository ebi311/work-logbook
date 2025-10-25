<script lang="ts">
	type Platform = 'mac' | 'win' | 'auto';

	type Props = {
		platform?: Platform;
	};

	let { platform = 'auto' }: Props = $props();

	// プラットフォームの判定
	const isMac = $derived(() => {
		if (platform === 'mac') return true;
		if (platform === 'win') return false;
		// auto の場合は navigator.platform で判定
		return typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
	});

	const modifierKey = $derived(isMac() ? '⌘' : 'Ctrl');

	type Shortcut = {
		key: string;
		description: string;
		modifier: string;
	};

	const shortcuts = $derived<Shortcut[]>([
		{
			modifier: modifierKey,
			key: 'S',
			description: '作業を開始/終了'
		}
	]);
</script>

<div
	class="card prose-sm border border-base-100 bg-base-300"
	role="region"
	aria-label="キーボードショートカット一覧"
>
	<div class="card-body p-2">
		<h2 class="card-title text-sm tracking-wide text-base-content/70 uppercase">
			キーボードショートカット
		</h2>
		<ul class="list">
			{#each shortcuts as shortcut}
				<li class="list-row items-center justify-between gap-4 py-2">
					<span class="flex items-center gap-2 font-semibold text-base-content">
						<kbd class="kbd">{shortcut.modifier}</kbd>
						<span class="text-base-content/60">+</span>
						<kbd class="kbd">{shortcut.key}</kbd>
					</span>
					<span class="text-sm text-base-content">{shortcut.description}</span>
				</li>
			{/each}
		</ul>
	</div>
</div>
