<script lang="ts">
	/**
	 * 作業内容入力フィールドコンポーネント
	 *
	 * Markdown対応のtextareaを提供します。
	 */

	type Props = {
		/** 作業内容の値 */
		value: string;
		/** 入力無効フラグ */
		disabled?: boolean;
		/** プレースホルダー */
		placeholder?: string;
	};

	let { value = $bindable(''), disabled = false, placeholder = '作業内容を入力...' }: Props =
		$props();
</script>

<div class="form-control flex w-full flex-col">
	<label for="description" class="label">
		<span class="label-text">作業内容(Markdown対応)</span>
	</label>
	<textarea
		id="description"
		name="description"
		bind:value
		{placeholder}
		class="textarea-bordered textarea w-full font-mono text-sm"
		rows="3"
		{disabled}
	></textarea>
</div>
