import { describe, it, expect, beforeEach } from 'vitest';
import { initDB, type OfflineWorkLog, type SyncQueueItem } from './index';
import 'fake-indexeddb/auto';

const DB_NAME = 'work-logbook-offline';

describe('IndexedDB initialization', () => {
	beforeEach(async () => {
		// テスト前にDBをクリーンアップ
		const databases = await indexedDB.databases();
		for (const db of databases) {
			if (db.name === DB_NAME) {
				indexedDB.deleteDatabase(DB_NAME);
			}
		}
	});

	it('should create database with correct version', async () => {
		expect.assertions(1);
		const db = await initDB();
		expect(db.version).toBe(1);
		db.close();
	});

	it('should create workLogs object store', async () => {
		expect.assertions(1);
		const db = await initDB();
		expect(db.objectStoreNames.contains('workLogs')).toBe(true);
		db.close();
	});

	it('should create syncQueue object store', async () => {
		expect.assertions(1);
		const db = await initDB();
		expect(db.objectStoreNames.contains('syncQueue')).toBe(true);
		db.close();
	});

	it('should create indexes on workLogs store', async () => {
		expect.assertions(2);
		const db = await initDB();
		const tx = db.transaction('workLogs', 'readonly');
		const store = tx.objectStore('workLogs');

		expect(store.indexNames.contains('syncStatus')).toBe(true);
		expect(store.indexNames.contains('userId')).toBe(true);

		await tx.done;
		db.close();
	});

	it('should create timestamp index on syncQueue store', async () => {
		expect.assertions(1);
		const db = await initDB();
		const tx = db.transaction('syncQueue', 'readonly');
		const store = tx.objectStore('syncQueue');

		expect(store.indexNames.contains('timestamp')).toBe(true);

		await tx.done;
		db.close();
	});

	it('should save and retrieve a workLog', async () => {
		expect.assertions(2);
		const db = await initDB();

		const workLog: OfflineWorkLog = {
			id: 'test-1',
			userId: 'user-1',
			startAt: '2025-11-05T00:00:00Z',
			endAt: null,
			description: 'Test work',
			tags: ['test'],
			syncStatus: 'pending',
			operation: 'create',
			localCreatedAt: Date.now(),
		};

		await db.put('workLogs', workLog);
		const retrieved = await db.get('workLogs', 'test-1');

		expect(retrieved).toBeDefined();
		expect(retrieved?.description).toBe('Test work');

		db.close();
	});

	it('should save and retrieve a sync queue item', async () => {
		expect.assertions(2);
		const db = await initDB();

		const queueItem: SyncQueueItem = {
			id: 'queue-1',
			workLogId: 'work-1',
			operation: 'create',
			data: {
				id: 'work-1',
				userId: 'user-1',
				startAt: '2025-11-05T00:00:00Z',
				endAt: null,
				description: 'Test',
				tags: [],
				syncStatus: 'pending',
				operation: 'create',
				localCreatedAt: Date.now(),
			},
			timestamp: Date.now(),
			retryCount: 0,
		};

		await db.put('syncQueue', queueItem);
		const retrieved = await db.get('syncQueue', 'queue-1');

		expect(retrieved).toBeDefined();
		expect(retrieved?.workLogId).toBe('work-1');

		db.close();
	});
});
