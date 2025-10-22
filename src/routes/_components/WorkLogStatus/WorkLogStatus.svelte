<script lang="ts">
	import { formatDuration, calculateElapsedSeconds } from '$lib/utils/duration';

	type ActiveWorkLog = {
		id: string;
		startedAt: string;
	};

	type Props = {
		active?: ActiveWorkLog | null;
		serverNow: string;
	};

	let { active = null, serverNow }: Props = $props();

	// 現在の経過時間（秒）
	let elapsedSeconds = $state(0);
	
	// タイマーID
	let intervalId: ReturnType<typeof setInterval> | null = null;

	// 経過時間を計算する関数
	const updateElapsedTime = () => {
		if (!active) {
			elapsedSeconds = 0;
			return;
		}

		// サーバー時刻からの経過を計算し、ローカル時刻の経過を加算
		const serverElapsed = calculateElapsedSeconds(active.startedAt, serverNow);
		const localElapsed = Math.floor((Date.now() - new Date(serverNow).getTime()) / 1000);
		elapsedSeconds = serverElapsed + localElapsed;
	};

	// 表示用のテキスト
	let statusText = $derived.by(() => {
		if (!active) {
			return '停止中';
		}
		const formatted = formatDuration(elapsedSeconds);
		return `記録中（経過 ${formatted}）`;
	});

	// activeやserverNowが変更されたときにタイマーを管理
	$effect(() => {
		// activeとserverNowの変更を監視するための参照
		const currentActive = active;
		const currentServerNow = serverNow;
		
		updateElapsedTime();
		
		// 既存のタイマーをクリア
		if (intervalId !== null) {
			clearInterval(intervalId);
			intervalId = null;
		}
		
		// activeの状態に応じてタイマーを開始
		if (currentActive) {
			intervalId = setInterval(() => {
				updateElapsedTime();
			}, 1000);
		}
		
		// クリーンアップ関数
		return () => {
			if (intervalId !== null) {
				clearInterval(intervalId);
				intervalId = null;
			}
		};
	});
</script>

<div class="work-log-status">
	<span>{statusText}</span>
</div>

<style>
	.work-log-status {
		padding: 1rem;
		font-size: 1.25rem;
		font-weight: 600;
	}
</style>
