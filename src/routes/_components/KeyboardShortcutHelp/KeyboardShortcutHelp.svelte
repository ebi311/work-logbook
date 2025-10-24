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

<div class="keyboard-shortcut-help" role="region" aria-label="キーボードショートカット一覧">
	<h2 class="title">キーボードショートカット</h2>
	<ul class="shortcut-list">
		{#each shortcuts as shortcut}
			<li class="shortcut-item">
				<span class="shortcut-keys">
					<kbd class="key">{shortcut.modifier}</kbd>
					<span class="plus">+</span>
					<kbd class="key">{shortcut.key}</kbd>
				</span>
				<span class="shortcut-description">{shortcut.description}</span>
			</li>
		{/each}
	</ul>
</div>

<style>
	.keyboard-shortcut-help {
		padding: 1rem;
		background-color: var(--color-bg-secondary, #f5f5f5);
		border-radius: 0.5rem;
		border: 1px solid var(--color-border, #e0e0e0);
	}

	.title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-secondary, #666);
		margin: 0 0 0.75rem 0;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.shortcut-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.shortcut-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.shortcut-keys {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-weight: 600;
	}

	.key {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		background-color: var(--color-bg-primary, #fff);
		border: 1px solid var(--color-border, #e0e0e0);
		border-radius: 0.25rem;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.75rem;
		min-width: 2rem;
		text-align: center;
	}

	.plus {
		color: var(--color-text-secondary, #666);
		font-size: 0.75rem;
	}

	.shortcut-description {
		color: var(--color-text-primary, #333);
		font-size: 0.875rem;
	}
</style>
