#!/bin/bash
# ==================================================================
# restore.sh — Restaura un backup en PostgreSQL local (Docker)
# ==================================================================
# PROPOSITO: Carga un archivo .sql generado por pg_dump en el
# contenedor Docker local de PostgreSQL.
#
# USO: bash scripts/restore.sh backups/backup_railway_2026-06-08.sql
#
# ADVERTENCIA: Esto SOBREESCRIBE los datos en el contenedor local.
# NO afecta a Railway.
# ==================================================================

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
  echo "USO: bash scripts/restore.sh <archivo_backup.sql>"
  echo "Ejemplo: bash scripts/restore.sh backups/backup_railway_2026-06-08.sql"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Archivo '$BACKUP_FILE' no encontrado."
  exit 1
fi

CONTAINER="edusphere_postgres"
DB_USER="postgres"
DB_NAME="edusphere"

echo "========================================="
echo " RESTORE — EduSphere LMS (Docker local)"
echo "========================================="
echo " Archivo: ${BACKUP_FILE}"
echo " Destino: ${CONTAINER} / ${DB_NAME}"
echo " Hora:    $(date)"
echo "========================================="

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo " Tamaño del backup: ${SIZE}"
echo ""

# Verificar que el contenedor esta corriendo
if ! docker ps --format '{{.Names}}' | grep -q "$CONTAINER"; then
  echo "ERROR: El contenedor '$CONTAINER' no esta corriendo."
  echo "  Ejecuta: docker compose -f infra/docker-compose.yml --env-file .env up -d postgres"
  exit 1
fi

echo " Restaurando... (esto puede tardar unos segundos)"
docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE" 2>&1 | tail -5

if [ $? -eq 0 ]; then
  echo "========================================="
  echo " RESTORE COMPLETADO"
  echo "========================================="
  echo ""
  echo "Verifica con: docker exec -i ${CONTAINER} psql -U ${DB_USER} -d ${DB_NAME} -c \"SELECT COUNT(*) FROM cursos;\""
else
  echo "ERROR: El restore fallo."
  exit 1
fi
