// Gemeinsam genutzt von App, CLI-Skripten und drizzle.config.ts, daher reines JavaScript.

/**
 * Zerlegt DATABASE_URL in Verbindungsoptionen. Ein Query-Parameter `host=/pfad` wählt einen
 * Unix-Socket-Ordner (so läuft PostgreSQL auf Uberspace); postgres.js wertet ihn selbst nicht aus.
 * @param {string} databaseUrl
 */
export function pgOptions(databaseUrl) {
	const url = new URL(databaseUrl);
	const socketDir = url.searchParams.get('host');
	return {
		host: socketDir ?? url.hostname,
		port: url.port ? Number(url.port) : 5432,
		user: decodeURIComponent(url.username),
		password: url.password ? decodeURIComponent(url.password) : undefined,
		database: url.pathname.slice(1)
	};
}
