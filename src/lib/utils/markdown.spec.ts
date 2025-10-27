import { describe, it, expect } from 'vitest';
import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
	it('空文字列の場合は空文字列を返す', () => {
		expect(renderMarkdown('')).toBe('');
	});

	it('プレーンテキストをそのまま変換する', () => {
		const result = renderMarkdown('Hello World');
		expect(result).toContain('Hello World');
	});

	it('太字を変換する', () => {
		const result = renderMarkdown('**Bold Text**');
		expect(result).toContain('<strong>Bold Text</strong>');
	});

	it('斜体を変換する', () => {
		const result = renderMarkdown('*Italic Text*');
		expect(result).toContain('<em>Italic Text</em>');
	});

	it('コードブロックを変換する', () => {
		const result = renderMarkdown('`code`');
		expect(result).toContain('<code>code</code>');
	});

	it('リンクを変換する', () => {
		const result = renderMarkdown('[Link](https://example.com)');
		expect(result).toContain('<a href="https://example.com">Link</a>');
	});

	it('リストを変換する', () => {
		const result = renderMarkdown('- Item 1\n- Item 2');
		expect(result).toContain('<ul>');
		expect(result).toContain('<li>Item 1</li>');
		expect(result).toContain('<li>Item 2</li>');
	});

	it('見出しを変換する', () => {
		const result = renderMarkdown('# Heading 1');
		expect(result).toContain('<h1');
		expect(result).toContain('Heading 1');
	});

	it('改行を<br>に変換する', () => {
		const result = renderMarkdown('Line 1\nLine 2');
		expect(result).toContain('Line 1');
		expect(result).toContain('Line 2');
	});

	it('XSS攻撃を防ぐ - script タグ', () => {
		const result = renderMarkdown('<script>alert("XSS")</script>');
		expect(result).not.toContain('<script>');
		expect(result).not.toContain('alert');
	});

	it('XSS攻撃を防ぐ - onerror 属性', () => {
		const result = renderMarkdown('<img src="x" onerror="alert(\'XSS\')">');
		expect(result).not.toContain('onerror');
	});

	it('許可されたHTMLタグは保持する', () => {
		const result = renderMarkdown('<strong>Bold</strong>');
		expect(result).toContain('<strong>Bold</strong>');
	});
});
