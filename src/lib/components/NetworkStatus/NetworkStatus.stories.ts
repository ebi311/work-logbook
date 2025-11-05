import type { Meta, StoryObj } from '@storybook/sveltekit';
import NetworkStatus from './NetworkStatus.svelte';
import { isOnline } from '$lib/client/network/status';

const meta = {
	title: 'Components/NetworkStatus',
	component: NetworkStatus,
	tags: ['autodocs'],
	parameters: {
		layout: 'padded',
	},
} satisfies Meta<NetworkStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Online: Story = {
	play: async () => {
		isOnline.set(true);
	},
};

export const Offline: Story = {
	play: async () => {
		isOnline.set(false);
	},
};
