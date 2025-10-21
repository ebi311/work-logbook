# F-001: Server Actions - load（初期状態取得）

**タスクID**: F001-SA-LOAD  
**作成日**: 2025-10-21 12:27  
**関連機能**: [F-001: 作業開始・終了](../features/2025-10-19%2012:51-F001-start-stop.md)

## 目的

ページ初期ロード時に、ユーザーの進行中の作業状態とサーバー時刻を取得する。

## 要件

### 入力
- なし（認証情報は`locals.user`から取得）

### 出力
```typescript
{
  active?: {
    id: string;           // UUID
    startedAt: string;    // ISO 8601形式
    endedAt: null;
  };
  serverNow: string;      // ISO 8601形式（UTC）
}
```

### 振る舞い
1. 認証チェック: `locals.user`が無い場合は401エラー
2. `getActiveWorkLog(userId)`で進行中の作業を取得
3. 進行中の作業がある場合、activeオブジェクトを返却
4. サーバー現在時刻（UTC）を返却

### エラーハンドリング
- 401: 未認証
- 500: DB接続エラーやその他の内部エラー

## API仕様

### 関数名
`load: PageServerLoad`

### 引数
- `locals.user`: 認証済みユーザー情報
  - `id`: string (UUID)

### 戻り値の型定義

#### ActiveWorkLog型
| プロパティ | 型 | 説明 |
|----------|---|------|
| id | string | 作業記録ID（UUID） |
| startedAt | string | 開始時刻（ISO 8601形式） |
| endedAt | null | 終了時刻（進行中はnull） |

#### LoadData型
| プロパティ | 型 | 必須 | 説明 |
|----------|---|-----|------|
| active | ActiveWorkLog | 任意 | 進行中の作業（存在する場合） |
| serverNow | string | 必須 | サーバー現在時刻（ISO 8601形式、UTC） |

### 処理フロー
1. `locals.user`の存在チェック
   - 存在しない場合: 401エラーをスロー
2. `userId`を取得
3. `getActiveWorkLog(userId)`を呼び出し
4. 進行中の作業が存在する場合、WorkLogインスタンスをプレーンオブジェクトに変換
5. サーバー現在時刻を取得（UTC）
6. レスポンスオブジェクトを構築して返却
7. エラー発生時は500エラーをスロー、エラーログを出力

## 実装ステップ

### Step 1: 型定義
- [ ] `ActiveWorkLog`型を定義
- [ ] `LoadData`型を定義

### Step 2: load関数の実装
- [ ] 認証チェックを実装
- [ ] `getActiveWorkLog()`を呼び出し
- [ ] WorkLogインスタンスをプレーンオブジェクトに変換
- [ ] サーバー時刻を取得（UTC、ISO 8601形式）
- [ ] レスポンスオブジェクトを構築

### Step 3: エラーハンドリング
- [ ] try-catchでDB接続エラーをハンドリング
- [ ] エラーログの出力（console.error）
- [ ] 500エラーを返却

## テストケース

### Step 4: テストコード作成
ファイル: `src/routes/+page.server.spec.ts`

#### TC1: 正常系 - 進行中の作業がある場合
- [ ] モック: `locals.user`が存在
- [ ] モック: `getActiveWorkLog()`が進行中の作業を返す
- [ ] 検証: `active`オブジェクトが返却される
- [ ] 検証: `serverNow`がISO 8601形式

#### TC2: 正常系 - 進行中の作業がない場合
- [ ] モック: `locals.user`が存在
- [ ] モック: `getActiveWorkLog()`がnullを返す
- [ ] 検証: `active`が含まれない
- [ ] 検証: `serverNow`が返却される

#### TC3: 異常系 - 未認証
- [ ] モック: `locals.user`がundefined
- [ ] 検証: 401エラーがスローされる

#### TC4: 異常系 - DB接続エラー
- [ ] モック: `getActiveWorkLog()`がエラーをスロー
- [ ] 検証: 500エラーがスローされる
- [ ] 検証: エラーログが出力される

## 合格基準

- [ ] すべてのテストケースがパス
- [ ] TypeScriptの型エラーがない
- [ ] ESLintエラーがない
- [ ] 認証済みユーザーでページが正常にロードされる
- [ ] 進行中の作業がある場合、UIに状態が反映される

## 依存関係

- `src/lib/server/db/workLogs.ts` の `getActiveWorkLog()`
- 認証システム（`locals.user`）

## 備考

- TDDの原則に従い、テストコードを先に実装
- モックを使用してDBへの実接続を避ける
- サーバー時刻は必ずUTCで返却
