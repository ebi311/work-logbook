import { describe, it, expect } from 'vitest';
import {
	WorkLog,
	startWorkLogResponseSchema,
	errorResponseSchema,
	validateWorkLog,
	isWorkLog
} from './workLog';

describe('WorkLog ドメインモデル', () => {
	describe('WorkLog.from()', () => {
		it('正常系: 正しいデータをパースできる（進行中）', () => {
			const data = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: null,
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			};

			const result = WorkLog.from(data);
			expect(result).toBeInstanceOf(WorkLog);
			expect(result.id).toBe(data.id);
			expect(result.userId).toBe(data.userId);
			expect(result.startedAt).toEqual(data.startedAt);
			expect(result.endedAt).toBe(data.endedAt);
		});

		it('正常系: 正しいデータをパースできる（完了）', () => {
			const startedAt = new Date('2025-10-20T12:00:00.000Z');
			const endedAt = new Date('2025-10-20T13:00:00.000Z');
			const data = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt,
				endedAt,
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			};

			const result = WorkLog.from(data);
			expect(result).toBeInstanceOf(WorkLog);
			expect(result.endedAt).toEqual(endedAt);
		});

		it('異常系: 不正なUUIDでエラー', () => {
			const data = {
				id: 'invalid-uuid',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: null,
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			};

			expect(() => WorkLog.from(data)).toThrow();
		});

		it('異常系: 不正な日時形式でエラー', () => {
			const data = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: 'invalid-date',
				endedAt: null,
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			};

			expect(() => WorkLog.from(data)).toThrow();
		});

		it('異常系: endedAtがstartedAt以前でエラー', () => {
			const data = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: new Date('2025-10-20T11:00:00.000Z'), // 1時間前
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			};

			expect(() => WorkLog.from(data)).toThrow();
		});

		it('異常系: endedAtがstartedAtと同じでエラー', () => {
			const sameTime = new Date('2025-10-20T12:00:00.000Z');
			const data = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: sameTime,
				endedAt: sameTime,
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			};

			expect(() => WorkLog.from(data)).toThrow();
		});
	});

	describe('startWorkLogResponseSchema', () => {
		it('正常系: 作業開始レスポンスをパースできる', () => {
			const data = {
				ok: true as const,
				workLog: {
					id: '123e4567-e89b-12d3-a456-426614174000',
					userId: '123e4567-e89b-12d3-a456-426614174001',
					startedAt: new Date('2025-10-20T12:00:00.000Z'),
					endedAt: null,
					createdAt: new Date('2025-10-20T12:00:00.000Z'),
					updatedAt: new Date('2025-10-20T12:00:00.000Z')
				},
				serverNow: new Date('2025-10-20T12:00:00.000Z')
			};

			const result = startWorkLogResponseSchema.parse(data);
			expect(result.ok).toBe(true);
			expect(result.workLog.id).toBeDefined();
		});
	});

	describe('errorResponseSchema', () => {
		it('正常系: エラーレスポンスをパースできる', () => {
			const data = {
				ok: false as const,
				reason: 'ACTIVE_EXISTS' as const,
				message: '既に進行中の作業があります',
				serverNow: new Date('2025-10-20T12:00:00.000Z')
			};

			const result = errorResponseSchema.parse(data);
			expect(result.ok).toBe(false);
			expect(result.reason).toBe('ACTIVE_EXISTS');
		});
	});

	describe('validateWorkLog', () => {
		it('正常系: バリデーション成功', () => {
			const data = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: null,
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			};

			expect(() => validateWorkLog(data)).not.toThrow();
		});
	});

	describe('WorkLog.isValid()', () => {
		it('正常系: 型ガード成功', () => {
			const data = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: null,
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			};

			expect(WorkLog.isValid(data)).toBe(true);
		});

		it('異常系: 型ガード失敗', () => {
			const data = { id: 'invalid' };
			expect(WorkLog.isValid(data)).toBe(false);
		});
	});

	describe('isWorkLog (deprecated)', () => {
		it('正常系: 型ガード成功', () => {
			const data = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: null,
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			};

			expect(isWorkLog(data)).toBe(true);
		});

		it('異常系: 型ガード失敗', () => {
			const data = { id: 'invalid' };
			expect(isWorkLog(data)).toBe(false);
		});
	});

	describe('WorkLog#isActive()', () => {
		it('進行中の作業の場合はtrueを返す', () => {
			const workLog = WorkLog.from({
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: null,
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			});

			expect(workLog.isActive()).toBe(true);
		});

		it('完了した作業の場合はfalseを返す', () => {
			const workLog = WorkLog.from({
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: new Date('2025-10-20T13:00:00.000Z'),
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			});

			expect(workLog.isActive()).toBe(false);
		});
	});

	describe('WorkLog#getDuration()', () => {
		it('完了した作業の場合は作業時間（秒）を返す', () => {
			const workLog = WorkLog.from({
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: new Date('2025-10-20T13:00:00.000Z'),
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			});

			expect(workLog.getDuration()).toBe(3600); // 1時間 = 3600秒
		});

		it('進行中の作業の場合はnullを返す', () => {
			const workLog = WorkLog.from({
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: null,
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			});

			expect(workLog.getDuration()).toBeNull();
		});
	});

	describe('WorkLog#canStop()', () => {
		it('進行中の作業の場合はtrueを返す', () => {
			const workLog = WorkLog.from({
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: null,
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			});

			expect(workLog.canStop()).toBe(true);
		});

		it('完了した作業の場合はfalseを返す', () => {
			const workLog = WorkLog.from({
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: new Date('2025-10-20T13:00:00.000Z'),
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			});

			expect(workLog.canStop()).toBe(false);
		});
	});

	describe('WorkLog#toObject()', () => {
		it('プレーンオブジェクトに変換できる', () => {
			const data = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: null,
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			};
			const workLog = WorkLog.from(data);

			const obj = workLog.toObject();
			expect(obj).toEqual(data);
		});
	});
});
