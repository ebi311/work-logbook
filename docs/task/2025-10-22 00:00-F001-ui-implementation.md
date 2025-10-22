# F-001: UI実装（作業開始・終了）

タスク作成日: 2025-10-22

## 目的

F-001「作業開始・終了」機能のUIを実装する。サーバー側の実装は完了しているため、クライアント側のコンポーネントとページを実装する。

## 前提条件

- サーバー側の実装が完了していること（`+page.server.ts`）
  - `load`: 初期状態取得
  - `actions.start`: 作業開始
  - `actions.stop`: 作業終了
- Server Actions APIの仕様に準拠すること

## 実装範囲

### 1. ページコンポーネント（`+page.svelte`）

トップページに作業開始・終了のUIを実装する。

**画面要素:**
- ステータス表示エリア
  - 停止中: 「停止中」
  - 記録中: 「記録中（経過 00:12:34）」
- トグルボタン
  - 停止中 → [作業開始]ボタン
  - 記録中 → [作業終了]ボタン
- エラー/成功メッセージ表示（トースト）

### 2. 作業状態コンポーネント（`WorkLogStatus`）

作業状態を表示するコンポーネント。ページ固有のコンポーネントとして実装。

**配置:** `src/routes/_components/WorkLogStatus/`

**責務:**
- 停止中/記録中のステータス表示
- 記録中の場合、経過時間をリアルタイム表示（1秒更新）
- サーバー時刻とローカル時刻のドリフト考慮

**Props:**
- `active`: 進行中の作業情報（id, startedAt）またはnull/undefined
- `serverNow`: サーバー時刻（ISO文字列）

**出力:**
- ステータステキスト（「停止中」または「記録中（経過 HH:MM:SS）」）

### 3. トグルボタンコンポーネント（`WorkLogToggleButton`）

作業開始/終了を切り替えるボタンコンポーネント。ページ固有のコンポーネントとして実装。

**配置:** `src/routes/_components/WorkLogToggleButton/`

**責務:**
- 現在の状態に応じたボタン表示（開始/終了）
- フォーム送信処理
- 送信中の無効化（二重送信防止）

**Props:**
- `isActive`: 現在記録中かどうか
- `isSubmitting`: 送信中かどうか

**イベント:**
- なし（フォームアクションを使用）

### 4. 経過時間計算ユーティリティ

**配置:** `src/lib/utils/duration.ts`

**関数:**
- `formatDuration(seconds: number): string`
  - 秒数を `HH:MM:SS` 形式の文字列に変換
  - 例: `3661` → `"01:00:01"`

- `calculateElapsedSeconds(startedAt: string, now: string): number`
  - 開始時刻とサーバー時刻から経過秒数を計算
  - ISO文字列を受け取り、秒数を返す

## 実装ステップ

### ステップ1: 経過時間計算ユーティリティの実装

**ファイル:** `src/lib/utils/duration.ts` と `src/lib/utils/duration.spec.ts`

**実装内容:**
1. `formatDuration` 関数の実装とテスト
2. `calculateElapsedSeconds` 関数の実装とテスト

**合格基準:**
- すべてのテストがパスすること
- エッジケース（0秒、負数、大きな値）が正しく処理されること

---

### ステップ2: WorkLogStatusコンポーネントの実装

**ディレクトリ構成:**
```
src/routes/_components/WorkLogStatus/
├── WorkLogStatus.svelte
├── WorkLogStatus.spec.ts
└── WorkLogStatus.stories.svelte
```

**実装内容:**
1. コンポーネント本体の実装
   - Props定義
   - 経過時間の計算とフォーマット
   - 1秒ごとの更新（`setInterval`）
   - クリーンアップ処理
2. ユニットテストの実装
   - 停止中の表示
   - 記録中の表示
   - タイマー更新の動作確認
3. Storybookストーリーの実装
   - 停止中のストーリー
   - 記録中のストーリー（複数パターン：直後、数分後、数時間後）

**合格基準:**
- すべてのテストがパスすること
- Storybookでビジュアル確認ができること
- タイマーが1秒ごとに更新されること
- コンポーネントのアンマウント時にタイマーがクリアされること

---

### ステップ3: WorkLogToggleButtonコンポーネントの実装

**ディレクトリ構成:**
```
src/routes/_components/WorkLogToggleButton/
├── WorkLogToggleButton.svelte
├── WorkLogToggleButton.spec.ts
└── WorkLogToggleButton.stories.svelte
```

**実装内容:**
1. コンポーネント本体の実装
   - Props定義
   - ボタンテキストの切り替え
   - formaction属性の設定（`?/start` または `?/stop`）
   - 送信中の無効化
2. ユニットテストの実装
   - 停止中の表示
   - 記録中の表示
   - 送信中の無効化
3. Storybookストーリーの実装
   - 停止中ボタン
   - 記録中ボタン
   - 送信中ボタン（両方）

**合格基準:**
- すべてのテストがパスすること
- Storybookでビジュアル確認ができること
- ボタンが状態に応じて正しく表示されること
- 送信中は無効化されること

---

### ステップ4: +page.svelteの実装

**ファイル:** `src/routes/+page.svelte`

**実装内容:**
1. ページコンポーネントの実装
   - `data` プロップからサーバーデータを取得
   - `form` プロップからアクション結果を取得
   - 2つのコンポーネントを配置
   - フォーム送信処理
   - エラー/成功メッセージの表示（簡易実装、トーストは後回し）
2. 状態管理
   - `active` の状態を管理
   - アクション成功時の状態更新
   - エラー時の状態同期

**合格基準:**
- ページが正しく表示されること
- 開始ボタンを押すと作業が開始されること
- 終了ボタンを押すと作業が終了されること
- 状態がリアルタイムで更新されること
- エラー時に適切なメッセージが表示されること

---

### ステップ5: +page.svelteのユニットテスト

**ファイル:** `src/routes/page.svelte.spec.ts`

**実装内容:**
1. ページコンポーネントのテスト
   - 停止中の初期表示
   - 記録中の初期表示
   - 作業開始アクションの成功
   - 作業開始アクションの失敗（409）
   - 作業終了アクションの成功
   - 作業終了アクションの失敗（404）

**合格基準:**
- すべてのテストがパスすること
- 各シナリオが正しく処理されること

---

### ステップ6: エンドツーエンドテスト（オプショナル）

**ファイル:** `e2e/work-log-start-stop.test.ts`

**実装内容:**
1. E2Eテストの実装
   - 作業開始・終了の一連の流れ
   - タイマー表示の確認
   - エラーハンドリングの確認

**合格基準:**
- すべてのE2Eテストがパスすること
- 実際のブラウザで動作確認ができること

---

## データフロー

### 初期ロード
```
+page.server.ts load
  ↓
{ active?: {...}, serverNow: "..." }
  ↓
+page.svelte (data prop)
  ↓
WorkLogStatus (active, serverNow)
WorkLogToggleButton (isActive)
```

### 作業開始
```
ユーザー: [作業開始]ボタンクリック
  ↓
<form method="POST" action="?/start">
  ↓
+page.server.ts actions.start
  ↓
成功: { ok: true, workLog: {...}, serverNow: "..." }
失敗: fail(409, { reason: 'ACTIVE_EXISTS', ... })
  ↓
+page.svelte (form prop)
  ↓
状態更新 & メッセージ表示
```

### 作業終了
```
ユーザー: [作業終了]ボタンクリック
  ↓
<form method="POST" action="?/stop">
  ↓
+page.server.ts actions.stop
  ↓
成功: { ok: true, workLog: {...}, serverNow: "...", durationSec: 123 }
失敗: fail(404, { reason: 'NO_ACTIVE', ... })
  ↓
+page.svelte (form prop)
  ↓
状態更新 & メッセージ表示
```

## エラーハンドリング

### 409 Conflict (ACTIVE_EXISTS)
- 発生条件: 既に作業が進行中の状態で開始ボタンを押した
- 対応: エラーメッセージ表示 + サーバーから返された active 状態で UI を更新

### 404 Not Found (NO_ACTIVE)
- 発生条件: 進行中の作業がない状態で終了ボタンを押した
- 対応: エラーメッセージ表示 + 停止中状態に UI を更新

### 401 Unauthorized
- 発生条件: 未認証状態で操作を試みた
- 対応: ログインページへリダイレクト（SvelteKitのフック機能で実装予定）

### 500 Internal Server Error
- 発生条件: サーバー側でエラーが発生
- 対応: エラーメッセージ表示 + 状態再取得を促す

## スタイリング方針

- シンプルで機能的なデザイン
- アクセシビリティを考慮（フォーカス状態、キーボード操作）
- レスポンシブ対応（モバイル/デスクトップ）
- 後でデザインシステムと統合可能な構造

## 非機能要件

- **パフォーマンス:** タイマー更新は1秒ごと、CPU負荷を最小限に
- **アクセシビリティ:** ARIA属性、キーボード操作対応
- **テスト:** 各コンポーネント80%以上のカバレッジ
- **ドキュメント:** Storybookでビジュアルドキュメント

## 実装順序

1. ステップ1: ユーティリティ関数（テスト駆動）
2. ステップ2: WorkLogStatusコンポーネント（テスト駆動）
3. ステップ3: WorkLogToggleButtonコンポーネント（テスト駆動）
4. ステップ4: +page.svelte統合
5. ステップ5: ページのユニットテスト
6. ステップ6: E2Eテスト（オプショナル）

## 備考

- 認証機能は未実装のため、`locals.user` のモック実装が必要
- タイムゾーンはすべてUTCで管理し、表示時のみローカルタイムに変換（将来対応）
- トースト通知は後のタスクで実装予定（現在はシンプルなメッセージ表示）
- デザインシステムは後で統一予定（現在は最小限のスタイル）

## 参考資料

- 機能仕様: `docs/features/2025-10-19 12:51-F001-start-stop.md`
- Server Actions: `src/routes/+page.server.ts`
- コンポーネント構成規則: `README.md` の「コンポーネントの構成規則」
