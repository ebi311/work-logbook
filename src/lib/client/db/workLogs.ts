import { nanoid } from 'nanoid';
import { initDB, type OfflineWorkLog } from './index';
import { addToSyncQueue } from './syncQueue';

export const saveWorkLogOffline = async (
	workLog: Omit<OfflineWorkLog, 'id' | 'syncStatus' | 'operation' | 'localCreatedAt'>,
): Promise<string> => {
	const db = await initDB();
	const id = nanoid();

	// Svelte 5のプロキシオブジェクトを通常の配列に変換
	const offlineWorkLog: OfflineWorkLog = {
		...workLog,
		tags: Array.isArray(workLog.tags) ? [...workLog.tags] : [],
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

	// Svelte 5のプロキシオブジェクトを通常の配列に変換
	const updated: OfflineWorkLog = {
		...workLog,
		...updates,
		tags: Array.isArray(updates.tags) ? [...updates.tags] : workLog.tags,
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

/**
 * サーバーからのデータをIndexedDBに保存（同期済みとしてマーク）
 * オンライン操作成功後に呼び出される
 */
export const saveWorkLogFromServer = async (workLog: {
	id: string;
	userId: string;
	startedAt: Date | string;
	endedAt: Date | string | null;
	description: string;
	tags?: string[];
}): Promise<void> => {
	const db = await initDB();

	const offlineWorkLog: OfflineWorkLog = {
		id: workLog.id,
		userId: workLog.userId,
		startAt:
			typeof workLog.startedAt === 'string' ? workLog.startedAt : workLog.startedAt.toISOString(),
		endAt: workLog.endedAt
			? typeof workLog.endedAt === 'string'
				? workLog.endedAt
				: workLog.endedAt.toISOString()
			: null,
		description: workLog.description,
		tags: workLog.tags ? [...workLog.tags] : [],
		syncStatus: 'synced', // サーバーと同期済み
		operation: 'create',
		localCreatedAt: Date.now(),
	};

	await db.put('workLogs', offlineWorkLog);
};
