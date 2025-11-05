<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import type { WorkLog } from '../models/workLog';
	import WorkLogStatus from './_components/WorkLogStatus/WorkLogStatus.svelte';
	import WorkLogToggleButton from './_components/WorkLogToggleButton/WorkLogToggleButton.svelte';
	import KeyboardShortcutHelp from './_components/KeyboardShortcutHelp/KeyboardShortcutHelp.svelte';
	import WorkLogHistory from './_components/WorkLogHistory/WorkLogHistory.svelte';
	import TagInput from './_components/TagInput/TagInput.svelte';
	import { enhance } from '$app/forms';
	import WorkLogEditModal from './_components/WorkLogEditModal/WorkLogEditModal.svelte';
	import { invalidate, invalidateAll, refreshAll, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { toastSuccess, toastError } from '$lib/utils/toast';
	import { isOnline } from '$lib/client/network/status';
	import {
		saveWorkLogOffline,
		updateWorkLogOffline,
		deleteWorkLogOffline,
		saveWorkLogFromServer,
	} from '$lib/client/db/workLogs';
	import { requestSync } from '$lib/client/sync/trigger';
	import { nanoid } from 'nanoid';

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
	$effect(() => {
		const tagsParam = page.url.searchParams.get('tags');
		filterTags = tagsParam ? tagsParam.split(',').filter(Boolean) : [];
	});

	// F-006: 日付フィルタ（URLから取得）
	let currentMonth = $state<string | undefined>(undefined);
	let currentDate = $state<string | undefined>(undefined);
	$effect(() => {
		currentMonth = page.url.searchParams.get('month') ?? undefined;
		currentDate = page.url.searchParams.get('date') ?? undefined;
	});

	// F-006: フィルタタグ変更ハンドラー
	const handleFilterTagsChange = (newTags: string[]) => {
		const url = new URL(page.url);

		if (newTags.length > 0) {
			url.searchParams.set('tags', newTags.join(','));
		} else {
			url.searchParams.delete('tags');
		}

		// ページをリセット
		url.searchParams.set('page', '1');

		goto(url.toString(), { replaceState: false, noScroll: true, keepFocus: true });
	};

	// F-006: 日付フィルタ変更ハンドラー
	const handleDateFilterChange = (filter: { month?: string; date?: string }) => {
		const url = new URL(page.url);

		// 既存の日付パラメータをクリア
		url.searchParams.delete('month');
		url.searchParams.delete('date');
		url.searchParams.delete('from');
		url.searchParams.delete('to');

		// 新しいフィルタを設定
		if (filter.month) {
			url.searchParams.set('month', filter.month);
		} else if (filter.date) {
			url.searchParams.set('date', filter.date);
		}

		// ページをリセット
		url.searchParams.set('page', '1');

		goto(url.toString(), { replaceState: false, noScroll: true, keepFocus: true });
	};

	// F-006 UC-003: タグバッジクリックハンドラー
	const handleTagClick = (tag: string) => {
		// 既に選択されている場合はスキップ
		if (filterTags.includes(tag)) {
			return;
		}

		// 新しいタグを追加
		const newTags = [...filterTags, tag];
		handleFilterTagsChange(newTags);
	};

	// 作業開始成功時の処理
	const handleStartSuccess = async (form: NonNullable<ActionData>) => {
		if (!('workLog' in form) || !form.workLog) return;
		if (form.workLog.endedAt !== null) return; // 型ガード
		currentActive = form.workLog;
		if ('serverNow' in form) {
			currentServerNow = form.serverNow;
		}

		// サーバーからのデータをIndexedDBに保存
		try {
			const listData = await data.listData;
			const userId = listData.items.length > 0 ? 'offline-user' : 'offline-user'; // TODO: 適切なuserIdを取得
			await saveWorkLogFromServer({
				id: form.workLog.id,
				userId,
				startedAt: form.workLog.startedAt,
				endedAt: null,
				description: form.workLog.description || '',
				tags: form.workLog.tags || [],
			});
		} catch (error) {
			console.error('Failed to save to IndexedDB:', error);
		}

		toastSuccess('作業を開始しました');
	};

	// 作業終了成功時の処理
	const handleStopSuccess = async (form: NonNullable<ActionData>) => {
		if (!('workLog' in form) || !form.workLog) return;
		currentActive = undefined;
		// タグをクリア
		tags = [];
		const duration =
			'durationSec' in form && typeof form.durationSec === 'number'
				? Math.floor(form.durationSec / 60)
				: 0;
		if ('serverNow' in form) {
			currentServerNow = form.serverNow;
		}

		// サーバーからのデータをIndexedDBに保存
		try {
			const listData = await data.listData;
			const userId = listData.items.length > 0 ? 'offline-user' : 'offline-user'; // TODO: 適切なuserIdを取得
			await saveWorkLogFromServer({
				id: form.workLog.id,
				userId,
				startedAt: form.workLog.startedAt,
				endedAt: form.workLog.endedAt,
				description: form.workLog.description || '',
				tags: form.workLog.tags || [],
			});
		} catch (error) {
			console.error('Failed to save to IndexedDB:', error);
		}

		toastSuccess(`作業を終了しました(${duration}分)`);
	};

	// 作業切り替え成功時の処理
	const handleSwitchSuccess = async (form: NonNullable<ActionData>) => {
		if (!('started' in form) || !form.started) return;
		if (!('stopped' in form) || !form.stopped) return;
		currentActive = form.started;
		// タグはクリアしない（新しい作業のタグを保持）
		const duration =
			'stopped' in form && form.stopped && 'durationSec' in form.stopped
				? Math.floor(form.stopped.durationSec / 60)
				: 0;
		if ('serverNow' in form) {
			currentServerNow = form.serverNow;
		}

		// サーバーからのデータをIndexedDBに保存（開始と終了の両方）
		try {
			const listData = await data.listData;
			const userId = listData.items.length > 0 ? 'offline-user' : 'offline-user'; // TODO: 適切なuserIdを取得

			// 終了した作業を保存
			if (form.stopped) {
				await saveWorkLogFromServer({
					id: form.stopped.id,
					userId,
					startedAt: form.stopped.startedAt,
					endedAt: form.stopped.endedAt,
					description: form.stopped.description || '',
					tags: form.stopped.tags || [],
				});
			}

			// 開始した作業を保存
			await saveWorkLogFromServer({
				id: form.started.id,
				userId,
				startedAt: form.started.startedAt,
				endedAt: null,
				description: form.started.description || '',
				tags: form.started.tags || [],
			});
		} catch (error) {
			console.error('Failed to save to IndexedDB:', error);
		}

		toastSuccess(`作業を切り替えました(${duration}分)`);
	};

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
	const handleOfflineAction = async (actionName: string) => {
		// ユーザーIDの取得(オフライン時はactiveから、なければデータの最初のアイテムから)
		let userId = 'offline-user';
		if (currentActive) {
			// currentActiveにはuserIdがないので、最初のworklogから取得を試みる
			const listData = await data.listData;
			if (listData.items.length > 0) {
				// WorkLogItemにもuserIdがないため、一時的に固定値を使用
				userId = 'offline-user';
			}
		}

		try {
			if (actionName === 'start') {
				// 作業開始（オフライン）
				const id = await saveWorkLogOffline({
					userId,
					startAt: new Date().toISOString(),
					endAt: null,
					description: description,
					tags: tags,
				});

				// ローカル状態を更新
				currentActive = {
					id,
					startedAt: new Date().toISOString(),
					endedAt: null,
					description: description,
					tags: tags,
				};

				toastSuccess('作業を開始しました（オフライン）');
				requestSync(); // Background Syncをリクエスト
			} else if (actionName === 'stop' && currentActive) {
				// 作業終了（オフライン）
				const endTime = new Date().toISOString();
				await updateWorkLogOffline(currentActive.id, {
					endAt: endTime,
					description: description,
					tags: tags,
				});

				const duration = Math.floor(
					(new Date(endTime).getTime() - new Date(currentActive.startedAt).getTime()) / 60000,
				);

				currentActive = undefined;
				description = '';
				tags = [];

				toastSuccess(`作業を終了しました（オフライン、${duration}分）`);
				requestSync(); // Background Syncをリクエスト
			} else if (actionName === 'switch' && currentActive) {
				// 作業切り替え（オフライン）
				const endTime = new Date().toISOString();
				const oldId = currentActive.id;

				// 既存の作業を終了
				await updateWorkLogOffline(oldId, {
					endAt: endTime,
					description: currentActive.description,
					tags: currentActive.tags,
				});

				// 新しい作業を開始
				const newId = await saveWorkLogOffline({
					userId,
					startAt: endTime,
					endAt: null,
					description: description,
					tags: tags,
				});

				const duration = Math.floor(
					(new Date(endTime).getTime() - new Date(currentActive.startedAt).getTime()) / 60000,
				);

				currentActive = {
					id: newId,
					startedAt: endTime,
					endedAt: null,
					description: description,
					tags: tags,
				};

				toastSuccess(`作業を切り替えました（オフライン、${duration}分）`);
				requestSync(); // Background Syncをリクエスト
			}
		} catch (error) {
			console.error('Offline action error:', error);
			toastError('オフライン操作でエラーが発生しました');
		}
	};

	// dataが変更されたら状態を同期
	$effect(() => {
		currentActive = data.active;
		currentServerNow = data.serverNow;
	});

	// formアクション結果を処理
	$effect(() => {
		if (!form) return;

		// 成功時
		if ('ok' in form && form.ok) {
			// switch 成功時の処理
			if ('started' in form && 'stopped' in form) {
				handleSwitchSuccess(form);
				return;
			}

			if (!('workLog' in form)) return;

			if (form.workLog?.endedAt === null) {
				handleStartSuccess(form);
			} else {
				// durationSec が存在するのは stop 成功時
				if ('durationSec' in form) {
					handleStopSuccess(form);
				}
				// update 成功時は、モーダルから onupdated コールバックで処理される
			}
			return;
		}

		// エラー時
		if (!('reason' in form) || typeof form.reason !== 'string') return;

		const handler = errorHandlers[form.reason];
		if (handler) {
			handler(form);
		}
	});

	// キーボードショートカットのハンドラー
	const handleKeyDown = (event: KeyboardEvent) => {
		// Cmd/Ctrl + S
		if ((event.metaKey || event.ctrlKey) && event.key === 's') {
			// 入力フィールドにフォーカスがある場合は無効
			const target = event.target as HTMLElement;
			if (
				target &&
				typeof target.matches === 'function' &&
				target.matches('input, textarea, [contenteditable="true"]')
			) {
				return;
			}

			// ブラウザのデフォルト動作（保存ダイアログ）を抑制
			event.preventDefault();

			// トグルボタンをクリック
			if (toggleButtonElement && !isSubmitting) {
				// ボタンにハイライト効果を追加
				toggleButtonElement.classList.add('keyboard-triggered');
				setTimeout(() => {
					toggleButtonElement?.classList.remove('keyboard-triggered');
				}, 300);

				// ボタンをクリック
				toggleButtonElement.click();
			}
		}
	};

	// キーボードイベントリスナーの登録・解除
	$effect(() => {
		window.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
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
	let editOpen = $state(false);
	let editTarget: {
		id: string;
		startedAt: Date;
		endedAt: Date | null;
		description: string;
		tags: string[];
	} | null = $state(null);

	const openEditModal = (item: ListItem) => {
		if (item.endedAt === null) return; // 進行中は編集不可
		editTarget = {
			id: item.id,
			startedAt: new Date(item.startedAt),
			endedAt: item.endedAt ? new Date(item.endedAt) : null,
			description: item.description,
			tags: item.tags || [],
		};
		editOpen = true;
	};

	const handleEditClose = () => {
		editOpen = false;
		editTarget = null;
	};

	const handleEditUpdate = async () => {
		console.log('handleEditUpdate called');
		await refreshAll();
	};

	// F-004: 削除処理
	const handleDeleteClick = async (item: ListItem) => {
		// ブラウザ標準の確認ダイアログ
		const confirmed = window.confirm(
			'この作業記録を削除してもよろしいですか？\n\nこの操作は取り消せません。',
		);

		if (!confirmed) {
			return; // キャンセルされた場合は何もしない
		}

		// オフライン時の処理
		if (!$isOnline) {
			try {
				await deleteWorkLogOffline(item.id);
				toastSuccess('作業記録を削除しました（オフライン）');
				requestSync(); // Background Syncをリクエスト
				// データを再取得
				await refreshAll();
			} catch (error) {
				console.error('Offline delete error:', error);
				toastError('オフライン削除でエラーが発生しました');
			}
			return;
		}

		// オンライン時: 削除アクションを実行
		const formData = new FormData();
		formData.set('id', item.id);

		try {
			const response = await fetch('?/delete', {
				method: 'POST',
				body: formData,
			});

			const result = await response.json();

			if (result.type === 'success') {
				// 削除成功
				toastSuccess('作業記録を削除しました');
				// データを再取得
				await refreshAll();
			} else {
				// 削除失敗
				toastError('削除に失敗しました');
			}
		} catch (error) {
			console.error('Delete error:', error);
			toastError('削除中にエラーが発生しました');
		}
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
						const actionName = action.search.substring(2); // "?/" を取り除く
						handleOfflineAction(actionName);
						isSubmitting = false;
						return;
					}

					// オンライン時は通常の処理
					return async ({ result, update }) => {
						isSubmitting = false;
						await update();
					};
				}}
			>
				<!-- 作業内容入力フィールド -->
				<div class="form-control flex w-full flex-col">
					<label for="description" class="label">
						<span class="label-text">作業内容（Markdown対応）</span>
					</label>
					<textarea
						id="description"
						name="description"
						bind:value={description}
						placeholder="作業内容を入力..."
						class="textarea-bordered textarea w-full font-mono text-sm"
						rows="3"
						disabled={isSubmitting}
					></textarea>
				</div>

				<!-- タグ入力フィールド -->
				<div class="form-control flex w-full flex-col">
					<TagInput bind:tags suggestions={data.tagSuggestions} placeholder="例: 開発 PJ-A" />
					<!-- 隠しフィールドでタグを送信 -->
					{#each tags as tag}
						<input type="hidden" name="tags" value={tag} />
					{/each}
				</div>

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
