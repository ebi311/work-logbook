<script lang="ts">
	import { toLocalDateTimeInputValue } from '$lib/utils/datetimeLocal';

	/**
	 * F-001.2: 進行中作業の開始時刻入力コンポーネント
	 *
	 * datetime-local input を使用して、開始時刻を編集できます。
	 */

	type Props = {
		/** UTC ISO文字列の開始時刻 */
		value: string;
		/** 最小値（UTC ISO文字列） */
		min?: string;
		/** 最大値（UTC ISO文字列） */
		max?: string;
		/** 入力無効フラグ */
		disabled?: boolean;
		/** エラーメッセージ */
		error?: string;
	};

	let { value = $bindable(''), min, max, disabled = false, error }: Props = $props();

	// UTC ISO文字列をローカル datetime-local 形式に変換
	let localValue = $derived(toLocalDateTimeInputValue(value));
	let minLocal = $derived(min ? toLocalDateTimeInputValue(min) : undefined);
	let maxLocal = $derived(max ? toLocalDateTimeInputValue(max) : undefined);

	// input 要素から直接値を取得して、隠しフィールドに設定するために使用
	// datetime-local の値はローカルタイムゾーンで解釈されるため、
	// サーバーに送信する際は fromLocalDateTimeInputValue で変換する必要がある
</script>

<div class="form-control flex w-full flex-col">
	<label for="started-at" class="label">
		<span class="label-text">開始時刻</span>
	</label>
	<input
		id="started-at"
		type="datetime-local"
		value={localValue}
		min={minLocal}
		max={maxLocal}
		class="input-bordered input w-full"
		class:input-error={!!error}
		{disabled}
	/>
	{#if error}
		<label for="started-at" class="label">
			<span class="label-text-alt text-error">{error}</span>
		</label>
	{/if}
</div>
