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
	const handleStartSuccess = (form: NonNullable<ActionData>) => {
		if (!('workLog' in form) || !form.workLog) return;
		if (form.workLog.endedAt !== null) return; // 型ガード
		currentActive = form.workLog;
		if ('serverNow' in form) {
			currentServerNow = form.serverNow;
		}
		toastSuccess('作業を開始しました');
	};

	// 作業終了成功時の処理
	const handleStopSuccess = (form: NonNullable<ActionData>) => {
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
		toastSuccess(`作業を終了しました(${duration}分)`);
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

		// 削除アクションを実行
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
				use:enhance={() => {
					isSubmitting = true;
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
		tagSuggestions={data.tagSuggestions}
		serverNow={currentServerNow}
		onFilterTagsChange={handleFilterTagsChange}
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
