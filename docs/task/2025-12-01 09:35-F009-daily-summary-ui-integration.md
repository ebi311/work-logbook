# Task: F-009 Daily Summary UI Integration (+page.svelte)

最終更新: 2025-12-01T09:35:00Z

## 目的

`DailySummaryData` に整合した UI 側の状態・イベント・Props 契約を定義する。ビュー分離（`WorkLogListView` / `DailySummaryView`）前提。

## 親コンポーネント: `src/routes/+page.svelte`

### State

| State名        | 型                  | 初期値  | 説明                                 |
| -------------- | ------------------- | ------- | ------------------------------------ |
| `currentView`  | `'list' \| 'daily'` | URL由来 | 現在のビュー                         |
| `filterTags`   | 配列<文字列>        | URL由来 | タグフィルタ                         |
| `currentMonth` | 文字列              | URL由来 | 対象月（YYYY-MM）                    |
| `currentDate`  | 文字列              | URL由来 | 対象日（YYYY-MM-DD、ドリルダウン用） |

### イベントハンドラー

| ハンドラー名             | 引数                                | 説明         | 振る舞い                                                        |
| ------------------------ | ----------------------------------- | ------------ | --------------------------------------------------------------- |
| `handleViewChange`       | `view: 'list' \| 'daily'`           | ビュー切替   | URLの `view` 更新 + `goto()`                                    |
| `handleFilterTagsChange` | `tags: string[]`                    | タグ更新     | URLの `tags` 更新 + `goto()`                                    |
| `handleDateFilterChange` | `{ month?: string; date?: string }` | 日付更新     | URLの `month`/`date` 更新 + `goto()`                            |
| `handleDateClick`        | `date: string`                      | ドリルダウン | `handleViewChange('list')` + `handleDateFilterChange({ date })` |

### 子コンポーネント配置

- タブUI（daisyUI）
- フィルタバー（共通）
- ビュー切替:
  - `currentView === 'list'` → `WorkLogListView`
  - `currentView === 'daily'` → `DailySummaryView`

## `WorkLogListView`（既存 `WorkLogHistory` をリネーム）

### Props

| Prop名            | 型                | 必須 | 説明                       |
| ----------------- | ----------------- | ---- | -------------------------- |
| `listDataPromise` | Promise<ListData> | ○    | 一覧データ                 |
| `serverNow`       | 文字列            | ○    | サーバー時刻               |
| `filterTags`      | 配列<文字列>      | ○    | 現在のタグフィルタ         |
| `currentMonth`    | 文字列            | ×    | 現在の月                   |
| `currentDate`     | 文字列            | ×    | 現在の日（ドリルダウン時） |
| `onTagClick`      | 関数              | ○    | タグクリックハンドラー     |
| `onEdit`          | 関数              | ○    | 編集ハンドラー             |
| `onDelete`        | 関数              | ○    | 削除ハンドラー             |

## `DailySummaryView`（新規）

### Props

| Prop名             | 型                            | 必須 | 説明                         |
| ------------------ | ----------------------------- | ---- | ---------------------------- |
| `dailySummaryData` | Promise<DailySummaryData>     | ○    | 日別集計データ               |
| `onDateClick`      | 関数 `(date: string) => void` | ○    | 日付クリック時のコールバック |

### 表示/挙動仕様

- ローディング: `dailySummaryData` が pending の間はスピナー表示
- 月次合計: `MonthlyTotal.totalSec = data.monthlyTotalSec`
- テーブル: 日付（曜日付）、合計時間（HH:mm）、件数
- クリック: 行クリックで `onDateClick(date)` を発火（ドリルダウン）
- 空状態: データ 0 件時はメッセージ「この期間に作業記録がありません」を表示

## 受け入れ基準

1. `currentView` に応じて正しいビューが表示される
2. `DailySummaryView` は `DailySummaryData` に準拠した表示を行う
3. 行クリックで一覧ビューに切り替わり、対象日にフィルタが適用される
4. URL 更新によりブラウザバックで状態復帰できる
