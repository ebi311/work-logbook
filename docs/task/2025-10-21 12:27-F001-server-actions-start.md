# F-001: Server Actions - start（作業開始）

**タスクID**: F001-SA-START  
**作成日**: 2025-10-21 12:27  
**関連機能**: [F-001: 作業開始・終了](../features/2025-10-19%2012:51-F001-start-stop.md)

## 目的

ユーザーの作業を開始し、進行中の作業記録を作成する。

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
    endedAt: null;
  };
  serverNow: string;      // ISO 8601形式（UTC）
}
```

### 出力（失敗時）
```typescript
{
  reason: 'ACTIVE_EXISTS';
  active: {
    id: string;
    startedAt: string;
    endedAt: null;
  };
  serverNow: string;
}
```

### 振る舞い
1. 認証チェック: `locals.user`が無い場合は401エラー
2. 進行中の作業を確認（`getActiveWorkLog()`）
3. 既に進行中の作業がある場合、409エラーを返却
4. 進行中の作業がない場合、サーバー時刻で新規作業を開始
5. 作成した作業とサーバー時刻を返却

### エラーハンドリング
- 401: 未認証
- 409: 既に進行中の作業がある
- 500: DB接続エラーやその他の内部エラー

## API仕様

### 関数名
`actions.start: Action`

### 引数
- `locals.user`: 認証済みユーザー情報
  - `id`: string (UUID)

### 戻り値の型定義

#### StartActionSuccess型（成功時）
| プロパティ | 型 | 説明 |
|----------|---|------|
| ok | true | 成功フラグ |
| workLog.id | string | 作業記録ID（UUID） |
| workLog.startedAt | string | 開始時刻（ISO 8601形式） |
| workLog.endedAt | null | 終了時刻（進行中はnull） |
| serverNow | string | サーバー現在時刻（ISO 8601形式、UTC） |

#### StartActionFailure型（失敗時: 409）
| プロパティ | 型 | 説明 |
|----------|---|------|
| reason | 'ACTIVE_EXISTS' | エラー理由 |
| active.id | string | 既存の進行中作業のID |
| active.startedAt | string | 既存の進行中作業の開始時刻 |
| active.endedAt | null | 既存の進行中作業の終了時刻 |
| serverNow | string | サーバー現在時刻（ISO 8601形式、UTC） |

### 処理フロー
1. `locals.user`の存在チェック
   - 存在しない場合: 401エラーをスロー
2. `userId`を取得
3. サーバー現在時刻を取得
4. `getActiveWorkLog(userId)`を呼び出し
5. 進行中の作業が存在する場合:
   - `fail(409, StartActionFailure)`を返却
6. 進行中の作業が存在しない場合:
   - `createWorkLog(userId, serverNow)`を呼び出し
   - 作成された作業をプレーンオブジェクトに変換
   - `StartActionSuccess`を返却
7. エラー発生時は500エラーをスロー、エラーログを出力

## 実装ステップ

### Step 1: 型定義
- [ ] `StartActionSuccess`型を定義
- [ ] `StartActionFailure`型を定義

### Step 2: start actionの実装
- [ ] 認証チェックを実装
- [ ] サーバー現在時刻を取得
- [ ] `getActiveWorkLog()`を呼び出し
- [ ] 既存の進行中作業がある場合のエラーハンドリング（409）
- [ ] `createWorkLog()`を呼び出し
- [ ] レスポンスオブジェクトを構築

### Step 3: エラーハンドリング
- [ ] try-catchでDB接続エラーをハンドリング
- [ ] エラーログの出力（console.error）
- [ ] 500エラーを返却

## テストケース

### Step 4: テストコード作成
ファイル: `src/routes/+page.server.spec.ts`

#### TC1: 正常系 - 作業開始成功
- [ ] モック: `locals.user`が存在
- [ ] モック: `getActiveWorkLog()`がnullを返す
- [ ] モック: `createWorkLog()`が新規作業を返す
- [ ] 検証: `ok: true`が返却される
- [ ] 検証: `workLog`オブジェクトが含まれる
- [ ] 検証: `serverNow`がISO 8601形式

#### TC2: 異常系 - 既に進行中の作業がある
- [ ] モック: `locals.user`が存在
- [ ] モック: `getActiveWorkLog()`が進行中の作業を返す
- [ ] 検証: 409エラーが返却される
- [ ] 検証: `reason: 'ACTIVE_EXISTS'`
- [ ] 検証: `active`オブジェクトが含まれる

#### TC3: 異常系 - 未認証
- [ ] モック: `locals.user`がundefined
- [ ] 検証: 401エラーがスローされる

#### TC4: 異常系 - DB接続エラー
- [ ] モック: `createWorkLog()`がエラーをスロー
- [ ] 検証: 500エラーがスローされる
- [ ] 検証: エラーログが出力される

#### TC5: 異常系 - UNIQUE制約違反
- [ ] モック: `createWorkLog()`がUNIQUE制約違反をスロー
- [ ] 検証: 409エラーまたは適切なエラーハンドリング

## 合格基準

- [ ] すべてのテストケースがパス
- [ ] TypeScriptの型エラーがない
- [ ] ESLintエラーがない
- [ ] UIから作業開始ボタンをクリックして正常に動作
- [ ] 二重開始が防止される（409エラー）
- [ ] サーバー時刻がUTCで保存される

## 依存関係

- `src/lib/server/db/workLogs.ts` の `getActiveWorkLog()`, `createWorkLog()`
- 認証システム（`locals.user`）

## 備考

- TDDの原則に従い、テストコードを先に実装
- モックを使用してDBへの実接続を避ける
- 409エラーは`fail()`を使用してフォームエラーとして返却
- サーバー時刻は必ずUTCで保存・返却
