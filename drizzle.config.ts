import { defineConfig } from 'drizzle-kit';
import { pgOptions } from './src/lib/server/db/connection.js';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: { ...pgOptions(process.env.DATABASE_URL), ssl: false },
	verbose: true,
	strict: true
});
