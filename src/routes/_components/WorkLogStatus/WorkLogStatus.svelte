<script lang="ts">
	import { formatDuration, calculateElapsedSeconds } from '$lib/utils/duration';
	import classNames from 'classnames';

	type ActiveWorkLog = {
		id: string;
		startedAt: string;
	};

	type Props = {
		active?: ActiveWorkLog;
		serverNow: string;
	};

	let { active, serverNow }: Props = $props();

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

	const symbolClassname = $derived(() => {
		let classes = classNames('mr-2', 'text-2xl', {
			'text-red-500': active,
			'text-gray-500': !active
		});
		return classes;
	});
</script>

<div class="my-4">
	<span class={symbolClassname()}>
		{active ? '●' : '■'}
	</span>
	<span class="text-2xl font-bold">{statusText}</span>
</div>
