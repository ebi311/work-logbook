import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import MonthlyTotal from './MonthlyTotal.svelte';

describe('MonthlyTotal', () => {
	describe('基本表示', () => {
		it('秒数がHH:mm形式で表示される', () => {
			render(MonthlyTotal, {
				props: {
					totalSec: 3600 // 1時間
				}
			});

			expect(screen.getByText('01:00')).toBeInTheDocument();
		});

		it('月が未指定の場合は「今月の合計」と表示される', () => {
			render(MonthlyTotal, {
				props: {
					totalSec: 3600
				}
			});

			expect(screen.getByText(/今月の合計/)).toBeInTheDocument();
		});

		it('月が指定されている場合は「YYYY年MM月の合計」と表示される', () => {
			render(MonthlyTotal, {
				props: {
					totalSec: 3600,
					month: '2025-10'
				}
			});

			expect(screen.getByText(/2025年10月の合計/)).toBeInTheDocument();
		});
	});

	describe('時間フォーマット', () => {
		it('0秒は "00:00" と表示される', () => {
			render(MonthlyTotal, {
				props: {
					totalSec: 0
				}
			});

			expect(screen.getByText('00:00')).toBeInTheDocument();
		});

		it('30分（1800秒）は "00:30" と表示される', () => {
			render(MonthlyTotal, {
				props: {
					totalSec: 1800
				}
			});

			expect(screen.getByText('00:30')).toBeInTheDocument();
		});

		it('24時間（86400秒）は "24:00" と表示される', () => {
			render(MonthlyTotal, {
				props: {
					totalSec: 86400
				}
			});

			expect(screen.getByText('24:00')).toBeInTheDocument();
		});

		it('100時間以上も正しく表示される', () => {
			render(MonthlyTotal, {
				props: {
					totalSec: 360000 // 100時間
				}
			});

			expect(screen.getByText('100:00')).toBeInTheDocument();
		});
	});

	describe('月の表示形式', () => {
		it('1月は "1月" と表示される（ゼロパディングなし）', () => {
			render(MonthlyTotal, {
				props: {
					totalSec: 3600,
					month: '2025-01'
				}
			});

			expect(screen.getByText(/2025年1月の合計/)).toBeInTheDocument();
		});

		it('12月は "12月" と表示される', () => {
			render(MonthlyTotal, {
				props: {
					totalSec: 3600,
					month: '2025-12'
				}
			});

			expect(screen.getByText(/2025年12月の合計/)).toBeInTheDocument();
		});
	});

	describe('アクセシビリティ', () => {
		it('適切なaria-labelが設定されている', () => {
			const { container } = render(MonthlyTotal, {
				props: {
					totalSec: 3600,
					month: '2025-01'
				}
			});

			const stat = container.querySelector('[aria-label]');
			expect(stat).toBeInTheDocument();
			expect(stat?.getAttribute('aria-label')).toBe('2025年1月の合計: 01:00');
		});
	});
});
