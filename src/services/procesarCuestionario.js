/**
 * Funcion JS de procesamiento de cuestionarios
 *
 * Requisito del enunciado (seccion 5.3): 1 funcion JS de procesamiento
 * en MongoDB para normalizar respuestas de cuestionarios antes de insertar.
 *
 * Esta funcion valida y normaliza los datos de entrada, calcula la
 * calificacion y retorna un documento listo para insertar en
 * la coleccion cuestionarios_respuestas.
 *
 * Se usa desde el endpoint POST /api/cuestionarios/respuestas:
 *   const doc = procesarRespuestas(req.body);
 *   await db.collection('cuestionarios_respuestas').insertOne(doc);
 *
 * Validaciones:
 *   1. estudiante_id y leccion_id deben ser UUIDs validos
 *   2. preguntas_respuestas debe ser un array no vacio
 *   3. Cada respuesta debe tener pregunta_id, respuesta y tipo de pregunta
 *   4. Para opcion_multiple: la respuesta debe ser una de las opciones
 *   5. Para verdadero_falso: la respuesta debe ser 'Verdadero' o 'Falso'
 *   6. Para respuesta_abierta: cualquier string es valido
 *   7. La calificacion se calcula automaticamente (correctas / total * 100)
 *
 * Decision de arquitectura:
 *   La validacion se hace AQUI en vez de en el validador JSON Schema de
 *   MongoDB porque necesitamos logica condicional por tipo de pregunta
 *   (opcion_multiple vs verdadero_falso vs respuesta_abierta).
 *   JSON Schema no soporta validacion condicional compleja.
 */

const RESPUESTAS_VALIDAS = { verdadero_falso: ['Verdadero', 'Falso'] };

class ErrorValidacionCuestionario extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ErrorValidacionCuestionario';
  }
}

function procesarRespuestas(entry) {
  const { estudiante_id, leccion_id, preguntas_respuestas, tiempo_total_seg, intento_numero } =
    entry || {};

  if (!estudiante_id || !leccion_id) {
    throw new ErrorValidacionCuestionario('estudiante_id y leccion_id son obligatorios');
  }

  if (!Array.isArray(preguntas_respuestas) || preguntas_respuestas.length === 0) {
    throw new ErrorValidacionCuestionario('preguntas_respuestas debe ser un array no vacio');
  }

  const procesadas = [];
  let puntajeTotal = 0;

  for (const r of preguntas_respuestas) {
    if (!r.pregunta_id) {
      throw new ErrorValidacionCuestionario('Cada respuesta requiere pregunta_id');
    }

    const respuesta = (r.respuesta || '').trim();
    if (!respuesta) {
      throw new ErrorValidacionCuestionario(
        `respuesta no puede estar vacia para pregunta_id ${r.pregunta_id}`
      );
    }

    let correcta = false;

    if (r.tipo === 'verdadero_falso') {
      if (!RESPUESTAS_VALIDAS.verdadero_falso.includes(respuesta)) {
        throw new ErrorValidacionCuestionario(
          `respuesta invalida para pregunta ${r.pregunta_id}: debe ser 'Verdadero' o 'Falso'`
        );
      }
      correcta = respuesta === r.respuesta_correcta;
    } else if (r.tipo === 'opcion_multiple') {
      if (r.opciones && Array.isArray(r.opciones) && !r.opciones.includes(respuesta)) {
        throw new ErrorValidacionCuestionario(
          `respuesta '${respuesta}' no esta entre las opciones validas para pregunta ${r.pregunta_id}`
        );
      }
      correcta = respuesta === r.respuesta_correcta;
    } else if (r.tipo === 'respuesta_abierta') {
      correcta = false;
    } else {
      throw new ErrorValidacionCuestionario(
        `tipo de pregunta desconocido: ${r.tipo} (pregunta ${r.pregunta_id})`
      );
    }

    if (correcta) {
      puntajeTotal += r.puntos || 1;
    }

    procesadas.push({
      pregunta_id: r.pregunta_id,
      respuesta,
      correcta,
    });
  }

  const totalPreguntas = preguntas_respuestas.length;
  const correctas = procesadas.filter(p => p.correcta).length;
  const calificacion = Math.round((correctas / totalPreguntas) * 100);

  return {
    estudiante_id,
    leccion_id,
    preguntas_respuestas: procesadas,
    calificacion,
    puntaje_total: puntajeTotal,
    tiempo_total_seg: Math.max(0, parseInt(tiempo_total_seg) || 0),
    fecha_intento: new Date(),
    intento_numero: Math.max(1, parseInt(intento_numero) || 1),
  };
}

module.exports = { procesarRespuestas, ErrorValidacionCuestionario };
