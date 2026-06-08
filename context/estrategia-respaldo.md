# Estrategia de Respaldo — EduSphere LMS

**Seccion 5.6 del enunciado**

---

## 1. Tipos de backup

### Backup FULL (pg_dump)

| Aspecto | Detalle |
|---------|---------|
| Herramienta | `pg_dump` (nativo de PostgreSQL) |
| Comando | `bash scripts/backup.sh` |
| Frecuencia | Semanal (domingo 3:00 AM) + bajo demanda antes de cambios criticos |
| Formato | SQL plano (.sql) — portable, legible, no depende de version de PG |
| Tamaño estimado | ~3-5 MB con los volumenes actuales |
| Ubicacion | `backups/` con marca de tiempo en el nombre |

### Backup INCREMENTAL (WAL archiving)

| Aspecto | Detalle |
|---------|---------|
| Herramienta | WAL (Write-Ahead Log) nativo de PostgreSQL |
| Configuracion | `infra/postgresql.conf` |
| Frecuencia de generacion | Automatica — cada segmento WAL (~16MB) se archiva al completarse |
| Frecuencia de envio | En produccion se copiaria a S3/GCS cada hora |
| Proposito | Permitir Point-In-Time Recovery (PITR) |

### ¿Por que FULL + INCREMENTAL?

```
┌──────────────────────────────────────────────────────┐
│ Semana típica                                        │
│                                                      │
│  DOM LUN MAR MIE JUE VIE SAB DOM                     │
│  ██ ─── ─── ─── ─── ─── ─── ██                       │
│  FULL                        FULL                     │
│                                                      │
│  Entre FULL y FULL:                                   │
│  Cada hora se guarda un segmento WAL con los cambios  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                                      │
│  Si la BD falla el MIERCOLES:                         │
│  1. Restauras FULL del DOMINGO                        │
│  2. Aplicas WAL del LUNES + MARTES + MIERCOLES        │
│  3. BD queda exactamente como estaba antes del fallo  │
└──────────────────────────────────────────────────────┘
```

---

## 2. Politica de retencion

| Tipo | Frecuencia | ¿Cuantos se guardan? | ¿Por cuanto tiempo? |
|------|-----------|---------------------|-------------------|
| WAL | Automatico (cada ~16MB) | 7 dias de archivos | 1 semana |
| FULL semanal | Cada domingo 3:00 AM | 4 backups | 4 semanas (1 mes) |
| FULL mensual | Dia 1 de cada mes | 6 backups | 6 meses |
| Pre-deploy | Antes de cada despliegue | 3 backups | 3 meses |

### Justificacion

- **WAL 7 dias**: suficiente para recuperar cualquier fallo de la ultima semana. Mas de 7 dias de WAL ocupa mucho espacio (~1GB/dia con alto trafico).
- **FULL 4 semanas**: cubre el caso de corrupcion silenciosa detectada tardiamente.
- **Mensual 6 meses**: requerimiento minimo de compliance/auditoria.
- **Pre-deploy**: si un deploy rompe algo, volver al estado anterior en minutos.

---

## 3. Procedimiento de restauracion

### Caso A: Restauracion completa desde FULL

```bash
# 1. Asegurar que el contenedor Docker local esta corriendo
docker compose -f infra/docker-compose.yml --env-file .env up -d postgres

# 2. Restaurar el backup
bash scripts/restore.sh backups/backup_railway_2026-06-08.sql

# 3. Verificar integridad
bash scripts/verify.sh
```

### Caso B: Point-In-Time Recovery (PITR) con WAL

```bash
# 1. Restaurar el backup FULL base
pg_restore ...

# 2. Crear archivo recovery.conf con el timestamp deseado
echo "restore_target_time = '2026-06-05 14:30:00'" > recovery.conf

# 3. Copiar los archivos WAL al directorio pg_wal/
cp wal_archive/* /var/lib/postgresql/data/pg_wal/

# 4. Iniciar PostgreSQL — reproducira los WAL hasta el timestamp indicado
pg_ctl start
```

---

## 4. Validacion de integridad

```bash
bash scripts/verify.sh
```

Este script compara `COUNT(*)` de cada tabla entre Railway (origen) y Docker local (destino). Si todos los conteos coinciden, el backup es integro.

### Ejemplo de salida esperada:

```
TABLA                          RAILWAY      LOCAL OK?
-----                          -------      ----- ---
categorias                           8          8 ✅
usuarios                           216        216 ✅
cursos                              51         51 ✅
modulos                            519        519 ✅
lecciones                         1499       1499 ✅
inscripciones                      768        768 ✅
pagos                              768        768 ✅
certificados                       150        150 ✅
...
```

---

## 5. Automatizacion (cron)

En produccion, los backups se automatizan con cron:

```cron
# Backup FULL semanal — domingo 3:00 AM
0 3 * * 0 /ruta/a/scripts/backup.sh >> /var/log/backup.log 2>&1

# Copia de WAL a almacenamiento externo (S3/GCS) — cada hora
0 * * * * /ruta/a/scripts/sync_wal.sh >> /var/log/wal_sync.log 2>&1

# Limpieza de backups antiguos — diario
0 4 * * * find /ruta/a/backups/ -name "*.sql" -mtime +28 -delete
```

---

## 6. Guion de demostracion para defensa

```
1. "Este es mi entorno de produccion — Railway con datos reales"
   → Muestro SELECT COUNT(*) FROM cursos → 51

2. "Este es mi entorno de recuperacion — Docker local vacio"
   → Muestro SELECT COUNT(*) FROM cursos → 0

3. "Aplico el backup generado con pg_dump"
   → Ejecuto: bash scripts/restore.sh backup_xxx.sql

4. "La base local ahora tiene los mismos datos que produccion"
   → Muestro SELECT COUNT(*) FROM cursos → 51 ✅

5. "Simulo un desastre: un DELETE sin WHERE borro la tabla cursos"
   → Ejecuto: DROP TABLE cursos CASCADE;

6. "Restauro desde el backup — los datos vuelven"
   → Ejecuto: bash scripts/restore.sh backup_xxx.sql
   → Muestro SELECT COUNT(*) FROM cursos → 51 ✅

7. "Verifico integridad con el script verify.sh"
   → Ejecuto: bash scripts/verify.sh
   → Todos ✅

8. "Asi funciona el backup incremental con WAL"
   → Muestro el archivo infra/postgresql.conf
   → Explico: "Cada hora se archiva un segmento WAL.
     Si la BD falla un miercoles, restauro el FULL del domingo
     + los WAL hasta minutos antes del fallo"

9. "Esta es mi politica de retencion"
   → Muestro la tabla de la seccion 2

Tiempo total: ~5 minutos
```
