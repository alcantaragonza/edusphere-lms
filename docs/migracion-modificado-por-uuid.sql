-- ============================================================
-- EduSphere LMS - Migración: usuarios.modificado_por a UUID nullable
-- ------------------------------------------------------------
-- La columna estaba como `smallint not null`, pero referencia a un usuario
-- (autor del cambio). El registro propio no tiene autor, así que pasamos la
-- columna a UUID nullable y le agregamos la FK auto-referenciada a usuarios(id).
--
-- Ejecútalo en DBeaver sobre la base edusphere_db (Execute SQL Script, Alt+X).
-- Es idempotente: se puede correr varias veces sin error.
--
-- IMPORTANTE: el `type uuid using null` descarta los valores actuales de
-- modificado_por (que eran smallint y no son UUID válidos). Si esos datos
-- importaran, habría que mapearlos antes; en este esquema se asumen vacíos/0.
--
-- NOTA: este cambio pertenece al esquema (rama feature/db). Pásaselo a tu
-- compañero para que lo integre allí; aquí está solo para poder probar la API.
-- ============================================================

-- 1) Quitar NOT NULL y cambiar el tipo a UUID (descarta valores previos).
ALTER TABLE usuarios
    ALTER COLUMN modificado_por DROP NOT NULL,
    ALTER COLUMN modificado_por TYPE uuid USING NULL;

-- 2) Agregar la FK auto-referenciada (solo si aún no existe -> idempotente).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_usuarios_modificado_por'
    ) THEN
        ALTER TABLE usuarios
            ADD CONSTRAINT fk_usuarios_modificado_por
            FOREIGN KEY (modificado_por) REFERENCES usuarios(id);
    END IF;
END $$;
