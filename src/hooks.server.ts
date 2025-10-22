import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const { locals } = event;
	// TODO: 認証機能はまだないので、仮のユーザーIDをセットする
	locals.user = {
		id: '019a0b65-b4fe-7e13-a40e-58fd23302687'
	};
	const response = await resolve(event);

	return response;
};
