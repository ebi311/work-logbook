# Task: F-009 Daily Summary Test Specification (Vitest)

最終更新: 2025-12-01T09:40:00Z

## 目的

`DailySummaryView` と `WorkLogListView` のビュー切替、Props受け渡し、URLナビゲーション、表示整形が仕様どおりであることをユニットテストで担保する。コードは記載せず、テストケース仕様のみ定義する。

## テスト対象

- 親: `src/routes/+page.svelte`
- 子: `src/routes/_components/DailySummaryView/DailySummaryView.svelte`
- 子: `src/routes/_components/WorkLogListView/WorkLogListView.svelte`

## 前提・セットアップ

- テストフレームワーク: Vitest
- Svelte Testing Library を使用
- 実行コマンド: `pnpm test:unit`

## モック/スタブ規約

- `goto` をモックし、URL更新の呼び出しと引数を検証
- `listDataPromise`/`dailySummaryData` は `Promise.resolve(mockData)` を使う
- タイムゾーンは UTC 前提で断片的に値検証（厳密時刻演算は別途サーバテストにて）

## テストケース一覧

### A. +page.svelte ビュー切替/ナビゲーション

1. 初期表示が `view=list` のとき、`WorkLogListView` がレンダリングされる
2. 初期表示が `view=daily` のとき、`DailySummaryView` がレンダリングされる
3. タブクリック（`日別集計`）で `goto()` が `view=daily` に更新される
4. タブクリック（`作業一覧`）で `goto()` が `view=list` に更新される
5. `DailySummaryView` の行クリックで `handleDateClick` が呼ばれ、`view=list` + `date=YYYY-MM-DD` に更新される
6. フィルタタグ更新で `tags` クエリが更新され、ビューは維持される

### B. DailySummaryView 表示仕様

1. ローディング中（Promise pending）はスピナーが表示される
2. データ受領後、月次合計が `MonthlyTotal` に反映される（秒→HH:mm の整形結果）
3. テーブルに `date (dayOfWeek)`、`totalSec`（HH:mm）、`count` が表示される
4. 行ホバーでスタイルが変更される（`hover:bg-base-200` の適用をクラスで確認）
5. データ 0 件の場合、空状態メッセージが表示される

### C. WorkLogListView 表示仕様

1. `listDataPromise` のローディング中はスケルトンが表示される（既存仕様準拠）
2. タグバッジクリックで `onTagClick(tag)` が発火する
3. 編集/削除ハンドラーが該当行で発火する（`onEdit`/`onDelete` に渡るアイテム形状を確認）

### D. 整形ユーティリティ

1. 秒数→HH:mm 変換が仕様どおり（例: 0→`0:00`, 65→`0:01`, 3661→`1:01`）
2. 曜日表記が `['日','月','火','水','木','金','土']` のいずれかである

## テストデータ例（モック）

### DailySummaryData（サンプル）

```
{
  month: "2025-11",
  monthlyTotalSec: 57600,
  items: [
    { date: "2025-11-30", dayOfWeek: "日", totalSec: 28800, count: 2 },
    { date: "2025-11-29", dayOfWeek: "土", totalSec: 28800, count: 1 }
  ]
}
```

### ListData（既存仕様の例）

- 既存の ListData 形状に準拠（id, startedAt, endedAt, description, tags など）。

## 受け入れ基準

1. すべてのテストケースが成功する
2. `goto()` の呼び出し引数（URL）に `view`/`date`/`tags` が正しく反映される
3. 表示整形（HH:mm、曜日）が仕様どおりである
4. 0件時の空状態メッセージが表示される
