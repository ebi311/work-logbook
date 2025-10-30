# タスク: F-003 タグ付け機能の実装

作成日時: 2025-10-29T00:00:00Z  
関連機能仕様: [F-003 タグ付け](../features/2025-10-29%2000:00-F003-tags.md)

## 目的

作業記録にタグを付けて分類できる機能を実装する。過去に使用したタグのサジェスト機能も含む。

## 実装範囲

本タスクは以下のステップに分割して実装する:

1. **DBスキーマとマイグレーション**: `work_log_tags` テーブルの作成
2. **ドメインモデルの拡張**: `WorkLog` クラスに `tags` プロパティを追加
3. **リポジトリ層の実装**: タグのCRUD操作
4. **Server Actions の拡張**: `start`, `stop`, `load` の拡張、`suggestTags` の追加
5. **UIコンポーネントの実装**: タグ入力フィールド、タグバッジ、サジェスト機能
6. **統合と動作確認**: 全体の統合テスト

## ステップ1: DBスキーマとマイグレーション

### 目的

`work_log_tags` テーブルを作成し、作業記録とタグの多対多の関連を保存する。

### DBスキーマ設計

```typescript
// src/lib/server/db/schema.ts に追加

import { pgTable, serial, integer, varchar, timestamp, unique, index } from 'drizzle-orm/pg-core';

export const workLogTags = pgTable(
	'work_log_tags',
	{
		id: serial('id').primaryKey(),
		workLogId: uuid('work_log_id')
			.notNull()
			.references(() => workLogs.id, { onDelete: 'cascade' }),
		tag: varchar('tag', { length: 100 }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
			.notNull()
			.defaultNow()
	},
	(table) => [
		// 同じ作業に同じタグを重複して付けられないようにする
		unique('work_log_tags_work_log_id_tag_unique').on(table.workLogId, table.tag),
		// タグでの検索を高速化
		index('work_log_tags_tag_idx').on(table.tag),
		// work_log_id での検索を高速化（JOINで使用）
		index('work_log_tags_work_log_id_idx').on(table.workLogId)
	]
);

// 型エクスポート
export type DbWorkLogTag = typeof workLogTags.$inferSelect;
export type NewDbWorkLogTag = typeof workLogTags.$inferInsert;
```

### マイグレーション

Drizzle Kit を使用してマイグレーションを生成:

```bash
pnpm drizzle-kit generate
```

生成されたマイグレーションファイルを確認し、必要に応じて調整。

### テスト

#### UT-1.1: テーブル作成の確認

**ファイル**: `src/lib/server/db/schema.spec.ts`（新規または追記）

```typescript
import { describe, it, expect } from 'vitest';
import { workLogTags } from './schema';

describe('workLogTags schema', () => {
	it('テーブルが定義されている', () => {
		expect(workLogTags).toBeDefined();
		expect(workLogTags._.name).toBe('work_log_tags');
	});

	it('必要なカラムが定義されている', () => {
		expect(workLogTags.id).toBeDefined();
		expect(workLogTags.workLogId).toBeDefined();
		expect(workLogTags.tag).toBeDefined();
		expect(workLogTags.createdAt).toBeDefined();
	});
});
```

### 合格基準

- [ ] `work_log_tags` テーブルが定義されている
- [ ] マイグレーションファイルが生成されている
- [ ] `UNIQUE(work_log_id, tag)` 制約が設定されている
- [ ] `ON DELETE CASCADE` が設定されている
- [ ] インデックスが適切に設定されている
- [ ] テストが合格する

---

## ステップ2: ドメインモデルの拡張

### 目的

`WorkLog` クラスに `tags` プロパティを追加し、タグのバリデーションロジックを実装する。

### WorkLog クラスの拡張

**ファイル**: `src/models/workLog.ts`

#### 2-1: Zod スキーマの拡張

```typescript
// 既存のスキーマに tags を追加
const WorkLogSchema = z.object({
	id: z.string().uuid(),
	userId: z.string().uuid(),
	startedAt: z.date(),
	endedAt: z.date().nullable(),
	description: z.string(),
	tags: z.array(z.string()).default([]), // 追加
	createdAt: z.date(),
	updatedAt: z.date()
}).refine(
	(data) => {
		// 既存のバリデーション: endedAt が startedAt より後であること
		if (data.endedAt === null) return true;
		return data.endedAt > data.startedAt;
	},
	{ message: 'endedAt must be after startedAt' }
);
```

#### 2-2: タグの正規化関数

```typescript
/**
 * タグの配列を正規化する
 * - 先頭・末尾の空白をトリミング
 * - 空文字列を除外
 * - 重複を除去
 * - 長さ制限（1〜100文字）をチェック
 * - 個数制限（最大20個）をチェック
 */
export const normalizeTags = (tags: string[]): string[] => {
	const normalized = tags
		.map((tag) => tag.trim())
		.filter((tag) => tag.length > 0)
		.filter((tag, index, self) => self.indexOf(tag) === index); // 重複除去

	// バリデーション
	if (normalized.length > 20) {
		throw new Error('タグは最大20個まで指定できます');
	}

	for (const tag of normalized) {
		if (tag.length > 100) {
			throw new Error('タグは100文字以内で指定してください');
		}
	}

	return normalized;
};
```

#### 2-3: WorkLog クラスにプロパティを追加

```typescript
export class WorkLog {
	readonly id: string;
	readonly userId: string;
	readonly startedAt: Date;
	readonly endedAt: Date | null;
	readonly description: string;
	readonly tags: string[]; // 追加
	readonly createdAt: Date;
	readonly updatedAt: Date;

	private constructor(props: z.infer<typeof WorkLogSchema>) {
		this.id = props.id;
		this.userId = props.userId;
		this.startedAt = props.startedAt;
		this.endedAt = props.endedAt;
		this.description = props.description;
		this.tags = props.tags; // 追加
		this.createdAt = props.createdAt;
		this.updatedAt = props.updatedAt;
	}

	// from メソッドは変更不要（スキーマが自動で tags をバリデーション）

	// toObject メソッドに tags を追加
	toObject() {
		return {
			id: this.id,
			userId: this.userId,
			startedAt: this.startedAt,
			endedAt: this.endedAt,
			description: this.description,
			tags: this.tags, // 追加
			createdAt: this.createdAt,
			updatedAt: this.updatedAt
		};
	}
}
```

### テスト

**ファイル**: `src/models/workLog.spec.ts`

#### UT-2.1: tags プロパティが正しく設定される

```typescript
it('tags プロパティが設定される', () => {
	const data = {
		id: '123e4567-e89b-12d3-a456-426614174000',
		userId: '123e4567-e89b-12d3-a456-426614174001',
		startedAt: new Date('2025-01-01T10:00:00Z'),
		endedAt: null,
		description: 'テスト作業',
		tags: ['開発', 'PJ-A'],
		createdAt: new Date('2025-01-01T10:00:00Z'),
		updatedAt: new Date('2025-01-01T10:00:00Z')
	};

	const workLog = WorkLog.from(data);

	expect(workLog.tags).toEqual(['開発', 'PJ-A']);
});
```

#### UT-2.2: tags が空配列の場合も正しく動作する

```typescript
it('tags が空配列でも正しく動作する', () => {
	const data = {
		// ... 他のプロパティ
		tags: []
	};

	const workLog = WorkLog.from(data);

	expect(workLog.tags).toEqual([]);
});
```

#### UT-2.3: tags が未指定の場合はデフォルトで空配列になる

```typescript
it('tags が未指定の場合はデフォルトで空配列になる', () => {
	const data = {
		// ... 他のプロパティ（tags なし）
	};

	const workLog = WorkLog.from(data);

	expect(workLog.tags).toEqual([]);
});
```

#### UT-2.4: normalizeTags - 空白のトリミング

```typescript
describe('normalizeTags', () => {
	it('先頭・末尾の空白をトリミングする', () => {
		const tags = ['  開発  ', ' PJ-A'];
		const normalized = normalizeTags(tags);
		expect(normalized).toEqual(['開発', 'PJ-A']);
	});

	it('空文字列を除外する', () => {
		const tags = ['開発', '', '  ', 'PJ-A'];
		const normalized = normalizeTags(tags);
		expect(normalized).toEqual(['開発', 'PJ-A']);
	});

	it('重複を除去する', () => {
		const tags = ['開発', 'PJ-A', '開発'];
		const normalized = normalizeTags(tags);
		expect(normalized).toEqual(['開発', 'PJ-A']);
	});

	it('21個以上のタグはエラー', () => {
		const tags = Array(21).fill('tag');
		expect(() => normalizeTags(tags)).toThrow('タグは最大20個まで指定できます');
	});

	it('101文字以上のタグはエラー', () => {
		const tags = ['a'.repeat(101)];
		expect(() => normalizeTags(tags)).toThrow('タグは100文字以内で指定してください');
	});
});
```

### 合格基準

- [ ] `WorkLog` クラスに `tags` プロパティが追加されている
- [ ] `normalizeTags` 関数が実装されている
- [ ] Zod スキーマに `tags` が追加されている
- [ ] すべてのテストが合格する

---

## ステップ3: リポジトリ層の実装

### 目的

タグのCRUD操作を行うリポジトリ関数を実装する。

### 実装

**ファイル**: `src/lib/server/db/workLogs.ts`（新規作成または既存ファイルに追記）

#### 3-1: タグの保存

```typescript
import { db } from './index';
import { workLogs, workLogTags } from './schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { DbWorkLog, DbWorkLogTag } from './schema';

/**
 * 作業記録にタグを保存する（既存のタグを削除して再作成）
 */
export const saveWorkLogTags = async (
	workLogId: string,
	tags: string[]
): Promise<DbWorkLogTag[]> => {
	return await db.transaction(async (tx) => {
		// 既存のタグを削除
		await tx.delete(workLogTags).where(eq(workLogTags.workLogId, workLogId));

		// 新しいタグを挿入
		if (tags.length === 0) {
			return [];
		}

		const inserted = await tx
			.insert(workLogTags)
			.values(
				tags.map((tag) => ({
					workLogId,
					tag
				}))
			)
			.returning();

		return inserted;
	});
};
```

#### 3-2: タグの取得

```typescript
/**
 * 作業記録IDからタグを取得
 */
export const getWorkLogTags = async (workLogId: string): Promise<string[]> => {
	const tags = await db
		.select({ tag: workLogTags.tag })
		.from(workLogTags)
		.where(eq(workLogTags.workLogId, workLogId))
		.orderBy(workLogTags.createdAt);

	return tags.map((t) => t.tag);
};
```

#### 3-3: 複数の作業記録のタグを一括取得

```typescript
/**
 * 複数の作業記録のタグを一括取得
 * @returns Map<workLogId, tags[]>
 */
export const getWorkLogTagsMap = async (workLogIds: string[]): Promise<Map<string, string[]>> => {
	if (workLogIds.length === 0) {
		return new Map();
	}

	const tags = await db
		.select({
			workLogId: workLogTags.workLogId,
			tag: workLogTags.tag
		})
		.from(workLogTags)
		.where(sql`${workLogTags.workLogId} IN ${workLogIds}`)
		.orderBy(workLogTags.createdAt);

	const map = new Map<string, string[]>();
	for (const { workLogId, tag } of tags) {
		if (!map.has(workLogId)) {
			map.set(workLogId, []);
		}
		map.get(workLogId)!.push(tag);
	}

	return map;
};
```

#### 3-4: タグのサジェスト取得

```typescript
/**
 * ユーザーが過去に使用したタグを使用頻度順に取得
 */
export const getUserTagSuggestions = async (
	userId: string,
	query?: string,
	limit = 20
): Promise<Array<{ tag: string; count: number }>> => {
	let sql = db
		.select({
			tag: workLogTags.tag,
			count: sql<number>`COUNT(*)::int`
		})
		.from(workLogTags)
		.innerJoin(workLogs, eq(workLogTags.workLogId, workLogs.id))
		.where(eq(workLogs.userId, userId))
		.groupBy(workLogTags.tag)
		.orderBy(desc(sql`COUNT(*)`), workLogTags.tag)
		.limit(limit);

	// 部分一致検索
	if (query) {
		sql = sql.where(sql`${workLogTags.tag} ILIKE ${'%' + query + '%'}`);
	}

	return await sql;
};
```

#### 3-5: WorkLog取得時にタグも取得

既存の `getActiveWorkLog` や `getWorkLogs` 関数を拡張してタグも取得するように修正。

```typescript
/**
 * 進行中の作業記録を取得（タグ付き）
 */
export const getActiveWorkLog = async (userId: string): Promise<(DbWorkLog & { tags: string[] }) | null> => {
	const workLog = await db
		.select()
		.from(workLogs)
		.where(and(eq(workLogs.userId, userId), sql`${workLogs.endedAt} IS NULL`))
		.limit(1);

	if (workLog.length === 0) {
		return null;
	}

	const tags = await getWorkLogTags(workLog[0].id);

	return {
		...workLog[0],
		tags
	};
};
```

### テスト

**ファイル**: `src/lib/server/db/workLogs.spec.ts`

#### UT-3.1: タグの保存と取得

```typescript
describe('saveWorkLogTags', () => {
	it('タグを保存できる', async () => {
		// 作業記録を作成
		const workLog = await createWorkLog({ userId, tags: [] });

		// タグを保存
		await saveWorkLogTags(workLog.id, ['開発', 'PJ-A']);

		// タグを取得
		const tags = await getWorkLogTags(workLog.id);

		expect(tags).toEqual(['開発', 'PJ-A']);
	});

	it('既存のタグを上書きできる', async () => {
		const workLog = await createWorkLog({ userId, tags: ['開発'] });

		await saveWorkLogTags(workLog.id, ['会議', 'PJ-B']);

		const tags = await getWorkLogTags(workLog.id);

		expect(tags).toEqual(['会議', 'PJ-B']);
	});

	it('空配列を保存すると全タグが削除される', async () => {
		const workLog = await createWorkLog({ userId, tags: ['開発'] });

		await saveWorkLogTags(workLog.id, []);

		const tags = await getWorkLogTags(workLog.id);

		expect(tags).toEqual([]);
	});
});
```

#### UT-3.2: タグのサジェスト

```typescript
describe('getUserTagSuggestions', () => {
	it('使用頻度順にタグを取得できる', async () => {
		// 複数の作業記録を作成
		await createWorkLog({ userId, tags: ['開発', 'PJ-A'] });
		await createWorkLog({ userId, tags: ['開発', 'PJ-B'] });
		await createWorkLog({ userId, tags: ['会議'] });

		const suggestions = await getUserTagSuggestions(userId);

		expect(suggestions).toEqual([
			{ tag: '開発', count: 2 },
			{ tag: 'PJ-A', count: 1 },
			{ tag: 'PJ-B', count: 1 },
			{ tag: '会議', count: 1 }
		]);
	});

	it('部分一致検索ができる', async () => {
		await createWorkLog({ userId, tags: ['開発', 'PJ-A', 'PJ-B'] });

		const suggestions = await getUserTagSuggestions(userId, 'PJ');

		expect(suggestions).toEqual([
			{ tag: 'PJ-A', count: 1 },
			{ tag: 'PJ-B', count: 1 }
		]);
	});

	it('他のユーザーのタグは取得しない', async () => {
		const otherUserId = 'other-user-id';
		await createWorkLog({ userId, tags: ['開発'] });
		await createWorkLog({ userId: otherUserId, tags: ['会議'] });

		const suggestions = await getUserTagSuggestions(userId);

		expect(suggestions).toEqual([{ tag: '開発', count: 1 }]);
	});
});
```

#### UT-3.3: カスケード削除

```typescript
it('作業記録を削除するとタグも削除される', async () => {
	const workLog = await createWorkLog({ userId, tags: ['開発'] });

	await db.delete(workLogs).where(eq(workLogs.id, workLog.id));

	const tags = await getWorkLogTags(workLog.id);

	expect(tags).toEqual([]);
});
```

### 合格基準

- [ ] `saveWorkLogTags` が実装されている
- [ ] `getWorkLogTags` が実装されている
- [ ] `getWorkLogTagsMap` が実装されている
- [ ] `getUserTagSuggestions` が実装されている
- [ ] 既存の WorkLog 取得関数がタグも取得するように拡張されている
- [ ] すべてのテストが合格する

---

## ステップ4: Server Actions の拡張

### 目的

`load`, `start`, `stop` を拡張し、`suggestTags` アクションを追加する。

### 実装

**ファイル**: `src/routes/+page.server.ts`

#### 4-1: load の拡張

```typescript
export const load = async ({ locals }) => {
	// 認証チェック
	if (!locals.user) {
		throw redirect(302, '/auth/signin');
	}

	const userId = locals.user.id;

	// 進行中の作業を取得（タグ付き）
	const activeWorkLog = await getActiveWorkLog(userId);

	// タグのサジェストを取得
	const tagSuggestionsData = await getUserTagSuggestions(userId);

	return {
		active: activeWorkLog
			? {
					id: activeWorkLog.id,
					startedAt: activeWorkLog.startedAt.toISOString(),
					endedAt: null,
					description: activeWorkLog.description,
					tags: activeWorkLog.tags // 追加
			  }
			: undefined,
		serverNow: new Date().toISOString(),
		tagSuggestions: tagSuggestionsData // 追加
	};
};
```

#### 4-2: actions.start の拡張

```typescript
export const actions = {
	start: async ({ request, locals }) => {
		// 認証チェック
		if (!locals.user) {
			return fail(401, { reason: 'UNAUTHORIZED' });
		}

		const userId = locals.user.id;
		const formData = await request.formData();
		const description = (formData.get('description') as string) || '';
		const tagsString = (formData.get('tags') as string) || '';

		// タグをパース（スペース区切り）
		const tagsArray = tagsString
			.split(/\s+/)
			.map((t) => t.trim())
			.filter((t) => t.length > 0);

		// タグの正規化
		let normalizedTags: string[];
		try {
			normalizedTags = normalizeTags(tagsArray);
		} catch (error) {
			return fail(400, {
				reason: 'INVALID_TAGS',
				message: error instanceof Error ? error.message : 'Invalid tags'
			});
		}

		// トランザクション内で作業記録とタグを保存
		try {
			const workLog = await db.transaction(async (tx) => {
				// 進行中の作業を確認
				const active = await getActiveWorkLog(userId);
				if (active) {
					return fail(409, {
						reason: 'ACTIVE_EXISTS',
						active: {
							id: active.id,
							startedAt: active.startedAt.toISOString(),
							endedAt: null,
							description: active.description,
							tags: active.tags
						},
						serverNow: new Date().toISOString()
					});
				}

				// 作業記録を作成
				const [newWorkLog] = await tx
					.insert(workLogs)
					.values({
						userId,
						startedAt: new Date(),
						description
					})
					.returning();

				// タグを保存
				await saveWorkLogTags(newWorkLog.id, normalizedTags);

				return newWorkLog;
			});

			return {
				ok: true,
				workLog: {
					id: workLog.id,
					startedAt: workLog.startedAt.toISOString(),
					endedAt: null,
					description: workLog.description,
					tags: normalizedTags
				},
				serverNow: new Date().toISOString()
			};
		} catch (error) {
			console.error('Failed to start work log:', error);
			return fail(500, { reason: 'INTERNAL_ERROR' });
		}
	}
	// ... stop も同様に拡張
};
```

#### 4-3: actions.stop の拡張

`start` と同様に、`tags` パラメータを受け取り、保存する。

#### 4-4: actions.suggestTags の追加

```typescript
export const actions = {
	// ... start, stop

	suggestTags: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { reason: 'UNAUTHORIZED' });
		}

		const userId = locals.user.id;
		const formData = await request.formData();
		const query = (formData.get('query') as string) || undefined;

		const suggestions = await getUserTagSuggestions(userId, query);

		return {
			ok: true,
			suggestions
		};
	}
};
```

### テスト

**ファイル**: `src/routes/+page.server.spec.ts`

#### UT-4.1: load がタグを返す

```typescript
it('load が進行中の作業のタグを返す', async () => {
	// 進行中の作業を作成（タグ付き）
	await createActiveWorkLog({ userId, tags: ['開発', 'PJ-A'] });

	const result = await load({ locals: { user: { id: userId } } });

	expect(result.active?.tags).toEqual(['開発', 'PJ-A']);
	expect(result.tagSuggestions).toBeDefined();
});
```

#### UT-4.2: start がタグを保存する

```typescript
it('start がタグを保存する', async () => {
	const formData = new FormData();
	formData.set('description', 'テスト作業');
	formData.set('tags', '開発 PJ-A');

	const result = await actions.start({
		request: { formData: async () => formData },
		locals: { user: { id: userId } }
	});

	expect(result.ok).toBe(true);
	expect(result.workLog.tags).toEqual(['開発', 'PJ-A']);
});
```

#### UT-4.3: タグのバリデーションエラー

```typescript
it('21個以上のタグはエラー', async () => {
	const formData = new FormData();
	formData.set('description', 'テスト作業');
	formData.set('tags', Array(21).fill('tag').join(' '));

	const result = await actions.start({
		request: { formData: async () => formData },
		locals: { user: { id: userId } }
	});

	expect(result.reason).toBe('INVALID_TAGS');
});
```

#### UT-4.4: suggestTags が動作する

```typescript
it('suggestTags がタグ候補を返す', async () => {
	// 作業記録を作成
	await createWorkLog({ userId, tags: ['開発', 'PJ-A'] });

	const formData = new FormData();
	const result = await actions.suggestTags({
		request: { formData: async () => formData },
		locals: { user: { id: userId } }
	});

	expect(result.ok).toBe(true);
	expect(result.suggestions).toContainEqual({ tag: '開発', count: 1 });
});
```

### 合格基準

- [ ] `load` がタグとサジェストを返す
- [ ] `start` がタグを保存する
- [ ] `stop` がタグを更新する
- [ ] `suggestTags` が動作する
- [ ] すべてのテストが合格する

---

## ステップ5: UIコンポーネントの実装

### 目的

タグ入力フィールド、タグバッジ、サジェスト機能を実装する。

### 実装

#### 5-1: TagBadge コンポーネント

**ファイル**: `src/routes/_components/TagBadge.svelte`

```svelte
<script lang="ts">
	export let tag: string;
	export let onRemove: (() => void) | undefined = undefined;
	export let clickable = false;
</script>

<span class="badge badge-primary badge-sm gap-1">
	{tag}
	{#if onRemove}
		<button
			type="button"
			class="btn btn-ghost btn-xs"
			on:click={onRemove}
			aria-label="タグを削除"
		>
			✕
		</button>
	{/if}
</span>

<style>
	.badge {
		user-select: none;
	}
</style>
```

#### 5-2: TagInput コンポーネント

**ファイル**: `src/routes/_components/TagInput.svelte`

```svelte
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import TagBadge from './TagBadge.svelte';

	export let tags: string[] = [];
	export let suggestions: Array<{ tag: string; count: number }> = [];
	export let placeholder = '開発 PJ-A 会議';

	let inputValue = '';
	let showSuggestions = false;
	let selectedIndex = -1;

	const dispatch = createEventDispatcher<{
		change: string[];
		input: string;
	}>();

	// タグを追加
	const addTag = (tag: string) => {
		const trimmed = tag.trim();
		if (trimmed && !tags.includes(trimmed)) {
			tags = [...tags, trimmed];
			dispatch('change', tags);
		}
		inputValue = '';
		showSuggestions = false;
		selectedIndex = -1;
	};

	// タグを削除
	const removeTag = (index: number) => {
		tags = tags.filter((_, i) => i !== index);
		dispatch('change', tags);
	};

	// 入力イベント
	const handleInput = (e: Event) => {
		const target = e.target as HTMLInputElement;
		inputValue = target.value;
		dispatch('input', inputValue);

		// サジェストを表示
		if (inputValue.trim()) {
			showSuggestions = true;
			selectedIndex = -1;
		} else {
			showSuggestions = false;
		}
	};

	// キーボードイベント
	const handleKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
				addTag(filteredSuggestions[selectedIndex].tag);
			} else if (inputValue.includes(' ')) {
				// スペースが含まれている場合、分割して追加
				const newTags = inputValue.split(/\s+/).filter((t) => t.trim());
				newTags.forEach((tag) => addTag(tag));
			} else {
				addTag(inputValue);
			}
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (showSuggestions && filteredSuggestions.length > 0) {
				selectedIndex = Math.min(selectedIndex + 1, filteredSuggestions.length - 1);
			}
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (showSuggestions) {
				selectedIndex = Math.max(selectedIndex - 1, -1);
			}
		} else if (e.key === 'Escape') {
			showSuggestions = false;
			selectedIndex = -1;
		} else if (e.key === ' ' && inputValue.trim()) {
			// スペースでタグを確定
			e.preventDefault();
			addTag(inputValue);
		} else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
			// 入力が空でBackspaceを押すと最後のタグを削除
			removeTag(tags.length - 1);
		}
	};

	// フィルタリングされたサジェスト
	$: filteredSuggestions = inputValue.trim()
		? suggestions.filter((s) => s.tag.toLowerCase().includes(inputValue.toLowerCase()))
		: suggestions;
</script>

<div class="form-control">
	<label class="label" for="tag-input">
		<span class="label-text">タグ</span>
	</label>

	<!-- タグバッジ表示 -->
	{#if tags.length > 0}
		<div class="flex flex-wrap gap-1 mb-2">
			{#each tags as tag, i}
				<TagBadge {tag} onRemove={() => removeTag(i)} />
			{/each}
		</div>
	{/if}

	<!-- 入力フィールド -->
	<div class="relative">
		<input
			id="tag-input"
			type="text"
			class="input input-bordered w-full"
			{placeholder}
			bind:value={inputValue}
			on:input={handleInput}
			on:keydown={handleKeydown}
			on:blur={() => {
				// 少し遅延させてクリックイベントを処理できるようにする
				setTimeout(() => {
					showSuggestions = false;
				}, 200);
			}}
		/>

		<!-- サジェスト -->
		{#if showSuggestions && filteredSuggestions.length > 0}
			<ul class="menu bg-base-200 rounded-box absolute z-10 w-full mt-1 shadow-lg">
				{#each filteredSuggestions as suggestion, i}
					<li>
						<button
							type="button"
							class:active={i === selectedIndex}
							on:click={() => addTag(suggestion.tag)}
						>
							<span class="flex-1">{suggestion.tag}</span>
							<span class="badge badge-ghost badge-sm">{suggestion.count}</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<!-- Hidden input for form submission -->
	<input type="hidden" name="tags" value={tags.join(' ')} />
</div>

<style>
	.menu li button.active {
		background-color: var(--fallback-p, oklch(var(--p) / 0.2));
	}
</style>
```

#### 5-3: メインページへの統合

**ファイル**: `src/routes/+page.svelte`

```svelte
<script lang="ts">
	import TagInput from './_components/TagInput.svelte';
	import TagBadge from './_components/TagBadge.svelte';

	export let data;

	let tags: string[] = data.active?.tags || [];
	$: tagSuggestions = data.tagSuggestions || [];

	// タグ変更時の処理
	const handleTagsChange = (event: CustomEvent<string[]>) => {
		tags = event.detail;
	};
</script>

<!-- 既存のフォームに追加 -->
<form method="POST" action="?/start">
	<!-- 既存の description 入力フィールド -->
	<textarea name="description" ... />

	<!-- タグ入力 -->
	<TagInput {tags} suggestions={tagSuggestions} on:change={handleTagsChange} />

	<button type="submit">作業開始</button>
</form>

<!-- 作業一覧にタグバッジを表示 -->
{#each workLogs as workLog}
	<div class="work-log-item">
		<!-- ... 既存の表示 -->

		<!-- タグ表示 -->
		{#if workLog.tags && workLog.tags.length > 0}
			<div class="flex flex-wrap gap-1 mt-2">
				{#each workLog.tags as tag}
					<TagBadge {tag} clickable />
				{/each}
			</div>
		{/if}
	</div>
{/each}
```

### テスト

#### UT-5.1: TagBadge コンポーネント

**ファイル**: `src/routes/_components/TagBadge.spec.ts`

```typescript
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import TagBadge from './TagBadge.svelte';

describe('TagBadge', () => {
	it('タグ名が表示される', () => {
		render(TagBadge, { tag: '開発' });
		expect(screen.getByText('開発')).toBeInTheDocument();
	});

	it('onRemove がある場合、削除ボタンが表示される', () => {
		render(TagBadge, { tag: '開発', onRemove: () => {} });
		expect(screen.getByLabelText('タグを削除')).toBeInTheDocument();
	});

	it('onRemove がない場合、削除ボタンは表示されない', () => {
		render(TagBadge, { tag: '開発' });
		expect(screen.queryByLabelText('タグを削除')).not.toBeInTheDocument();
	});
});
```

#### UT-5.2: TagInput コンポーネント

**ファイル**: `src/routes/_components/TagInput.spec.ts`

```typescript
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import TagInput from './TagInput.svelte';

describe('TagInput', () => {
	it('タグを入力できる', async () => {
		const { component } = render(TagInput);
		const input = screen.getByPlaceholderText(/開発/);

		await fireEvent.input(input, { target: { value: '開発' } });
		await fireEvent.keyDown(input, { key: 'Enter' });

		expect(component.$$.ctx[0]).toContain('開発');
	});

	it('スペースでタグが確定される', async () => {
		const { component } = render(TagInput);
		const input = screen.getByPlaceholderText(/開発/);

		await fireEvent.input(input, { target: { value: '開発' } });
		await fireEvent.keyDown(input, { key: ' ' });

		expect(component.$$.ctx[0]).toContain('開発');
	});

	it('サジェストが表示される', async () => {
		render(TagInput, {
			suggestions: [
				{ tag: '開発', count: 5 },
				{ tag: 'PJ-A', count: 3 }
			]
		});

		const input = screen.getByPlaceholderText(/開発/);
		await fireEvent.input(input, { target: { value: '開' } });

		expect(screen.getByText('開発')).toBeInTheDocument();
	});
});
```

### 合格基準

- [ ] `TagBadge` コンポーネントが実装されている
- [ ] `TagInput` コンポーネントが実装されている
- [ ] サジェスト機能が動作する
- [ ] スペースでタグが確定される
- [ ] Backspaceで最後のタグが削除される
- [ ] メインページに統合されている
- [ ] すべてのテストが合格する

---

## ステップ6: 統合と動作確認

### 目的

すべての機能を統合し、エンドツーエンドで動作確認する。

### 確認項目

#### 動作確認-1: タグ付きで作業を開始

1. ブラウザでアプリを開く
2. タグ入力フィールドに「開発 PJ-A」と入力
3. サジェストが表示されることを確認
4. 「作業開始」ボタンをクリック
5. 作業が開始され、タグが保存されることを確認

#### 動作確認-2: タグ付きで作業を終了

1. 進行中の作業がある状態で、タグを「開発 PJ-A 会議」に変更
2. 「作業終了」ボタンをクリック
3. 作業が終了し、タグが更新されることを確認

#### 動作確認-3: タグのサジェスト

1. 過去に「開発」「PJ-A」のタグを使用した作業記録を作成
2. 新しい作業を開始する際、タグ入力フィールドに「開」と入力
3. サジェストに「開発」が表示されることを確認
4. サジェストをクリックしてタグを追加できることを確認

#### 動作確認-4: 作業一覧でタグが表示される

1. 作業一覧画面を開く
2. 各作業にタグバッジが表示されることを確認

#### 動作確認-5: タグのバリデーション

1. 21個以上のタグを入力しようとする
2. エラーメッセージが表示されることを確認
3. 101文字以上のタグを入力しようとする
4. エラーメッセージが表示されることを確認

### E2Eテスト（オプション）

**ファイル**: `e2e/tags.test.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('タグ機能', () => {
	test('タグ付きで作業を開始できる', async ({ page }) => {
		await page.goto('/');

		// タグを入力
		await page.fill('[placeholder*="開発"]', '開発 PJ-A');

		// 作業開始
		await page.click('text=作業開始');

		// タグが表示されることを確認
		await expect(page.locator('text=開発')).toBeVisible();
		await expect(page.locator('text=PJ-A')).toBeVisible();
	});

	test('タグのサジェストが動作する', async ({ page }) => {
		// 過去の作業を作成（セットアップ）
		// ...

		await page.goto('/');

		// タグ入力フィールドに入力
		await page.fill('[placeholder*="開発"]', '開');

		// サジェストが表示される
		await expect(page.locator('text=開発')).toBeVisible();
	});
});
```

### 合格基準

- [ ] タグ付きで作業を開始できる
- [ ] タグ付きで作業を終了できる
- [ ] タグのサジェストが動作する
- [ ] 作業一覧でタグが表示される
- [ ] タグのバリデーションが動作する
- [ ] E2Eテストが合格する（オプション）

---

## 最終チェックリスト

### 実装

- [ ] DBスキーマとマイグレーション
- [ ] ドメインモデルの拡張
- [ ] リポジトリ層の実装
- [ ] Server Actions の拡張
- [ ] UIコンポーネントの実装

### テスト

- [ ] すべてのUTが合格する
- [ ] 動作確認が完了する
- [ ] E2Eテストが合格する（オプション）

### ドキュメント

- [ ] README にタグ機能の説明を追加
- [ ] API ドキュメントを更新（必要に応じて）

### その他

- [ ] コードレビュー
- [ ] パフォーマンステスト（大量のタグがある場合）
- [ ] アクセシビリティチェック（キーボード操作など）

---

## 注意事項

- タグ名にスペースを含めたい場合は、アンダースコア（`_`）で連結する
- タグの最大数（20個）と最大長（100文字）は、必要に応じて調整可能
- サジェストのパフォーマンスが悪い場合は、キャッシュの導入を検討
- タグの色をハッシュ値で決定する場合、色のコントラスト比に注意

---

## 完了基準

- [ ] すべてのステップが完了している
- [ ] すべてのテストが合格している
- [ ] 動作確認が完了している
- [ ] コードレビューが完了している
- [ ] ドキュメントが更新されている
