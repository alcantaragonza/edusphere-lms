'use strict';

// Controllers de autenticación: registro y login.
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const authModel = require('../models/auth.model');
const { asyncWrap } = require('./crud.controller');
const { exigirRequeridos, esEmail, ErrorValidacion } = require('../middlewares/validar');

const ROLES = ['instructor', 'estudiante', 'admin'];
const SALT_ROUNDS = 10;
const MIN_PASSWORD = 8;

// Firma un JWT con los datos públicos del usuario.
function firmarToken(usuario) {
  if (!process.env.JWT_SECRET) {
    const e = new Error('JWT_SECRET no está configurado en .env');
    e.status = 500;
    throw e;
  }
  return jwt.sign(
    { sub: usuario.id, email: usuario.email, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || '8h' }
  );
}

// POST /api/auth/registro
// body: { nombre, apellido, email, password, rol, telefono?, fecha_nacimiento? }
const registro = asyncWrap(async (req, res) => {
  exigirRequeridos(req.body, ['nombre', 'apellido', 'email', 'password', 'rol']);
  const { nombre, apellido, email, password, rol, telefono, fecha_nacimiento } = req.body;

  if (!esEmail(email)) {
    throw new ErrorValidacion('El email no tiene un formato válido');
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
    throw new ErrorValidacion(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres`);
  }
  if (!ROLES.includes(rol)) {
    throw new ErrorValidacion(`rol debe ser uno de: ${ROLES.join(', ')}`);
  }

  // Hashear la contraseña antes de guardarla (nunca se guarda en texto plano).
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  // Si el email ya existe, el UNIQUE de la BD lanza 23505 -> errorHandler responde 409.
  const usuario = await authModel.crearUsuario({
    nombre, apellido, email, password_hash, rol, telefono, fecha_nacimiento,
  });

  const token = firmarToken(usuario);
  res.status(201).json({ usuario, token });
});

// POST /api/auth/login
// body: { email, password }
const login = asyncWrap(async (req, res) => {
  exigirRequeridos(req.body, ['email', 'password']);
  const { email, password } = req.body;

  const usuario = await authModel.buscarPorEmail(email);

  // Mensaje genérico (no revelamos si el email existe o no).
  const credencialesInvalidas = () =>
    res.status(401).json({ error: 'Credenciales inválidas', detalle: null });

  if (!usuario || !usuario.password_hash) return credencialesInvalidas();

  const coincide = await bcrypt.compare(password, usuario.password_hash);
  if (!coincide) return credencialesInvalidas();

  const publico = {
    id: usuario.id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    email: usuario.email,
    rol: usuario.rol,
  };
  const token = firmarToken(publico);
  res.json({ usuario: publico, token });
});

// GET /api/auth/yo  -> datos del usuario del token (ruta protegida)
const yo = asyncWrap(async (req, res) => {
  res.json({ usuario: req.usuario });
});

module.exports = { registro, login, yo };
