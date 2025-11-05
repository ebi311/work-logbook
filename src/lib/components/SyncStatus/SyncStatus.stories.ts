import type { Meta, StoryObj } from '@storybook/sveltekit';
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

const meta = {
	title: 'Components/SyncStatus',
	component: SyncStatus,
	tags: ['autodocs'],
	parameters: {
		layout: 'padded',
	},
} satisfies Meta<typeof SyncStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoSyncItems: Story = {
	play: async () => {
		await clearSyncQueue();
	},
};

export const OneSyncItem: Story = {
	play: async () => {
		await clearSyncQueue();
		await addToSyncQueue(createTestSyncItem('sync-1'));
	},
};

export const MultipleSyncItems: Story = {
	play: async () => {
		await clearSyncQueue();
		await addToSyncQueue(createTestSyncItem('sync-1'));
		await addToSyncQueue(createTestSyncItem('sync-2'));
		await addToSyncQueue(createTestSyncItem('sync-3'));
	},
};
