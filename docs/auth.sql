-- ============================================================
-- EduSphere LMS - Soporte de autenticación
-- ------------------------------------------------------------
-- Agrega la columna donde se guarda el HASH de la contraseña en `usuarios`.
-- La app NUNCA guarda la contraseña en texto plano: guarda el hash bcrypt.
--
-- Ejecútalo en DBeaver sobre la base edusphere_db (Execute SQL Script, Alt+X).
-- Es idempotente: se puede correr varias veces sin error.
--
-- NOTA: este cambio pertenece al esquema (rama feature/db). Pásaselo a tu
-- compañero para que lo integre allí; aquí está solo para poder probar la API.
-- ============================================================

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS password_hash varchar(255);

-- (Opcional) Si quieres que sea obligatoria a futuro, primero rellena los
-- usuarios existentes y luego:
--   ALTER TABLE usuarios ALTER COLUMN password_hash SET NOT NULL;
