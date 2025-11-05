# Phase 2: オフライン同期機能 - テストガイド

作成日: 2025-11-05

## 概要

PWA Phase 2（オフライン同期機能）の実装が完了しました。このドキュメントでは、実装された機能のテスト方法を説明します。

## 実装された機能

### ✅ 完了した機能

1. **IndexedDB セットアップ** (Step 1-2)

   - `workLogs` ストア: オフラインでの作業記録
   - `syncQueue` ストア: サーバーへの同期待ちキュー

2. **CRUD 操作** (Step 3)

   - `saveWorkLogOffline`: 新規作業記録の保存
   - `updateWorkLogOffline`: 作業記録の更新
   - `deleteWorkLogOffline`: 作業記録の削除
   - `getSyncQueue`: 同期待ちアイテムの取得
   - `addToSyncQueue`: 同期キューへの追加

3. **ネットワーク状態監視** (Step 4)

   - `isOnline` ストア: オンライン/オフライン状態の監視
   - `NetworkStatus` コンポーネント: オフライン時の警告表示

4. **Background Sync API** (Step 5)

   - `processSyncQueue`: 同期キューの処理（リトライロジック付き）
   - `requestSync`: Background Sync のリクエスト
   - `setupAutoSync`: オンライン復帰時の自動同期

5. **UI 統合** (Step 6-7)
   - `start/stop/switch` アクションのオフライン対応
   - `SyncStatus` コンポーネント: 同期待ちアイテム数の表示
   - レイアウトへのコンポーネント統合

## テスト項目

### 単体テスト

以下のコマンドでテストを実行:

```bash
pnpm test:unit
```

#### テストファイル一覧

- `src/lib/client/db/index.spec.ts` (7 tests) ✅
- `src/lib/client/db/workLogs.spec.ts` (12 tests) ✅
- `src/lib/client/db/syncQueue.spec.ts` (9 tests) ✅
- `src/lib/client/network/status.spec.ts` (2 tests) ✅
- `src/lib/components/NetworkStatus/NetworkStatus.svelte.spec.ts` (5 tests) ✅
- `src/lib/client/sync/processor.spec.ts` (6 tests) ✅
- `src/lib/client/sync/trigger.spec.ts` (7 tests) ✅
- `src/lib/components/SyncStatus/SyncStatus.svelte.spec.ts` (4 tests) ✅

**合計: 52 テスト**

### 手動テスト項目

#### 1. オフライン時の作業開始

**手順:**

1. アプリを開く
2. Chrome DevTools を開く（F12）
3. Network タブで "Offline" を選択
4. 画面上部に「オフラインモード - 変更は後で同期されます」と表示されることを確認
5. 作業内容を入力
6. 「作業を開始」ボタンをクリック
7. 「作業を開始しました（オフライン）」というトーストが表示されることを確認
8. 画面右下に「1 件の変更を同期待ち」バッジが表示されることを確認

**期待結果:**

- ✅ オフライン警告が表示される
- ✅ 作業が開始される
- ✅ 同期待ちバッジが表示される

#### 2. オフライン時の作業終了

**手順:**

1. オフラインのまま（手順 1 の続き）
2. 「作業を終了」ボタンをクリック
3. 「作業を終了しました（オフライン、X 分）」というトーストが表示されることを確認
4. 画面右下のバッジが「2 件の変更を同期待ち」に更新されることを確認

**期待結果:**

- ✅ 作業が終了される
- ✅ 作業時間が表示される
- ✅ 同期待ちバッジが増える

#### 3. オンライン復帰時の自動同期

**手順:**

1. Chrome DevTools の Network タブで "No throttling" を選択（オンラインに戻す）
2. 画面上部のオフライン警告が消えることを確認
3. 数秒待つ
4. 同期待ちバッジが消えることを確認
5. ページをリロード
6. 作業履歴に、オフラインで記録した作業が表示されることを確認

**期待結果:**

- ✅ オフライン警告が消える
- ✅ 自動的に同期が開始される
- ✅ 同期待ちバッジが消える
- ✅ サーバーにデータが保存される

#### 4. オフライン時の作業切り替え

**手順:**

1. オフラインにする
2. 作業を開始
3. 異なる作業内容を入力
4. 「新しい作業に切り替え」ボタンをクリック
5. 「作業を切り替えました（オフライン、X 分）」というトーストが表示されることを確認
6. バッジが「2 件の変更を同期待ち」になることを確認（停止+開始）

**期待結果:**

- ✅ 作業が切り替わる
- ✅ 前の作業が終了される
- ✅ 新しい作業が開始される
- ✅ 同期待ちバッジが適切に更新される

#### 5. 同期エラー時のリトライ

**手順:**

1. オフラインで作業を記録
2. オンラインに戻す
3. **直後に再度オフラインにする**（同期中に切断）
4. エラーが発生することを確認（Console を確認）
5. 再度オンラインにする
6. リトライされることを確認
7. 最終的に同期が完了することを確認

**期待結果:**

- ✅ 同期エラーが記録される
- ✅ 指数バックオフでリトライされる（2s → 4s → 8s → 16s → 32s）
- ✅ 最大 5 回までリトライされる
- ✅ 最終的に同期が成功する

### デバッグツール

#### IndexedDB の確認

Chrome DevTools:

1. Application タブを開く
2. Storage > IndexedDB > work-logbook-offline を展開
3. `workLogs` と `syncQueue` ストアを確認

#### Console ログ

同期処理の詳細ログを確認:

```javascript
// ブラウザのコンソールで実行
localStorage.setItem('debug', '*');
```

## 既知の制限事項

### 未実装の機能

1. **編集・削除のオフライン対応**

   - 現在は start/stop/switch のみオフライン対応
   - 編集・削除は今後の拡張で対応予定

2. **ユーザー ID の永続化**

   - オフライン時のユーザー ID は固定値 `"offline-user"` を使用
   - 実運用では localStorage などに保存が必要

3. **コンフリクト解決**
   - 複数デバイスでの同時編集時のコンフリクト解決は未実装
   - 基本的に「最後の書き込みが勝つ」方式

### ブラウザ互換性

- **Background Sync API**: Chrome, Edge のみサポート
- Safari では自動同期の代わりに手動同期が必要
- フォールバック機能実装済み（オンライン復帰時に自動実行）

## トラブルシューティング

### 同期が完了しない場合

1. IndexedDB の syncQueue を確認
2. Console でエラーログを確認
3. Network タブで API リクエストを確認

### バッジが消えない場合

1. IndexedDB の syncQueue を手動でクリア:

```javascript
// ブラウザのコンソールで実行
import('$lib/client/db/syncQueue').then(({ clearSyncQueue }) => clearSyncQueue());
```

2. ページをリロード

## 次のステップ

### Phase 3 の候補機能

1. **編集・削除のオフライン対応**
2. **バックグラウンド同期の改善**
   - より詳細な進捗表示
   - 手動同期ボタンの追加
3. **データ圧縮**
   - IndexedDB のサイズ制限対策
4. **コンフリクト解決**
   - 複数デバイス間のデータ同期

### E2E テスト

Playwright でのエンドツーエンドテストの追加:

- オフライン/オンライン切り替え
- 同期フロー全体のテスト

## 参考資料

- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Background Sync API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
- [Service Worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
