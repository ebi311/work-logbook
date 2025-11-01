# F-006 UC-002: 複数タグでの絞り込み（AND条件） タスク

作成日: 2025-11-01T12:00:00Z  
関連機能: [F-006: タグでの絞り込み](../features/2025-11-01%2000:00-F006-tag-filter.md)  
前提タスク: [F-006 UC-001](./2025-11-01%2000:00-F006-UC001-single-tag-filter.md) ✅

## 概要

UC-001で単一タグでの絞り込みを実装済み。UC-002では、複数タグを追加・削除して絞り込める機能を実装する。

### 現状

- ✅ 単一タグでの絞り込みが可能
- ✅ DB層でのAND検索（複数タグ対応）実装済み
- ✅ TagInputコンポーネントで複数タグ入力可能
- ✅ URLパラメータ `?tags=tag1,tag2` のパース実装済み

### 実装範囲

UC-002では以下を実装:
- 複数タグの追加・削除UI操作
- タグバッジの×ボタンでの個別削除
- 入力欄での複数タグ追加
- 既存のタグフィルタUI拡張

**注意**: DB層とサーバーロード層は既にUC-001で複数タグに対応済みのため、主にUIロジックの拡張となる。

## ゴール

- ユーザーが複数のタグを追加して、AND条件で絞り込める
- 各タグを個別に削除できる
- URLに複数タグがカンマ区切りで反映される（例: `?tags=開発,PJ-A`）
- スクロール位置を保持したまま操作できる

## 実装ステップ

### Step 1: TagInputコンポーネントの拡張確認

**目的**: 既存のTagInputコンポーネントが複数タグの追加・削除をサポートしているか確認

**確認項目**:
1. 複数タグの追加が可能か
2. 各タグバッジに×ボタンがあるか
3. `on:change` イベントで全タグ配列が渡されるか

**実装**: 必要に応じて以下を追加
- タグバッジの×ボタンクリックハンドラ
- Backspace キーで最後のタグを削除
- Enter キーでタグを追加

**合格基準**:
- 複数タグを追加・削除できる
- タグ変更時に `on:change` イベントが発火し、全タグ配列が渡される
- 既存のテストが成功

### Step 2: +page.svelteのハンドラ拡張

**目的**: 複数タグの追加・削除に対応する

**実装箇所**: `src/routes/+page.svelte`

**実装内容**:

1. **handleFilterTagsChange の確認**
   - 既にUC-001で実装済み
   - 新しいタグ配列を受け取り、URLを更新
   - ページをリセット
   - スクロール位置を保持

2. **個別タグ削除ハンドラの追加**（必要に応じて）
   ```typescript
   const handleTagRemove = (tagToRemove: string) => {
     const newTags = filterTags.filter(t => t !== tagToRemove);
     handleFilterTagsChange(newTags);
   };
   ```

3. **WorkLogHistoryコンポーネントへのハンドラ伝播**
   - 既存の `onFilterTagsChange` を使用
   - 必要に応じて `onTagRemove` を追加

**合格基準**:
- 複数タグを追加できる
- 各タグを個別に削除できる
- URL が `?tags=tag1,tag2` 形式で更新される
- ページが1にリセットされる
- スクロール位置が保持される

### Step 3: WorkLogHistoryコンポーネントの拡張

**目的**: フィルタバーでの複数タグ操作をサポート

**実装箇所**: `src/routes/_components/WorkLogHistory/WorkLogHistory.svelte`

**実装内容**:

1. **Props の確認**
   - 既存の `filterTags: string[]` を使用
   - 既存の `onFilterTagsChange: (tags: string[]) => void` を使用

2. **TagInput への Props 伝播**
   ```svelte
   <TagInput
     tags={filterTags}
     suggestions={tagSuggestions}
     placeholder="タグで絞り込み..."
     on:change={(e) => onFilterTagsChange(e.detail)}
   />
   ```

3. **複数タグバッジの表示**（TagInput内で既に実装済みの場合はスキップ）
   - 各タグにバッジと×ボタンを表示
   - ×ボタンクリックで該当タグを削除

**合格基準**:
- 複数タグがバッジとして表示される
- 各バッジの×ボタンでタグを削除できる
- タグ入力欄で新しいタグを追加できる

### Step 4: テストの追加

**目的**: 複数タグでの絞り込みが正しく動作することを確認

**実装箇所**: 
- `src/routes/page.svelte.spec.ts`
- `src/routes/_components/WorkLogHistory/WorkLogHistory.svelte.spec.ts`（必要に応じて）

**テストケース**:

#### +page.svelte のテスト

```typescript
describe('F-006 UC-002: 複数タグでの絞り込み', () => {
  it('複数タグを追加すると、URLに反映される', async () => {
    // Given: ページを表示
    const { component } = render(/* ... */);
    
    // When: 複数タグを選択
    const tagInput = screen.getByPlaceholderText('タグで絞り込み...');
    // タグ1を追加
    await fireEvent.change(tagInput, { detail: ['開発'] });
    // タグ2を追加
    await fireEvent.change(tagInput, { detail: ['開発', 'PJ-A'] });
    
    // Then: URLが更新される
    expect(mockGoto).toHaveBeenCalledWith(
      expect.stringContaining('tags=開発,PJ-A'),
      expect.objectContaining({ noScroll: true, keepFocus: true })
    );
  });

  it('タグを個別に削除できる', async () => {
    // Given: 複数タグでフィルタリング中
    const { component } = render(/* ... */, {
      data: { /* tags=開発,PJ-A */ }
    });
    
    // When: 1つのタグを削除
    await fireEvent.change(tagInput, { detail: ['開発'] }); // PJ-Aを削除
    
    // Then: URLが更新される
    expect(mockGoto).toHaveBeenCalledWith(
      expect.stringContaining('tags=開発'),
      expect.anything()
    );
  });

  it('全てのタグを削除すると、tagsパラメータが削除される', async () => {
    // Given: タグでフィルタリング中
    const { component } = render(/* ... */);
    
    // When: 全タグを削除
    await fireEvent.change(tagInput, { detail: [] });
    
    // Then: tagsパラメータが削除される
    expect(mockGoto).toHaveBeenCalledWith(
      expect.not.stringContaining('tags='),
      expect.anything()
    );
  });

  it('タグ追加時、ページが1にリセットされる', async () => {
    // Given: ページ2を表示中
    const { component } = render(/* page=2 */);
    
    // When: タグを追加
    await fireEvent.change(tagInput, { detail: ['開発'] });
    
    // Then: page=1に戻る
    expect(mockGoto).toHaveBeenCalledWith(
      expect.stringContaining('page=1'),
      expect.anything()
    );
  });

  it('タグ追加時、スクロール位置が保持される', async () => {
    // Given: ページを表示
    const { component } = render(/* ... */);
    
    // When: タグを追加
    await fireEvent.change(tagInput, { detail: ['開発', 'PJ-A'] });
    
    // Then: noScroll, keepFocusオプションが設定される
    expect(mockGoto).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        noScroll: true,
        keepFocus: true
      })
    );
  });
});
```

**合格基準**:
- 全テストケースが成功
- 既存の31テストケースも引き続き成功

### Step 5: 動作確認とコミット

**確認項目**:
1. 複数タグを追加できる
2. 各タグを個別に削除できる
3. URL が正しく更新される
4. スクロール位置が保持される
5. ページが1にリセットされる
6. 複数タグでのAND検索が正しく動作する

**コミット**:
```bash
git add -A
git commit -m "F-006 UC-002: 複数タグでの絞り込み機能を実装

- TagInputコンポーネントで複数タグの追加・削除をサポート
- +page.svelteで複数タグのハンドリング確認
- WorkLogHistoryコンポーネントでの複数タグ表示
- URLパラメータに複数タグをカンマ区切りで反映
- スクロール位置を保持
- テストケース追加（5件）
"
```

## 技術仕様

### URL形式

```
?tags=開発,PJ-A,会議
```

- カンマ区切り
- URLエンコード対象（日本語タグの場合）
- 最大10タグまで（バリデーション済み）

### DB検索（既存）

UC-001で実装済みのAND検索を使用:

```sql
SELECT DISTINCT wl.*
FROM work_logs wl
INNER JOIN work_log_tags wlt ON wl.id = wlt.work_log_id
WHERE wl.user_id = ?
  AND wlt.tag IN ('開発', 'PJ-A')
GROUP BY wl.id
HAVING COUNT(DISTINCT wlt.tag) = 2  -- タグ数と一致
ORDER BY wl.started_at DESC
```

### コンポーネント構成

```
+page.svelte
  ├─ WorkLogHistory
  │   └─ TagInput (複数タグ入力)
  │       └─ TagBadge[] (選択中タグ)
  └─ WorkLogEditModal
```

## 非機能要件

- **パフォーマンス**: タグ追加・削除時のUI更新は100ms以内
- **アクセシビリティ**: キーボード操作で全機能を利用可能
- **ブラウザ対応**: モダンブラウザ（Chrome, Firefox, Safari, Edge最新版）

## 備考

- UC-001で実装したスクロール位置保持機能を継承
- TagInputコンポーネントは既にF-003で実装済みなので、拡張のみ
- DB層とサーバーロード層は既に複数タグ対応済み（UC-001で実装）
