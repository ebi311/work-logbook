# F-006 UC-005: 日付とタグの組み合わせフィルタ

作成日: 2025-11-01T15:00:00Z  
ステータス: 実装中

## 概要

日付フィルタとタグフィルタを組み合わせて、より詳細な絞り込みを行う機能を確認・テストします。

## 前提条件

- ✅ F-005: 日付フィルタ実装済み
- ✅ F-006 UC-001: 単一タグフィルタ実装済み
- ✅ F-006 UC-002: 複数タグフィルタ実装済み
- ✅ F-006 UC-003: タグバッジクリック実装済み
- ✅ F-006 UC-004: タグクリア実装済み

## ユースケース

### UC-005-1: 月指定 + タグフィルタ

1. ユーザーが月指定フィルタで `2025-10` を選択
2. さらにタグ `会議` を追加
3. システムは2025年10月の作業のうち、`会議` タグが付いたもののみを表示
4. URLに `?month=2025-10&tags=会議` が設定される

### UC-005-2: 日付範囲 + 複数タグフィルタ

1. ユーザーが日付範囲 `from=2025-10-01&to=2025-10-31` を指定
2. さらに複数タグ `開発`, `PJ-A` を追加
3. システムは指定期間内の作業のうち、両方のタグが付いたもののみを表示
4. URLに `?from=2025-10-01&to=2025-10-31&tags=開発,PJ-A` が設定される

### UC-005-3: フィルタの独立性

1. ユーザーが日付とタグでフィルタリング中
2. タグのみを変更（例: `会議` → `開発`）
3. 日付フィルタは保持されたまま、タグフィルタのみが更新される
4. その逆（日付のみ変更、タグ保持）も同様

## 実装ステップ

### Step 1: 既存実装の確認

**目的**: 日付とタグの組み合わせフィルタが既に実装されているか確認

**確認箇所**:

1. **`src/routes/+page.server.ts`**:

   ```typescript
   const fetchListData = async (userId, normalized) => {
   	// ...
   	const [{ items: dbItems, hasNext }, monthlyTotalSec] = await Promise.all([
   		listWorkLogs(userId, {
   			from: normalized.from, // ✅ 日付フィルタ
   			to: normalized.to, // ✅ 日付フィルタ
   			tags: normalized.tags, // ✅ タグフィルタ
   			limit: normalized.size,
   			offset: normalized.offset,
   		}),
   		// ...
   	]);
   };
   ```

2. **`src/lib/server/db/workLogs.ts`**:

   ```typescript
   export const listWorkLogs = async (userId, options) => {
   	// ...
   	// 基本条件
   	const conditions = [eq(workLogs.userId, userId)];

   	// from/to 範囲フィルタ（指定がある場合）
   	if (from) {
   		conditions.push(gte(workLogs.startedAt, from)); // ✅
   	}
   	if (to) {
   		conditions.push(lte(workLogs.startedAt, to)); // ✅
   	}

   	// タグフィルタがある場合
   	if (tags && tags.length > 0) {
   		// AND条件でタグフィルタと日付フィルタを組み合わせ ✅
   		const results = await db
   			.select({ workLog: workLogs })
   			.from(workLogs)
   			.innerJoin(workLogTags, eq(workLogTags.workLogId, workLogs.id))
   			.where(and(...conditions, inArray(workLogTags.tag, tags))); // ✅ 両方適用
   		// ...
   	}
   };
   ```

**結果**: ✅ 日付とタグの組み合わせフィルタは既に完全に実装されている

### Step 2: URL処理の確認

**目的**: URLクエリパラメータで日付とタグが同時に指定された場合の処理を確認

**確認箇所**: `src/routes/+page.server.ts`

```typescript
const parseQueryParams = (url: URL) => {
  // タグフィルタ
  const tagsParam = url.searchParams.get('tags');
  const tags = tagsParam ? /* ... */ : undefined;

  return {
    month: url.searchParams.get('month') ?? undefined,    // ✅
    date: url.searchParams.get('date') ?? undefined,      // ✅
    from: url.searchParams.get('from') ?? undefined,      // ✅
    to: url.searchParams.get('to') ?? undefined,          // ✅
    page: /* ... */,
    size: /* ... */,
    tags,                                                   // ✅
  };
};
```

**結果**: ✅ 日付パラメータとタグパラメータは独立してパース・処理される

### Step 3: フロントエンドの確認

**目的**: UIで日付とタグを同時に操作できるか確認

**確認箇所**: `src/routes/+page.svelte`

```typescript
// 日付フィルタ変更時
// → URLの month/date/from/to を更新
// → tags パラメータは保持される（URL全体を再構築しないため）

// タグフィルタ変更時
const handleFilterTagsChange = (newTags: string[]) => {
	const url = new URL(page.url); // ✅ 現在のURLを基に構築

	if (newTags.length > 0) {
		url.searchParams.set('tags', newTags.join(','));
	} else {
		url.searchParams.delete('tags');
	}

	url.searchParams.set('page', '1'); // ページリセット

	goto(url.toString(), { replaceState: false, noScroll: true, keepFocus: true });
	// ✅ 日付パラメータは保持される
};
```

**結果**: ✅ 日付フィルタとタグフィルタは独立して更新され、互いに影響しない

### Step 4: テストケースの追加

**目的**: 日付とタグの組み合わせフィルタの動作を確認するテストを追加

**実装箇所**:

- `src/routes/page.svelte.spec.ts` - UI統合テスト
- `src/lib/server/db/workLogs.spec.ts` - DB層のテスト（既存のタグフィルタテストで確認済み可能性あり）

**テストケース**:

#### page.svelte.spec.ts

```typescript
describe('F-006 UC-005: 日付とタグの組み合わせフィルタ', () => {
	it('月指定とタグフィルタを組み合わせて使用できる', async () => {
		// Given: 月指定でフィルタリング中のデータ
		// When: タグを追加
		// Then: 両方のフィルタが適用された結果が表示される
	});

	it('タグフィルタを変更しても、月指定は保持される', async () => {
		// Given: 月指定 + タグでフィルタリング中
		// When: タグを変更（追加または削除）
		// Then: 月指定はそのまま、タグのみが更新される
	});

	it('日付フィルタとタグフィルタが独立して動作する', async () => {
		// Given: 日付 + タグでフィルタリング中
		// When: 日付を変更
		// Then: タグフィルタは保持される
	});
});
```

#### workLogs.spec.ts（必要に応じて）

既存の `workLogs.tagFilter.spec.ts` で日付フィルタとの組み合わせテストがあるか確認:

```typescript
describe('listWorkLogs - 日付とタグの組み合わせ', () => {
	it('日付範囲とタグフィルタを同時に適用できる', async () => {
		// Given: 複数の作業記録（異なる日付・タグ）
		// When: from/to + tags を指定
		// Then: 両方の条件を満たす作業のみが返される
	});
});
```

### Step 5: 動作確認とコミット

**確認項目**:

1. ✅ URLに `?month=2025-10&tags=会議` を指定すると、両方のフィルタが適用される
2. ✅ タグを追加/削除しても、月指定は保持される
3. ✅ 月を変更しても、タグフィルタは保持される
4. ✅ ページネーションが正しく動作する
5. ✅ 月次合計は日付フィルタのみを考慮（タグは無視）
6. ✅ スクロール位置が保持される

**コミット**:

```bash
git add -A
git commit -m "F-006 UC-005: 日付とタグの組み合わせフィルタを確認

- 既存実装で日付とタグの組み合わせが正しく動作することを確認
  - +page.server.ts でパラメータを独立してパース
  - listWorkLogs で日付とタグを AND 条件で適用
  - handleFilterTagsChange で日付パラメータを保持
- テストケース追加（3件）
- タスクドキュメント作成
- 全テスト成功
"
```

## 技術仕様

### SQL実行例

日付: 2025-10-01 〜 2025-10-31  
タグ: '開発', 'PJ-A'

```sql
SELECT work_logs.*
FROM work_logs
INNER JOIN work_log_tags ON work_log_tags.work_log_id = work_logs.id
WHERE work_logs.user_id = ?
  AND work_logs.started_at >= '2025-10-01T00:00:00Z'  -- 日付フィルタ
  AND work_logs.started_at <= '2025-10-31T23:59:59Z'  -- 日付フィルタ
  AND work_log_tags.tag IN ('開発', 'PJ-A')          -- タグフィルタ
GROUP BY work_logs.id
HAVING COUNT(DISTINCT work_log_tags.tag) = 2           -- AND条件
ORDER BY work_logs.started_at DESC
LIMIT 11 OFFSET 0;
```

### URLパラメータの組み合わせ例

| パターン    | URL                                             | 説明                 |
| ----------- | ----------------------------------------------- | -------------------- |
| 月 + タグ   | `?month=2025-10&tags=会議`                      | 2025年10月の会議のみ |
| 範囲 + タグ | `?from=2025-10-01&to=2025-10-31&tags=開発,PJ-A` | 期間内の開発+PJ-A    |
| 日付 + タグ | `?date=2025-10-15&tags=会議`                    | 特定日の会議のみ     |
| タグのみ    | `?tags=開発`                                    | 全期間の開発         |
| 日付のみ    | `?month=2025-10`                                | 2025年10月の全作業   |

## UI/UX仕様

### フィルタバーの表示

```
[月選択: 2025-10 ▼]  [タグ入力: 開発 × | PJ-A × ...]
```

- 日付フィルタとタグフィルタが横並び
- それぞれ独立して操作可能
- どちらかを変更しても、もう一方は保持される

### フィルタのクリア

- 「タグをクリア」: タグフィルタのみ解除、日付フィルタは保持
- 「すべてクリア」: 日付とタグの両方を解除（オプション、UI次第）

## 非機能要件

- **パフォーマンス**:
  - 日付 + タグの組み合わせでも、100ms以内でフィルタリング完了
  - インデックスが適切に使用される（work_logs.started_at, work_log_tags.tag）
- **一貫性**:
  - 日付フィルタとタグフィルタの挙動が一貫している
  - URLからの直接アクセスでも同じ結果が得られる

## 備考

- UC-005は新規実装ではなく、既存実装の動作確認とテスト追加が中心
- 日付フィルタ（F-005）とタグフィルタ（F-006 UC-001〜004）が独立して実装されているため、自然に組み合わせが機能する
- 月次合計の計算にはタグフィルタは適用されない（仕様として正しい）
