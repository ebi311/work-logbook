# F-005/F-006 サーバー実装タスク（一覧 + 月次合計）

最終更新: 2025-10-25T09:00:00Z
対象: docs/features/2025-10-25 00:00-F005-F006-worklog-list-and-filter.md

## 目的 / スコープ

- 作業一覧（降順・ページング）のサーバー実装（DB層 + Load）
- 月次合計（monthlyTotalSec）のサーバー実装（DB層 + Load）
- URLクエリ正規化（month/date/from-to/page/size）
- Server Action（任意）: フィルタフォームから month を受け取り、URLへリダイレクトする軽量アクション

非スコープ

- UI/コンポーネント実装（別タスク）
- タグ絞り込み（F-003後に対応）
- 任意期間の合計（本タスクでは月次のみ）

## 契約（Contracts）

DB関数（新規）

1. listWorkLogs(userId, options)

- 入力: userId, from(任意), to(任意), limit, offset
- 出力: items（id, startedAt, endedAt, durationSec|null）, hasNext（limit+1で判定）
- 並び: startedAt desc 固定

2. aggregateMonthlyWorkLogDuration(userId, { month })

- 入力: userId, month(YYYY-MM)
- 内部: from=月初00:00Z, toExclusive=翌月初00:00Z を算出
- 対象: endedAt != null のみ
- 跨ぎ: 月境界でクリップし加算（min(endedAt,toExclusive)-max(startedAt,from) の正数部）
- 出力: monthlyTotalSec（number; 秒）

Server Load（既存ページの拡張 or 新規ルート）

- 入力: 認証済み userId, クエリ: month/date/from-to/page/size
- 処理:
  - クエリ正規化: month > date > from/to の優先順位
  - 一覧: listWorkLogs を実行
  - 月次合計: aggregateMonthlyWorkLogDuration を実行（month 未指定は今月）
- 出力フィールド（抜粋）:
  - items[].{ id, startedAt(ISO), endedAt(ISO|null), durationSec|null }
  - page, size, hasNext, serverNow(ISO)
  - monthlyTotalSec（ページング非依存）

Server Action（任意、URLリダイレクト）

- action: filter
- 入力: formData(month|date|from|to|size)
- 出力: 303 redirect（正規化後のクエリに遷移）

## バリデーション / ルール

- 認証: 未認証は 401
- page: 1 以上。size: 10〜100 へ丸め
- month 形式: YYYY-MM（不正時は今月）
- date 形式: YYYY-MM-DD（不正時は month 優先の既定にフォールバック）
- from/to: 不正・逆転時はサニタイズ（例: 今月）
- 並び: startedAt desc 固定
- 合計: 進行中(endedAt=null)は除外。月境界クリップ必須

## エッジケース

- 月末跨ぎ（前月開始→当月内で終了／当月開始→翌月終了）
- うるう年（2/29 を含む月）
- レコード0件（月次合計=0、一覧空）
- 非常に大きい size 指定（丸め）
- 未来日/月の指定（許容、結果は0になり得る）

## 実装ステップ（TDD）

1. ユーティリティ: 月初/翌月初の算出

- 入力: month(YYYY-MM)
- 出力: from(UTC), toExclusive(UTC)
- テスト: うるう年、年跨ぎ、タイムゾーン影響なし（UTC基準）

2. DB: aggregateMonthlyWorkLogDuration

- ダミーデータで境界クリップの単体テスト（3ケース）
  - 例A: 前月開始→当月内終了 → 当月寄与=終了-月初
  - 例B: 当月開始→翌月終了 → 当月寄与=翌月初-開始
  - 例C: 完全当月内 → 寄与=終了-開始
- 進行中(endedAt=null)除外のテスト
- 0件時は 0 を返すテスト

3. DB: listWorkLogs

- 並び順が startedAt desc
- limit+1 で hasNext 判定
- from/to 範囲フィルタの適用（境界含む/排他的の整合）

4. Load: クエリ正規化と応答

- month > date > from/to の優先順位のテスト
- size/page バリデーション
- monthlyTotalSec がページングと独立で一定

5. Action: filter（任意）

- フォーム入力→正規化→303 redirect のテスト

## 受け入れ基準（DoD）

- 一覧API（Load）が spec の ListResponse 互換のデータを返す
- monthlyTotalSec が対象月の確定合計（進行中除外、境界クリップ）である
- page/size/範囲がサニタイズされ、異常系でも 500 を出さない
- ユニットテスト（Vitest）がグリーン（最低: ユーティリティ/集計/一覧/正規化）

## テスト方針

- フレームワーク: Vitest
- 実行: pnpm test:unit
- テスト対象（目安）
  - src/lib/server/db/workLogs.(list/aggregate) の単体
  - クエリ正規化ユーティリティ（新設予定）
  - Load（モックDBでのI/O検証）
  - Action（リダイレクト先URLの検証）

## リスク・留意点

- DBにおけるタイムゾーンは timestamptz/UTC 前提。表示はクライアント側でローカル処理
- データ量増に伴い offset のコスト増 → 将来 keyset への移行を見据えたシグネチャ設計
- インデックス: (user_id, started_at desc) を想定（マイグレーションは別タスクで管理）

## 変更ファイル（予定）

- src/lib/server/db/workLogs.ts（関数追加）
- src/routes/+page.server.ts（Load拡張、必要なら Action追加）
- src/lib/utils/dateRange.ts（新規: 月初/翌月初/日→範囲 正規化ユーティリティ）
- テスト: 該当箇所の \*.spec.ts 追加
