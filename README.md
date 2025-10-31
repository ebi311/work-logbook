# Work Logbook - フリーランスITエンジニアのための作業記録アプリ

フリーランスITエンジニアが作業記録を素早く、ストレスなく記録・管理できるWebアプリケーションです。

## 📝 概要

このアプリケーションは、フリーランスITエンジニアの日々の作業管理と月次報告書作成を効率化することを目的としています。

### 主な特徴

- **⚡ 素早い記録**: ワンクリックで作業の開始・終了を記録
- **🏷️ タグ管理**:
  - 作業内容を複数のタグで分類・整理
  - スペース区切りで複数タグを一度に入力
  - オートコンプリート機能で過去のタグをサジェスト
  - 使用頻度順に候補を表示
  - 日本語タグも完全サポート（IME対応）
- **📊 月次レポート**: 作業記録をCSV形式でエクスポート
- **✏️ 柔軟な編集**: 過去の作業記録を自由に編集・削除
- **⌨️ キーボードショートカット**: `Cmd/Ctrl + S` で素早く作業開始
- **🎯 シンプル設計**: 多機能さよりも、思考を中断させずに使えることを重視

詳細なコンセプトと機能要件については [CONCEPT.md](CONCEPT.md) を参照してください。

## 🛠️ 技術スタック

### フレームワーク

#### **SvelteKit** (v2.43.2)

フルスタックのWebアプリケーションフレームワークです。Svelteをベースに、ルーティング、サーバーサイドレンダリング（SSR）、APIエンドポイントなどの機能を提供します。

- **Svelte 5** (v5.39.5): 最新のリアクティブフレームワーク。コンパイル時に最適化され、高速で軽量なWebアプリケーションを構築できます
- **@sveltejs/adapter-node** (v5.3.2): Node.js環境へのデプロイ用アダプター

### データベース

#### **PostgreSQL** + **Drizzle ORM**

- **postgres** (v3.4.7): PostgreSQLクライアントライブラリ
- **drizzle-orm** (v0.44.5): TypeScript優先のORMで、型安全なデータベース操作を実現
- **drizzle-kit** (v0.31.4): マイグレーション管理とスキーマ生成ツール

データベースはDockerコンテナで管理され、開発環境の構築が容易です。

### スタイリング

#### **Tailwind CSS** (v4.1.13)

ユーティリティファーストのCSSフレームワークで、迅速なUI開発を可能にします。

- **@tailwindcss/typography** (v0.5.18): タイポグラフィのためのプラグイン
- **@tailwindcss/vite** (v4.1.13): Vite用のTailwind CSS統合
- **daisyUI** (v5.3.7): Tailwind CSS用のコンポーネントライブラリ。美しいUIコンポーネントを簡単に利用できます

### ビルドツール

#### **Vite** (v7.1.7)

高速なビルドツールおよび開発サーバー。ホットモジュールリプレースメント（HMR）により、開発体験が大幅に向上します。

### 開発ツール

#### **TypeScript** (v5.9.2)

型安全性を提供し、大規模なアプリケーション開発をサポートします。

#### **ESLint** (v9.36.0) + **Prettier** (v3.6.2)

- **eslint-plugin-svelte** (v3.12.4): Svelte用のESLintルール
- **prettier-plugin-svelte** (v3.4.0): Svelteファイルのフォーマット
- **prettier-plugin-tailwindcss** (v0.6.14): Tailwind CSSクラスの自動ソート

コード品質と一貫性を保つための静的解析およびフォーマットツールです。

#### **Storybook** (v9.1.13)

UIコンポーネントの開発・テスト・ドキュメント化のための環境です。

- **@storybook/sveltekit** (v9.1.13): SvelteKit用のStorybook統合
- **@storybook/addon-a11y** (v9.1.13): アクセシビリティチェック
- **@storybook/addon-docs** (v9.1.13): 自動ドキュメント生成
- **@storybook/addon-svelte-csf** (v5.0.10): Svelteコンポーネントストーリーフォーマットのサポート

### テスト

#### **Vitest** (v3.2.4)

Viteベースの高速なユニットテストフレームワークです。

- **@vitest/browser** (v3.2.4): ブラウザ環境でのテスト
- **vitest-browser-svelte** (v1.1.0): Svelteコンポーネントのブラウザテスト

#### **Playwright** (v1.55.1)

エンドツーエンド（E2E）テストフレームワーク。実際のブラウザでアプリケーションをテストします。

## 🚀 セットアップ

### 前提条件

- **Node.js**: v18以上
- **pnpm**: v8以上（推奨パッケージマネージャー）
- **Docker**: データベース環境用

### インストール手順

1. **リポジトリのクローン**

```sh
git clone <repository-url>
cd work-logbook
```

2. **依存関係のインストール**

```sh
pnpm install
```

3. **環境変数の設定**

`.env.example`をコピーして`.env`ファイルを作成し、必要な環境変数を設定します。

```sh
cp .env.example .env
```

4. **データベースの起動**

```sh
pnpm db:start
```

5. **データベースのマイグレーション**

```sh
pnpm db:push
```

## 💻 開発

### 開発サーバーの起動

```sh
pnpm dev

# ブラウザを自動的に開く場合
pnpm dev -- --open
```

開発サーバーは `http://localhost:5173` で起動します。

### データベース管理

```sh
# データベースコンテナの起動
pnpm db:start

# スキーマの適用
pnpm db:push

# マイグレーションファイルの生成
pnpm db:generate

# Drizzle Studioの起動（データベースGUI）
pnpm db:studio
```

### Storybookの起動

コンポーネント開発環境を起動します。

```sh
pnpm storybook
```

`http://localhost:6006` でアクセスできます。

## 🧪 テスト

### ユニットテストの実行

```sh
# テスト実行（watch mode）
pnpm test:unit

# テスト実行（1回のみ）
pnpm test:unit -- --run
```

### E2Eテストの実行

```sh
pnpm test:e2e
```

### すべてのテストの実行

```sh
pnpm test
```

## 🏗️ ビルド

### 本番用ビルド

```sh
pnpm build
```

ビルドされたアプリケーションは`build`ディレクトリに出力されます。

### ビルドのプレビュー

```sh
pnpm preview
```

## 📋 コード品質

### フォーマット

```sh
# コードのフォーマット
pnpm format

# フォーマットチェック
pnpm lint
```

### 型チェック

```sh
# 型チェックの実行
pnpm check

# 型チェック（watch mode）
pnpm check:watch
```

## 📂 プロジェクト構造

```
work-logbook/
├── src/
│   ├── db/
│   │   └── schema.ts     # データベーススキーマ定義
│   ├── models/           # モデル定義（サーバー・クライアント共通）
│   ├── lib/              # 共有コンポーネントとユーティリティ
│   │   └── server/       # サーバーサイドのコード
│   │       └── db/       # データベーススキーマと設定
│   ├── routes/           # SvelteKitのルート定義
│   └── stories/          # Storybookストーリー
├── static/               # 静的ファイル
├── e2e/                  # E2Eテスト
├── drizzle.config.ts     # Drizzle ORM設定
├── svelte.config.js      # Svelte設定
├── vite.config.ts        # Vite設定
├── playwright.config.ts  # Playwright設定
└── docker-compose.yml    # データベースコンテナ設定
```

### コンポーネントの構成規則

#### ページ固有のコンポーネント

SvelteKitの予約ファイル（`+page.svelte`、`+layout.svelte`など）以外のページ固有コンポーネントは、同じディレクトリの`_components/`以下に配置します。

```
src/routes/work-logs/
├── +page.svelte              # ページファイル
├── +page.server.ts           # サーバーロード関数
└── _components/              # ページ固有のコンポーネント
    ├── WorkLogList/
    │   ├── WorkLogList.svelte
    │   ├── WorkLogList.spec.ts
    │   ├── WorkLogList.stories.svelte
    │   └── testData.ts
    └── WorkLogForm/
        ├── WorkLogForm.svelte
        ├── WorkLogForm.spec.ts
        ├── WorkLogForm.stories.svelte
        └── mockData.json
```

#### コンポーネントディレクトリの構成

各コンポーネントは専用のディレクトリを持ち、関連するファイルをまとめて管理します。

- **コンポーネントファイル**: `ComponentName.svelte` - Svelteコンポーネント本体
- **テストファイル**: `ComponentName.spec.ts` - Vitestによるユニットテスト
- **Storybookファイル**: `ComponentName.stories.svelte` - UIカタログとドキュメント
- **テストデータ**: `testData.ts`、`mockData.json`など - テストやStorybookで使用するデータ

#### 共有コンポーネント

複数のページで使用する共有コンポーネントは`src/lib/components/`に配置します。

```
src/lib/components/
├── Button/
│   ├── Button.svelte
│   ├── Button.spec.ts
│   └── Button.stories.svelte
└── Tag/
    ├── Tag.svelte
    ├── Tag.spec.ts
    ├── Tag.stories.svelte
    └── tagColors.ts
```

## ✨ 実装済み機能

### F-001: 作業開始・終了

- ワンクリックで作業の開始・終了を記録
- 進行中の作業がある場合はエラー表示
- サーバー時刻で正確な記録

### F-002: 作業内容の入力

- Markdownテキストエリアで作業内容を記述
- プレビュー機能（計画中）

### F-003: タグ付け ✅ NEW

作業記録にタグを付けて分類・整理できます。

#### 主な機能

- **複数タグの入力**: スペース区切りで一度に複数タグを入力
- **オートコンプリート**:
  - 過去に使用したタグを自動でサジェスト
  - 使用頻度順に表示（よく使うタグが上位に）
  - キーボード操作対応（↑↓、Enter、Escape）
- **日本語サポート**: IME入力に完全対応（日本語タグも問題なし）
- **バリデーション**:
  - タグ数: 最大20個
  - タグ名: 1〜100文字
  - 自動トリミング、重複除去
- **タグ編集**: 過去の作業記録のタグも編集可能
- **タグ表示**: 作業一覧にバッジ形式で表示

#### 使い方

1. 作業内容入力欄の下にあるタグ入力フィールドに入力
2. 文字を入力すると過去のタグがサジェスト表示
3. スペースで区切って複数タグを入力
4. 作業開始・終了時に自動保存

#### 技術的な特徴

- デバウンス処理（300ms）による効率的なAPI呼び出し
- DBインデックスによる高速検索
- トランザクション管理による整合性保証

### F-004: 作業記録の編集・削除

- 過去の作業記録の編集（開始時刻、終了時刻、内容、タグ）
- 作業記録の削除（確認ダイアログ付き）
- 編集モーダルでの直感的な操作

### F-005/F-006: 作業一覧とフィルタリング

- 月単位での作業一覧表示
- ページネーション対応
- 月次合計時間の表示
- 日付によるフィルタリング

### O-001: キーボードショートカット

- `Cmd/Ctrl + S`: 作業開始・終了
- `?`: ヘルプ表示
- テキストエリアにフォーカスがある場合は無効化

### NF-001: GitHub OAuth認証

- GitHub アカウントでのログイン
- セッション管理（Heroku Key-Value Store使用）
- 自動ログアウト機能

## 🎯 今後の実装予定

- [ ] タグでのフィルタリング機能（F-006拡張）
- [ ] コマンドパレット機能
- [ ] PWA（Progressive Web App）対応
- [ ] Googleスプレッドシート連携
- [ ] レポートテンプレートのカスタマイズ機能
- [ ] タグクラウド表示
- [ ] タグの色カスタマイズ

詳細は [CONCEPT.md](CONCEPT.md) の要件リストを参照してください。

## 📄 ライセンス

このプロジェクトはプライベートプロジェクトです。

## 🤝 貢献

現在、このプロジェクトは個人用途を目的としています。
