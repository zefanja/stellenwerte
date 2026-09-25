#!/usr/bin/env bash
# Neue Version einspielen: Code holen, bauen, Dienst neu starten, Gesundheit prüfen.
# Migrationen laufen beim Start der App automatisch.
set -euo pipefail
cd "$(dirname "$0")/.."

git pull --ff-only
# npm 10.9 bricht bei diesem Abhängigkeitsbaum ab; npm 11 per npx
npx -y npm@11 ci
npm run build
supervisorctl restart stellenwert

PORT=$(grep -E '^PORT=' .env | cut -d= -f2 | tr -d '"')
for i in $(seq 1 20); do
	if curl -fsS "http://localhost:${PORT:-3000}/healthz" >/dev/null; then
		echo "App läuft ($(git rev-parse --short HEAD))."
		exit 0
	fi
	sleep 1
done
echo "App antwortet nicht auf /healthz. Log: supervisorctl tail -f stellenwert" >&2
exit 1
