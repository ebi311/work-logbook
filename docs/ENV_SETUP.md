# 環境変数設定ガイド

このファイルは環境変数の設定例です。実際の環境変数は `.env` ファイルに設定してください。

## 初期セットアップ

1. このファイルをコピーして `.env` ファイルを作成:

   ```bash
   cp .env.example .env
   ```

2. `.env` ファイルを編集して、実際の値を設定してください。

## 環境変数の説明

### DATABASE_URL

PostgreSQLデータベースの接続URL

- **開発環境（devContainer内）**: `postgres://root:mysecretpassword@db.localtest.me:5432/local`
  - devContainer内では Neon HTTP Proxy を経由してローカルPostgreSQLに接続します
  - ホスト名を `db.localtest.me` にすることで、Neon SDK が開発モードで動作します
- **開発環境（ホスト）**: `postgres://root:mysecretpassword@localhost:5432/local`
- **本番環境**: Vercel Postgres または Neon から自動で設定

### GitHub OAuth設定

#### GITHUB_CLIENT_ID

GitHub OAuth AppのクライアントID

設定手順:

1. https://github.com/settings/developers にアクセス
2. "New OAuth App" をクリック
3. 以下を入力:
   - Application name: Work Logbook (開発)
   - Homepage URL: http://localhost:5173
   - Authorization callback URL: http://localhost:5173/auth/callback
4. 生成されたClient IDをコピー

#### GITHUB_CLIENT_SECRET

GitHub OAuth Appのクライアントシークレット

- OAuth App作成時に生成される
- **重要**: このシークレットは絶対に公開しないでください

#### GITHUB_CALLBACK_URL

OAuth認証後のコールバックURL

- **開発環境**: `http://localhost:5173/auth/callback`
- **本番環境**: `https://your-app.herokuapp.com/auth/callback`

### SESSION_SECRET

セッションの署名に使用するシークレットキー

生成方法:

```bash
# Node.jsで生成
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# またはOpenSSLで生成
openssl rand -hex 32
```

**重要**: 最低32文字以上のランダムな文字列を使用してください。

### ALLOWED_GITHUB_IDS

アクセスを許可するGitHub IDのリスト（カンマ区切り）

GitHub IDの確認方法:

1. https://api.github.com/users/YOUR_GITHUB_USERNAME にアクセス
2. JSONレスポンスの `id` フィールドを確認

例: `ALLOWED_GITHUB_IDS="12345678,87654321"`

**注意**: この設定が空の場合、誰もログインできません。

### REDIS_URL

Redisの接続URL（セッション管理用）

- **開発環境**: `redis://localhost:6379` (Docker Composeで起動)
- **本番環境 (Vercel)**: Vercel KV (Redis) が自動で設定
- **本番環境 (Heroku)**: Heroku Key-Value Store アドオンが自動で設定

## ローカル開発環境の構成

### Neon HTTP Proxy を使用した開発環境

このプロジェクトでは、本番環境で Neon Database を使用しているため、ローカル開発環境でも同じ接続方法（HTTP経由）でPostgreSQLにアクセスできるように Neon HTTP Proxy を使用しています。

#### Docker Compose 構成

`.devcontainer/docker-compose.yml` で以下のサービスが起動します:

1. **db**: PostgreSQL データベース（ポート5432）
2. **neon-proxy**: Neon HTTP Proxy（ポート4444）
   - PostgreSQLへのHTTPベースのアクセスを提供
   - Neon SDK との互換性を保つ
3. **redis**: Redis サーバー（ポート6379）
4. **app**: 開発用コンテナ

#### 動作の仕組み

1. アプリケーションコードは `@neondatabase/serverless` を使用してクエリを実行
2. `DATABASE_URL` のホスト名が `db.localtest.me` の場合、開発モードとして認識
3. `src/lib/server/db/index.ts` の設定により、HTTPリクエストが `neon-proxy:4444` に送信される
4. Neon Proxy がそのリクエストを PostgreSQL に変換して実行
5. 結果が HTTP レスポンスとして返される

この構成により、本番環境と同じコード（Neon SDK）を使用しながら、ローカルのPostgreSQLで開発できます。

#### 設定ファイル

**`.env.local`**:

```bash
DATABASE_URL="postgres://root:mysecretpassword@db.localtest.me:5432/local"
```

**`src/lib/server/db/index.ts`** (開発環境での設定):

```typescript
if (process.env.NODE_ENV === 'development') {
	neonConfig.fetchEndpoint = (host) => {
		const [protocol, port] = host === 'db.localtest.me' ? ['http', 4444] : ['https', 443];
		return `${protocol}://neon-proxy:${port}/sql`;
	};
	neonConfig.useSecureWebSocket = false;
	neonConfig.wsProxy = (host) => 'neon-proxy:4444/v2';
	neonConfig.pipelineConnect = false;
}
```

### REDIS_URL

Redisの接続URL（セッション管理用）

- **開発環境**: `redis://localhost:6379` (Docker Composeで起動)
- **本番環境 (Vercel)**: Vercel KV (Redis) が自動で設定
- **本番環境 (Heroku)**: Heroku Key-Value Store アドオンが自動で設定

## セキュリティに関する注意

- `.env` ファイルは `.gitignore` に含まれており、Gitにコミットされません
- 本番環境の環境変数は Vercel の Environment Variables または Heroku の Config Vars で管理してください
- `GITHUB_CLIENT_SECRET` と `SESSION_SECRET` は絶対に公開しないでください

## トラブルシューティング

### エラー: "GITHUB_CLIENT_ID is not set"

→ `.env` ファイルに `GITHUB_CLIENT_ID` が設定されているか確認してください

### エラー: "SESSION_SECRET is not set"

→ `.env` ファイルに `SESSION_SECRET` を設定してください（最低32文字）

### ログインできない

→ `ALLOWED_GITHUB_IDS` にあなたのGitHub IDが含まれているか確認してください
