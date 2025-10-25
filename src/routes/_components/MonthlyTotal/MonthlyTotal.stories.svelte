<script lang="ts" context="module">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import MonthlyTotal from './MonthlyTotal.svelte';

	const { Story } = defineMeta({
		component: MonthlyTotal,
		title: 'Components/MonthlyTotal',
		tags: ['autodocs'],
		argTypes: {
			totalSec: {
				control: { type: 'number', min: 0, max: 1000000 },
				description: '合計作業時間（秒）'
			},
			month: {
				control: 'text',
				description: '対象月（YYYY-MM形式）。未指定の場合は「今月」'
			}
		}
	});
</script>

<!-- デフォルト: 今月、1時間 -->
<Story name="Default" args={{ totalSec: 3600 }} />

<!-- 月指定あり -->
<Story name="WithMonth" args={{ totalSec: 7200, month: '2025-10' }} />

<!-- 0時間 -->
<Story name="Zero" args={{ totalSec: 0 }} />

<!-- 30分 -->
<Story name="HalfHour" args={{ totalSec: 1800 }} />

<!-- 8時間（1日の労働時間） -->
<Story name="EightHours" args={{ totalSec: 28800, month: '2025-10' }} />

<!-- 160時間（1ヶ月の労働時間） -->
<Story name="MonthlyWork" args={{ totalSec: 576000, month: '2025-10' }} />

<!-- 100時間以上 -->
<Story name="Over100Hours" args={{ totalSec: 360000, month: '2025-09' }} />

<!-- 1月 -->
<Story name="January" args={{ totalSec: 144000, month: '2025-01' }} />

<!-- 12月 -->
<Story name="December" args={{ totalSec: 172800, month: '2024-12' }} />
