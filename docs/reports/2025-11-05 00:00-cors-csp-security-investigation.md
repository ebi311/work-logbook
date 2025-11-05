# CORS と CSP のセキュリティ設定調査レポート

## 調査日時

2025-11-05

## 目的

Work Logbook アプリケーションに適切な CORS (Cross-Origin Resource Sharing) と CSP (Content Security Policy) を設定する。

## 現状の問題

- CORS ポリシーが設定されていない
- CSP ヘッダーが設定されていない
- セキュリティヘッダーが不足している

## 推奨する設定

### 1. CORS (Cross-Origin Resource Sharing)

#### 概要

- 同一オリジン以外からのリクエストを制限する仕組み
- このアプリは自身のフロントエンドのみがAPIを使用するため、厳格なCORS設定が望ましい

#### 推奨設定

```typescript
// 基本的に同一オリジンのみ許可
Access-Control-Allow-Origin: (リクエスト元と同じオリジン、または未設定)
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH
Access-Control-Allow-Headers: Content-Type, Authorization
```

### 2. CSP (Content Security Policy)

#### 概要

- XSS (クロスサイトスクリプティング) 攻撃を防ぐ仕組み
- どのソースからスクリプトやスタイルを読み込めるかを制限

#### 推奨設定

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

**注意**:

- `'unsafe-inline'` は SvelteKit の開発環境で必要だが、本番環境では nonce または hash ベースに移行することが望ましい
- GitHub OAuth のリダイレクトを考慮する必要がある

### 3. その他のセキュリティヘッダー

#### X-Frame-Options

- クリックジャッキング攻撃を防ぐ

```
X-Frame-Options: DENY
```

#### X-Content-Type-Options

- MIME タイプスニッフィングを防ぐ

```
X-Content-Type-Options: nosniff
```

#### Referrer-Policy

- リファラー情報の送信を制限

```
Referrer-Policy: strict-origin-when-cross-origin
```

#### Permissions-Policy

- ブラウザの機能へのアクセスを制限

```
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

#### Strict-Transport-Security (HSTS)

- HTTPS 接続を強制（本番環境のみ）

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## 実装方法

### SvelteKit の hooks.server.ts で実装

- `handle` 関数内でレスポンスヘッダーを設定
- 環境変数で本番/開発を切り替え

### Vercel の設定

- `vercel.json` でヘッダーを設定することも可能
- ただし、動的な設定が必要な場合は hooks.server.ts が適している

## 注意点

1. **GitHub OAuth との互換性**
   - GitHub へのリダイレクトが正しく動作するか確認
   - `form-action` と `connect-src` に GitHub のドメインが必要な場合がある

2. **開発環境との互換性**
   - 開発環境では一部のポリシーを緩和する必要がある
   - Vite の HMR (Hot Module Replacement) が動作するように設定

3. **段階的な導入**
   - まず Report-Only モードで影響を確認
   - 問題がなければ Enforce モードに切り替え

## 参考資料

- [MDN: CORS](https://developer.mozilla.org/ja/docs/Web/HTTP/CORS)
- [MDN: CSP](https://developer.mozilla.org/ja/docs/Web/HTTP/CSP)
- [SvelteKit: Hooks](https://kit.svelte.dev/docs/hooks)
- [OWASP: Security Headers](https://owasp.org/www-project-secure-headers/)
