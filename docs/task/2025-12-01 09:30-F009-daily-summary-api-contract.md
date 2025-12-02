# Task: F-009 Daily Summary API Contract (+page.server.ts)

最終更新: 2025-12-01T09:30:00Z

## 目的

`+page.server.ts` のサーバロード関数が返却するフィールド契約を、`DailySummaryData` モデルに整合する形で定義する。

## ビュー別レスポンス契約

### view = `daily`

| フィールド名       | 型                        | 必須 | 説明                         |
| ------------------ | ------------------------- | ---- | ---------------------------- |
| `active`           | オブジェクトまたは null   | ○    | 進行中の作業（F-001系）      |
| `serverNow`        | 文字列（ISO）             | ○    | サーバー時刻                 |
| `tagSuggestions`   | 配列                      | ○    | タグ候補（F-003系）          |
| `previousEndedAt`  | 文字列または null         | ○    | 直前の作業終了時刻           |
| `dailySummaryData` | Promise<DailySummaryData> | ○    | 日別集計データ（モデル準拠） |
| `view`             | `'daily'`                 | ○    | ビュー種別                   |

注: `listData` は返却しない（フィールド未含）。

### view = `list`

| フィールド名      | 型                      | 必須 | 説明                       |
| ----------------- | ----------------------- | ---- | -------------------------- |
| `active`          | オブジェクトまたは null | ○    | 進行中の作業               |
| `serverNow`       | 文字列（ISO）           | ○    | サーバー時刻               |
| `tagSuggestions`  | 配列                    | ○    | タグ候補                   |
| `previousEndedAt` | 文字列または null       | ○    | 直前の作業終了時刻         |
| `listData`        | Promise<ListData>       | ○    | 作業一覧データ（既存仕様） |
| `view`            | `'list'`                | ○    | ビュー種別                 |

注: `dailySummaryData` は返却しない（フィールド未含）。

## 入力パラメータ（URL/環境）

| パラメータ | 取得元           | 説明                            | デフォルト |
| ---------- | ---------------- | ------------------------------- | ---------- |
| `view`     | URLクエリ        | 表示ビュー（`list` or `daily`） | `list`     |
| `month`    | URLクエリ        | 対象月（YYYY-MM）               | 現在の月   |
| `tags`     | URLクエリ        | タグフィルタ（カンマ区切り）    | なし       |
| `userId`   | `locals.user.id` | ログインユーザーID              | -          |

## 処理フロー

1. URL から `view` を取得
2. `view === 'daily'` の場合、`getDailySummary(userId, month, tags?)` を呼び、`dailySummaryData` に設定
3. `view === 'list'` の場合、既存の一覧データ取得を実行し、`listData` に設定
4. それぞれ不要なフィールドは返却しない（未含）

## エラー契約（例外→HTTP）

| 例外              | 条件                        | 返却ステータス | メッセージ              |
| ----------------- | --------------------------- | -------------- | ----------------------- |
| InvalidMonthError | `month` が `YYYY-MM` でない | 400            | `Invalid month format`  |
| UnauthorizedError | `userId` が未設定           | 401            | `Unauthorized`          |
| ForbiddenError    | 他者のデータアクセス        | 403            | `Forbidden`             |
| DB例外            | 接続・クエリ失敗            | 500            | `Internal Server Error` |

## 受け入れ基準

1. ビューに応じて、必要なフィールドのみが返却されること
2. `dailySummaryData` は `DailySummaryData` に完全準拠であること
3. `listData` と `dailySummaryData` は同時に返却されないこと
4. 入力パラメータのバリデーション違反が適切な HTTP ステータスで返却されること
