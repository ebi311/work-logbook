# 作業記録 F-002 仕様（作業内容の入力）

F-002「作業内容の入力」の仕様。Markdown形式での記述に対応。

最終更新: 2025-01-27

## 目的・ゴール

- 作業開始時または終了時に、作業内容を記録できるようにする
- Markdown形式で記述することで、リッチな表現を可能にする
- 後から編集・閲覧時にMarkdownをレンダリングして表示する
- シンプルな入力でストレスなく記録できることを重視

## 関連要件

- 前提: F-001「作業開始・終了」が実装済み
- 関連: F-004「作業記録の編集・削除」（未実装）
- 関連: F-005「作業一覧の表示」（実装済み）

## 用語

- **作業内容（description）**: 作業の詳細を記述するテキストフィールド（Markdown対応）
- **Markdown**: 軽量マークアップ言語。見出し、リスト、コードブロックなどを簡単に記述できる

## ユースケース

### UC-001: 作業開始時に内容を入力

1. ユーザーが作業内容を入力フィールドに記述（オプション）
2. 「作業開始」ボタンをクリック
3. システムは作業記録を作成し、入力された内容を保存

### UC-002: 作業終了時に内容を追記・修正

1. 作業中の状態で、内容入力フィールドが表示されている
2. ユーザーが作業内容を追記・修正
3. 「作業終了」ボタンをクリック
4. システムは作業を終了し、更新された内容を保存

### UC-003: 作業内容の閲覧

1. 作業一覧画面で過去の作業記録を表示
2. 各作業の内容がMarkdownレンダリングされて表示される
3. 見出し、リスト、コードブロックなどが適切に整形される

## データモデル

### DBスキーマ拡張

`work_logs` テーブルに以下のカラムを追加:

```sql
ALTER TABLE work_logs
ADD COLUMN description TEXT NOT NULL DEFAULT '';
```

| カラム名    | 型   | NULL許可 | デフォルト | 説明                     |
| ----------- | ---- | -------- | ---------- | ------------------------ |
| description | TEXT | NO       | ''         | 作業内容（Markdown形式） |

### ドメインモデル拡張

`WorkLog` クラスに `description` プロパティを追加:

```typescript
export class WorkLog {
	// ... 既存のプロパティ
	readonly description: string;
}
```

バリデーション:

- 型: `string`（空文字列を許可、nullは不可）
- 最大長: 10,000文字（データベース制約は設けない）
- デフォルト値: 空文字列 `''`

## UI/UX設計

### 画面要素

#### 1. 作業内容入力フィールド

- **位置**: トグルボタン（作業開始/終了）の上または横
- **タイプ**: `<textarea>` 要素
- **プレースホルダー**: "作業内容を入力（Markdown対応）"
- **行数**: 初期3行、自動拡張（最大10行程度）
- **スタイル**: モノスペースフォントを使用してMarkdownの記述を見やすくする

#### 2. Markdownヘルプ

- **表示**: 入力フィールドの近くに「？」アイコンまたは「Markdownヘルプ」リンク
- **内容**: クリックでモーダルまたはトグル表示
  - 見出し: `# 見出し1`, `## 見出し2`
  - リスト: `- 項目`, `1. 番号付き`
  - 太字: `**太字**`
  - イタリック: `*イタリック*`
  - コードブロック: ` ```言語 `
  - インラインコード: `` `コード` ``

#### 3. プレビュー機能（オプション）

- **表示**: 入力フィールドの下に「プレビュー」タブ
- **動作**: 入力内容をリアルタイムでMarkdownレンダリング
- **実装優先度**: 低（MVPでは不要）

### 状態別の表示

| 状態       | 入力フィールド | 編集可否 | 保存タイミング         |
| ---------- | -------------- | -------- | ---------------------- |
| 停止中     | 表示           | 可能     | 作業開始時に保存       |
| 作業中     | 表示           | 可能     | 作業終了時に保存       |
| 一覧表示時 | 非表示         | 不可     | レンダリング済みを表示 |

## インタラクション仕様

### 作業開始フロー

```
[停止中]
  ↓ ユーザーが内容を入力（オプション）
[内容入力済み]
  ↓ 「作業開始」クリック
[Server Action: start]
  - startedAt: 現在時刻
  - description: 入力内容（または null）
  ↓ 成功
[作業中]
  - description が保存される
  - 入力フィールドは引き続き編集可能
```

### 作業終了フロー

```
[作業中]
  ↓ ユーザーが内容を編集（オプション）
[内容更新済み]
  ↓ 「作業終了」クリック
[Server Action: stop]
  - endedAt: 現在時刻
  - description: 更新された内容
  ↓ 成功
[停止中]
  - description が保存される
  - 一覧に反映される
```

### エラーハンドリング

| エラーケース               | HTTP Status | 動作                                                 |
| -------------------------- | ----------- | ---------------------------------------------------- |
| description が10,000文字超 | 400         | エラーメッセージ表示: "作業内容は10,000文字以内です" |
| Markdownパースエラー       | -           | クライアント側でエスケープして安全に表示             |

## Server Actions 設計

### load 関数の拡張

既存の load 関数に description を含める:

```typescript
return {
	active: activeWorkLog
		? {
				id: activeWorkLog.id,
				startedAt: activeWorkLog.startedAt.toISOString(),
				endedAt: null,
				description: activeWorkLog.description, // 追加
			}
		: undefined,
	// ... その他
};
```

### actions.start の拡張

```typescript
start: async ({ request, locals }) => {
	const formData = await request.formData();
	const description = formData.get('description') as string | null;

	// デフォルト値として空文字列を使用
	const sanitizedDescription = description?.trim() || '';

	// バリデーション
	if (sanitizedDescription.length > 10000) {
		return fail(400, { reason: 'DESCRIPTION_TOO_LONG' });
	}

	// WorkLog 作成時に description を含める
	const workLog = await startWorkLog(userId, sanitizedDescription);

	return {
		workLog: {
			/* ... description を含む */
		},
		serverNow: new Date().toISOString(),
	};
};
```

### actions.stop の拡張

```typescript
stop: async ({ request, locals }) => {
  const formData = await request.formData();
  const description = formData.get('description') as string | null;

  // デフォルト値として空文字列を使用
  const sanitizedDescription = description?.trim() || '';

  // バリデーション
  if (sanitizedDescription.length > 10000) {
    return fail(400, { reason: 'DESCRIPTION_TOO_LONG' });
  }

  // WorkLog 終了時に description を更新
  const workLog = await stopWorkLog(userId, sanitizedDescription);

  return {
    workLog: { /* ... description を含む */ },
    serverNow: new Date().toISOString(),
    durationSec: /* ... */
  };
}
```

## Markdownレンダリング

### ライブラリ選定

推奨: **marked** または **markdown-it**

- **marked**: シンプルで軽量、Svelte との相性が良い
- **markdown-it**: 拡張性が高い、プラグインが豊富

セキュリティ対策:

- **DOMPurify** または **marked** の sanitize オプションを使用
- XSS攻撃を防ぐため、HTMLタグをエスケープ

### 実装例（Svelte コンポーネント）

```svelte
<script lang="ts">
	import { marked } from 'marked';
	import DOMPurify from 'isomorphic-dompurify';

	type Props = {
		description: string;
	};

	let { description }: Props = $props();

	const renderMarkdown = (md: string): string => {
		if (md === '') return '';
		const html = marked.parse(md);
		return DOMPurify.sanitize(html);
	};
</script>

<div class="markdown-content">
	{@html renderMarkdown(description)}
</div>

<style>
	.markdown-content {
		/* Markdownスタイル定義 */
		font-size: 0.875rem;
		line-height: 1.6;
	}

	.markdown-content :global(h1) {
		font-size: 1.5rem;
		font-weight: bold;
		margin-bottom: 0.5rem;
	}

	.markdown-content :global(h2) {
		font-size: 1.25rem;
		font-weight: bold;
		margin-bottom: 0.5rem;
	}

	.markdown-content :global(ul) {
		list-style: disc;
		margin-left: 1.5rem;
	}

	.markdown-content :global(code) {
		background-color: #f3f4f6;
		padding: 0.125rem 0.25rem;
		border-radius: 0.25rem;
		font-family: monospace;
	}

	.markdown-content :global(pre) {
		background-color: #1f2937;
		color: #f9fafb;
		padding: 1rem;
		border-radius: 0.5rem;
		overflow-x: auto;
	}

	.markdown-content :global(pre code) {
		background-color: transparent;
		padding: 0;
	}
</style>
```

## バリデーション/ルール

1. **文字数制限**: 10,000文字以内（クライアント・サーバー両方でチェック）
2. **空文字列の扱い**: 空文字列 `''` をデフォルト値として許可（`null` は不可）
3. **改行の保持**: Markdown の仕様に従い、改行を保持
4. **HTMLエスケープ**: ユーザー入力のHTMLタグはエスケープ（セキュリティ）

## テスト観点

### ユニットテスト

1. **WorkLog モデル**
   - description が空文字列の場合（デフォルト値）
   - description が有効な文字列の場合
   - description が null の場合（エラー）

2. **Server Actions**
   - start: description ありで作業開始
   - start: description なしで作業開始
   - stop: description を更新して作業終了
   - stop: description が10,000文字を超える場合のエラー

3. **Markdownレンダリング**
   - 見出しが正しくレンダリングされる
   - リストが正しくレンダリングされる
   - コードブロックが正しくレンダリングされる
   - HTMLタグがエスケープされる（XSS対策）

### E2Eテスト

1. 作業開始時に内容を入力して保存
2. 作業中に内容を編集して終了
3. 一覧でMarkdownレンダリングされた内容が表示される
4. 10,000文字を超える入力でエラーメッセージが表示される

## 実装の優先順位

### Phase 1: 基本機能（必須）

1. DBマイグレーション: `work_logs.description` カラム追加
2. ドメインモデル拡張: `WorkLog` に description 追加
3. Server Actions 拡張: start/stop に description 対応
4. UI: textarea 追加（作業開始/終了画面）

### Phase 2: 表示機能（必須）

5. Markdown レンダリングコンポーネント作成
6. 作業一覧での description 表示
7. セキュリティ対策: DOMPurify 導入

### Phase 3: UX改善（オプション）

8. Markdownヘルプの追加
9. プレビュー機能（タブ切り替え）
10. 自動保存機能（下書き保存）

## デザイン指針

- **シンプル第一**: 複雑なエディタは避け、プレーンな textarea を基本とする
- **Markdownの利点を活かす**: キーボードだけで構造化された文書を作成できる
- **視認性**: レンダリング時は読みやすいスタイルを適用
- **モバイル対応**: スマートフォンでも快適に入力できるサイズと配置

## 将来の拡張案

- リアルタイムプレビュー
- Markdown エディタ（ツールバー付き）
- テンプレート機能（よく使う内容の保存）
- ファイル添付機能
- 画像の埋め込み（Markdown 記法）

## 参考リソース

- [Marked.js](https://marked.js.org/)
- [DOMPurify](https://github.com/cure53/DOMPurify)
- [Markdown Guide](https://www.markdownguide.org/)
