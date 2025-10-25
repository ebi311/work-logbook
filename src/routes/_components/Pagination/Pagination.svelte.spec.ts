import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import Pagination from './Pagination.svelte';

describe('Pagination', () => {
	it('現在ページを表示する', () => {
		render(Pagination, {
			props: {
				currentPage: 3,
				hasNext: true,
				size: 10
			}
		});

		expect(screen.getByText('ページ 3')).toBeInTheDocument();
	});

	it('前へボタンが currentPage === 1 の場合は無効化される', () => {
		render(Pagination, {
			props: {
				currentPage: 1,
				hasNext: true,
				size: 10
			}
		});

		const prevButton = screen.getByLabelText('前のページ');
		expect(prevButton).toBeDisabled();
	});

	it('前へボタンが currentPage > 1 の場合は有効化される', () => {
		render(Pagination, {
			props: {
				currentPage: 2,
				hasNext: true,
				size: 10
			}
		});

		const prevButton = screen.getByLabelText('前のページ');
		expect(prevButton).not.toBeDisabled();
	});

	it('次へボタンが hasNext === false の場合は無効化される', () => {
		render(Pagination, {
			props: {
				currentPage: 5,
				hasNext: false,
				size: 10
			}
		});

		const nextButton = screen.getByLabelText('次のページ');
		expect(nextButton).toBeDisabled();
	});

	it('次へボタンが hasNext === true の場合は有効化される', () => {
		render(Pagination, {
			props: {
				currentPage: 1,
				hasNext: true,
				size: 10
			}
		});

		const nextButton = screen.getByLabelText('次のページ');
		expect(nextButton).not.toBeDisabled();
	});

	it('前へボタンに正しいリンクが設定される', () => {
		render(Pagination, {
			props: {
				currentPage: 3,
				hasNext: true,
				size: 20
			}
		});

		const prevButton = screen.getByLabelText('前のページ');
		expect(prevButton).toHaveAttribute('href', '?page=2&size=20');
	});

	it('次へボタンに正しいリンクが設定される', () => {
		render(Pagination, {
			props: {
				currentPage: 2,
				hasNext: true,
				size: 15
			}
		});

		const nextButton = screen.getByLabelText('次のページ');
		expect(nextButton).toHaveAttribute('href', '?page=3&size=15');
	});

	it('キーボード操作が可能', () => {
		render(Pagination, {
			props: {
				currentPage: 2,
				hasNext: true,
				size: 10
			}
		});

		const prevButton = screen.getByLabelText('前のページ');
		const nextButton = screen.getByLabelText('次のページ');

		// リンクボタンなのでフォーカス可能
		expect(prevButton).not.toHaveAttribute('tabindex', '-1');
		expect(nextButton).not.toHaveAttribute('tabindex', '-1');
	});

	it('最初のページで前へボタンが無効化され、次へボタンが有効', () => {
		render(Pagination, {
			props: {
				currentPage: 1,
				hasNext: true,
				size: 10
			}
		});

		const prevButton = screen.getByLabelText('前のページ');
		const nextButton = screen.getByLabelText('次のページ');

		expect(prevButton).toBeDisabled();
		expect(nextButton).not.toBeDisabled();
	});

	it('最後のページで次へボタンが無効化され、前へボタンが有効', () => {
		render(Pagination, {
			props: {
				currentPage: 10,
				hasNext: false,
				size: 10
			}
		});

		const prevButton = screen.getByLabelText('前のページ');
		const nextButton = screen.getByLabelText('次のページ');

		expect(prevButton).not.toBeDisabled();
		expect(nextButton).toBeDisabled();
	});
});
