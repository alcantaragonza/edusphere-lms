'use strict';

// Middlewares de autenticación y autorización basados en JWT.
const jwt = require('jsonwebtoken');

// Exige un token válido en el header "Authorization: Bearer <token>".
// Si es válido, adjunta los datos del usuario a req.usuario y continúa.
function autenticar(req, res, next) {
  const header = req.headers.authorization || '';
  const [tipo, token] = header.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({
      error: 'No autenticado',
      detalle: 'Falta el header Authorization: Bearer <token>',
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = { id: payload.sub, email: payload.email, rol: payload.rol };
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Token inválido o expirado',
      detalle: err.message,
    });
  }
}

// Exige que el usuario autenticado tenga uno de los roles indicados.
// Uso: router.post('/', autenticar, requiereRol('admin'), handler)
function requiereRol(...roles) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autenticado', detalle: null });
    }
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({
        error: 'No autorizado',
        detalle: `Esta acción requiere rol: ${roles.join(' o ')}`,
      });
    }
    next();
  };
}

module.exports = { autenticar, requiereRol };
