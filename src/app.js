'use strict';

// Construye y configura la app Express (sin levantar el server: eso es index.js).
const express = require('express');
const cors = require('cors');

const apiRouter = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Middlewares globales.
app.use(cors());
app.use(express.json()); // parsea bodies JSON

// Raíz informativa.
app.get('/', (req, res) => {
  res.json({ servicio: 'EduSphere LMS API', estado: 'ok', base: '/api' });
});

// Todas las rutas de la API cuelgan de /api.
app.use('/api', apiRouter);

// 404 para rutas no encontradas (Express 5: usar '/*splat' como comodín nombrado).
app.use('/*splat', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada', detalle: `${req.method} ${req.originalUrl}` });
});

// Middleware central de errores (siempre al final).
app.use(errorHandler);

module.exports = app;
