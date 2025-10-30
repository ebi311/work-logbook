import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import TagBadge from './TagBadge.svelte';

describe('TagBadge', () => {
	it('タグ名が表示される', () => {
		render(TagBadge, { tag: '開発' });
		expect(screen.getByText('開発')).toBeInTheDocument();
	});

	it('onRemove がある場合、削除ボタンが表示される', () => {
		render(TagBadge, { tag: '開発', onRemove: () => {} });
		expect(screen.getByLabelText('タグを削除')).toBeInTheDocument();
	});

	it('onRemove がない場合、削除ボタンは表示されない', () => {
		render(TagBadge, { tag: '開発' });
		expect(screen.queryByLabelText('タグを削除')).not.toBeInTheDocument();
	});

	it('削除ボタンをクリックすると onRemove が呼ばれる', async () => {
		const onRemove = vi.fn();
		render(TagBadge, { tag: '開発', onRemove });

		const button = screen.getByLabelText('タグを削除');
		await fireEvent.click(button);

		expect(onRemove).toHaveBeenCalledTimes(1);
	});

	it('異なるタグは異なる色になる可能性がある', () => {
		const { container: container1 } = render(TagBadge, { tag: '開発' });
		const { container: container2 } = render(TagBadge, { tag: 'PJ-A' });

		const badge1 = container1.querySelector('.badge');
		const badge2 = container2.querySelector('.badge');

		expect(badge1).toBeInTheDocument();
		expect(badge2).toBeInTheDocument();
		// 色のクラスが適用されていることを確認
		expect(badge1?.className).toMatch(/badge-(primary|secondary|accent|info|success|warning)/);
		expect(badge2?.className).toMatch(/badge-(primary|secondary|accent|info|success|warning)/);
	});
});
