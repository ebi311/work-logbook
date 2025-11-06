import { describe, it, expect } from 'vitest';
import {
	readFiltersFromUrl,
	buildTagFilterUrl,
	buildDateFilterUrl,
	buildAddTagToFilterUrl,
} from './filterManager';

describe('filterManager', () => {
	describe('readFiltersFromUrl', () => {
		it('タグパラメータがある場合、配列として返す', () => {
			// Arrange
			const url = new URL('http://localhost/?tags=開発,レビュー');

			// Act
			const result = readFiltersFromUrl(url);

			// Assert
			expect(result.tags).toEqual(['開発', 'レビュー']);
		});

		it('タグパラメータがない場合、空配列を返す', () => {
			// Arrange
			const url = new URL('http://localhost/');

			// Act
			const result = readFiltersFromUrl(url);

			// Assert
			expect(result.tags).toEqual([]);
		});

		it('monthパラメータがある場合、文字列として返す', () => {
			// Arrange
			const url = new URL('http://localhost/?month=2025-11');

			// Act
			const result = readFiltersFromUrl(url);

			// Assert
			expect(result.month).toBe('2025-11');
		});

		it('dateパラメータがある場合、文字列として返す', () => {
			// Arrange
			const url = new URL('http://localhost/?date=2025-11-06');

			// Act
			const result = readFiltersFromUrl(url);

			// Assert
			expect(result.date).toBe('2025-11-06');
		});

		it('日付パラメータがない場合、undefinedを返す', () => {
			// Arrange
			const url = new URL('http://localhost/');

			// Act
			const result = readFiltersFromUrl(url);

			// Assert
			expect(result.month).toBeUndefined();
			expect(result.date).toBeUndefined();
		});

		it('すべてのフィルタパラメータを正しく読み取る', () => {
			// Arrange
			const url = new URL('http://localhost/?tags=開発,テスト&month=2025-11');

			// Act
			const result = readFiltersFromUrl(url);

			// Assert
			expect(result).toEqual({
				tags: ['開発', 'テスト'],
				month: '2025-11',
				date: undefined,
			});
		});
	});

	describe('buildTagFilterUrl', () => {
		it('タグが指定されている場合、URLにtagsパラメータを追加する', () => {
			// Arrange
			const currentUrl = new URL('http://localhost/');
			const newTags = ['開発', 'レビュー'];

			// Act
			const result = buildTagFilterUrl(newTags, currentUrl);
			const resultUrl = new URL(result);

			// Assert
			expect(resultUrl.searchParams.get('tags')).toBe('開発,レビュー');
			expect(resultUrl.searchParams.get('page')).toBe('1');
		});

		it('タグが空の場合、tagsパラメータを削除する', () => {
			// Arrange
			const currentUrl = new URL('http://localhost/?tags=開発');
			const newTags: string[] = [];

			// Act
			const result = buildTagFilterUrl(newTags, currentUrl);

			// Assert
			expect(result).not.toContain('tags=');
		});

		it('既存のページパラメータを1にリセットする', () => {
			// Arrange
			const currentUrl = new URL('http://localhost/?page=5');
			const newTags = ['開発'];

			// Act
			const result = buildTagFilterUrl(newTags, currentUrl);

			// Assert
			expect(result).toContain('page=1');
			expect(result).not.toContain('page=5');
		});
	});

	describe('buildDateFilterUrl', () => {
		it('monthフィルタを設定する', () => {
			// Arrange
			const currentUrl = new URL('http://localhost/');
			const filter = { month: '2025-11' };

			// Act
			const result = buildDateFilterUrl(filter, currentUrl);

			// Assert
			expect(result).toContain('month=2025-11');
			expect(result).toContain('page=1');
		});

		it('dateフィルタを設定する', () => {
			// Arrange
			const currentUrl = new URL('http://localhost/');
			const filter = { date: '2025-11-06' };

			// Act
			const result = buildDateFilterUrl(filter, currentUrl);

			// Assert
			expect(result).toContain('date=2025-11-06');
			expect(result).toContain('page=1');
		});

		it('既存の日付パラメータをクリアする', () => {
			// Arrange
			const currentUrl = new URL('http://localhost/?month=2025-10&from=2025-10-01&to=2025-10-31');
			const filter = { month: '2025-11' };

			// Act
			const result = buildDateFilterUrl(filter, currentUrl);

			// Assert
			expect(result).toContain('month=2025-11');
			expect(result).not.toContain('month=2025-10');
			expect(result).not.toContain('from=');
			expect(result).not.toContain('to=');
		});

		it('空のフィルタを渡すとすべての日付パラメータをクリアする', () => {
			// Arrange
			const currentUrl = new URL('http://localhost/?month=2025-10&date=2025-10-15');
			const filter = {};

			// Act
			const result = buildDateFilterUrl(filter, currentUrl);

			// Assert
			expect(result).not.toContain('month=');
			expect(result).not.toContain('date=');
		});
	});

	describe('buildAddTagToFilterUrl', () => {
		it('新しいタグを追加したURLを返す', () => {
			// Arrange
			const currentUrl = new URL('http://localhost/?tags=開発');
			const currentTags = ['開発'];
			const tag = 'レビュー';

			// Act
			const result = buildAddTagToFilterUrl(tag, currentTags, currentUrl);
			const resultUrl = result ? new URL(result) : null;

			// Assert
			expect(result).not.toBeNull();
			expect(resultUrl?.searchParams.get('tags')).toBe('開発,レビュー');
		});

		it('既に存在するタグの場合、nullを返す', () => {
			// Arrange
			const currentUrl = new URL('http://localhost/?tags=開発,レビュー');
			const currentTags = ['開発', 'レビュー'];
			const tag = '開発';

			// Act
			const result = buildAddTagToFilterUrl(tag, currentTags, currentUrl);

			// Assert
			expect(result).toBeNull();
		});

		it('タグがない状態から追加する', () => {
			// Arrange
			const currentUrl = new URL('http://localhost/');
			const currentTags: string[] = [];
			const tag = '開発';

			// Act
			const result = buildAddTagToFilterUrl(tag, currentTags, currentUrl);
			const resultUrl = result ? new URL(result) : null;

			// Assert
			expect(result).not.toBeNull();
			expect(resultUrl?.searchParams.get('tags')).toBe('開発');
		});
	});
});
