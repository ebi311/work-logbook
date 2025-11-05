# タスク: PWA対応 Phase 2 - オフライン同期機能

## 概要

Phase 1で実装したPWA基本機能に加えて、オフラインでの作業記録の作成・編集と、オンライン復帰時の自動同期を実装します。

## 関連要件

- O-003: PWA対応（CONCEPT.md）- Phase 2

## 前提条件

- Phase 1完了：PWAとしてインストール可能、オフラインでのUI表示が動作

## 目標

- オフラインで作業記録（開始・終了・編集・削除）ができる
- オンライン復帰時に自動的にサーバーと同期される
- ユーザーに同期状態が適切に通知される

## アーキテクチャ設計

### データフロー

```
[ユーザー操作]
    ↓
[オンライン判定]
    ↓
┌─────────────┬─────────────┐
│  オンライン  │ オフライン   │
├─────────────┼─────────────┤
│ サーバーAPI  │ IndexedDB   │
│    ↓        │    ↓        │
│  成功       │  保存       │
│             │    ↓        │
│             │ 同期キュー   │
└─────────────┴─────────────┘
                 ↓
            [オンライン復帰]
                 ↓
          [Background Sync]
                 ↓
            [サーバーAPI]
                 ↓
         [IndexedDBを更新]
```

### データ構造

#### IndexedDB スキーマ

```typescript
// Database: work-logbook-offline
// Version: 1

// Store 1: workLogs
interface OfflineWorkLog {
	id: string; // UUID
	userId: string;
	startAt: string; // ISO 8601
	endAt: string | null;
	description: string;
	tags: string[];

	// オフライン管理用
	syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
	operation: 'create' | 'update' | 'delete';
	localCreatedAt: number; // タイムスタンプ
	serverVersion?: number; // サーバー側のバージョン
	error?: string; // 同期エラーメッセージ
}

// Store 2: syncQueue
interface SyncQueueItem {
	id: string; // UUID
	workLogId: string;
	operation: 'create' | 'update' | 'delete';
	data: any; // 操作データ
	timestamp: number;
	retryCount: number;
	lastError?: string;
}
```

## 実装ステップ

### Step 1: IndexedDBライブラリのインストール

#### 1.1 idbライブラリのインストール

```bash
pnpm add idb
```

`idb`は、IndexedDBのPromiseベースのラッパーで、より使いやすいAPIを提供します。

### Step 2: IndexedDBの初期化とスキーマ定義

#### 2.1 DBユーティリティの作成

**ファイル**: `src/lib/client/db/index.ts`

```typescript
import { openDB, type IDBPDatabase } from 'idb';

export interface OfflineWorkLog {
	id: string;
	userId: string;
	startAt: string;
	endAt: string | null;
	description: string;
	tags: string[];
	syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
	operation: 'create' | 'update' | 'delete';
	localCreatedAt: number;
	serverVersion?: number;
	error?: string;
}

export interface SyncQueueItem {
	id: string;
	workLogId: string;
	operation: 'create' | 'update' | 'delete';
	data: any;
	timestamp: number;
	retryCount: number;
	lastError?: string;
}

const DB_NAME = 'work-logbook-offline';
const DB_VERSION = 1;

export async function initDB() {
	return openDB(DB_NAME, DB_VERSION, {
		upgrade(db) {
			// workLogs store
			if (!db.objectStoreNames.contains('workLogs')) {
				const workLogsStore = db.createObjectStore('workLogs', { keyPath: 'id' });
				workLogsStore.createIndex('syncStatus', 'syncStatus');
				workLogsStore.createIndex('userId', 'userId');
			}

			// syncQueue store
			if (!db.objectStoreNames.contains('syncQueue')) {
				const syncQueueStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
				syncQueueStore.createIndex('timestamp', 'timestamp');
			}
		},
	});
}
```

#### 2.2 UTの作成

**ファイル**: `src/lib/client/db/index.spec.ts`

### Step 3: オフラインストレージの実装

#### 3.1 WorkLog操作の実装

**ファイル**: `src/lib/client/db/workLogs.ts`

```typescript
import { nanoid } from 'nanoid';
import { initDB, type OfflineWorkLog } from './index';

export async function saveWorkLogOffline(
	workLog: Omit<OfflineWorkLog, 'id' | 'syncStatus' | 'operation' | 'localCreatedAt'>,
): Promise<string> {
	const db = await initDB();
	const id = nanoid();

	const offlineWorkLog: OfflineWorkLog = {
		...workLog,
		id,
		syncStatus: 'pending',
		operation: 'create',
		localCreatedAt: Date.now(),
	};

	await db.put('workLogs', offlineWorkLog);

	// 同期キューに追加
	await addToSyncQueue({
		id: nanoid(),
		workLogId: id,
		operation: 'create',
		data: offlineWorkLog,
		timestamp: Date.now(),
		retryCount: 0,
	});

	return id;
}

export async function updateWorkLogOffline(
	id: string,
	updates: Partial<OfflineWorkLog>,
): Promise<void> {
	const db = await initDB();
	const workLog = await db.get('workLogs', id);

	if (!workLog) {
		throw new Error(`WorkLog ${id} not found`);
	}

	const updated: OfflineWorkLog = {
		...workLog,
		...updates,
		syncStatus: 'pending',
		operation: 'update',
	};

	await db.put('workLogs', updated);

	await addToSyncQueue({
		id: nanoid(),
		workLogId: id,
		operation: 'update',
		data: updated,
		timestamp: Date.now(),
		retryCount: 0,
	});
}

export async function deleteWorkLogOffline(id: string): Promise<void> {
	const db = await initDB();
	const workLog = await db.get('workLogs', id);

	if (!workLog) {
		return;
	}

	const deleted: OfflineWorkLog = {
		...workLog,
		syncStatus: 'pending',
		operation: 'delete',
	};

	await db.put('workLogs', deleted);

	await addToSyncQueue({
		id: nanoid(),
		workLogId: id,
		operation: 'delete',
		data: deleted,
		timestamp: Date.now(),
		retryCount: 0,
	});
}

export async function getWorkLogsOffline(userId: string): Promise<OfflineWorkLog[]> {
	const db = await initDB();
	const index = db.transaction('workLogs').store.index('userId');
	return index.getAll(userId);
}
```

#### 3.2 同期キューの実装

**ファイル**: `src/lib/client/db/syncQueue.ts`

```typescript
import { initDB, type SyncQueueItem } from './index';

export async function addToSyncQueue(item: SyncQueueItem): Promise<void> {
	const db = await initDB();
	await db.put('syncQueue', item);
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
	const db = await initDB();
	const index = db.transaction('syncQueue').store.index('timestamp');
	return index.getAll();
}

export async function removeSyncQueueItem(id: string): Promise<void> {
	const db = await initDB();
	await db.delete('syncQueue', id);
}

export async function updateSyncQueueItem(
	id: string,
	updates: Partial<SyncQueueItem>,
): Promise<void> {
	const db = await initDB();
	const item = await db.get('syncQueue', id);

	if (!item) {
		return;
	}

	await db.put('syncQueue', { ...item, ...updates });
}
```

### Step 4: オンライン/オフライン判定

#### 4.1 ネットワーク状態の監視

**ファイル**: `src/lib/client/network/status.ts`

```typescript
import { writable } from 'svelte/store';

export const isOnline = writable(typeof navigator !== 'undefined' ? navigator.onLine : true);

if (typeof window !== 'undefined') {
	window.addEventListener('online', () => isOnline.set(true));
	window.addEventListener('offline', () => isOnline.set(false));
}
```

#### 4.2 ネットワーク状態表示コンポーネント

**ファイル**: `src/lib/components/NetworkStatus/NetworkStatus.svelte`

```svelte
<script lang="ts">
	import { isOnline } from '$lib/client/network/status';
</script>

{#if !$isOnline}
	<div class="alert alert-warning">
		<span class="material-symbols-outlined">cloud_off</span>
		<span>オフラインモード - 変更は後で同期されます</span>
	</div>
{/if}
```

### Step 5: Background Sync APIの実装

#### 5.1 Service Workerでの同期処理

**ファイル**: カスタムService Workerが必要なため、`vite.config.ts`を修正

```typescript
VitePWA({
	// ... 既存の設定
	strategies: 'injectManifest',
	srcDir: 'src',
	filename: 'service-worker.ts',
});
```

**ファイル**: `src/service-worker.ts`

```typescript
/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

// Background Sync
sw.addEventListener('sync', (event) => {
	if (event.tag === 'sync-worklogs') {
		event.waitUntil(syncWorkLogs());
	}
});

async function syncWorkLogs() {
	// 同期処理の実装
	// IndexedDBから未同期データを取得
	// サーバーAPIに送信
	// 成功したら同期キューから削除
}
```

#### 5.2 同期トリガーの実装

**ファイル**: `src/lib/client/sync/trigger.ts`

```typescript
export async function requestSync() {
	if ('serviceWorker' in navigator && 'sync' in self.registration) {
		try {
			const registration = await navigator.serviceWorker.ready;
			await registration.sync.register('sync-worklogs');
		} catch (error) {
			console.error('Background Sync registration failed:', error);
			// フォールバック: 即座に同期を試みる
			await syncWorkLogsNow();
		}
	} else {
		// Background Sync非対応ブラウザ
		await syncWorkLogsNow();
	}
}

async function syncWorkLogsNow() {
	// 同期処理を即座に実行
}
```

### Step 6: UIの統合

#### 6.1 作業開始/終了アクションの修正

**ファイル**: `src/routes/_actions/start.ts` (修正)

```typescript
import { isOnline } from '$lib/client/network/status';
import { saveWorkLogOffline } from '$lib/client/db/workLogs';
import { get } from 'svelte/store';

export async function startWorkLog(data: StartWorkLogData) {
	if (get(isOnline)) {
		// オンライン: サーバーAPIを使用
		return await startWorkLogOnline(data);
	} else {
		// オフライン: IndexedDBに保存
		return await saveWorkLogOffline({
			userId: data.userId,
			startAt: new Date().toISOString(),
			endAt: null,
			description: data.description || '',
			tags: data.tags || [],
		});
	}
}
```

### Step 7: 同期状態の表示

#### 7.1 同期ステータス表示コンポーネント

**ファイル**: `src/lib/components/SyncStatus/SyncStatus.svelte`

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { getSyncQueue } from '$lib/client/db/syncQueue';

	let pendingCount = 0;

	async function updateStatus() {
		const queue = await getSyncQueue();
		pendingCount = queue.length;
	}

	onMount(() => {
		updateStatus();
		const interval = setInterval(updateStatus, 5000);
		return () => clearInterval(interval);
	});
</script>

{#if pendingCount > 0}
	<div class="badge badge-info">
		<span class="material-symbols-outlined">sync</span>
		{pendingCount}件の変更を同期待ち
	</div>
{/if}
```

### Step 8: テスト

#### 8.1 ユニットテスト

各モジュールのUTを作成：

- `src/lib/client/db/index.spec.ts`
- `src/lib/client/db/workLogs.spec.ts`
- `src/lib/client/db/syncQueue.spec.ts`
- `src/lib/client/sync/trigger.spec.ts`

#### 8.2 統合テスト

**テストシナリオ**:

1. オフラインで作業を開始
2. オフラインで作業を終了
3. オンライン復帰
4. 自動同期が実行される
5. サーバーにデータが保存される
6. IndexedDBの同期ステータスが更新される

#### 8.3 手動テスト項目

- [ ] オフラインで作業開始ができる
- [ ] オフラインで作業終了ができる
- [ ] オフラインで作業編集ができる
- [ ] オフラインで作業削除ができる
- [ ] オンライン復帰時に自動同期される
- [ ] 同期中の表示が正しい
- [ ] 同期完了後、サーバーデータと一致する
- [ ] エラー時に適切なメッセージが表示される

## 技術仕様

### 使用ライブラリ

```json
{
	"dependencies": {
		"idb": "^8.0.0"
	}
}
```

### ブラウザ互換性

- **IndexedDB**: すべてのモダンブラウザでサポート
- **Background Sync API**: Chrome, Edge, Opera (Firefox, Safariは未サポート)
  - 非対応ブラウザではフォールバック処理を実装

### データ同期の戦略

#### 競合解決

単一ユーザーのため、基本的には**Last Write Wins**戦略を採用：

- サーバータイムスタンプを基準に最新のデータを採用
- 将来的な拡張性のため、バージョン番号を保持

#### リトライ戦略

1. 初回失敗: 即座にリトライ
2. 2回目以降: Exponential Backoff (2秒 → 4秒 → 8秒...)
3. 最大リトライ回数: 5回
4. 5回失敗後: エラー状態として保持、手動同期が必要

## 合格基準

### 機能要件

- [ ] オフラインで作業記録の作成ができる
- [ ] オフラインで作業記録の更新ができる
- [ ] オフラインで作業記録の削除ができる
- [ ] オンライン復帰時に自動同期される
- [ ] 同期状態がUIに表示される
- [ ] 同期エラーが適切に処理される

### 非機能要件

- [ ] IndexedDBへの保存が1秒以内に完了する
- [ ] 同期処理がバックグラウンドで実行される
- [ ] ユーザー体験を損なわない（同期中も操作可能）
- [ ] データの整合性が保たれる

### セキュリティ

- [ ] オフラインデータは暗号化されている（将来的な拡張）
- [ ] 同期時の認証が適切に行われる

## 実装の優先順位

### 必須（MVP）

1. IndexedDBの初期化とスキーマ定義
2. オフラインでの作業記録保存
3. オンライン/オフライン判定
4. 基本的な同期処理（フォールバック）

### 推奨

5. Background Sync APIの実装
6. 同期状態の表示
7. エラーハンドリング

### オプション

8. 競合解決の高度化
9. 部分同期（差分のみ）
10. オフラインデータの暗号化

## 参考資料

- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [idb Library](https://github.com/jakearchibald/idb)
- [Background Sync API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Sync_API)
- [Service Worker Cookbook](https://serviceworke.rs/)
- [Workbox Background Sync](https://developer.chrome.com/docs/workbox/modules/workbox-background-sync/)

## 備考

### Background Sync API の制限事項

- iOS Safari: 未サポート
- Firefox: 未サポート
- 対策: フォールバック処理（定期的なポーリングまたは手動同期ボタン）

### 次のフェーズ（Phase 3）

Phase 2完了後、以下の機能を検討：

- プッシュ通知（同期完了の通知）
- オフラインデータの暗号化
- 複数デバイス間の同期
- 競合解決UIの提供
