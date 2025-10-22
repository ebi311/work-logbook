import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/svelte';
import { afterEach } from 'vitest';

// 各テスト後にクリーンアップ
afterEach(() => {
	cleanup();
});
