import { toast } from '@zerodevx/svelte-toast';

/**
 * 成功メッセージを表示するToast通知
 */
export const toastSuccess = (message: string) => {
	toast.push(message, {
		theme: {
			'--toastBackground': 'oklch(var(--su))',
			'--toastColor': 'oklch(var(--suc))',
			'--toastBarBackground': 'oklch(var(--suc))',
		},
	});
};

/**
 * エラーメッセージを表示するToast通知
 */
export const toastError = (message: string) => {
	toast.push(message, {
		theme: {
			'--toastBackground': 'oklch(var(--er))',
			'--toastColor': 'oklch(var(--erc))',
			'--toastBarBackground': 'oklch(var(--erc))',
		},
	});
};

/**
 * 警告メッセージを表示するToast通知
 */
export const toastWarn = (message: string) => {
	toast.push(message, {
		theme: {
			'--toastBackground': 'oklch(var(--wa))',
			'--toastColor': 'oklch(var(--wac))',
			'--toastBarBackground': 'oklch(var(--wac))',
		},
	});
};

/**
 * 情報メッセージを表示するToast通知
 */
export const toastInfo = (message: string) => {
	toast.push(message, {
		theme: {
			'--toastBackground': 'oklch(var(--in))',
			'--toastColor': 'oklch(var(--inc))',
			'--toastBarBackground': 'oklch(var(--inc))',
		},
	});
};
