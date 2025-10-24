import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import KeyboardShortcutHelp from './KeyboardShortcutHelp.svelte';

describe('KeyboardShortcutHelp', () => {
	it('ショートカット一覧が表示される', () => {
		render(KeyboardShortcutHelp);

		// タイトルが表示される
		expect(screen.getByText(/キーボードショートカット/i)).toBeInTheDocument();

		// 作業開始/終了のショートカットが表示される
		expect(screen.getByText(/作業を開始\/終了/i)).toBeInTheDocument();
	});

	it('macOSでは Cmd キーを表示', () => {
		// macOS環境をシミュレート
		Object.defineProperty(window.navigator, 'platform', {
			value: 'MacIntel',
			configurable: true
		});

		render(KeyboardShortcutHelp, {
			props: {
				platform: 'mac'
			}
		});

		// Cmd が表示される
		expect(screen.getByText(/⌘/)).toBeInTheDocument();
	});

	it('WindowsではCtrl キーを表示', () => {
		render(KeyboardShortcutHelp, {
			props: {
				platform: 'win'
			}
		});

		// Ctrl が表示される
		expect(screen.getByText(/Ctrl/)).toBeInTheDocument();
	});

	it('platformが指定されない場合は自動判定', () => {
		// デフォルトでは navigator.platform をチェック
		render(KeyboardShortcutHelp);

		// どちらかのキーが表示される
		const hasCmd = screen.queryByText(/⌘/);
		const hasCtrl = screen.queryByText(/Ctrl/);
		expect(hasCmd || hasCtrl).toBeTruthy();
	});

	it('アクセシビリティ: role="region"が設定される', () => {
		const { container } = render(KeyboardShortcutHelp);

		const region = container.querySelector('[role="region"]');
		expect(region).toBeInTheDocument();
	});

	it('アクセシビリティ: aria-labelが設定される', () => {
		const { container } = render(KeyboardShortcutHelp);

		const region = container.querySelector('[aria-label]');
		expect(region).toBeInTheDocument();
		expect(region?.getAttribute('aria-label')).toBe('キーボードショートカット一覧');
	});
});
