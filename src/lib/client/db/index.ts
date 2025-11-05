import { openDB } from 'idb';

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
	data: OfflineWorkLog;
	timestamp: number;
	retryCount: number;
	lastError?: string;
}

const DB_NAME = 'work-logbook-offline';
const DB_VERSION = 1;

export const initDB = async () => {
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
};
