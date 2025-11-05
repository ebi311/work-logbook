/**
 * リクエストごとに一意のnonceを生成する
 * CSP (Content Security Policy) でインラインスクリプト・スタイルを許可するために使用
 */

/**
 * 暗号学的に安全なランダムnonceを生成
 * @returns 32文字の16進数文字列（16バイト）
 */
export const generateNonce = (): string => {
	const buffer = new Uint8Array(16);
	crypto.getRandomValues(buffer);
	return Array.from(buffer)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
};
