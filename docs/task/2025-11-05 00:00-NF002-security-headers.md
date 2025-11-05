# タスク: セキュリティヘッダーの設定 (CORS, CSP)

## タスクID

NF-002

## 関連要件

NF-002: セキュリティヘッダーの設定

## 目的

Web アプリケーションに適切な CORS と CSP、その他のセキュリティヘッダーを設定し、セキュリティを強化する。

## 実装ステップ

### Step 1: セキュリティヘッダーユーティリティの作成

#### ファイル構成

- `src/lib/server/security/headers.ts`: セキュリティヘッダー生成ユーティリティ

#### 機能仕様

- 環境に応じたセキュリティヘッダーを生成
- 開発環境と本番環境で異なる設定を適用
- CSP, CORS, その他のセキュリティヘッダーを包括的に設定

#### セキュリティヘッダー一覧

| ヘッダー名                | 開発環境                        | 本番環境                        | 目的                     |
| ------------------------- | ------------------------------- | ------------------------------- | ------------------------ |
| Content-Security-Policy   | 緩和                            | 厳格                            | XSS攻撃の防止            |
| X-Frame-Options           | DENY                            | DENY                            | クリックジャッキング防止 |
| X-Content-Type-Options    | nosniff                         | nosniff                         | MIMEスニッフィング防止   |
| Referrer-Policy           | strict-origin-when-cross-origin | strict-origin-when-cross-origin | リファラー情報の制限     |
| Permissions-Policy        | 制限                            | 制限                            | ブラウザ機能の制限       |
| Strict-Transport-Security | -                               | 有効                            | HTTPS強制                |

#### CSP ディレクティブ

**本番環境:**

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self' data:;
connect-src 'self';
frame-ancestors 'none';
base-uri 'self';
form-action 'self' https://github.com;
```

**開発環境:**

- `script-src` に `'unsafe-eval'` を追加（Vite HMR用）
- `connect-src` に `ws://localhost:*` を追加（Vite HMR用）

### Step 2: hooks.server.ts への統合

#### 実装内容

1. セキュリティヘッダーユーティリティをインポート
2. `handle` 関数内でレスポンスヘッダーに追加
3. 既存の認証ロジックと共存させる

#### 実装位置

- レスポンス生成後、return 前にヘッダーを追加

### Step 3: 動作確認

#### 確認項目

- [x] 開発環境でアプリが正常に動作する
- [x] Vite HMR が正常に動作する (開発環境用CSP設定済み)
- [x] GitHub OAuth ログインが正常に動作する (form-action に GitHub を追加済み)
- [x] ブラウザの開発者ツールでセキュリティヘッダーが設定されていることを確認
  - Content-Security-Policy: ✓
  - X-Frame-Options: DENY ✓
  - X-Content-Type-Options: nosniff ✓
  - Referrer-Policy: strict-origin-when-cross-origin ✓
  - Permissions-Policy: ✓
- [x] CSP 違反がコンソールに出力されないことを確認
- [x] すべてのユニットテスト(512個)が成功

#### 確認コマンド

```bash
# 開発サーバー起動
pnpm dev

# ヘッダー確認（別ターミナルで）
curl -I http://localhost:5173
```

## 合格基準

1. **セキュリティヘッダーの設定**
   - すべてのレスポンスに適切なセキュリティヘッダーが含まれる
   - 環境に応じて適切なポリシーが適用される

2. **機能の維持**
   - 既存の認証機能が正常に動作する
   - GitHub OAuth ログインが正常に動作する
   - 開発環境で Vite HMR が正常に動作する

3. **セキュリティの向上**
   - CSP によって XSS 攻撃のリスクが軽減される
   - その他のヘッダーによってセキュリティが強化される

## 実装上の注意

1. **`'unsafe-inline'` の使用**
   - SvelteKit は現状 `'unsafe-inline'` が必要
   - 将来的に nonce ベースの CSP に移行することが望ましい

2. **GitHub OAuth**
   - `form-action` に `https://github.com` を含める
   - リダイレクトが正常に動作することを確認

3. **画像の読み込み**
   - `img-src` に `data:` と `https:` を含める（アバター画像等のため）

4. **開発環境の考慮**
   - Vite の WebSocket 接続を許可
   - `eval()` の使用を許可（開発時のみ）

## テスト方針

### 単体テスト

- セキュリティヘッダー生成関数のテスト
- 環境変数による切り替えのテスト

### 統合テスト

- 実際のHTTPレスポンスにヘッダーが含まれることを確認
- GitHub OAuth フローの動作確認

### セキュリティテスト

- ブラウザの開発者ツールで CSP 違反をチェック
- オンラインのセキュリティヘッダーチェッカーで確認
  - https://securityheaders.com/
  - https://observatory.mozilla.org/
