# F-001: Server Actions - stop（作業終了）

**タスクID**: F001-SA-STOP  
**作成日**: 2025-10-21 12:27  
**関連機能**: [F-001: 作業開始・終了](../features/2025-10-19%2012:51-F001-start-stop.md)

## 目的

ユーザーの進行中の作業を終了し、終了時刻を記録する。

## 要件

### 入力
- なし（認証情報は`locals.user`から取得）

### 出力（成功時）
```typescript
{
  ok: true;
  workLog: {
    id: string;
    startedAt: string;    // ISO 8601形式
    endedAt: string;      // ISO 8601形式
  };
  serverNow: string;      // ISO 8601形式（UTC）
  durationSec: number;    // 作業時間（秒）
}
```

### 出力（失敗時）
```typescript
{
  reason: 'NO_ACTIVE';
  serverNow: string;
}
```

### 振る舞い
1. 認証チェック: `locals.user`が無い場合は401エラー
2. 進行中の作業を取得（`getActiveWorkLog()`）
3. 進行中の作業がない場合、404エラーを返却
4. 進行中の作業がある場合、サーバー時刻で作業を終了
5. 終了した作業、サーバー時刻、作業時間を返却

### エラーハンドリング
- 401: 未認証
- 404: 進行中の作業がない
- 500: DB接続エラーやその他の内部エラー

## API仕様

### 関数名
`actions.stop: Action`

### 引数
- `locals.user`: 認証済みユーザー情報
  - `id`: string (UUID)

### 戻り値の型定義

#### StopActionSuccess型（成功時）
| プロパティ | 型 | 説明 |
|----------|---|------|
| ok | true | 成功フラグ |
| workLog.id | string | 作業記録ID（UUID） |
| workLog.startedAt | string | 開始時刻（ISO 8601形式） |
| workLog.endedAt | string | 終了時刻（ISO 8601形式） |
| serverNow | string | サーバー現在時刻（ISO 8601形式、UTC） |
| durationSec | number | 作業時間（秒） |

#### StopActionFailure型（失敗時: 404）
| プロパティ | 型 | 説明 |
|----------|---|------|
| reason | 'NO_ACTIVE' | エラー理由 |
| serverNow | string | サーバー現在時刻（ISO 8601形式、UTC） |

### 処理フロー
1. `locals.user`の存在チェック
   - 存在しない場合: 401エラーをスロー
2. `userId`を取得
3. サーバー現在時刻を取得
4. `getActiveWorkLog(userId)`を呼び出し
5. 進行中の作業が存在しない場合:
   - `fail(404, StopActionFailure)`を返却
6. 進行中の作業が存在する場合:
   - `stopWorkLog(activeWorkLog.id, serverNow)`を呼び出し
   - 更新結果がnullの場合: `fail(404, StopActionFailure)`を返却
   - 更新結果が存在する場合:
     - 作業時間を`getDuration()`で計算
     - 終了した作業をプレーンオブジェクトに変換
     - `StopActionSuccess`を返却
7. エラー発生時は500エラーをスロー、エラーログを出力

## 実装ステップ

### Step 1: 型定義
- [x] `StopActionSuccess`型を定義
- [x] `StopActionFailure`型を定義

### Step 2: stop actionの実装
- [x] 認証チェックを実装
- [x] サーバー現在時刻を取得
- [x] `getActiveWorkLog()`を呼び出し
- [x] 進行中の作業がない場合のエラーハンドリング（404）
- [x] `stopWorkLog()`を呼び出し
- [x] 更新失敗時のエラーハンドリング（404）
- [x] 作業時間の計算（`getDuration()`）
- [x] レスポンスオブジェクトを構築

### Step 3: エラーハンドリング
- [x] try-catchでDB接続エラーをハンドリング
- [x] エラーログの出力（console.error）
- [x] 500エラーを返却

## テストケース

### Step 4: テストコード作成
ファイル: `src/routes/+page.server.spec.ts`

#### TC1: 正常系 - 作業終了成功
- [x] モック: `locals.user`が存在
- [x] モック: `getActiveWorkLog()`が進行中の作業を返す
- [x] モック: `stopWorkLog()`が終了した作業を返す
- [x] 検証: `ok: true`が返却される
- [x] 検証: `workLog.endedAt`が設定されている
- [x] 検証: `durationSec`が計算されている
- [x] 検証: `serverNow`がISO 8601形式

#### TC2: 異常系 - 進行中の作業がない
- [x] モック: `locals.user`が存在
- [x] モック: `getActiveWorkLog()`がnullを返す
- [x] 検証: 404エラーが返却される
- [x] 検証: `reason: 'NO_ACTIVE'`
- [x] 検証: `serverNow`が返却される

#### TC3: 異常系 - 未認証
- [x] モック: `locals.user`がundefined
- [x] 検証: 401エラーがスローされる

#### TC4: 異常系 - DB接続エラー
- [x] モック: `stopWorkLog()`がエラーをスロー
- [x] 検証: 500エラーがスローされる
- [x] 検証: エラーログが出力される

#### TC5: 異常系 - 更新失敗（既に終了済み）
- [x] モック: `getActiveWorkLog()`が作業を返す
- [x] モック: `stopWorkLog()`がnullを返す
- [x] 検証: 404エラーが返却される

#### TC6: 正常系 - 作業時間の計算
- [x] 開始から1時間後に終了
- [x] 検証: `durationSec`が3600秒

## 合格基準

- [x] すべてのテストケースがパス
- [x] TypeScriptの型エラーがない
- [x] ESLintエラーがない
- [ ] UIから作業終了ボタンをクリックして正常に動作
- [ ] 進行中の作業がない場合、404エラーが返却される
- [ ] 作業時間が正確に計算される
- [ ] サーバー時刻がUTCで保存される

## 依存関係

- `src/lib/server/db/workLogs.ts` の `getActiveWorkLog()`, `stopWorkLog()`
- `src/models/workLog.ts` の `WorkLog.getDuration()`
- 認証システム（`locals.user`）

## 備考

- TDDの原則に従い、テストコードを先に実装
- モックを使用してDBへの実接続を避ける
- 404エラーは`fail()`を使用してフォームエラーとして返却
- サーバー時刻は必ずUTCで保存・返却
- 作業時間は`WorkLog.getDuration()`メソッドで計算
