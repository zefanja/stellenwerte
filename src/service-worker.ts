/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { build, files, version } from '$service-worker';

/**
 * Offline-Puffer für eine Session:
 * - App-Dateien (JS, CSS, Icons) aus dem Cache, damit die App auch ohne Netz startet
 * - Schülerseiten (Start, Üben, Login) zuerst aus dem Netz, sonst die zuletzt geladene Fassung
 * - API und Lehrerbereich nie zwischengespeichert
 */
const sw = self as unknown as ServiceWorkerGlobalScope;
const STATISCH = `statisch-${version}`;
export const SEITEN = 'seiten-v1';
const SCHUELER_SEITEN = new Set(['/', '/ueben', '/login']);
const statisch = new Set([...build, ...files]);

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(STATISCH)
			.then((c) => c.addAll([...statisch]))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter((k) => k.startsWith('statisch-') && k !== STATISCH)
						.map((k) => caches.delete(k))
				)
			)
			.then(() => sw.clients.claim())
	);
});

/** Seite und die zugehörigen Daten (__data.json) unter demselben Pfad ablegen, ohne Query */
const seitenPfad = (url: URL) => url.pathname.replace(/\/__data\.json$/, '') || '/';

async function netzZuerst(request: Request, url: URL): Promise<Response> {
	const schluessel = url.pathname;
	const cache = await caches.open(SEITEN);
	try {
		const antwort = await fetch(request);
		// Weiterleitungen (z. B. abgemeldet → /login) nicht unter der alten Adresse merken
		if (antwort.ok && !antwort.redirected) await cache.put(schluessel, antwort.clone());
		return antwort;
	} catch {
		const gemerkt =
			(await cache.match(schluessel)) ??
			(request.mode === 'navigate' ? await cache.match('/') : undefined);
		return (
			gemerkt ??
			new Response('Offline', {
				status: 503,
				headers: { 'content-type': 'text/plain; charset=utf-8' }
			})
		);
	}
}

sw.addEventListener('fetch', (event) => {
	const request = event.request;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);
	if (url.origin !== sw.location.origin) return;

	if (statisch.has(url.pathname)) {
		event.respondWith(caches.match(request).then((r) => r ?? fetch(request)));
		return;
	}
	if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/lehrer')) return;
	if (SCHUELER_SEITEN.has(seitenPfad(url))) event.respondWith(netzZuerst(request, url));
});
