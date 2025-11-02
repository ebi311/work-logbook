import { marked } from 'marked';
import { browser } from '$app/environment';

// DOMPurifyの動的インポート（クライアントサイドのみ）
let DOMPurify: typeof import('dompurify').default | null = null;

if (browser) {
	import('dompurify').then((module) => {
		DOMPurify = module.default;
	});
}

/**
 * MarkdownをサニタイズされたHTMLに変換する
 * @param markdown Markdown文字列
 * @returns サニタイズされたHTML文字列
 */
export const renderMarkdown = (markdown: string): string => {
	if (!markdown) {
		return '';
	}

	// Markdownをパース
	const rawHtml = marked.parse(markdown, {
		breaks: true, // 改行を<br>に変換
		gfm: true, // GitHub Flavored Markdown
	}) as string;

	// クライアントサイドでのみサニタイズ
	// サーバーサイドではMarkedの出力をそのまま返す（Markedは基本的に安全）
	if (!browser || !DOMPurify) {
		return rawHtml;
	}

	// XSS対策のためサニタイズ
	const cleanHtml = DOMPurify.sanitize(rawHtml, {
		ALLOWED_TAGS: [
			'p',
			'br',
			'strong',
			'em',
			'u',
			's',
			'code',
			'pre',
			'a',
			'ul',
			'ol',
			'li',
			'blockquote',
			'h1',
			'h2',
			'h3',
			'h4',
			'h5',
			'h6',
			'hr',
			'table',
			'thead',
			'tbody',
			'tr',
			'th',
			'td',
		],
		ALLOWED_ATTR: ['href', 'target', 'rel'],
	});

	return cleanHtml;
};
