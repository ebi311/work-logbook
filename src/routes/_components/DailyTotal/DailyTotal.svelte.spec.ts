import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import DailyTotal from './DailyTotal.svelte';

describe('DailyTotal.svelte', () => {
	describe('TC1: 基本的な表示', () => {
		it('今日の合計を正しく表示する', () => {
			const { container } = render(DailyTotal, { props: { totalSec: 3661 } });
			const statTitle = container.querySelector('.stat-title');
			const statValue = container.querySelector('.stat-value');

			expect(statTitle?.textContent).toBe('今日の合計');
			expect(statValue?.textContent).toBe('01:01');
		});

		it('0秒の場合、00:00を表示する', () => {
			const { container } = render(DailyTotal, { props: { totalSec: 0 } });
			const statValue = container.querySelector('.stat-value');

			expect(statValue?.textContent).toBe('00:00');
		});
	});

	describe('TC2: 日付指定', () => {
		it('日付を指定した場合、その日付の合計を表示する', () => {
			const { container } = render(DailyTotal, { props: { totalSec: 7200, date: '2025-11-06' } });
			const statTitle = container.querySelector('.stat-title');
			const statValue = container.querySelector('.stat-value');

			expect(statTitle?.textContent).toBe('2025年11月6日の合計');
			expect(statValue?.textContent).toBe('02:00');
		});

		it('月が1桁の場合も正しく表示する', () => {
			const { container } = render(DailyTotal, { props: { totalSec: 3600, date: '2025-01-05' } });
			const statTitle = container.querySelector('.stat-title');

			expect(statTitle?.textContent).toBe('2025年1月5日の合計');
		});
	});

	describe('TC3: アクセシビリティ', () => {
		it('aria-labelに正しい情報を設定する', () => {
			const { container } = render(DailyTotal, { props: { totalSec: 3661 } });
			const stat = container.querySelector('.stat');

			expect(stat?.getAttribute('aria-label')).toBe('今日の合計: 01:01');
		});
	});
});
