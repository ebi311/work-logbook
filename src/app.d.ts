// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user?: {
				id: string;
				githubId: string;
				githubUsername: string;
				isActive: boolean;
			};
			nonce?: string;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	// Background Sync API
	interface SyncManager {
		getTags(): Promise<string[]>;
		register(tag: string): Promise<void>;
	}

	interface ServiceWorkerRegistration {
		readonly sync: SyncManager;
	}

	interface SyncEvent extends ExtendableEvent {
		readonly lastChance: boolean;
		readonly tag: string;
	}
}

export {};
