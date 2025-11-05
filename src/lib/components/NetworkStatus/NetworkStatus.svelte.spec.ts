import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { isOnline } from '$lib/client/network/status';
import NetworkStatus from './NetworkStatus.svelte';

describe('NetworkStatus', () => {
	beforeEach(() => {
		// テスト前にオンライン状態にリセット
		isOnline.set(true);
	});

	it('オンライン時は何も表示しない', () => {
		isOnline.set(true);
		render(NetworkStatus);

		expect(screen.queryByTestId('offline-alert')).not.toBeInTheDocument();
	});

	it('オフライン時はアラートを表示する', () => {
		isOnline.set(false);
		render(NetworkStatus);

		const alert = screen.getByTestId('offline-alert');
		expect(alert).toBeInTheDocument();
		expect(alert).toHaveTextContent('オフラインモード - 変更は後で同期されます');
	});

	it('オフラインからオンラインに変わると警告が消える', async () => {
		isOnline.set(false);
		render(NetworkStatus);

		expect(screen.getByTestId('offline-alert')).toBeInTheDocument();

		isOnline.set(true);
		await new Promise((resolve) => setTimeout(resolve, 0)); // リアクティブ更新を待つ

		expect(screen.queryByTestId('offline-alert')).not.toBeInTheDocument();
	});

	it('オンラインからオフラインに変わると警告が表示される', async () => {
		isOnline.set(true);
		render(NetworkStatus);

		expect(screen.queryByTestId('offline-alert')).not.toBeInTheDocument();

		isOnline.set(false);
		await new Promise((resolve) => setTimeout(resolve, 0)); // リアクティブ更新を待つ

		expect(screen.getByTestId('offline-alert')).toBeInTheDocument();
	});

	it('アラートにはwarningスタイルが適用される', () => {
		isOnline.set(false);
		render(NetworkStatus);

		const alert = screen.getByTestId('offline-alert');
		expect(alert).toHaveClass('alert', 'alert-warning');
	});
});
