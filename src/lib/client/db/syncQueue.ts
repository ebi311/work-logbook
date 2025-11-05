import { initDB, type SyncQueueItem } from './index';

export const addToSyncQueue = async (item: SyncQueueItem): Promise<void> => {
	const db = await initDB();
	await db.put('syncQueue', item);
};

export const getSyncQueue = async (): Promise<SyncQueueItem[]> => {
	const db = await initDB();
	const index = db.transaction('syncQueue').store.index('timestamp');
	return index.getAll();
};

export const removeSyncQueueItem = async (id: string): Promise<void> => {
	const db = await initDB();
	await db.delete('syncQueue', id);
};

export const updateSyncQueueItem = async (
	id: string,
	updates: Partial<SyncQueueItem>,
): Promise<void> => {
	const db = await initDB();
	const item = await db.get('syncQueue', id);

	if (!item) {
		return;
	}

	await db.put('syncQueue', { ...item, ...updates });
};

export const clearSyncQueue = async (): Promise<void> => {
	const db = await initDB();
	await db.clear('syncQueue');
};
