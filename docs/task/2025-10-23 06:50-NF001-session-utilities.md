# NF-001: セッション管理ユーティリティの実装

## 概要
Redis（Heroku Key-Value Store 互換）にセッションを保存/検証/更新/削除するユーティリティを実装する。

## 背景
GitHub OAuth による認証後、サーバサイドセッションを Redis に保存して管理する方針。UTでは外部依存を避けるため、Redisクライアントはモックで検証する。

## 要件
- セッションは `session:{id}` 形式のキーで保存する。
- 値は `{ userId: string, createdAt: ISOString }` のJSON。
- TTLは30日（2592000秒）。
- 関数は Arrow Function を用いる。
- UTは Vitest、外部Redisに依存しない（モック使用）。

## 実装範囲
- `src/lib/server/auth/session.ts`
  - `createSession(userId: string): Promise<string>`
  - `validateSession(sessionId: string): Promise<{valid: true; userId: string} | {valid: false}>`
  - `refreshSession(sessionId: string): Promise<boolean>`
  - `deleteSession(sessionId: string): Promise<boolean>`
  - 定数: `SESSION_PREFIX`, `SESSION_TTL_SECONDS`
- `src/lib/server/auth/session.spec.ts`
  - 上記のTDD。
- 既存 `src/lib/server/config/redis.spec.ts` は外部接続を避けるためモックに置換。

## API仕様（契約）
- 入力
  - `userId`: UUID文字列。
  - `sessionId`: セッションID（UUIDなどの一意文字列）。
- 出力
  - `createSession`: 生成した `sessionId`。
  - `validateSession`: `valid` と `userId`（有効時）。
  - `refreshSession`: TTL更新に成功したか。
  - `deleteSession`: 削除件数>0 なら true。
- エラーモード
  - 例外は基本的に投げない（Redis障害時は上位でハンドル）。

## テスト（最小）
- 正常: create→validate で `valid: true` と `userId` を返す。
- TTL: refreshSession が TTL 更新を呼び出す。
- 削除: delete 後は validate が `valid: false`。
- 異常: 存在しないIDは `valid: false`。

## 受け入れ基準
- `pnpm test:unit` で全テストがFAILなし。
- UTは外部Redisに接続しない（接続ログ無し）。

## 備考
- 後続タスクで hooks.server.ts によるセッション検証/ユーザー注入、OAuthルート実装、Cookie設定を行う。