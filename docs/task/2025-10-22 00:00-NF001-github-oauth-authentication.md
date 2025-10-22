# タスク: NF-001 GitHub OAuth 認証機能の実装

タスク作成日: 2025-10-22  
要件: NF-001 (GitHub認証), NF-002 (ユーザー制限)

## 目的

- GitHub OAuth 2.0による認証機能を実装する
- 登録済みユーザー(ホワイトリスト)のみがログインできるようにする
- 現在の仮ユーザー実装(`hooks.server.ts`)を本格的な認証に置き換える

## 前提条件

- GitHub OAuth Appの登録が完了していること
  - Client ID と Client Secret を取得済み
  - Callback URL: `http://localhost:5173/auth/callback` (開発環境)
- 環境変数で認証情報を管理する

## 実装ステップ

### ステップ1: データベーススキーマの設計

**目的**: ユーザー情報を管理するためのテーブルを定義する

**テーブル仕様**:

1. **users テーブル**
   - `id`: UUID (PK) - 内部ユーザーID
   - `github_id`: TEXT (UNIQUE, NOT NULL) - GitHubのユーザーID
   - `github_username`: TEXT (NOT NULL) - GitHubのユーザー名
   - `github_email`: TEXT (NULLABLE) - GitHubのメールアドレス
   - `avatar_url`: TEXT (NULLABLE) - プロフィール画像URL
   - `is_active`: BOOLEAN (DEFAULT true) - アカウントの有効/無効
   - `created_at`: TIMESTAMPTZ (DEFAULT NOW())
   - `updated_at`: TIMESTAMPTZ (DEFAULT NOW())

**マイグレーション**:
- `work_logs` テーブルの `user_id` を `users.id` への外部キー制約に変更

**セッション管理**:
- セッション情報は **Heroku Key-Value Store** に保存する
- PostgreSQLには保存しない

**合格基準**:
- スキーマファイルが正しく定義されている
- マイグレーションが正常に実行できる
- 既存の `work_logs` データとの整合性が保たれる

---

### ステップ2: 環境変数とOAuth設定

**目的**: GitHub OAuth認証に必要な設定を環境変数で管理する

**環境変数**:
```env
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_CALLBACK_URL=http://localhost:5173/auth/callback
SESSION_SECRET=random_secret_key_for_signing
ALLOWED_GITHUB_IDS=12345678,87654321  # ホワイトリスト (GitHub ID)
```

**実装内容**:
- `.env.example` ファイルの作成
- 環境変数の型定義 (`$env/static/private` の利用)
- 設定の読み込みとバリデーション

**合格基準**:
- 環境変数が正しく読み込まれる
- 環境変数が未設定の場合、適切なエラーメッセージが表示される

---

### ステップ3: Heroku Key-Value Store セットアップ

**目的**: Heroku Key-Value Store をプロジェクトに統合する

**Heroku Key-Value Store について**:
- Herokuが提供するRedis互換のKey-Valueストア
- セッションデータの保存に最適
- TTL（Time To Live）による自動削除をサポート

**環境変数**:
```env
HEROKU_REDIS_URL=redis://...  # Heroku が自動でセット
```

**依存関係の追加**:
```json
{
  "dependencies": {
    "redis": "^4.6.0"  # Node.js用Redisクライアント
  }
}
```

**合格基準**:
- Heroku Key-Value Store アドオンがプロビジョニングされている
- 環境変数 `HEROKU_REDIS_URL` が設定されている
- Redis クライアントライブラリがインストールされている

---

### ステップ4: セッション管理ユーティリティの実装

**目的**: Heroku Key-Value Store を使用したセッション管理を実装する

**実装ファイル**: `src/lib/server/auth/session.ts`

**Redis接続の設定**:
```typescript
import { createClient } from 'redis';
import { HEROKU_REDIS_URL } from '$env/static/private';

const redis = createClient({ url: HEROKU_REDIS_URL });
await redis.connect();
```

**API設計**:

```typescript
// セッション作成
export const createSession = async (userId: string): Promise<string>
// - セッションIDを生成 (crypto.randomUUID())
// - Key: `session:{sessionId}`, Value: `{userId, createdAt}`
// - TTL: 30日間 (2592000秒)
// - セッションIDを返す

// セッション検証
export const validateSession = async (sessionId: string): Promise<User | null>
// - Redis から `session:{sessionId}` を取得
// - 存在しない場合は null
// - userId から users テーブルでユーザー情報を取得
// - User オブジェクトを返す

// セッション削除
export const deleteSession = async (sessionId: string): Promise<void>
// - Redis から `session:{sessionId}` を削除

// セッション延長
export const refreshSession = async (sessionId: string): Promise<void>
// - TTLを30日間にリセット
```

**データ構造**:
```
Key: session:{uuid}
Value: {"userId":"xxx","createdAt":"2025-10-22T12:00:00Z"}
TTL: 2592000秒 (30日)
```

**合格基準**:
- Redis接続が正常に確立される
- 各関数のユニットテストが通る（モックRedis使用）
- セッションのTTLが正しく機能する
- 無効なセッションIDに対して適切に処理される

---

### ステップ5: GitHub OAuth認証フローの実装

**目的**: GitHub OAuthによるログイン/ログアウト機能を実装する

**実装ファイル**:
- `src/routes/auth/login/+server.ts` - ログインエンドポイント
- `src/routes/auth/callback/+server.ts` - OAuthコールバック
- `src/routes/auth/logout/+server.ts` - ログアウトエンドポイント

**ログインフロー** (`/auth/login`):
1. GitHub OAuth認証URLを生成
2. `state` パラメータを生成してセッションに保存 (CSRF対策)
3. GitHubの認証ページにリダイレクト

**コールバックフロー** (`/auth/callback`):
1. `code` と `state` パラメータを検証
2. GitHub APIでアクセストークンを取得
3. GitHub APIでユーザー情報を取得 (ID, username, email, avatar_url)
4. ホワイトリスト (ALLOWED_GITHUB_IDS) をチェック
5. ユーザーがホワイトリストにない場合 → エラーページへ
6. ユーザー情報をDBに保存/更新 (`users` テーブル)
7. セッションを作成し、クッキーにセット
8. トップページ (`/`) にリダイレクト

**ログアウトフロー** (`/auth/logout`):
1. セッションIDをクッキーから取得
2. セッションを Heroku Key-Value Store から削除
3. クッキーをクリア
4. ログインページにリダイレクト

**合格基準**:
- 認証フロー全体が正常に動作する
- CSRF対策が実装されている
- ホワイトリストに無いユーザーはログインできない
- セッションが正しく作成・削除される

---

### ステップ6: hooks.server.ts の更新

**目的**: リクエストごとにセッションを検証し、`locals.user` にユーザー情報をセットする

**実装ファイル**: `src/hooks.server.ts`

**実装内容**:
```typescript
export const handle: Handle = async ({ event, resolve }) => {
	const { locals, cookies } = event;
	
	// セッションIDをクッキーから取得
	const sessionId = cookies.get('session_id');
	
	if (sessionId) {
		// セッション検証
		const user = await validateSession(sessionId);
		if (user) {
			locals.user = user;
		} else {
			// 無効なセッションの場合、クッキーをクリア
			cookies.delete('session_id', { path: '/' });
		}
	}
	
	const response = await resolve(event);
	return response;
};
```

**合格基準**:
- 有効なセッションの場合、`locals.user` が正しくセットされる
- 無効なセッションの場合、クッキーがクリアされる
- 既存の `+page.server.ts` の認証チェックが正常に機能する

---

### ステップ7: ログインページの実装

**目的**: 未認証ユーザー向けのログインページを作成する

**実装ファイル**:
- `src/routes/login/+page.svelte` - ログインページ
- `src/routes/login/+page.server.ts` - サーバーロード関数

**UI要件**:
- アプリのタイトルと説明
- "GitHubでログイン" ボタン
- シンプルで使いやすいデザイン

**実装内容**:
```typescript
// +page.server.ts
export const load = async ({ locals }) => {
	// すでにログイン済みの場合はリダイレクト
	if (locals.user) {
		throw redirect(303, '/');
	}
	return {};
};
```

**合格基準**:
- ログイン済みユーザーはトップページにリダイレクトされる
- "GitHubでログイン" ボタンが正しく動作する

---

### ステップ8: 認証エラーページの実装

**目的**: ホワイトリストに無いユーザーがログインしようとした場合のエラーページ

**実装ファイル**: `src/routes/auth/error/+page.svelte`

**UI要件**:
- エラーメッセージ: "アクセスが許可されていません"
- 説明: "このアプリケーションは登録済みユーザーのみ利用できます"
- "戻る" ボタン

**合格基準**:
- エラーページが適切に表示される
- わかりやすいメッセージが表示される

---

### ステップ9: トップページの認証ガード

**目的**: 未認証ユーザーをログインページにリダイレクトする

**実装ファイル**: `src/routes/+page.server.ts` (既存)

**実装内容**:
```typescript
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}
	
	// 既存のロジック...
};
```

**合格基準**:
- 未認証ユーザーは自動的にログインページにリダイレクトされる
- 認証済みユーザーは通常通りアプリを利用できる

---

### ステップ10: ユニットテストの作成

**目的**: 認証機能の各モジュールに対するテストを作成する

**テストファイル**:
- `src/lib/server/auth/session.spec.ts` - セッション管理のテスト
- `src/routes/auth/callback/+server.spec.ts` - コールバックのテスト

**テスト項目**:
- セッションの作成・検証・削除
- GitHub OAuth コールバック処理
- ホワイトリストチェック
- エラーハンドリング

**合格基準**:
- すべてのテストが通る
- カバレッジが80%以上

---

### ステップ11: E2Eテストの作成

**目的**: 認証フロー全体のE2Eテストを作成する

**テストファイル**: `e2e/auth.test.ts`

**テストシナリオ**:
1. 未認証ユーザーがトップページにアクセス → ログインページにリダイレクト
2. ログインボタンをクリック → GitHub認証ページにリダイレクト (モック)
3. 認証成功 → トップページに戻る
4. ログアウト → ログインページにリダイレクト

**合格基準**:
- E2Eテストが正常に実行される
- 認証フロー全体が正しく動作する

---

## 技術メモ

### 使用ライブラリ

**GitHub OAuth**: 外部ライブラリを使わずに直接実装

**セッション管理**: Heroku Key-Value Store (Redis)
- `redis`: Node.js用Redisクライアント (v4.6.0以上)

将来的に複雑になる場合は、以下のライブラリの導入を検討:
- `arctic`: シンプルなOAuth 2.0クライアント
- `connect-redis`: Express/Connect用のRedisセッションストア

### セキュリティ考慮事項

- セッションIDは暗号的に安全な乱数で生成する (`crypto.randomUUID()`)
- クッキーには `httpOnly`, `secure`, `sameSite` 属性を設定する
- CSRF対策として `state` パラメータを使用する
- 環境変数で機密情報を管理し、リポジトリにコミットしない

### Heroku Key-Value Store 考慮事項

- **TTL (Time To Live)**: セッションは30日後に自動削除される
- **接続管理**: Redis接続をシングルトンとして管理し、接続プールを効率的に使用
- **エラーハンドリング**: Redis接続エラー時のフォールバック処理を実装
- **ローカル開発**: Docker ComposeでRedisコンテナを起動して開発環境を構築

### データベース考慮事項

- 既存の `work_logs` テーブルの `user_id` は文字列型なので、新しい `users.id` との互換性を保つ
- マイグレーション時に既存データを `users` テーブルに移行する
- セッション情報はPostgreSQLではなくKey-Value Storeに保存する

---

## 実装順序の推奨

1. ステップ1 (DBスキーマ)
2. ステップ2 (環境変数設定)
3. ステップ3 (Heroku Key-Value Store セットアップ)
4. ステップ4 (セッション管理) → ステップ5 (OAuth認証フロー)
5. ステップ6 (hooks.server.ts) → ステップ7 (ログインページ)
6. ステップ8 (エラーページ) → ステップ9 (認証ガード)
7. ステップ10 (ユニットテスト) → ステップ11 (E2Eテスト)

---

## 完了条件

- [ ] すべてのステップが実装されている
- [ ] ユニットテストが通る
- [ ] E2Eテストが通る
- [ ] 既存の作業記録機能が正常に動作する
- [ ] ホワイトリストに無いユーザーはログインできない
- [ ] セッション管理が正しく機能する
- [ ] 本番環境での動作確認が完了している
