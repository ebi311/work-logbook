import { nanoid } from 'nanoid';
import { initDB, type OfflineWorkLog } from './index';
import { addToSyncQueue } from './syncQueue';

export const saveWorkLogOffline = async (
	workLog: Omit<OfflineWorkLog, 'id' | 'syncStatus' | 'operation' | 'localCreatedAt'>,
): Promise<string> => {
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
};

export const updateWorkLogOffline = async (
	id: string,
	updates: Partial<Omit<OfflineWorkLog, 'id' | 'syncStatus' | 'operation' | 'localCreatedAt'>>,
): Promise<void> => {
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
};

export const deleteWorkLogOffline = async (id: string): Promise<void> => {
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
};

export const getWorkLogsOffline = async (userId: string): Promise<OfflineWorkLog[]> => {
	const db = await initDB();
	const index = db.transaction('workLogs').store.index('userId');
	return index.getAll(userId);
};

export const getWorkLogOffline = async (id: string): Promise<OfflineWorkLog | undefined> => {
	const db = await initDB();
	return db.get('workLogs', id);
};

export const clearWorkLogsOffline = async (): Promise<void> => {
	const db = await initDB();
	await db.clear('workLogs');
};
