#!/usr/bin/env bash
# Nächtliches, verschlüsseltes Datenbank-Backup (zusätzlich zu den Snapshots von Uberspace).
# pg_dump im Custom-Format, symmetrisch mit gpg (AES-256) verschlüsselt; 30 Tage aufbewahrt.
# Passphrase-Datei nur für den Benutzer lesbar anlegen (chmod 600) und getrennt aufbewahren:
# ohne sie ist das Backup wertlos.
set -euo pipefail
cd "$(dirname "$0")/.."

ZIEL="${BACKUP_DIR:-$HOME/backups/stellenwert}"
PASSPHRASE="${BACKUP_PASSPHRASE_FILE:-$HOME/.config/stellenwert/backup-passphrase}"
TAGE="${BACKUP_TAGE:-30}"

DATABASE_URL=$(grep -E '^DATABASE_URL=' .env | cut -d= -f2- | tr -d '"')
# postgres://user@localhost/db?host=/socket/dir → Einzelteile für pg_dump
BENUTZER=$(sed -E 's#^postgres(ql)?://([^@:/]+).*#\2#' <<<"$DATABASE_URL")
DATENBANK=$(sed -E 's#^[^/]*//[^/]*/([^?]+).*#\1#' <<<"$DATABASE_URL")
SOCKET=$(sed -nE 's#.*[?&]host=([^&]+).*#\1#p' <<<"$DATABASE_URL")

[ -r "$PASSPHRASE" ] || { echo "Passphrase-Datei fehlt: $PASSPHRASE" >&2; exit 1; }
mkdir -p "$ZIEL"
chmod 700 "$ZIEL"
DATEI="$ZIEL/stellenwert-$(date +%Y-%m-%d_%H%M).dump.gpg"

pg_dump -h "${SOCKET:-localhost}" -U "$BENUTZER" -Fc "$DATENBANK" |
	gpg --batch --yes --quiet --symmetric --cipher-algo AES256 --pinentry-mode loopback --passphrase-file "$PASSPHRASE" -o "$DATEI"
chmod 600 "$DATEI"

find "$ZIEL" -name 'stellenwert-*.dump.gpg' -mtime +"$TAGE" -delete
echo "$(date -Iseconds) Backup: $DATEI ($(du -h "$DATEI" | cut -f1))"
