/**
 * 編集モーダル管理モジュール
 *
 * @module lib/client/modal/editModalManager
 */

/**
 * リストアイテムの型定義
 */
export interface ListItem {
	id: string;
	startedAt: string;
	endedAt: string | null;
	description: string;
	tags?: string[];
}

/**
 * 編集対象の型定義
 */
export interface EditTarget {
	id: string;
	startedAt: Date;
	endedAt: Date | null;
	description: string;
	tags: string[];
}

/**
 * 編集モーダル管理の状態
 */
interface EditModalState {
	isOpen: boolean;
	target: EditTarget | null;
}

/**
 * 編集モーダルマネージャーを作成
 *
 * モーダルの開閉状態と編集対象を管理します。
 *
 * ## 主な機能
 * - モーダルの開閉制御
 * - 編集対象の設定とクリア
 * - 進行中の作業記録は編集不可
 *
 * @returns 編集モーダル管理オブジェクト
 *
 * @example
 * ```ts
 * const manager = createEditModalManager();
 *
 * // モーダルを開く
 * manager.openModal(listItem);
 *
 * // モーダルを閉じる
 * manager.closeModal();
 *
 * // 状態を取得
 * if (manager.isOpen()) {
 *   const target = manager.getTarget();
 * }
 * ```
 */
export const createEditModalManager = () => {
	const state: EditModalState = {
		isOpen: false,
		target: null,
	};

	return {
		/**
		 * モーダルが開いているかどうかを取得
		 */
		isOpen: (): boolean => state.isOpen,

		/**
		 * 現在の編集対象を取得
		 */
		getTarget: (): EditTarget | null => state.target,

		/**
		 * モーダルを開く
		 *
		 * @param item - リストアイテム
		 */
		openModal: (item: ListItem): void => {
			// 進行中の作業記録は編集不可
			if (item.endedAt === null) {
				return;
			}

			state.target = {
				id: item.id,
				startedAt: new Date(item.startedAt),
				endedAt: item.endedAt ? new Date(item.endedAt) : null,
				description: item.description,
				tags: item.tags || [],
			};
			state.isOpen = true;
		},

		/**
		 * モーダルを閉じる
		 */
		closeModal: (): void => {
			state.isOpen = false;
			state.target = null;
		},
	};
};
