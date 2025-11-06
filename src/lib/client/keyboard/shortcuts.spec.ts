/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createKeyboardShortcutHandler } from './shortcuts';

describe('keyboard/shortcuts', () => {
	describe('createKeyboardShortcutHandler', () => {
		let mockButton: HTMLButtonElement;
		let onToggleClick: ReturnType<typeof vi.fn>;

		beforeEach(() => {
			mockButton = document.createElement('button');
			onToggleClick = vi.fn();

			// classList.add/remove をモック
			vi.spyOn(mockButton.classList, 'add');
			vi.spyOn(mockButton.classList, 'remove');
		});

		describe('Cmd/Ctrl + S でトグルボタンをクリック', () => {
			it('Meta + S (Mac)でトグルボタンがクリックされる', () => {
				const handler = createKeyboardShortcutHandler({
					toggleButton: mockButton,
					isSubmitting: false,
					onToggleClick,
				});

				const event = new KeyboardEvent('keydown', {
					key: 's',
					metaKey: true,
					bubbles: true,
					cancelable: true,
				});
				handler(event);

				expect(event.defaultPrevented).toBe(true);
				expect(mockButton.classList.add).toHaveBeenCalledWith('keyboard-triggered');
				expect(onToggleClick).toHaveBeenCalledOnce();
			});

			it('Ctrl + S (Windows/Linux)でトグルボタンがクリックされる', () => {
				const handler = createKeyboardShortcutHandler({
					toggleButton: mockButton,
					isSubmitting: false,
					onToggleClick,
				});

				const event = new KeyboardEvent('keydown', {
					key: 's',
					ctrlKey: true,
					bubbles: true,
					cancelable: true,
				});
				handler(event);

				expect(event.defaultPrevented).toBe(true);
				expect(onToggleClick).toHaveBeenCalledOnce();
			});
		});

		describe('入力フィールド内では無効化', () => {
			it('input要素内では Cmd+S が無視される', () => {
				const input = document.createElement('input');
				const handler = createKeyboardShortcutHandler({
					toggleButton: mockButton,
					isSubmitting: false,
					onToggleClick,
				});

				const event = new KeyboardEvent('keydown', {
					key: 's',
					metaKey: true,
					bubbles: true,
					cancelable: true,
				});
				Object.defineProperty(event, 'target', { value: input, configurable: true });

				handler(event);

				expect(event.defaultPrevented).toBe(false);
				expect(onToggleClick).not.toHaveBeenCalled();
			});

			it('textarea要素内では Cmd+S が無視される', () => {
				const textarea = document.createElement('textarea');
				const handler = createKeyboardShortcutHandler({
					toggleButton: mockButton,
					isSubmitting: false,
					onToggleClick,
				});

				const event = new KeyboardEvent('keydown', {
					key: 's',
					metaKey: true,
					bubbles: true,
					cancelable: true,
				});
				Object.defineProperty(event, 'target', { value: textarea, configurable: true });

				handler(event);

				expect(event.defaultPrevented).toBe(false);
				expect(onToggleClick).not.toHaveBeenCalled();
			});

			it('contenteditable要素内では Cmd+S が無視される', () => {
				const div = document.createElement('div');
				div.setAttribute('contenteditable', 'true');
				const handler = createKeyboardShortcutHandler({
					toggleButton: mockButton,
					isSubmitting: false,
					onToggleClick,
				});

				const event = new KeyboardEvent('keydown', {
					key: 's',
					metaKey: true,
					bubbles: true,
					cancelable: true,
				});
				Object.defineProperty(event, 'target', { value: div, configurable: true });

				handler(event);

				expect(event.defaultPrevented).toBe(false);
				expect(onToggleClick).not.toHaveBeenCalled();
			});
		});

		describe('送信中は無効化', () => {
			it('isSubmitting=true の場合、ショートカットが無視される', () => {
				const handler = createKeyboardShortcutHandler({
					toggleButton: mockButton,
					isSubmitting: true,
					onToggleClick,
				});

				const event = new KeyboardEvent('keydown', {
					key: 's',
					metaKey: true,
					bubbles: true,
					cancelable: true,
				});
				handler(event);

				expect(event.defaultPrevented).toBe(true);
				expect(onToggleClick).not.toHaveBeenCalled();
			});
		});

		describe('ボタンが存在しない場合', () => {
			it('toggleButton=null の場合、エラーが発生しない', () => {
				const handler = createKeyboardShortcutHandler({
					toggleButton: null,
					isSubmitting: false,
					onToggleClick,
				});

				const event = new KeyboardEvent('keydown', {
					key: 's',
					metaKey: true,
					bubbles: true,
					cancelable: true,
				});

				expect(() => handler(event)).not.toThrow();
				expect(event.defaultPrevented).toBe(true);
				expect(onToggleClick).not.toHaveBeenCalled();
			});
		});

		describe('その他のキー操作', () => {
			it('Cmd+S 以外のキーは無視される', () => {
				const handler = createKeyboardShortcutHandler({
					toggleButton: mockButton,
					isSubmitting: false,
					onToggleClick,
				});

				const event = new KeyboardEvent('keydown', {
					key: 'a',
					metaKey: true,
					bubbles: true,
					cancelable: true,
				});
				handler(event);

				expect(event.defaultPrevented).toBe(false);
				expect(onToggleClick).not.toHaveBeenCalled();
			});

			it('修飾キーなしの S は無視される', () => {
				const handler = createKeyboardShortcutHandler({
					toggleButton: mockButton,
					isSubmitting: false,
					onToggleClick,
				});

				const event = new KeyboardEvent('keydown', {
					key: 's',
					bubbles: true,
					cancelable: true,
				});
				handler(event);

				expect(event.defaultPrevented).toBe(false);
				expect(onToggleClick).not.toHaveBeenCalled();
			});
		});

		describe('アニメーション効果', () => {
			it('ハイライトクラスが追加される', () => {
				const handler = createKeyboardShortcutHandler({
					toggleButton: mockButton,
					isSubmitting: false,
					onToggleClick,
				});

				const event = new KeyboardEvent('keydown', {
					key: 's',
					metaKey: true,
					bubbles: true,
					cancelable: true,
				});
				handler(event);

				expect(mockButton.classList.add).toHaveBeenCalledWith('keyboard-triggered');
			});
		});
	});
});
