/**
 * キーボードショートカット処理
 *
 * @module lib/client/keyboard/shortcuts
 */

/**
 * キーボードショートカットハンドラーのオプション
 */
export interface KeyboardShortcutOptions {
	/** トグルボタン要素 (null の場合はクリックしない) */
	toggleButton: HTMLElement | null;
	/** 送信中フラグ (true の場合はショートカットを無効化) */
	isSubmitting: boolean;
	/** トグルボタンクリック時のコールバック */
	onToggleClick: () => void;
}

/**
 * キーボードショートカットの判定と処理を行うハンドラーを作成
 *
 * ## サポートされているショートカット
 * - Cmd/Ctrl + S: トグルボタンのクリック
 *
 * ## 無効化される条件
 * - 入力フィールド（input/textarea/contenteditable）内での操作
 * - 送信中 (isSubmitting=true)
 * - トグルボタンが存在しない
 *
 * @param options - キーボードショートカットのオプション
 * @returns キーボードイベントハンドラー
 *
 * @example
 * ```ts
 * const handler = createKeyboardShortcutHandler({
 *   toggleButton: buttonElement,
 *   isSubmitting: false,
 *   onToggleClick: () => buttonElement.click()
 * });
 * window.addEventListener('keydown', handler);
 * ```
 */
export const createKeyboardShortcutHandler = (
	options: KeyboardShortcutOptions,
): ((event: KeyboardEvent) => void) => {
	return (event: KeyboardEvent) => {
		// Cmd/Ctrl + S
		if ((event.metaKey || event.ctrlKey) && event.key === 's') {
			// 入力フィールドにフォーカスがある場合は無効
			const target = event.target as HTMLElement;
			if (
				target &&
				typeof target.matches === 'function' &&
				target.matches('input, textarea, [contenteditable="true"]')
			) {
				return;
			}

			// ブラウザのデフォルト動作（保存ダイアログ）を抑制
			event.preventDefault();

			// トグルボタンをクリック
			if (options.toggleButton && !options.isSubmitting) {
				// ボタンにハイライト効果を追加
				options.toggleButton.classList.add('keyboard-triggered');
				setTimeout(() => {
					options.toggleButton?.classList.remove('keyboard-triggered');
				}, 300);

				// ボタンをクリック
				options.onToggleClick();
			}
		}
	};
};

/**
 * キーボードショートカットのハイライト効果を削除
 *
 * @param element - 対象の要素
 */
export const removeKeyboardHighlight = (element: HTMLElement | null): void => {
	if (element) {
		element.classList.remove('keyboard-triggered');
	}
};
