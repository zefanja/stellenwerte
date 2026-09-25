import { defineConfig, devices } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Eigene Test-Datenbank neben der Entwicklungsdatenbank, gleiche Instanz
const devUrl = /DATABASE_URL="?([^"\n]+)"?/.exec(readFileSync('.env', 'utf8'))?.[1] ?? '';
export const TEST_DATABASE_URL =
	process.env.TEST_DATABASE_URL ?? devUrl.replace('/stellenwert?', '/stellenwert_test?');

export default defineConfig({
	testDir: 'e2e',
	testMatch: '**/*.e2e.ts',
	globalSetup: './e2e/seed.ts',
	// Rate Limit liegt im Speicher des einen Server-Prozesses: Tests nacheinander
	workers: 1,
	fullyParallel: false,
	use: {
		baseURL: 'http://localhost:4173',
		...devices['Pixel 7'],
		// wie hinter dem Uberspace-Proxy: Client-IP aus X-Forwarded-For (siehe ADDRESS_HEADER unten)
		extraHTTPHeaders: { 'x-forwarded-for': '203.0.113.1' }
	},
	webServer: {
		command: 'npm run build && node --env-file=.env build',
		port: 4173,
		env: {
			DATABASE_URL: TEST_DATABASE_URL,
			PORT: '4173',
			ORIGIN: 'http://localhost:4173',
			ADDRESS_HEADER: 'x-forwarded-for',
			XFF_DEPTH: '1'
		},
		reuseExistingServer: false
	}
});
