#!/bin/bash
# ==================================================================
# verify.sh — Compara row counts entre Railway y Docker local
# ==================================================================
# PROPOSITO: Verificar la integridad del backup comparando cuantas
# filas hay en cada tabla en Railway (produccion) vs Docker (copia).
#
# USO: bash scripts/verify.sh
#
# Si todos los conteos coinciden → backup integro ✅
# Si alguno difiere → posible corrupcion o backup incompleto ❌
# ==================================================================

# Railway
RAILWAY_HOST="acela.proxy.rlwy.net"
RAILWAY_PORT="42156"
RAILWAY_USER="postgres"
RAILWAY_PASSWORD="oavroyKZDvZYxpVFSwYQKwXsLoFpuNzM"
RAILWAY_DB="railway"

# Docker local
CONTAINER="edusphere_postgres"
LOCAL_USER="postgres"
LOCAL_DB="edusphere"

TABLES=(
  "categorias" "usuarios" "instructores" "estudiantes"
  "cursos" "modulos" "lecciones" "preguntas"
  "inscripciones" "pagos" "certificados"
  "liquidaciones_instructor" "liquidaciones_detalle"
  "carrito_compras" "log_auditoria"
  "tipos_operacion_auditoria" "configuracion_plataforma"
)

echo "========================================="
echo " VERIFICACION DE INTEGRIDAD"
echo "========================================="
echo " Railway: ${RAILWAY_USER}@${RAILWAY_HOST}:${RAILWAY_PORT}/${RAILWAY_DB}"
echo " Local:   ${CONTAINER}/${LOCAL_DB}"
echo "========================================="
echo ""
printf "%-35s %10s %10s %s\n" "TABLA" "RAILWAY" "LOCAL" "OK?"
printf "%-35s %10s %10s %s\n" "-----" "-------" "-----" "---"

ALL_OK=true

for TABLE in "${TABLES[@]}"; do
  RAILWAY_COUNT=$(PGPASSWORD="$RAILWAY_PASSWORD" psql \
    --host="$RAILWAY_HOST" --port="$RAILWAY_PORT" \
    --username="$RAILWAY_USER" --dbname="$RAILWAY_DB" \
    -tAc "SELECT COUNT(*) FROM ${TABLE};" 2>/dev/null || echo "ERROR")

  LOCAL_COUNT=$(docker exec "$CONTAINER" psql \
    -U "$LOCAL_USER" -d "$LOCAL_DB" \
    -tAc "SELECT COUNT(*) FROM ${TABLE};" 2>/dev/null || echo "ERROR")

  if [ "$RAILWAY_COUNT" = "$LOCAL_COUNT" ] && [ "$RAILWAY_COUNT" != "ERROR" ]; then
    STATUS="✅"
  else
    STATUS="❌"
    ALL_OK=false
  fi

  printf "%-35s %10s %10s %s\n" "$TABLE" "$RAILWAY_COUNT" "$LOCAL_COUNT" "$STATUS"
done

echo ""
if $ALL_OK; then
  echo "========================================="
  echo " ✅ BACKUP INTEGRO — Todos los conteos coinciden"
  echo "========================================="
else
  echo "========================================="
  echo " ❌ DISCREPANCIA DETECTADA — Revisa las tablas marcadas"
  echo "========================================="
fi
