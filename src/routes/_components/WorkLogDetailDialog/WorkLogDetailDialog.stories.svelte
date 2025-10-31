<script lang="ts" context="module">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import WorkLogDetailDialog from './WorkLogDetailDialog.svelte';

	const { Story } = defineMeta({
		component: WorkLogDetailDialog,
		title: 'Components/WorkLogDetailDialog',
		tags: ['autodocs'],
		argTypes: {
			item: {
				control: 'object',
				description: '作業アイテム',
			},
			duration: {
				control: 'number',
				description: '作業時間（ミリ秒）',
			},
			onClose: {
				action: 'close',
				description: 'ダイアログを閉じる際のコールバック',
			},
		},
	});
</script>

<script lang="ts">
	// 通常の作業
	const normalItem = {
		id: '1',
		startedAt: '2025-10-25T09:00:00.000Z',
		endedAt: '2025-10-25T10:30:00.000Z',
		tags: ['バグ修正', 'ログイン', 'フロントエンド'],
		description: `# バグ修正: ログイン画面のエラーハンドリング

## 概要
ログイン画面で無効な認証情報を入力した際のエラーハンドリングを改善しました。

## 変更内容
- エラーメッセージの表示改善
- ローディング状態の表示
- **フォームバリデーション**の追加

## テスト
- 単体テスト追加
- E2Eテスト更新

\`\`\`typescript
const handleLogin = async () => {
  try {
    await login(email, password);
  } catch (error) {
    showError(error.message);
  }
};
\`\`\`

## 参考
- [Issue #123](https://example.com/issue/123)
- [Design Doc](https://example.com/design)`,
	};

	// 進行中の作業
	const activeItem = {
		id: '2',
		startedAt: '2025-10-25T11:00:00.000Z',
		endedAt: null,
		tags: ['開発', 'ユーザー設定'],
		description: '新機能開発: ユーザー設定画面の実装中',
	};

	// Markdownなし
	const plainItem = {
		id: '3',
		startedAt: '2025-10-25T13:00:00.000Z',
		endedAt: '2025-10-25T14:00:00.000Z',
		tags: ['レビュー'],
		description: 'コードレビュー対応とドキュメント更新',
	};

	// 空の説明
	const emptyItem = {
		id: '4',
		startedAt: '2025-10-25T15:00:00.000Z',
		endedAt: '2025-10-25T16:00:00.000Z',
		tags: [],
		description: '',
	};

	// 長い説明とコードブロック
	const longItem = {
		id: '5',
		startedAt: '2025-10-25T09:00:00.000Z',
		endedAt: '2025-10-25T17:00:00.000Z',
		tags: ['DB設計', 'スキーマ変更', 'マイグレーション'],
		description: `# データベース設計の見直し

## 実施内容

### スキーマ変更
- ユーザーテーブルのスキーマ変更
- インデックスの追加
- 外部キー制約の見直し

### 変更点

1. \`users\` テーブルに \`email_verified\` カラムを追加
2. \`created_at\` と \`updated_at\` にインデックスを追加
3. \`work_logs\` テーブルの外部キー制約を修正

#### SQLコード例

\`\`\`sql
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_updated_at ON users(updated_at);
\`\`\`

#### TypeScriptコード例

\`\`\`typescript
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});
\`\`\`

## チェックリスト
- [x] スキーマ定義の更新
- [x] マイグレーションファイルの作成
- [x] テストコードの作成
- [ ] 本番環境への適用（保留中）

## 注意事項

> ⚠️ **重要**: 本番環境への適用前に必ずステージング環境でテストすること。
> 
> データ量が多い場合、インデックス作成に時間がかかる可能性があります。

## パフォーマンスへの影響

| テーブル | レコード数 | インデックス作成時間 |
|---------|----------|------------------|
| users   | 10,000   | ~2秒             |
| work_logs | 100,000 | ~15秒            |

## 参考資料
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Drizzle ORM](https://orm.drizzle.team/)
- 社内Wiki: データベース設計ガイドライン`,
	};

	// リスト項目が多い
	const listItem = {
		id: '6',
		startedAt: '2025-10-25T10:00:00.000Z',
		endedAt: '2025-10-25T11:30:00.000Z',
		tags: ['レビュー', 'TypeScript', 'パフォーマンス'],
		description: `# コードレビュー対応

## 対応した指摘事項

### TypeScriptの型定義
- \`any\` 型の使用を削除
- 明示的な型注釈の追加
- ジェネリクス型の活用

### パフォーマンス
- 不要な再レンダリングの削除
- メモ化の追加
- 遅延読み込みの実装

### アクセシビリティ
- aria-label の追加
- キーボードナビゲーション対応
- スクリーンリーダー対応

### テスト
- エッジケースのテスト追加
- モックの改善
- カバレッジ向上（85% → 92%）

### ドキュメント
- JSDocコメントの追加
- README更新
- 使用例の追加`,
	};

	const noop = () => {};
</script>

<!-- デフォルト: Markdown付き -->
<Story
	name="Default"
	args={{
		item: normalItem,
		duration: 5400000, // 1時間30分（ミリ秒）
		onClose: noop,
	}}
/>

<!-- 進行中 -->
<Story
	name="Active"
	args={{
		item: activeItem,
		duration: null,
		onClose: noop,
	}}
/>

<!-- プレーンテキスト -->
<Story
	name="PlainText"
	args={{
		item: plainItem,
		duration: 3600000, // 1時間（ミリ秒）
		onClose: noop,
	}}
/>

<!-- 空の説明 -->
<Story
	name="EmptyDescription"
	args={{
		item: emptyItem,
		duration: 3600000, // 1時間（ミリ秒）
		onClose: noop,
	}}
/>

<!-- 長い説明とコードブロック -->
<Story
	name="LongWithCode"
	args={{
		item: longItem,
		duration: 28800000, // 8時間（ミリ秒）
		onClose: noop,
	}}
/>

<!-- リスト項目が多い -->
<Story
	name="ManyListItems"
	args={{
		item: listItem,
		duration: 5400000, // 1時間30分（ミリ秒）
		onClose: noop,
	}}
/>
