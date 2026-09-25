// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		interface Locals {
			teacher: { id: string; email: string } | null;
			student: { id: string; label: string; groupId: string } | null;
		}
	}
}

export {};
