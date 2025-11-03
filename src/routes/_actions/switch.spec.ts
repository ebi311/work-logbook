import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleSwitchAction } from './switch';
import {
	getActiveWorkLog,
	stopWorkLog,
	createWorkLog,
	saveWorkLogTags,
} from '$lib/server/db/workLogs';
import { error, fail } from '@sveltejs/kit';

vi.mock('$lib/server/db/workLogs');
vi.mock('@sveltejs/kit', async () => {
	const actual = await vi.importActual('@sveltejs/kit');
	return {
		...actual,
		error: vi.fn((status: number, message: string) => {
			throw { status, message };
		}),
		fail: vi.fn((status: number, data: any) => data),
	};
});

describe('switch action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('正常系', () => {
		it('進行中の作業を終了し、新しい作業を開始する', async () => {
			// Arrange
			const userId = 'user-1';
			const activeWorkLog = {
				id: 'worklog-1',
				userId,
				startedAt: new Date('2025-11-03T10:00:00Z'),
				endedAt: null,
				description: '旧作業',
				tags: ['開発'],
				getDuration: () => null,
			};
			const stoppedWorkLog = {
				id: 'worklog-1',
				userId,
				startedAt: new Date('2025-11-03T10:00:00Z'),
				endedAt: new Date('2025-11-03T11:00:00Z'),
				description: '旧作業',
				tags: ['開発'],
				getDuration: () => 3600,
			};
			const newWorkLog = {
				id: 'worklog-2',
				userId,
				startedAt: new Date('2025-11-03T11:00:00Z'),
				endedAt: null,
				description: '新作業',
				tags: [],
				getDuration: () => null,
			};

			vi.mocked(getActiveWorkLog).mockResolvedValue(activeWorkLog as any);
			vi.mocked(stopWorkLog).mockResolvedValue(stoppedWorkLog as any);
			vi.mocked(createWorkLog).mockResolvedValue(newWorkLog as any);
			vi.mocked(saveWorkLogTags).mockResolvedValue();

			const formData = new FormData();
			formData.set('description', '新作業');
			formData.append('tags', 'PJ-A');

			const event = {
				locals: { user: { id: userId } },
				request: { formData: async () => formData },
			} as any;

			// Act
			const result = await handleSwitchAction(event);

			// Assert
			expect(result).toEqual({
				ok: true,
				stopped: {
					id: 'worklog-1',
					startedAt: '2025-11-03T10:00:00.000Z',
					endedAt: '2025-11-03T11:00:00.000Z',
					description: '旧作業',
					tags: ['開発'],
					durationSec: 3600,
				},
				started: {
					id: 'worklog-2',
					startedAt: '2025-11-03T11:00:00.000Z',
					endedAt: null,
					description: '新作業',
					tags: ['PJ-A'],
				},
				serverNow: expect.any(String),
			});

			expect(stopWorkLog).toHaveBeenCalledWith('worklog-1', expect.any(Date), '新作業');
			expect(createWorkLog).toHaveBeenCalledWith(userId, expect.any(Date), '新作業');
			expect(saveWorkLogTags).toHaveBeenCalledWith('worklog-1', ['開発']);
			expect(saveWorkLogTags).toHaveBeenCalledWith('worklog-2', ['PJ-A']);
		});

		it('タグなしで切り替えができる', async () => {
			// Arrange
			const userId = 'user-1';
			const activeWorkLog = {
				id: 'worklog-1',
				userId,
				startedAt: new Date('2025-11-03T10:00:00Z'),
				endedAt: null,
				description: '',
				tags: [],
				getDuration: () => null,
			};
			const stoppedWorkLog = {
				id: 'worklog-1',
				userId,
				startedAt: new Date('2025-11-03T10:00:00Z'),
				endedAt: new Date('2025-11-03T11:00:00Z'),
				description: '作業内容',
				tags: [],
				getDuration: () => 3600,
			};
			const newWorkLog = {
				id: 'worklog-2',
				userId,
				startedAt: new Date('2025-11-03T11:00:00Z'),
				endedAt: null,
				description: '作業内容',
				tags: [],
				getDuration: () => null,
			};

			vi.mocked(getActiveWorkLog).mockResolvedValue(activeWorkLog as any);
			vi.mocked(stopWorkLog).mockResolvedValue(stoppedWorkLog as any);
			vi.mocked(createWorkLog).mockResolvedValue(newWorkLog as any);
			vi.mocked(saveWorkLogTags).mockResolvedValue();

			const formData = new FormData();
			formData.set('description', '作業内容');

			const event = {
				locals: { user: { id: userId } },
				request: { formData: async () => formData },
			} as any;

			// Act
			const result = await handleSwitchAction(event);

			// Assert
			expect(result).toEqual({
				ok: true,
				stopped: expect.objectContaining({
					id: 'worklog-1',
					tags: [],
				}),
				started: expect.objectContaining({
					id: 'worklog-2',
					tags: [],
				}),
				serverNow: expect.any(String),
			});
		});
	});

	describe('異常系', () => {
		it('認証されていない場合はエラー', async () => {
			// Arrange
			const event = {
				locals: {},
				request: { formData: async () => new FormData() },
			} as any;

			// Act & Assert
			await expect(handleSwitchAction(event)).rejects.toEqual({
				status: 401,
				message: 'Unauthorized',
			});
		});

		it('進行中の作業がない場合は404エラー', async () => {
			// Arrange
			const userId = 'user-1';
			vi.mocked(getActiveWorkLog).mockResolvedValue(null);

			const formData = new FormData();
			const event = {
				locals: { user: { id: userId } },
				request: { formData: async () => formData },
			} as any;

			// Act
			const result = await handleSwitchAction(event);

			// Assert
			expect(fail).toHaveBeenCalledWith(404, {
				reason: 'NO_ACTIVE',
				serverNow: expect.any(String),
			});
			expect(result).toEqual({
				reason: 'NO_ACTIVE',
				serverNow: expect.any(String),
			});
		});

		it('stopWorkLogが失敗した場合は404エラー', async () => {
			// Arrange
			const userId = 'user-1';
			const activeWorkLog = {
				id: 'worklog-1',
				userId,
				startedAt: new Date('2025-11-03T10:00:00Z'),
				endedAt: null,
				description: '',
				tags: [],
				getDuration: () => null,
			};

			vi.mocked(getActiveWorkLog).mockResolvedValue(activeWorkLog as any);
			vi.mocked(stopWorkLog).mockResolvedValue(null);

			const formData = new FormData();
			const event = {
				locals: { user: { id: userId } },
				request: { formData: async () => formData },
			} as any;

			// Act
			const result = await handleSwitchAction(event);

			// Assert
			expect(fail).toHaveBeenCalledWith(404, {
				reason: 'NO_ACTIVE',
				serverNow: expect.any(String),
			});
			expect(result).toEqual({
				reason: 'NO_ACTIVE',
				serverNow: expect.any(String),
			});
		});

		it('無効なタグが含まれている場合は400エラー', async () => {
			// Arrange
			const userId = 'user-1';
			const activeWorkLog = {
				id: 'worklog-1',
				userId,
				startedAt: new Date('2025-11-03T10:00:00Z'),
				endedAt: null,
				description: '',
				tags: [],
				getDuration: () => null,
			};

			vi.mocked(getActiveWorkLog).mockResolvedValue(activeWorkLog as any);

			const formData = new FormData();
			// 101文字のタグ(無効)
			formData.append('tags', 'a'.repeat(101));

			const event = {
				locals: { user: { id: userId } },
				request: { formData: async () => formData },
			} as any;

			// Act
			const result = await handleSwitchAction(event);

			// Assert
			expect(fail).toHaveBeenCalledWith(400, {
				ok: false,
				reason: 'INVALID_TAGS',
				message: expect.stringContaining('タグ'),
				serverNow: expect.any(String),
			});
		});
	});
});
