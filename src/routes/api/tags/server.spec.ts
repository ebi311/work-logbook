/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from './+server';

// getUserTagSuggestions をモック化
vi.mock('$lib/server/db/workLogs', () => ({
	getUserTagSuggestions: vi.fn(),
}));

import { getUserTagSuggestions } from '$lib/server/db/workLogs';

describe('GET /api/tags', () => {
	const mockLocals = {
		user: {
			id: 'test-user-id',
			githubId: 12345,
			githubUsername: 'testuser',
			isActive: true,
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('認証済みユーザーのタグ一覧を取得（クエリなし）', async () => {
		// モックの設定
		vi.mocked(getUserTagSuggestions).mockResolvedValue([
			{ tag: 'backend', count: 5 },
			{ tag: 'frontend', count: 3 },
			{ tag: 'api', count: 2 },
		]);

		// リクエストイベントのモック
		const event = {
			locals: mockLocals,
			url: new URL('http://localhost/api/tags'),
		} as any;

		// APIを呼び出し
		const response = await GET(event);
		const data = await response.json();

		// getUserTagSuggestions が正しく呼ばれたことを確認
		expect(getUserTagSuggestions).toHaveBeenCalledWith('test-user-id', '', 100);

		// レスポンスの検証
		expect(data).toEqual({
			tags: ['backend', 'frontend', 'api'],
		});
	});

	it('認証済みユーザーのタグ一覧を取得（クエリあり）', async () => {
		// モックの設定
		vi.mocked(getUserTagSuggestions).mockResolvedValue([
			{ tag: 'backend', count: 5 },
			{ tag: 'backend-api', count: 2 },
		]);

		// リクエストイベントのモック
		const event = {
			locals: mockLocals,
			url: new URL('http://localhost/api/tags?q=back'),
		} as any;

		// APIを呼び出し
		const response = await GET(event);
		const data = await response.json();

		// getUserTagSuggestions が正しく呼ばれたことを確認
		expect(getUserTagSuggestions).toHaveBeenCalledWith('test-user-id', 'back', 100);

		// レスポンスの検証
		expect(data).toEqual({
			tags: ['backend', 'backend-api'],
		});
	});

	it('認証済みユーザーのタグ一覧を取得（limitあり）', async () => {
		// モックの設定
		vi.mocked(getUserTagSuggestions).mockResolvedValue([
			{ tag: 'backend', count: 5 },
			{ tag: 'frontend', count: 3 },
		]);

		// リクエストイベントのモック
		const event = {
			locals: mockLocals,
			url: new URL('http://localhost/api/tags?limit=2'),
		} as any;

		// APIを呼び出し
		const response = await GET(event);
		const data = await response.json();

		// getUserTagSuggestions が正しく呼ばれたことを確認
		expect(getUserTagSuggestions).toHaveBeenCalledWith('test-user-id', '', 2);

		// レスポンスの検証
		expect(data).toEqual({
			tags: ['backend', 'frontend'],
		});
	});

	it('未認証ユーザーは401エラー', async () => {
		// 未認証のリクエストイベント
		const event = {
			locals: {},
			url: new URL('http://localhost/api/tags'),
		} as any;

		// APIを呼び出し、エラーを期待
		await expect(GET(event)).rejects.toThrow();

		// getUserTagSuggestions が呼ばれないことを確認
		expect(getUserTagSuggestions).not.toHaveBeenCalled();
	});

	it('DB エラー時は 500 エラー', async () => {
		// モックでエラーを投げる
		vi.mocked(getUserTagSuggestions).mockRejectedValue(new Error('DB error'));

		// リクエストイベントのモック
		const event = {
			locals: mockLocals,
			url: new URL('http://localhost/api/tags'),
		} as any;

		// APIを呼び出し、エラーを期待
		await expect(GET(event)).rejects.toThrow();
	});

	it('タグが0件の場合は空配列を返す', async () => {
		// モックの設定（空配列）
		vi.mocked(getUserTagSuggestions).mockResolvedValue([]);

		// リクエストイベントのモック
		const event = {
			locals: mockLocals,
			url: new URL('http://localhost/api/tags'),
		} as any;

		// APIを呼び出し
		const response = await GET(event);
		const data = await response.json();

		// レスポンスの検証
		expect(data).toEqual({
			tags: [],
		});
	});
});
