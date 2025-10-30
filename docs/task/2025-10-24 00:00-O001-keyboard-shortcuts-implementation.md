# タスク: O-001 キーボードショートカット実装

## 概要

作業開始/終了をキーボードショートカット（`Cmd/Ctrl + S`）で実行できるようにする。

## 前提条件

- 既存の作業開始/終了機能が正常に動作していること
- `+page.svelte` に WorkLogToggleButton コンポーネントが配置されていること

## タスクの分解

### ステップ1: ショートカットヘルプコンポーネントの作成

**目的**: ユーザーが利用可能なショートカットを確認できるUIを提供

**合格基準**:

- [ ] ショートカット一覧を表示するコンポーネントが作成される
- [ ] プラットフォームに応じた修飾キー（Cmd/Ctrl）を表示
- [ ] アクセシビリティ対応（aria-label等）

### ステップ2: キーボードイベントリスナーの実装

**目的**: ページレベルでキーボードショートカットを検出

**合格基準**:

- [ ] `Cmd/Ctrl + S` でトグルアクションが実行される
- [ ] 入力フィールドフォーカス時は無効化される
- [ ] イベントのデフォルト動作（ブラウザの保存ダイアログ）が抑制される
- [ ] macOS（metaKey）とWindows/Linux（ctrlKey）の両方で動作

**実装仕様**:

```typescript
// キーボードイベントの型定義
interface KeyboardShortcut {
	key: string;
	ctrlOrCmd: boolean;
	action: () => void;
}

// ショートカットの判定ロジック
const isShortcutKey = (event: KeyboardEvent, key: string): boolean => {
	return (event.metaKey || event.ctrlKey) && event.key === key;
};

// 入力フィールドかどうかの判定
const isInputElement = (element: Element | null): boolean => {
	if (!element) return false;
	const tagName = element.tagName.toLowerCase();
	return (
		tagName === 'input' ||
		tagName === 'textarea' ||
		element.getAttribute('contenteditable') === 'true'
	);
};
```

### ステップ3: トグルボタンとの連携

**目的**: ショートカットから既存のフォーム送信を実行

**合格基準**:

- [ ] ショートカットでトグルボタンのクリックと同じ処理が実行される
- [ ] 作業開始/終了の状態に応じて適切なアクションが実行される
- [ ] 既存のエラーハンドリングが機能する
- [ ] 成功/エラーメッセージが表示される

**実装方針**:

- `<form>` 要素への参照を保持
- `requestSubmit()` メソッドでフォーム送信を実行
- または、ボタン要素への参照を保持して `click()` を実行

### ステップ4: ビジュアルフィードバックの追加

**目的**: ショートカット実行時に視覚的なフィードバックを提供

**合格基準**:

- [ ] ショートカット実行時、対応するボタンにハイライト効果が表示される
- [ ] アニメーションは短時間（200-300ms）で完了する

**実装例**:

```typescript
// ボタンハイライトのアニメーション
const highlightButton = (buttonElement: HTMLElement) => {
	buttonElement.classList.add('keyboard-triggered');
	setTimeout(() => {
		buttonElement.classList.remove('keyboard-triggered');
	}, 300);
};
```

```css
/* ハイライトアニメーション */
.keyboard-triggered {
	animation: keyboard-pulse 300ms ease-in-out;
}

@keyframes keyboard-pulse {
	0%,
	100% {
		transform: scale(1);
	}
	50% {
		transform: scale(1.05);
		box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
	}
}
```

## 実装順序

1. **テスト作成** (TDD)
   - `+page.svelte` のキーボードショートカットテスト
   - KeyboardShortcutHelp コンポーネントのテスト

2. **コンポーネント実装**
   - KeyboardShortcutHelp コンポーネント
   - スタイリング

3. **メインページへの統合**
   - キーボードイベントリスナーの追加
   - フォーム送信との連携
   - ビジュアルフィードバック

4. **動作確認**
   - ブラウザでの手動テスト
   - 異なるプラットフォームでの確認

## テストケース

### ユニットテスト（`+page.svelte.spec.ts`）

```typescript
describe('Keyboard Shortcuts', () => {
	it('Cmd/Ctrl + S で作業を開始できる', async () => {
		// テスト実装
	});

	it('作業中に Cmd/Ctrl + S で作業を終了できる', async () => {
		// テスト実装
	});

	it('input要素フォーカス時はショートカットが無効', async () => {
		// テスト実装
	});

	it('macOSのCmd + S で動作する', async () => {
		// テスト実装
	});

	it('WindowsのCtrl + S で動作する', async () => {
		// テスト実装
	});
});
```

### KeyboardShortcutHelp コンポーネントテスト

```typescript
describe('KeyboardShortcutHelp', () => {
	it('ショートカット一覧が表示される', () => {
		// テスト実装
	});

	it('macOSでは Cmd キーを表示', () => {
		// テスト実装
	});

	it('WindowsではCtrl キーを表示', () => {
		// テスト実装
	});
});
```

## API・インターフェース

### KeyboardShortcutHelp Props

```typescript
type Props = {
	// プラットフォームを指定（テスト用）
	platform?: 'mac' | 'win' | 'auto';
};
```

### ショートカット定義

```typescript
type ShortcutDefinition = {
	key: string;
	description: string;
	modifierKeys: ('Cmd' | 'Ctrl' | 'Shift' | 'Alt')[];
};

const shortcuts: ShortcutDefinition[] = [
	{
		key: 'S',
		description: '作業を開始/終了',
		modifierKeys: ['Cmd', 'Ctrl'], // プラットフォームで自動選択
	},
];
```

## 注意事項

### ブラウザのデフォルト動作の抑制

`Cmd/Ctrl + S` は多くのブラウザで「ページを保存」のショートカットです。
`event.preventDefault()` を呼び出して、ブラウザのデフォルト動作を抑制する必要があります。

### 入力フィールドの判定

ユーザーがテキストを入力中（input, textarea, contenteditable）の場合、
ショートカットを無効にする必要があります。

```typescript
const target = event.target as HTMLElement;
if (target.matches('input, textarea, [contenteditable="true"]')) {
	return; // ショートカット無効
}
```

## 参考資料

- [Svelte - Event Handling](https://svelte.dev/docs/svelte/on)
- [MDN - KeyboardEvent.key](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key)
- [MDN - Event.preventDefault()](https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault)
