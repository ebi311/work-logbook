<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import WorkLogStatus from './_components/WorkLogStatus/WorkLogStatus.svelte';
	import WorkLogToggleButton from './_components/WorkLogToggleButton/WorkLogToggleButton.svelte';
	import KeyboardShortcutHelp from './_components/KeyboardShortcutHelp/KeyboardShortcutHelp.svelte';
	import WorkLogHistory from './_components/WorkLogHistory/WorkLogHistory.svelte';
	import DescriptionInput from './_components/DescriptionInput/DescriptionInput.svelte';
	import WorkLogTagInput from './_components/WorkLogTagInput/WorkLogTagInput.svelte';
	import { enhance } from '$app/forms';
	import WorkLogEditModal from './_components/WorkLogEditModal/WorkLogEditModal.svelte';
	import { invalidate, invalidateAll, refreshAll, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { toastSuccess, toastError } from '$lib/utils/toast';
	import { isOnline } from '$lib/client/network/status';
	import { saveWorkLogFromServer, deleteWorkLogOffline } from '$lib/client/db/workLogs';
	import { setSyncSuccessCallback, requestSync } from '$lib/client/sync/trigger';
	import {
		executeOfflineAction,
		type ActiveWorkLog,
		type OfflineActionContext,
	} from '$lib/client/offline/workLogActions';
	import {
		createHandleStartSuccess,
		createHandleStopSuccess,
		createHandleSwitchSuccess,
	} from '$lib/client/handlers/successHandlers';
	import { createFormResponseHandler } from '$lib/client/handlers/formResponseHandler';
	import {
		readFiltersFromUrl,
		buildTagFilterUrl,
		buildDateFilterUrl,
		buildAddTagToFilterUrl,
	} from '$lib/client/state/filterManager';
	import { createKeyboardShortcutHandler } from '$lib/client/keyboard/shortcuts';
	import {
		createEditModalManager,
		type ListItem as EditableListItem,
	} from '$lib/client/modal/editModalManager';
	import { createDeleteHandler } from '$lib/client/delete/deleteHandler';

	type Props = {
		data: PageData;
		form?: ActionData;
	};

	let { data, form }: Props = $props();

	// 現在のactive状態（dataまたはformから）
	let currentActive = $state(data.active);
	let currentServerNow = $state(data.serverNow);

	// フォーム送信中の状態
	let isSubmitting = $state(false);

	// オフライン操作中フラグ（同期が完了するまでサーバーデータを無視）
	let hasOfflineChanges = $state(false);

	// フォームとボタンへの参照
	let formElement: HTMLFormElement | null = $state(null);
	let toggleButtonElement: HTMLButtonElement | null = $state(null);

	// 作業内容の入力値（currentActiveが変更されたら同期）
	let description = $state('');
	let tags = $state<string[]>([]);
	$effect(() => {
		description = currentActive?.description || '';
		tags = currentActive?.tags || [];
	});

	// F-006: フィルタ用のタグ（URLから取得）
	let filterTags = $state<string[]>([]);
	let currentMonth = $state<string | undefined>(undefined);
	let currentDate = $state<string | undefined>(undefined);
	$effect(() => {
		const filters = readFiltersFromUrl(page.url);
		filterTags = filters.tags;
		currentMonth = filters.month;
		currentDate = filters.date;
	});

	// F-006: フィルタタグ変更ハンドラー
	const handleFilterTagsChange = (newTags: string[]) => {
		const url = buildTagFilterUrl(newTags, page.url);
		goto(url, { replaceState: false, noScroll: true, keepFocus: true });
	};

	// F-006: 日付フィルタ変更ハンドラー
	const handleDateFilterChange = (filter: { month?: string; date?: string }) => {
		const url = buildDateFilterUrl(filter, page.url);
		goto(url, { replaceState: false, noScroll: true, keepFocus: true });
	};

	// F-006 UC-003: タグバッジクリックハンドラー
	const handleTagClick = (tag: string) => {
		const url = buildAddTagToFilterUrl(tag, filterTags, page.url);
		if (url) {
			goto(url, { replaceState: false, noScroll: true, keepFocus: true });
		}
	};

	// 成功ハンドラーを作成
	const handleStartSuccess = createHandleStartSuccess({
		setCurrentActive: (active) => {
			currentActive = active;
		},
		setTags: (newTags) => {
			tags = newTags;
		},
		setCurrentServerNow: (serverNow) => {
			currentServerNow = serverNow;
		},
		showSuccessToast: toastSuccess,
		listDataPromise: data.listData,
	});

	const handleStopSuccess = createHandleStopSuccess({
		setCurrentActive: (active) => {
			currentActive = active;
		},
		setTags: (newTags) => {
			tags = newTags;
		},
		setCurrentServerNow: (serverNow) => {
			currentServerNow = serverNow;
		},
		showSuccessToast: toastSuccess,
		listDataPromise: data.listData,
	});

	const handleSwitchSuccess = createHandleSwitchSuccess({
		setCurrentActive: (active) => {
			currentActive = active;
		},
		setTags: (newTags) => {
			tags = newTags;
		},
		setCurrentServerNow: (serverNow) => {
			currentServerNow = serverNow;
		},
		showSuccessToast: toastSuccess,
		listDataPromise: data.listData,
	});

	// エラー処理ハンドラーマップ
	const errorHandlers: Record<string, (form: NonNullable<ActionData>) => void> = {
		ACTIVE_EXISTS: (form) => {
			// 409エラー: 既に進行中の作業がある
			if ('active' in form && 'serverNow' in form && form.active) {
				currentActive = {
					...form.active,
					tags: form.active.tags || [],
				};
				currentServerNow = form.serverNow;
			}
			toastError('既に作業が進行中です');
		},
		NO_ACTIVE: (form) => {
			// 404エラー: 進行中の作業がない
			currentActive = undefined;
			if ('serverNow' in form) {
				currentServerNow = form.serverNow;
			}
			toastError('進行中の作業がありません');
		},
	};

	// オフライン時のアクション処理
	const handleOfflineAction = async (actionName: 'start' | 'stop' | 'switch') => {
		// ユーザーIDの取得(オフライン時は固定値を使用)
		const userId = 'offline-user';

		// コンテキストを構築
		const context: OfflineActionContext = {
			currentActive,
			description,
			tags,
			userId,
		};

		// オフラインアクションを実行
		const result = await executeOfflineAction(actionName, context);

		if (result.success) {
			// 状態を更新
			currentActive = result.currentActive;

			// 終了・切り替え時は入力フィールドをクリア
			if (!result.currentActive) {
				description = '';
				tags = [];
			}

			// オフライン変更フラグを立てる
			hasOfflineChanges = true;

			// 成功メッセージを表示
			if (result.message) {
				toastSuccess(result.message);
			}
		} else {
			// エラーメッセージを表示
			if (result.error) {
				toastError(result.error);
			}
		}
	};

	// dataが変更されたら状態を同期
	// ただし、オフライン変更がある場合は同期完了(ページリロード)まで無視
	$effect(() => {
		if (!hasOfflineChanges) {
			currentActive = data.active;
			currentServerNow = data.serverNow;
		}
	});

	// formアクション結果を処理
	const processFormResponse = $derived(
		createFormResponseHandler({
			onStartSuccess: handleStartSuccess,
			onStopSuccess: handleStopSuccess,
			onSwitchSuccess: handleSwitchSuccess,
			errorHandlers,
		}),
	);

	$effect(() => {
		processFormResponse(form);
	});

	// キーボードショートカットのハンドラー
	// キーボードショートカットハンドラー
	const keyboardHandler = $derived(
		createKeyboardShortcutHandler({
			toggleButton: toggleButtonElement,
			isSubmitting,
			onToggleClick: () => toggleButtonElement?.click(),
		}),
	);

	// キーボードイベントリスナーの登録・解除
	$effect(() => {
		window.addEventListener('keydown', keyboardHandler);

		return () => {
			window.removeEventListener('keydown', keyboardHandler);
		};
	});

	// 同期成功時のコールバックを設定
	$effect(() => {
		setSyncSuccessCallback(() => {
			// オフライン変更フラグをリセット
			hasOfflineChanges = false;
			console.log('[Sync] Offline changes flag reset');
		});

		return () => {
			setSyncSuccessCallback(null);
		};
	});

	// ===== 作業一覧（編集反映用のローカル状態） =====
	type ListItem = {
		id: string;
		startedAt: string;
		endedAt: string | null;
		description: string;
		tags: string[];
	};
	type ListData = {
		items: ListItem[];
		page: number;
		size: number;
		hasNext: boolean;
		monthlyTotalSec: number;
	};

	let listDataPromise = $derived<Promise<ListData>>(data.listData as Promise<ListData>);

	// ===== 編集モーダルの状態 =====
	const editModalManager = createEditModalManager();
	let editOpen = $state(false);
	let editTarget = $state<ReturnType<typeof editModalManager.getTarget>>(null);

	const openEditModal = (item: ListItem) => {
		editModalManager.openModal(item as EditableListItem);
		editOpen = editModalManager.isOpen();
		editTarget = editModalManager.getTarget();
	};

	const handleEditClose = () => {
		editModalManager.closeModal();
		editOpen = editModalManager.isOpen();
		editTarget = editModalManager.getTarget();
	};

	const handleEditUpdate = async (
		workLog: {
			id: string;
			startedAt: Date;
			endedAt: Date | null;
			description: string;
			tags: string[];
		},
		wasOffline?: boolean,
	) => {
		console.log('handleEditUpdate called', { wasOffline });
		if (wasOffline) {
			hasOfflineChanges = true; // オフライン変更フラグを立てる
		}
		await refreshAll();
	};

	// F-004: 削除処理
	const deleteHandler = createDeleteHandler({
		isOnline: $isOnline,
		deleteOffline: deleteWorkLogOffline,
		onSuccess: async (wasOffline: boolean) => {
			if (wasOffline) {
				toastSuccess('作業記録を削除しました(オフライン)');
				hasOfflineChanges = true;
				requestSync();
			} else {
				toastSuccess('作業記録を削除しました');
			}
			await refreshAll();
		},
		onError: (message: string) => {
			toastError(message);
		},
	});

	// WorkLogHistoryコンポーネント用のラッパー関数
	const handleDeleteClick = (item: ListItem) => {
		deleteHandler(item.id);
	};
</script>

<div class="mx-auto prose h-full w-xl bg-base-300 py-16">
	<h1>作業記録</h1>

	<div class="card mb-8 border border-neutral-300 bg-base-100">
		<div class="card-body">
			<WorkLogStatus active={currentActive} serverNow={currentServerNow} />
			<form
				bind:this={formElement}
				method="POST"
				class="card-actions flex-col gap-4"
				use:enhance={({ action, formData, cancel }) => {
					isSubmitting = true;

					// オフライン時の処理
					if (!$isOnline) {
						cancel();
						// action.search は "?/start" のような形式
						const actionName = action.search.substring(2) as 'start' | 'stop' | 'switch'; // "?/" を取り除く
						handleOfflineAction(actionName);
						isSubmitting = false;
						return;
					} // オンライン時は通常の処理
					return async ({ result, update }) => {
						isSubmitting = false;
						await update();
					};
				}}
			>
				<!-- 作業内容入力フィールド -->
				<DescriptionInput bind:value={description} disabled={isSubmitting} />

				<!-- タグ入力フィールド -->
				<WorkLogTagInput bind:tags suggestions={data.tagSuggestions} />

				<WorkLogToggleButton
					bind:buttonElement={toggleButtonElement}
					isActive={!!currentActive}
					{isSubmitting}
				/>
			</form>
		</div>
	</div>

	<!-- 作業一覧セクション -->
	<WorkLogHistory
		{listDataPromise}
		{filterTags}
		{currentMonth}
		{currentDate}
		tagSuggestions={data.tagSuggestions}
		serverNow={currentServerNow}
		onFilterTagsChange={handleFilterTagsChange}
		onDateFilterChange={handleDateFilterChange}
		onTagClick={handleTagClick}
		onEdit={openEditModal}
		onDelete={handleDeleteClick}
	/>

	<!-- キーボードショートカットヘルプ -->
	<KeyboardShortcutHelp />

	<!-- 編集モーダル -->
	{#if editTarget}
		<WorkLogEditModal
			workLog={editTarget}
			bind:open={editOpen}
			onclose={handleEditClose}
			onupdated={handleEditUpdate}
			tagSuggestions={data.tagSuggestions}
		/>
	{/if}
</div>

<style>
	:global(.keyboard-triggered) {
		animation: keyboard-pulse 300ms ease-in-out;
	}

	@keyframes keyboard-pulse {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.05);
			box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
		}
	}
</style>
