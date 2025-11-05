<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { WorkLog } from '../../../models/workLog';
	import { validateTimeRange, validateDescription } from '$lib/utils/validation';
	import { toDatetimeLocal } from '$lib/utils/timeFormat';
	import DateTimeField from './DateTimeField.svelte';
	import DescriptionField from './DescriptionField.svelte';
	import ErrorAlert from './ErrorAlert.svelte';
	import TagInput from '../TagInput/TagInput.svelte';
	import { isOnline } from '$lib/client/network/status';
	import { updateWorkLogOffline, saveWorkLogFromServer } from '$lib/client/db/workLogs';
	import { requestSync } from '$lib/client/sync/trigger';
	import { toastSuccess, toastError } from '$lib/utils/toast';

	// 親からは最小限のフィールドのみ受け取れるようにする（構造的部分型）
	type EditableWorkLog = {
		id: string;
		startedAt: Date;
		endedAt: Date | null;
		description: string;
		tags: string[];
	};

	type Props = {
		workLog: EditableWorkLog;
		open: boolean;
		onclose?: () => void;
		onupdated?: (workLog: WorkLog) => void;
		tagSuggestions: Array<{ tag: string; count: number }>;
	};

	let { workLog, open = $bindable(false), onclose, onupdated, tagSuggestions }: Props = $props();

	// dialogの参照
	let dialog: HTMLDialogElement | undefined = $state();

	// フォーム送信中の状態
	let isSubmitting = $state(false);

	// フォーム入力値
	let startedAt = $state('');
	let endedAt = $state('');
	let description = $state('');
	let tags = $state<string[]>([]);

	// バリデーションエラー
	let errors = $state<Record<string, string>>({});

	// workLogが変更されたら、フォーム値を初期化
	$effect(() => {
		if (!workLog) return;
		startedAt = toDatetimeLocal(workLog.startedAt);
		endedAt = workLog.endedAt ? toDatetimeLocal(workLog.endedAt) : '';
		description = workLog.description;
		tags = [...workLog.tags];
		errors = {};
	});

	// openが変更されたら、dialogを開閉
	$effect(() => {
		if (open && dialog) {
			dialog.showModal();
		} else if (!open && dialog) {
			dialog.close();
		}
	});

	// リアルタイムバリデーション
	const validateForm = (): boolean => {
		const newErrors: Record<string, string> = {};

		if (!startedAt || !endedAt) {
			return false;
		}

		const startDate = new Date(startedAt);
		const endDate = new Date(endedAt);

		// 時刻の整合性チェック
		const timeValidation = validateTimeRange(startDate, endDate);
		if (!timeValidation.valid && timeValidation.error) {
			newErrors.time = timeValidation.error;
		}

		// 作業内容の文字数チェック
		const descValidation = validateDescription(description);
		if (!descValidation.valid && descValidation.error) {
			newErrors.description = descValidation.error;
		}

		// タグのバリデーション
		if (tags.length > 20) {
			newErrors.tags = 'タグは最大20個までです';
		}

		for (const tag of tags) {
			if (tag.length > 100) {
				newErrors.tags = 'タグ名は100文字以内にしてください';
				break;
			}
		}

		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	};

	// フォーム値が変更されたらバリデーション
	$effect(() => {
		// トラッキングのために変数を参照
		void startedAt;
		void endedAt;
		void description;
		if (!isSubmitting) {
			validateForm();
		}
	});

	// フォームの有効性（副作用なしの計算）
	const isFormValid = $derived(() => {
		if (!startedAt || !endedAt) {
			return false;
		}

		const startDate = new Date(startedAt);
		const endDate = new Date(endedAt);

		// 時刻の整合性チェック
		const timeValidation = validateTimeRange(startDate, endDate);
		if (!timeValidation.valid) {
			return false;
		}

		// 作業内容の文字数チェック
		const descValidation = validateDescription(description);
		if (!descValidation.valid) {
			return false;
		}

		return true;
	});

	// dialogのcloseイベント
	const handleDialogClose = () => {
		open = false;
		onclose?.();
	};

	// キャンセルボタン
	const handleCancel = () => {
		dialog?.close();
		handleDialogClose();
	};

	// キーボードショートカット
	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			if (isFormValid() && !isSubmitting) {
				const form = dialog?.querySelector('form');
				form?.requestSubmit();
			}
		}
	};

	// オフライン時の更新処理
	const handleOfflineUpdate = async () => {
		try {
			if (!validateForm()) {
				return;
			}

			await updateWorkLogOffline(workLog.id, {
				startAt: new Date(startedAt).toISOString(),
				endAt: new Date(endedAt).toISOString(),
				description: description,
				tags: [...tags],
			});

			// 成功時
			open = false;
			toastSuccess('作業記録を更新しました（オフライン）');
			requestSync(); // Background Syncをリクエスト
			
			// 親コンポーネントに通知（ローカル状態を更新）
			if (onupdated) {
				const updatedWorkLog = WorkLog.from({
					id: workLog.id,
					userId: 'offline-user',
					startedAt: new Date(startedAt),
					endedAt: new Date(endedAt),
					description: description,
					tags: [...tags],
					createdAt: new Date(),
					updatedAt: new Date(),
				});
				onupdated(updatedWorkLog);
			}
			
			onclose?.();
		} catch (error) {
			console.error('Offline update error:', error);
			toastError('オフライン更新でエラーが発生しました');
		}
	};

	// フォーム送信ハンドラー
	const handleFormSubmit = ({ formData, cancel }: { formData: FormData; cancel: () => void }) => {
		isSubmitting = true;

		// オフライン時の処理
		if (!$isOnline) {
			cancel();
			handleOfflineUpdate();
			isSubmitting = false;
			return;
		}

		// オンライン時: datetime-local の値をローカルタイムゾーン付きISO文字列に変換
		const startedAtLocal = formData.get('startedAt') as string;
		const endedAtLocal = formData.get('endedAt') as string;

		if (startedAtLocal) {
			const startDate = new Date(startedAtLocal);
			formData.set('startedAt', startDate.toISOString());
		}

		if (endedAtLocal) {
			const endDate = new Date(endedAtLocal);
			formData.set('endedAt', endDate.toISOString());
		}

		return async ({ result }: { result: any }) => {
			isSubmitting = false;

			if (result.type === 'success' && result.data) {
				const data = result.data as { ok?: boolean; workLog?: WorkLog };
				if (data.ok && data.workLog) {
					// IndexedDBにも保存（オンライン操作の結果を保存）
					try {
						await saveWorkLogFromServer({
							id: data.workLog.id,
							userId: 'offline-user', // TODO: 適切なuserIdを取得
							startedAt: data.workLog.startedAt,
							endedAt: data.workLog.endedAt,
							description: data.workLog.description,
							tags: data.workLog.tags || [],
						});
					} catch (error) {
						console.error('Failed to save to IndexedDB:', error);
					}

					// 成功時
					open = false;
					onupdated?.(data.workLog);
					onclose?.();
				}
			} else if (result.type === 'failure' && result.data) {
				// サーバーサイドエラー
				const data = result.data as { errors?: Record<string, string> };
				if (data.errors) {
					errors = data.errors;
				}
			}
		};
	};

	// フォーム送信
	onMount(() => {
		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	});
</script>

<dialog bind:this={dialog} class="modal" onclose={handleDialogClose}>
	<div class="modal-box flex max-h-[80vh] w-11/12 max-w-3xl flex-col">
		<!-- ヘッダー -->
		<div class="mb-4 flex flex-shrink-0 items-start justify-between">
			<h3 class="text-lg font-bold">作業記録の編集</h3>
			<button class="btn btn-circle btn-ghost btn-sm" onclick={handleCancel} aria-label="閉じる">
				✕
			</button>
		</div>

		<!-- フォーム -->
		<form method="post" action="?/update" use:enhance={handleFormSubmit}>
			<!-- hidden input for id -->
			<input type="hidden" name="id" value={workLog?.id ?? ''} />

			<div class="space-y-4">
				<!-- 開始時刻 -->
				<DateTimeField
					label="開始時刻"
					id="startedAt"
					name="startedAt"
					bind:value={startedAt}
					required
					disabled={isSubmitting}
				/>

				<!-- 終了時刻 -->
				<DateTimeField
					label="終了時刻"
					id="endedAt"
					name="endedAt"
					bind:value={endedAt}
					required
					disabled={isSubmitting}
				/>

				<!-- 時刻エラー -->
				<ErrorAlert message={errors.time} />

				<!-- 作業内容 -->
				<DescriptionField
					label="作業内容"
					id="description"
					name="description"
					bind:value={description}
					disabled={isSubmitting}
				/>

				<!-- 作業内容エラー -->
				<ErrorAlert message={errors.description} />

				<!-- タグ -->
				<div class="form-control">
					<TagInput bind:tags suggestions={tagSuggestions} placeholder="開発 PJ-A 会議" />
					<input type="hidden" name="tags" value={tags.join(' ')} />
				</div>

				<!-- タグエラー -->
				<ErrorAlert message={errors.tags} />

				<!-- 全般エラー -->
				<ErrorAlert message={errors.general} />
			</div>

			<!-- アクション -->
			<div class="modal-action">
				<button
					type="button"
					class="btn"
					onclick={handleCancel}
					disabled={isSubmitting}
					aria-label="キャンセル"
				>
					キャンセル
				</button>
				<button
					type="submit"
					class="btn btn-primary"
					disabled={!isFormValid() || isSubmitting}
					aria-label="保存"
				>
					{isSubmitting ? '保存中...' : '保存'}
				</button>
			</div>
		</form>
	</div>

	<!-- 背景クリックでダイアログを閉じる -->
	<form method="dialog" class="modal-backdrop">
		<button type="submit">close</button>
	</form>
</dialog>
