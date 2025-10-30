# タスク: F-001 DB Schema と Domain Model の統合

作成日時: 2025-10-20T14:00:00Z  
関連タスク: [F-001 ドメインモデル定義](./2025-10-20%2011:30-F001-domain-model.md)  
関連機能仕様: [F-001 作業開始・終了](../features/2025-10-19%2012:51-F001-start-stop.md)

## 目的

DB Schema（Drizzle ORM）とドメインモデル（Zod + WorkLog クラス）の間で型の不一致が発生しているため、これらを統合する。

### 現状の問題点

1. **timestamp の型不一致**
   - **DB Schema**: `timestamp(..., { mode: 'string' })` → 文字列型（ISO 8601形式）
   - **Domain Model**: `z.date()` → JavaScript Date オブジェクト
   - **影響**: DB から取得したデータをそのままドメインモデルに渡すとバリデーションエラー

2. **変換関数が未実装**
   - DB層 → ドメイン層への変換処理がない
   - ドメイン層 → DB層への変換処理がない

3. **型の二重定義**
   - DB Schema: `export type WorkLog = typeof workLogs.$inferSelect`
   - Domain Model: `export class WorkLog { ... }`
   - 両者が同じ名前で異なる型を定義しているため混乱を招く

## 実装範囲

### 対象

- DB Schema の timestamp 設定変更（`mode: 'string'` → `mode: 'date'`）
- 型エクスポート名の変更（`WorkLog` → `DbWorkLog`）
- DB層 ↔ ドメイン層の変換関数実装
- テストコードの修正
- マイグレーション（不要: mode変更はDB構造に影響しない）

### 対象外（後続タスク）

- API エンドポイント実装（別タスクで実施）
- UI コンポーネントでの利用（別タスクで実施）

## 技術方針

### 1. DB Schema の変更

**変更内容:** timestamp の mode を `'string'` から `'date'` に変更

**理由:**

- ドメインモデルと型を統一
- JavaScript Date オブジェクトとして扱う方が自然
- Drizzle ORM は自動的に型変換を行う（DB: timestamptz ↔ JS: Date）

**影響範囲:**

- `src/lib/server/db/schema.ts` - schema 定義
- `src/lib/server/db/workLogs.spec.ts` - テストコード
- マイグレーションファイル: **不要**（mode は TypeScript 型のみに影響、DB構造には影響なし）

### 2. 型エクスポート名の変更

**変更内容:** DB Schema の型エクスポートを `DbWorkLog` に rename

| 変更前                   | 変更後                     | 理由                             |
| ------------------------ | -------------------------- | -------------------------------- |
| `export type WorkLog`    | `export type DbWorkLog`    | ドメインモデルとの名前衝突を回避 |
| `export type NewWorkLog` | `export type NewDbWorkLog` | 命名規則を統一                   |

**用途の明確化:**

- `DbWorkLog`: DB から SELECT した結果の型（Drizzle ORM の型）
- `WorkLog`（ドメイン）: アプリケーション内で扱うビジネスロジック付きの型

### 3. 変換関数の実装

#### 3-1. DB → ドメイン変換

**関数名:** `toWorkLog(dbWorkLog: DbWorkLog): WorkLog`

**実装場所:** `src/lib/server/db/workLogs.ts`（新規作成）

**処理内容:**

1. DB から取得したレコードをそのまま `WorkLog.from()` に渡す
2. Zod バリデーションが自動実行される
3. バリデーション成功時: WorkLog インスタンスを返す
4. バリデーション失敗時: 例外をスロー（Zod エラー）

**実装例:**

```typescript
import { WorkLog } from '$models/workLog';
import type { DbWorkLog } from './schema';

export function toWorkLog(dbWorkLog: DbWorkLog): WorkLog {
	return WorkLog.from(dbWorkLog);
}
```

**特徴:**

- mode: 'date' に変更後は型変換不要（DB層とドメイン層で同じDate型）
- シンプルなラッパー関数
- 将来的にフィールドマッピングが必要になった場合の拡張ポイント

#### 3-2. ドメイン → DB 変換

**関数名:** `toDbWorkLog(workLog: WorkLog): NewDbWorkLog`

**実装場所:** `src/lib/server/db/workLogs.ts`

**処理内容:**

1. WorkLog インスタンスを `toObject()` でプレーンオブジェクト化
2. DB INSERT/UPDATE に必要なフィールドのみ抽出
3. 戻り値: `NewDbWorkLog` 型（Drizzle の INSERT 型）

**実装例:**

```typescript
import type { NewDbWorkLog } from './schema';

export function toDbWorkLog(workLog: WorkLog): NewDbWorkLog {
	const obj = workLog.toObject();
	return {
		id: obj.id,
		userId: obj.userId,
		startedAt: obj.startedAt,
		endedAt: obj.endedAt,
		// createdAt, updatedAt は DB の defaultNow() で自動設定されるため省略可能
	};
}
```

**注意点:**

- `id` は DB 側で `defaultRandom()` が設定されているが、ドメイン層で生成済みの場合は渡す
- `createdAt`, `updatedAt` は DB 側でデフォルト値が設定されるため、通常は省略

### 4. DB クエリ関数の実装

**実装場所:** `src/lib/server/db/workLogs.ts`

#### 4-1. 進行中の作業取得

| 関数名 | `getActiveWorkLog`               |
| ------ | -------------------------------- |
| 引数   | `userId: string`                 |
| 戻り値 | `Promise<WorkLog \| null>`       |
| 説明   | 指定ユーザーの進行中の作業を取得 |

**実装内容:**

1. DB クエリ: `endedAt IS NULL` の条件で検索
2. レコードが見つかった場合: `toWorkLog()` でドメインモデルに変換
3. レコードが見つからない場合: `null` を返す

**SQL相当:**

```sql
SELECT * FROM work_logs
WHERE user_id = ? AND ended_at IS NULL
LIMIT 1;
```

#### 4-2. 作業開始

| 関数名 | `createWorkLog`                                            |
| ------ | ---------------------------------------------------------- |
| 引数   | `userId: string`, `startedAt: Date`                        |
| 戻り値 | `Promise<WorkLog>`                                         |
| 説明   | 新規作業を開始                                             |
| 例外   | 進行中の作業が既に存在する場合、部分ユニーク制約違反エラー |

**実装内容:**

1. INSERT クエリ実行
2. 戻り値（DB レコード）を `toWorkLog()` でドメインモデルに変換
3. ユニーク制約違反時: Drizzle エラーをそのままスロー（呼び出し側でハンドリング）

**SQL相当:**

```sql
INSERT INTO work_logs (user_id, started_at, ended_at)
VALUES (?, ?, NULL)
RETURNING *;
```

#### 4-3. 作業終了

| 関数名 | `stopWorkLog`                                        |
| ------ | ---------------------------------------------------- |
| 引数   | `workLogId: string`, `endedAt: Date`                 |
| 戻り値 | `Promise<WorkLog>`                                   |
| 説明   | 指定された作業を終了                                 |
| 例外   | レコードが見つからない場合、または既に終了済みの場合 |

**実装内容:**

1. UPDATE クエリ実行（`endedAt` を設定）
2. WHERE 条件: `id = ? AND ended_at IS NULL`
3. 更新されたレコードを RETURNING で取得
4. `toWorkLog()` でドメインモデルに変換
5. レコードが見つからない場合: `null` を返す（呼び出し側でエラーハンドリング）

**SQL相当:**

```sql
UPDATE work_logs
SET ended_at = ?, updated_at = NOW()
WHERE id = ? AND ended_at IS NULL
RETURNING *;
```

## ファイル構成

```
src/
├── lib/
│   └── server/
│       └── db/
│           ├── schema.ts                # DB Schema定義（変更）
│           ├── workLogs.ts              # DB関数実装（新規作成）
│           ├── workLogs.spec.ts         # テスト（修正）
│           └── index.ts                 # 再エクスポート
├── models/
│   └── workLog.ts                       # ドメインモデル（既存）
```

## 実装ステップ

### ステップ1: DB Schema の timestamp mode 変更

**ファイル:** `src/lib/server/db/schema.ts`

**変更内容:**

1. **timestamp mode を 'date' に変更**

```typescript
// 変更前
startedAt: timestamp('started_at', { withTimezone: true, mode: 'string' }).notNull(),
endedAt: timestamp('ended_at', { withTimezone: true, mode: 'string' }),
createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),

// 変更後
startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }).notNull(),
endedAt: timestamp('ended_at', { withTimezone: true, mode: 'date' }),
createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
```

2. **型エクスポート名を変更**

```typescript
// 変更前
export type WorkLog = typeof workLogs.$inferSelect;
export type NewWorkLog = typeof workLogs.$inferInsert;

// 変更後
export type DbWorkLog = typeof workLogs.$inferSelect;
export type NewDbWorkLog = typeof workLogs.$inferInsert;
```

**マイグレーション:**

- **不要** - `mode` は TypeScript の型定義のみに影響し、DB スキーマには影響しない

### ステップ2: DB関数の実装

**ファイル:** `src/lib/server/db/workLogs.ts`（新規作成）

**実装内容:**

```typescript
import { db } from './index';
import { workLogs, type DbWorkLog, type NewDbWorkLog } from './schema';
import { eq, and, isNull } from 'drizzle-orm';
import { WorkLog } from '$models/workLog';

/**
 * DB → ドメイン変換
 * @param dbWorkLog - DB から取得した作業記録
 * @returns ドメインモデルの WorkLog インスタンス
 * @throws ZodError - バリデーション失敗時
 */
export function toWorkLog(dbWorkLog: DbWorkLog): WorkLog {
	return WorkLog.from(dbWorkLog);
}

/**
 * 進行中の作業を取得
 * @param userId - ユーザーID
 * @returns 進行中の作業、または null
 */
export async function getActiveWorkLog(userId: string): Promise<WorkLog | null> {
	const dbWorkLog = await db.query.workLogs.findFirst({
		where: (workLogs, { eq, and, isNull }) =>
			and(eq(workLogs.userId, userId), isNull(workLogs.endedAt)),
	});

	if (!dbWorkLog) {
		return null;
	}

	return toWorkLog(dbWorkLog);
}

/**
 * 作業を開始
 * @param userId - ユーザーID
 * @param startedAt - 作業開始日時
 * @returns 作成された作業記録
 * @throws Error - 進行中の作業が既に存在する場合（部分ユニーク制約違反）
 */
export async function createWorkLog(userId: string, startedAt: Date): Promise<WorkLog> {
	const [dbWorkLog] = await db
		.insert(workLogs)
		.values({
			userId,
			startedAt,
			endedAt: null,
		})
		.returning();

	return toWorkLog(dbWorkLog);
}

/**
 * 作業を終了
 * @param workLogId - 作業記録ID
 * @param endedAt - 作業終了日時
 * @returns 更新された作業記録、またはnull（レコードが見つからない場合）
 */
export async function stopWorkLog(workLogId: string, endedAt: Date): Promise<WorkLog | null> {
	const [dbWorkLog] = await db
		.update(workLogs)
		.set({ endedAt })
		.where(and(eq(workLogs.id, workLogId), isNull(workLogs.endedAt)))
		.returning();

	if (!dbWorkLog) {
		return null;
	}

	return toWorkLog(dbWorkLog);
}
```

**エクスポート:**

- `toWorkLog` - 変換関数（テストで使用）
- `getActiveWorkLog` - 進行中の作業取得
- `createWorkLog` - 作業開始
- `stopWorkLog` - 作業終了

### ステップ3: 再エクスポート

**ファイル:** `src/lib/server/db/index.ts`

**追加内容:**

```typescript
export * from './workLogs';
```

### ステップ4: テストコードの修正

**ファイル:** `src/lib/server/db/workLogs.spec.ts`

**変更内容:**

1. **型インポートを修正**

```typescript
// 変更前
import { workLogs } from './schema';

// 変更後
import { workLogs, type DbWorkLog } from './schema';
```

2. **ISO文字列 → Date オブジェクトに変更**

```typescript
// 変更前
const serverNow = new Date().toISOString();
await db.insert(workLogs).values({
	userId: testUserId,
	startedAt: serverNow,
	endedAt: null,
});

// 変更後
const serverNow = new Date();
await db.insert(workLogs).values({
	userId: testUserId,
	startedAt: serverNow,
	endedAt: null,
});
```

3. **新規関数のテストケースを追加**

| テストスイート       | テストケース                                      | 検証内容                            |
| -------------------- | ------------------------------------------------- | ----------------------------------- |
| `toWorkLog()`        | 正常系: DB レコードをドメインモデルに変換できる   | DbWorkLog → WorkLog 変換が成功する  |
|                      | 異常系: 不正なデータでエラー                      | バリデーション失敗時に例外をスロー  |
| `getActiveWorkLog()` | 進行中の作業がない場合、nullを返す                | null を返す                         |
|                      | 進行中の作業がある場合、WorkLogインスタンスを返す | WorkLog クラスのインスタンスである  |
| `createWorkLog()`    | 新規作業を開始できる                              | WorkLog インスタンスが返される      |
|                      | 既に進行中の作業がある場合、エラー                | 部分ユニーク制約違反で例外をスロー  |
| `stopWorkLog()`      | 進行中の作業を終了できる                          | endedAt が設定された WorkLog を返す |
|                      | 既に終了済みの作業は更新できない                  | null を返す                         |
|                      | 存在しないIDでは更新できない                      | null を返す                         |

### ステップ5: 統合テスト（オプション）

**ファイル:** `src/lib/server/db/workLogs.integration.spec.ts`（新規作成）

**テスト内容:**

| テストケース                 | 検証内容                                                                                                                         |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 正常フロー: 開始 → 終了      | 1. createWorkLog() で作業開始<br>2. getActiveWorkLog() で取得<br>3. stopWorkLog() で終了<br>4. getActiveWorkLog() で null が返る |
| 異常フロー: 二重開始         | 1. createWorkLog() で作業開始<br>2. 再度 createWorkLog() で例外発生                                                              |
| 異常フロー: 進行中なしで終了 | 1. getActiveWorkLog() で null<br>2. stopWorkLog() で null が返る                                                                 |

## 合格基準

### 必須条件

- [ ] DB Schema の timestamp mode が 'date' に変更されている
- [ ] 型エクスポート名が `DbWorkLog`, `NewDbWorkLog` に変更されている
- [ ] 変換関数 `toWorkLog()` が実装されている
- [ ] DB関数 `getActiveWorkLog()`, `createWorkLog()`, `stopWorkLog()` が実装されている
- [ ] 全テストケースが PASS する
- [ ] TypeScript の型チェックが通る
- [ ] 既存のテストが引き続き動作する

### 推奨条件

- [ ] JSDoc コメントが記載されている
- [ ] 統合テストが実装されている
- [ ] エラーハンドリングが適切に実装されている

## 決定事項

### 技術選定

- **timestamp mode:** `'date'` を採用
  - 理由: ドメインモデルとの型統一、変換処理の削減
  - トレードオフ: DB から取得した値が Date オブジェクトのため、JSON シリアライズ時に注意が必要
    - SvelteKit は自動的に Date → ISO 文字列変換を行うため問題なし

- **型命名規則:**
  - DB層: `DbWorkLog`, `NewDbWorkLog`
  - ドメイン層: `WorkLog`（クラス）
  - 理由: 名前空間を分離し、用途を明確化

### DB関数の設計方針

- **変換を関数内で完結**: DB関数は必ずドメインモデルを返す
- **エラーは呼び出し側で処理**: DB関数は例外をスロー、API層でハンドリング
- **null vs 例外**:
  - レコードが見つからない場合: `null` を返す（正常系）
  - 制約違反などのDB例外: 例外をスロー（異常系）

### マイグレーションの必要性

- **不要**: `mode` パラメータは TypeScript の型定義のみに影響
- DB スキーマ（PostgreSQL の timestamptz 型）は変更されない
- 既存のマイグレーションファイルはそのまま使用可能

## 次のステップ（後続タスク）

このタスク完了後、以下のタスクに進む:

1. **API エンドポイント実装**
   - SvelteKit form actions で DB 関数を呼び出し
   - エラーハンドリング（部分ユニーク制約違反 → ACTIVE_EXISTS）
   - レスポンス生成（Zod スキーマでバリデーション）

2. **UI コンポーネント実装**
   - 作業開始/終了ボタン
   - 進行中の作業表示
   - エラーメッセージ表示

## 参考資料

- [Drizzle ORM - Column Types](https://orm.drizzle.team/docs/column-types/pg)
- [Drizzle ORM - Queries](https://orm.drizzle.team/docs/rqb)
- [Zod - Date Schema](https://zod.dev/?id=dates)

## 実装結果

### 実装日

2025-10-20

### テスト結果

- ✅ 12/12 テスト成功（DB関数）
- ✅ 20/20 テスト成功（ドメインモデル）
- ✅ 型チェック成功（pnpm tsc --noEmit）
- ✅ すべての合格基準を満たす

### 実装内容

#### 1. DB Schema の変更

- ✅ timestamp の mode を `'string'` → `'date'` に変更
- ✅ 型エクスポート名を `WorkLog` → `DbWorkLog`, `NewWorkLog` → `NewDbWorkLog` に変更
- ✅ マイグレーション不要（mode は TypeScript 型のみに影響）

#### 2. DB関数の実装

新規ファイル: `src/lib/server/db/workLogs.ts`

- ✅ `toWorkLog(dbWorkLog)`: DB → ドメイン変換関数
- ✅ `getActiveWorkLog(userId)`: 進行中の作業取得
- ✅ `createWorkLog(userId, startedAt)`: 作業開始
- ✅ `stopWorkLog(workLogId, endedAt)`: 作業終了

#### 3. 再エクスポート

- ✅ `src/lib/server/db/index.ts` に `export * from './workLogs'` を追加

#### 4. テストコードの修正

- ✅ ISO文字列 → Date オブジェクトに変更
- ✅ 新規関数のテストケース12件を追加:
  - toWorkLog(): 3テスト
  - getActiveWorkLog(): 2テスト
  - createWorkLog(): 2テスト
  - stopWorkLog(): 3テスト
  - 統合テスト: 1テスト
  - updated_at トリガー確認: 1テスト

### 技術的な決定事項

1. **パスエイリアスの問題**
   - 当初 `$models/workLog` を使用しようとしたが、エイリアスが未設定
   - 相対パス `../../../models/workLog` に変更して解決

2. **型の統一**
   - DB層とドメイン層で Date オブジェクトを統一
   - 変換処理が不要になり、コードがシンプルに

3. **エラーハンドリング**
   - DB関数は WorkLog インスタンスまたは null を返す
   - 制約違反などの例外は呼び出し側でハンドリング

### 次のステップ

このタスク完了により、以下が可能になりました:

1. ✅ DB層とドメイン層の型安全な統合
2. ✅ ビジネスロジックを持つドメインモデルの活用
3. ✅ バリデーション付きのDB操作

次のタスク候補:

- API エンドポイント実装（SvelteKit form actions）
- UI コンポーネント実装（作業開始/終了ボタン）

---

**ステータス:** ✅ 完了
