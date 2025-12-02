// 日別集計データモデル（F-009）

export type DailySummaryItem = {
	date: string; // YYYY-MM-DD, UTC基準
	dayOfWeek: string; // '日' | '月' | '火' | '水' | '木' | '金' | '土'
	totalSec: number; // 合計作業秒数
	count: number; // 作業記録件数
};

export type DailySummaryData = {
	items: DailySummaryItem[];
	monthlyTotalSec: number;
	month: string; // YYYY-MM
};
