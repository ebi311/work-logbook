/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createEditModalManager, type ListItem } from './editModalManager';

describe('modal/editModalManager', () => {
	describe('createEditModalManager', () => {
		let manager: ReturnType<typeof createEditModalManager>;

		beforeEach(() => {
			manager = createEditModalManager();
		});

		describe('初期状態', () => {
			it('モーダルが閉じている', () => {
				expect(manager.isOpen()).toBe(false);
			});

			it('編集対象がnull', () => {
				expect(manager.getTarget()).toBe(null);
			});
		});

		describe('openModal', () => {
			it('終了済みの作業記録を開ける', () => {
				const item: ListItem = {
					id: 'test-id',
					startedAt: '2025-11-06T10:00:00Z',
					endedAt: '2025-11-06T12:00:00Z',
					description: 'テスト作業',
					tags: ['tag1', 'tag2'],
				};

				manager.openModal(item);

				expect(manager.isOpen()).toBe(true);
				const target = manager.getTarget();
				expect(target).not.toBe(null);
				expect(target?.id).toBe('test-id');
				expect(target?.startedAt).toBeInstanceOf(Date);
				expect(target?.endedAt).toBeInstanceOf(Date);
				expect(target?.description).toBe('テスト作業');
				expect(target?.tags).toEqual(['tag1', 'tag2']);
			});

			it('進行中の作業記録は開けない(endedAt=null)', () => {
				const item: ListItem = {
					id: 'active-id',
					startedAt: '2025-11-06T10:00:00Z',
					endedAt: null,
					description: '進行中',
					tags: [],
				};

				manager.openModal(item);

				expect(manager.isOpen()).toBe(false);
				expect(manager.getTarget()).toBe(null);
			});

			it('tagsが未定義の場合、空配列として扱う', () => {
				const item: ListItem = {
					id: 'test-id',
					startedAt: '2025-11-06T10:00:00Z',
					endedAt: '2025-11-06T12:00:00Z',
					description: 'テスト',
					tags: undefined,
				};

				manager.openModal(item);

				const target = manager.getTarget();
				expect(target?.tags).toEqual([]);
			});
		});

		describe('closeModal', () => {
			it('モーダルを閉じる', () => {
				const item: ListItem = {
					id: 'test-id',
					startedAt: '2025-11-06T10:00:00Z',
					endedAt: '2025-11-06T12:00:00Z',
					description: 'テスト',
					tags: [],
				};

				manager.openModal(item);
				expect(manager.isOpen()).toBe(true);

				manager.closeModal();

				expect(manager.isOpen()).toBe(false);
				expect(manager.getTarget()).toBe(null);
			});

			it('既に閉じている状態で呼んでもエラーにならない', () => {
				expect(manager.isOpen()).toBe(false);

				expect(() => manager.closeModal()).not.toThrow();

				expect(manager.isOpen()).toBe(false);
				expect(manager.getTarget()).toBe(null);
			});
		});

		describe('複数回の開閉', () => {
			it('異なる作業記録を順次開ける', () => {
				const item1: ListItem = {
					id: 'id-1',
					startedAt: '2025-11-06T10:00:00Z',
					endedAt: '2025-11-06T11:00:00Z',
					description: '作業1',
					tags: ['tag1'],
				};

				const item2: ListItem = {
					id: 'id-2',
					startedAt: '2025-11-06T12:00:00Z',
					endedAt: '2025-11-06T13:00:00Z',
					description: '作業2',
					tags: ['tag2'],
				};

				manager.openModal(item1);
				expect(manager.getTarget()?.id).toBe('id-1');

				manager.closeModal();
				expect(manager.getTarget()).toBe(null);

				manager.openModal(item2);
				expect(manager.getTarget()?.id).toBe('id-2');
			});
		});

		describe('データ変換の正確性', () => {
			it('ISO文字列をDateオブジェクトに正しく変換する', () => {
				const item: ListItem = {
					id: 'test-id',
					startedAt: '2025-11-06T10:30:45.123Z',
					endedAt: '2025-11-06T12:45:30.456Z',
					description: 'テスト',
					tags: [],
				};

				manager.openModal(item);

				const target = manager.getTarget();
				expect(target?.startedAt.getTime()).toBe(new Date('2025-11-06T10:30:45.123Z').getTime());
				expect(target?.endedAt?.getTime()).toBe(new Date('2025-11-06T12:45:30.456Z').getTime());
			});
		});
	});
});
