// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		interface Locals {
			teacher: { id: string; email: string } | null;
		}
	}
}

export {};
