/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import {
	WorkLog,
	startWorkLogResponseSchema,
	errorResponseSchema,
	validateWorkLog,
	isWorkLog,
	normalizeTags
} from './workLog';

describe('WorkLog ドメインモデル', () => {
	describe('WorkLog.from()', () => {
		it('正常系: 正しいデータをパースできる（進行中）', () => {
			const data = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: null,
				description: '',
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			};

			const result = WorkLog.from(data);
			expect(result).toBeInstanceOf(WorkLog);
			expect(result.id).toBe(data.id);
			expect(result.userId).toBe(data.userId);
			expect(result.startedAt).toEqual(data.startedAt);
			expect(result.endedAt).toBe(data.endedAt);
			expect(result.description).toBe('');
		});

		it('正常系: 正しいデータをパースできる（完了）', () => {
			const startedAt = new Date('2025-10-20T12:00:00.000Z');
			const endedAt = new Date('2025-10-20T13:00:00.000Z');
			const data = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt,
				endedAt,
				description: 'テスト作業',
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			};

			const result = WorkLog.from(data);
			expect(result).toBeInstanceOf(WorkLog);
			expect(result.endedAt).toEqual(endedAt);
			expect(result.description).toBe('テスト作業');
		});

		it('正常系: descriptionが空文字列の場合', () => {
			const data = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: null,
				description: '',
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			};

			const result = WorkLog.from(data);
			expect(result).toBeInstanceOf(WorkLog);
			expect(result.description).toBe('');
		});

		it('正常系: descriptionにMarkdown形式のテキストが含まれる場合', () => {
			const data = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: null,
				description: '# タスク\n- 項目1\n- 項目2',
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			};

			const result = WorkLog.from(data);
			expect(result).toBeInstanceOf(WorkLog);
			expect(result.description).toBe('# タスク\n- 項目1\n- 項目2');
		});

		it('異常系: descriptionがnullの場合はエラー', () => {
			const data = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: null,
				description: null,
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			};

			expect(() => WorkLog.from(data as any)).toThrow();
		});

		it('異常系: 不正なUUIDでエラー', () => {
			const data = {
				id: 'invalid-uuid',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: null,
				description: '',
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
				description: '',
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
				description: '',
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
				description: '',
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
					description: '',
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
				description: '',
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
				description: '',
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
				description: '',
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
				description: '',
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
				description: '',
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
				description: '',
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
				description: '',
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
				description: '',
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
				description: '',
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
				description: '',
				tags: [], // F-003: タグ配列を追加
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			};
			const workLog = WorkLog.from(data);

			const obj = workLog.toObject();
			expect(obj).toEqual(data);
		});
	});

	// F-004: 編集機能のテスト
	describe('WorkLog#update()', () => {
		it('TC1: 正常系 - 各フィールドが正しく更新される', () => {
			const original = WorkLog.from({
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: new Date('2025-10-20T13:00:00.000Z'),
				description: '元の作業内容',
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			});

			const newStartedAt = new Date('2025-10-20T11:00:00.000Z');
			const newEndedAt = new Date('2025-10-20T14:00:00.000Z');
			const newDescription = '更新された作業内容';

			const updated = original.update({
				startedAt: newStartedAt,
				endedAt: newEndedAt,
				description: newDescription
			});

			// 各フィールドが更新されている
			expect(updated.startedAt).toEqual(newStartedAt);
			expect(updated.endedAt).toEqual(newEndedAt);
			expect(updated.description).toBe(newDescription);

			// 元のインスタンスは変更されていない（イミュータブル）
			expect(original.startedAt).toEqual(new Date('2025-10-20T12:00:00.000Z'));
			expect(original.endedAt).toEqual(new Date('2025-10-20T13:00:00.000Z'));
			expect(original.description).toBe('元の作業内容');

			// updatedAtが更新されている
			expect(updated.updatedAt.getTime()).toBeGreaterThan(original.updatedAt.getTime());
		});

		it('TC2: 正常系 - 部分更新（一部のフィールドのみ更新）', () => {
			const original = WorkLog.from({
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: new Date('2025-10-20T13:00:00.000Z'),
				description: '元の作業内容',
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			});

			const newDescription = '更新された作業内容';
			const updated = original.update({ description: newDescription });

			// 指定したフィールドのみ更新
			expect(updated.description).toBe(newDescription);

			// その他のフィールドは元の値を保持
			expect(updated.startedAt).toEqual(original.startedAt);
			expect(updated.endedAt).toEqual(original.endedAt);
			expect(updated.id).toBe(original.id);
			expect(updated.userId).toBe(original.userId);
		});
	});

	describe('WorkLog#validateTimeRange()', () => {
		it('TC3: 正常系 - startedAt < endedAt の場合、エラーをスローしない', () => {
			const workLog = WorkLog.from({
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: new Date('2025-10-20T13:00:00.000Z'),
				description: '',
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			});

			expect(() => workLog.validateTimeRange()).not.toThrow();
		});

		it('TC4: 異常系 - startedAt >= endedAt の場合、エラーをスロー', () => {
			// 正常なWorkLogを作成してから、update()で不正な状態にする
			const workLog = WorkLog.from({
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: new Date('2025-10-20T13:00:00.000Z'),
				description: '',
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			});

			// update()で不正な時刻範囲にする（同じ時刻）
			const invalidWorkLog = workLog.update({
				startedAt: new Date('2025-10-20T13:00:00.000Z'),
				endedAt: new Date('2025-10-20T13:00:00.000Z')
			});

			expect(() => invalidWorkLog.validateTimeRange()).toThrow(
				'開始時刻は終了時刻より前である必要があります'
			);
		});

		it('TC5: 正常系 - endedAt が null の場合、検証をスキップ', () => {
			const workLog = WorkLog.from({
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: null,
				description: '',
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			});

			expect(() => workLog.validateTimeRange()).not.toThrow();
		});
	});

	describe('WorkLog#isActive()', () => {
		it('TC6: 進行中の場合 - endedAt === null の場合、true を返す', () => {
			const workLog = WorkLog.from({
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: null,
				description: '',
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			});

			expect(workLog.isActive()).toBe(true);
		});

		it('TC7: 完了した場合 - endedAt に値がある場合、false を返す', () => {
			const workLog = WorkLog.from({
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: new Date('2025-10-20T13:00:00.000Z'),
				description: '',
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			});

			expect(workLog.isActive()).toBe(false);
		});
	});
});

describe('normalizeTags 関数', () => {
	describe('正常系', () => {
		it('タグの配列をそのまま返す', () => {
			const tags = ['tag1', 'tag2', 'tag3'];
			const result = normalizeTags(tags);
			expect(result).toEqual(tags);
		});

		it('前後の空白をトリミングする', () => {
			const tags = ['  tag1  ', ' tag2 ', 'tag3'];
			const result = normalizeTags(tags);
			expect(result).toEqual(['tag1', 'tag2', 'tag3']);
		});

		it('空文字列のタグを除外する', () => {
			const tags = ['tag1', '', '  ', 'tag2'];
			const result = normalizeTags(tags);
			expect(result).toEqual(['tag1', 'tag2']);
		});

		it('重複したタグを削除する', () => {
			const tags = ['tag1', 'tag2', 'tag1', 'tag3', 'tag2'];
			const result = normalizeTags(tags);
			expect(result).toEqual(['tag1', 'tag2', 'tag3']);
		});

		it('空配列を受け取った場合は空配列を返す', () => {
			const result = normalizeTags([]);
			expect(result).toEqual([]);
		});

		it('トリミング後の重複も削除する', () => {
			const tags = ['tag1', '  tag1  ', 'tag2'];
			const result = normalizeTags(tags);
			expect(result).toEqual(['tag1', 'tag2']);
		});
	});

	describe('異常系', () => {
		it('タグが21個以上の場合はエラーをスローする', () => {
			const tags = Array.from({ length: 21 }, (_, i) => `tag${i}`);
			expect(() => normalizeTags(tags)).toThrow('タグは最大20個まで');
		});

		it('タグが20個の場合はエラーをスローしない', () => {
			const tags = Array.from({ length: 20 }, (_, i) => `tag${i}`);
			expect(() => normalizeTags(tags)).not.toThrow();
		});

		it('タグの文字数が100文字を超える場合はエラーをスローする', () => {
			const longTag = 'a'.repeat(101);
			expect(() => normalizeTags([longTag])).toThrow('タグは100文字以内');
		});

		it('タグの文字数が100文字の場合はエラーをスローしない', () => {
			const tag = 'a'.repeat(100);
			expect(() => normalizeTags([tag])).not.toThrow();
		});
	});
});

describe('WorkLog クラス - タグ機能', () => {
	describe('WorkLog.from() - タグ付き', () => {
		it('タグ配列を含むデータをパースできる', () => {
			const data = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: null,
				description: 'テスト作業',
				tags: ['開発', 'バグ修正', 'urgent'],
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			};

			const result = WorkLog.from(data);
			expect(result).toBeInstanceOf(WorkLog);
			expect(result.tags).toEqual(['開発', 'バグ修正', 'urgent']);
		});

		it('tagsが省略された場合は空配列になる', () => {
			const data = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: null,
				description: 'テスト作業',
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			};

			const result = WorkLog.from(data);
			expect(result.tags).toEqual([]);
		});

		it('tagsが空配列の場合は空配列になる', () => {
			const data = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: null,
				description: 'テスト作業',
				tags: [],
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			};

			const result = WorkLog.from(data);
			expect(result.tags).toEqual([]);
		});
	});

	describe('WorkLog.from() - タグ付き', () => {
		it('タグを指定して作業を開始できる', () => {
			const userId = '123e4567-e89b-12d3-a456-426614174001';
			const startedAt = new Date('2025-10-20T12:00:00.000Z');
			const tags = ['開発', 'feature'];

			const result = WorkLog.from({
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId,
				startedAt,
				endedAt: null,
				description: '',
				tags,
				createdAt: startedAt,
				updatedAt: startedAt
			});
			expect(result).toBeInstanceOf(WorkLog);
			expect(result.tags).toEqual(['開発', 'feature']);
			expect(result.startedAt).toEqual(startedAt);
			expect(result.endedAt).toBeNull();
		});

		it('タグを省略して作業を開始できる', () => {
			const userId = '123e4567-e89b-12d3-a456-426614174001';
			const startedAt = new Date('2025-10-20T12:00:00.000Z');

			const result = WorkLog.from({
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId,
				startedAt,
				endedAt: null,
				description: '',
				createdAt: startedAt,
				updatedAt: startedAt
			});
			expect(result.tags).toEqual([]);
		});
	});

	describe('update() - タグ更新', () => {
		it('タグを更新できる', () => {
			const workLog = WorkLog.from({
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: null,
				description: '',
				tags: ['開発'],
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			});

			const updated = workLog.update({ tags: ['開発', 'レビュー'] });
			expect(updated.tags).toEqual(['開発', 'レビュー']);
		});

		it('タグを空配列に更新できる', () => {
			const workLog = WorkLog.from({
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: null,
				description: '',
				tags: ['開発', 'バグ修正'],
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			});

			const updated = workLog.update({ tags: [] });
			expect(updated.tags).toEqual([]);
		});

		it('タグを省略した場合は元のタグが保持される', () => {
			const workLog = WorkLog.from({
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: null,
				description: '',
				tags: ['開発'],
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			});

			const updated = workLog.update({ description: '更新後の説明' });
			expect(updated.tags).toEqual(['開発']);
		});
	});

	describe('toObject() - タグを含む', () => {
		it('タグを含むオブジェクトに変換できる', () => {
			const data = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: null,
				description: 'テスト作業',
				tags: ['開発', 'feature'],
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			};

			const workLog = WorkLog.from(data);
			const obj = workLog.toObject();

			expect(obj.tags).toEqual(['開発', 'feature']);
			expect(obj).toHaveProperty('tags');
		});

		it('タグが空配列の場合も正しく変換できる', () => {
			const data = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				userId: '123e4567-e89b-12d3-a456-426614174001',
				startedAt: new Date('2025-10-20T12:00:00.000Z'),
				endedAt: null,
				description: 'テスト作業',
				tags: [],
				createdAt: new Date('2025-10-20T12:00:00.000Z'),
				updatedAt: new Date('2025-10-20T12:00:00.000Z')
			};

			const workLog = WorkLog.from(data);
			const obj = workLog.toObject();

			expect(obj.tags).toEqual([]);
		});
	});
});
