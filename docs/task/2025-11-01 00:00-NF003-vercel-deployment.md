# NF-003: Vercel へのデプロイ

## 概要

Work Logbook アプリケーションを Vercel にデプロイするための設定と手順をまとめたタスク。

## 背景

- アプリケーションのMVP機能（F-001〜F-006）が完成
- 現在は `@sveltejs/adapter-node` を使用しているが、Vercel デプロイには `@sveltejs/adapter-vercel` が必要
- 環境変数の設定と外部サービス（PostgreSQL、Redis）の接続設定が必要

## 前提条件

- SvelteKit アプリケーションが動作している
- GitHub リポジトリにコードがプッシュされている
- PostgreSQL と Redis が必要（外部サービスを利用）

## タスクの分解

### ステップ1: Vercel アダプターへの切り替え

**目的**: SvelteKit を Vercel にデプロイできるようにする

**作業内容**:

1. `@sveltejs/adapter-vercel` のインストール
2. `svelte.config.js` の修正
3. `@sveltejs/adapter-node` の削除

**実装手順**:

```bash
# adapter-vercel をインストール
pnpm add -D @sveltejs/adapter-vercel

# adapter-node をアンインストール
pnpm remove @sveltejs/adapter-node
```

**svelte.config.js の修正**:

```javascript
import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			// Vercel の Edge Functions を使用する場合は runtime: 'edge' を指定
			// Node.js ランタイムを使用する場合は省略可能
			runtime: 'nodejs20.x',
		}),
	},
};

export default config;
```

**検証方法**:

```bash
# ビルドが成功することを確認
pnpm build
```

### ステップ2: PostgreSQL データベースの準備

**目的**: Vercel から接続可能な PostgreSQL データベースを用意する

**選択肢**:

1. **Vercel Postgres** (推奨)
   - Vercel の公式 PostgreSQL サービス
   - 簡単な統合
   - 料金: Hobby プランは無料（制限あり）

2. **Neon**
   - サーバーレス PostgreSQL
   - 無料プランが充実
   - 自動スケーリング

3. **Supabase**
   - PostgreSQL + 認証などの機能
   - 無料プランあり

**推奨**: Vercel Postgres を使用

**作業内容**:

1. Vercel ダッシュボードでプロジェクトを作成
2. Storage タブから Postgres を追加
3. 接続文字列を環境変数として取得

**環境変数**:

- `POSTGRES_URL`: フル機能の接続文字列
- `POSTGRES_PRISMA_URL`: Prisma/Drizzle 用（プーリング対応）
- `POSTGRES_URL_NON_POOLING`: マイグレーション用

### ステップ3: Redis の準備

**目的**: セッション管理用の Redis を用意する

**選択肢**:

1. **Vercel KV** (推奨)
   - Vercel の公式 Redis サービス
   - 簡単な統合
   - 料金: Hobby プランは無料（制限あり）

2. **Upstash**
   - サーバーレス Redis
   - 無料プランあり
   - Vercel との統合が簡単

**推奨**: Vercel KV を使用

**作業内容**:

1. Vercel ダッシュボードで Storage タブから KV を追加
2. 環境変数が自動的に設定される

**環境変数**:

- `KV_URL`: Redis 接続URL
- `KV_REST_API_URL`: REST API URL
- `KV_REST_API_TOKEN`: REST API トークン
- `KV_REST_API_READ_ONLY_TOKEN`: 読み取り専用トークン

### ステップ4: GitHub OAuth アプリの設定

**目的**: 本番環境用の GitHub OAuth アプリを作成

**作業内容**:

1. GitHub Settings → Developer settings → OAuth Apps へ移動
2. "New OAuth App" をクリック
3. 以下を入力:
   - **Application name**: `Work Logbook (Production)`
   - **Homepage URL**: `https://your-app.vercel.app`（実際のVercel URLに置き換え）
   - **Authorization callback URL**: `https://your-app.vercel.app/auth/callback`
4. Client ID と Client Secret を取得

**注意事項**:

- 開発環境と本番環境で別々の OAuth App を使用すること
- Client Secret は安全に保管すること

### ステップ5: 環境変数の設定

**目的**: Vercel に必要な環境変数を設定する

**設定する環境変数**:

| 変数名                 | 説明                         | 取得方法                                            |
| ---------------------- | ---------------------------- | --------------------------------------------------- |
| `DATABASE_URL`         | PostgreSQL接続URL            | Vercel Postgres から自動設定                        |
| `POSTGRES_PRISMA_URL`  | Drizzle用接続URL             | Vercel Postgres から自動設定                        |
| `KV_URL`               | Redis接続URL                 | Vercel KV から自動設定                              |
| `GITHUB_CLIENT_ID`     | GitHub OAuth Client ID       | GitHub OAuth App から取得                           |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Client Secret   | GitHub OAuth App から取得                           |
| `GITHUB_CALLBACK_URL`  | OAuth コールバックURL        | `https://your-app.vercel.app/auth/callback`         |
| `SESSION_SECRET`       | セッション署名用シークレット | `openssl rand -hex 32` で生成                       |
| `ALLOWED_GITHUB_IDS`   | 許可するGitHub IDリスト      | `https://api.github.com/users/YOUR_USERNAME` で確認 |

**設定方法**:

1. Vercel ダッシュボード → プロジェクト → Settings → Environment Variables
2. 各変数を追加
3. 環境（Production, Preview, Development）を選択

### ステップ6: データベースマイグレーションの実行

**目的**: 本番データベースにスキーマを適用する

**方法1: Vercel CLI を使用**

```bash
# Vercel CLI をインストール
npm i -g vercel

# ログイン
vercel login

# 本番環境の環境変数をプル
vercel env pull .env.production

# マイグレーション実行
DATABASE_URL=$(grep POSTGRES_PRISMA_URL .env.production | cut -d '=' -f2-) pnpm db:push
```

**方法2: GitHub Actions を使用**

`.github/workflows/migrate.yml` を作成して、デプロイ時に自動でマイグレーションを実行する。

**検証**:

- Drizzle Studio で本番データベースに接続してテーブルを確認

### ステップ7: vercel.json の作成（オプション）

**目的**: ビルド設定やリダイレクトなどをカスタマイズする

**vercel.json の例**:

```json
{
	"buildCommand": "pnpm build",
	"installCommand": "pnpm install",
	"framework": "sveltekit",
	"outputDirectory": "build",
	"regions": ["nrt1"],
	"env": {
		"NODE_VERSION": "20"
	}
}
```

**説明**:

- `regions`: デプロイリージョン（`nrt1` = 東京）
- `NODE_VERSION`: Node.js バージョン

### ステップ8: デプロイ実行

**目的**: アプリケーションを Vercel にデプロイする

**方法1: GitHub 連携（推奨）**

1. Vercel ダッシュボードで "Add New Project"
2. GitHub リポジトリを選択
3. フレームワークプリセットで "SvelteKit" を選択
4. 環境変数を設定
5. "Deploy" をクリック

**自動デプロイ**:

- `main` ブランチへのプッシュで自動的に本番デプロイ
- プルリクエストでプレビューデプロイが自動作成

**方法2: Vercel CLI を使用**

```bash
# プロジェクトにリンク
vercel link

# プレビューデプロイ
vercel

# 本番デプロイ
vercel --prod
```

### ステップ9: デプロイ後の確認

**目的**: デプロイが正常に完了したことを確認する

**確認項目**:

1. **アプリケーションの起動**
   - デプロイされたURLにアクセスできるか
   - エラーが表示されていないか

2. **認証機能**
   - GitHub でログインできるか
   - ログアウトできるか
   - 許可されたユーザーのみアクセスできるか

3. **作業記録機能**
   - 作業を開始・終了できるか
   - データが保存されるか
   - 一覧表示されるか

4. **データベース接続**
   - PostgreSQL に接続できているか
   - データが永続化されているか

5. **セッション管理**
   - Redis に接続できているか
   - ログイン状態が維持されるか

**デバッグ方法**:

- Vercel ダッシュボードの Logs タブでエラーログを確認
- ブラウザの開発者ツールでネットワークエラーを確認

### ステップ10: ドキュメントの更新

**目的**: デプロイ手順を文書化する

**作成するドキュメント**:

1. **README.md の更新**
   - デプロイ済みアプリケーションのURLを追加
   - デプロイ手順の概要を記載

2. **DEPLOYMENT.md の作成**
   - 詳細なデプロイ手順
   - トラブルシューティング
   - ロールバック手順

## 合格基準

- [ ] `@sveltejs/adapter-vercel` でビルドが成功する
- [ ] Vercel Postgres に接続できる
- [ ] Vercel KV (Redis) に接続できる
- [ ] GitHub OAuth 認証が本番環境で動作する
- [ ] Vercel にデプロイされたアプリケーションが正常に動作する
- [ ] 作業の開始・終了・一覧表示が正常に動作する
- [ ] データが永続化される
- [ ] セッションが維持される
- [ ] 環境変数が正しく設定されている
- [ ] デプロイ手順がドキュメント化されている

## 注意事項

### セキュリティ

- 環境変数は `.env` ファイルに保存し、Git にコミットしない
- `GITHUB_CLIENT_SECRET` と `SESSION_SECRET` は厳重に管理する
- `ALLOWED_GITHUB_IDS` で許可ユーザーを制限する

### コスト

- Vercel Hobby プランの制限を確認する
  - 月間ビルド時間: 100時間
  - 関数実行時間: 100GB-時間
  - KV ストレージ: 256MB
  - Postgres ストレージ: 256MB
- 必要に応じて有料プランへのアップグレードを検討

### データベース接続

- Vercel Functions はステートレスなため、接続プーリングが重要
- `POSTGRES_PRISMA_URL` を使用してプーリングを有効化
- 接続数の上限に注意（Vercel Postgres Hobby: 60接続）

### パフォーマンス

- 初回アクセス時はコールドスタートが発生する可能性がある
- Edge Functions の使用を検討（レイテンシー削減）
- 静的ファイルは自動的に CDN にキャッシュされる

## 参考資料

- [Vercel Deployment Documentation](https://vercel.com/docs/deployments/overview)
- [SvelteKit Vercel Adapter](https://kit.svelte.dev/docs/adapter-vercel)
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
- [Vercel KV](https://vercel.com/docs/storage/vercel-kv)
- [Drizzle ORM with Vercel Postgres](https://orm.drizzle.team/docs/get-started-postgresql#vercel-postgres)

## 実装予定日

2025-11-01

## 実装者

ebi311
