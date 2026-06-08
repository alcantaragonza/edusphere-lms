#!/bin/bash
# ==================================================================
# backup.sh — Backup FULL de PostgreSQL (Railway → archivo local)
# ==================================================================
# PROPOSITO: Genera un dump completo de la base de datos de Railway
# y lo guarda en la carpeta backups/ con marca de tiempo.
#
# USO: bash scripts/backup.sh
#
# REQUISITOS: pg_dump instalado (viene con PostgreSQL)
# ==================================================================

# Configuracion — ajustar si Railway cambia las credenciales
HOST="acela.proxy.rlwy.net"
PORT="42156"
USER="postgres"
PASSWORD="oavroyKZDvZYxpVFSwYQKwXsLoFpuNzM"
DB="railway"
BACKUP_DIR="backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="${BACKUP_DIR}/backup_${DB}_${TIMESTAMP}.sql"

mkdir -p "$BACKUP_DIR"

echo "========================================="
echo " BACKUP FULL — EduSphere LMS"
echo "========================================="
echo " Origen:  ${USER}@${HOST}:${PORT}/${DB}"
echo " Destino: ${BACKUP_FILE}"
echo " Hora:    $(date)"
echo "========================================="

export PGPASSWORD="$PASSWORD"

pg_dump \
  --host="$HOST" \
  --port="$PORT" \
  --username="$USER" \
  --dbname="$DB" \
  --no-owner \
  --no-acl \
  --format=plain \
  --verbose \
  > "$BACKUP_FILE" 2>&1

if [ $? -eq 0 ]; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "========================================="
  echo " BACKUP COMPLETADO"
  echo " Archivo: ${BACKUP_FILE}"
  echo " Tamaño:  ${SIZE}"
  echo "========================================="
else
  echo "ERROR: pg_dump fallo. Revisa la conexion a Railway."
  exit 1
fi
