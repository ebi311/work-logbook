import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import 'fake-indexeddb/auto';
import SyncStatus from './SyncStatus.svelte';
import { addToSyncQueue, clearSyncQueue } from '$lib/client/db/syncQueue';
import type { SyncQueueItem } from '$lib/client/db';

const createTestSyncItem = (id: string): SyncQueueItem => ({
	id,
	workLogId: `work-${id}`,
	operation: 'create',
	data: {
		id: `work-${id}`,
		userId: 'user-1',
		startAt: '2025-11-05T10:00:00Z',
		endAt: null,
		description: 'Test work',
		tags: [],
		syncStatus: 'pending',
		operation: 'create',
		localCreatedAt: Date.now(),
	},
	timestamp: Date.now(),
	retryCount: 0,
});

describe('SyncStatus', () => {
	beforeEach(async () => {
		await clearSyncQueue();
	});

	it('同期待ちアイテムがない場合は何も表示しない', async () => {
		render(SyncStatus);

		// 少し待つ
		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(screen.queryByTestId('sync-status-badge')).not.toBeInTheDocument();
	});

	it('同期待ちアイテムがある場合はバッジを表示する', async () => {
		await addToSyncQueue(createTestSyncItem('sync-1'));

		render(SyncStatus);

		// バッジが表示されるまで待つ
		await waitFor(
			() => {
				expect(screen.getByTestId('sync-status-badge')).toBeInTheDocument();
			},
			{ timeout: 1000 },
		);

		const badge = screen.getByTestId('sync-status-badge');
		expect(badge).toHaveTextContent('1件の変更を同期待ち');
	});

	it('複数の同期待ちアイテムを正しく表示する', async () => {
		await addToSyncQueue(createTestSyncItem('sync-1'));
		await addToSyncQueue(createTestSyncItem('sync-2'));
		await addToSyncQueue(createTestSyncItem('sync-3'));

		render(SyncStatus);

		await waitFor(
			() => {
				expect(screen.getByTestId('sync-status-badge')).toBeInTheDocument();
			},
			{ timeout: 1000 },
		);

		const badge = screen.getByTestId('sync-status-badge');
		expect(badge).toHaveTextContent('3件の変更を同期待ち');
	});

	it('バッジにはinfoスタイルが適用される', async () => {
		await addToSyncQueue(createTestSyncItem('sync-1'));

		render(SyncStatus);

		await waitFor(
			() => {
				expect(screen.getByTestId('sync-status-badge')).toBeInTheDocument();
			},
			{ timeout: 1000 },
		);

		const badge = screen.getByTestId('sync-status-badge');
		expect(badge).toHaveClass('badge', 'badge-info');
	});
});
