/**
 * Formato de fechas — compartido entre pantallas.
 *
 * Nacieron dentro de admin/Usuarios.jsx y en cuanto Gerencia necesitó lo mismo
 * quedaban dos copias que iban a divergir. Todo lo que muestre fechas de la app
 * debería importar de aquí.
 *
 * Locale fijo 'es-VE' porque los clientes están en Maracaibo: no queremos que
 * el formato cambie según la configuración del navegador de quien administra.
 */

/**
 * "hace 3 horas" — para modales y detalles, donde hay espacio.
 * Devuelve null pasado un mes: a esa distancia "hace 47 días" no le dice
 * nada a nadie y conviene mostrar la fecha exacta.
 */
export function tiempoRelativo(iso) {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1)  return 'hace un momento'
  if (min < 60) return `hace ${min} ${min === 1 ? 'minuto' : 'minutos'}`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `hace ${hrs} ${hrs === 1 ? 'hora' : 'horas'}`
  const dias = Math.floor(hrs / 24)
  if (dias < 30) return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`
  return null
}

/**
 * "3 h", "2 d" — para celdas de tabla, donde cada carácter cuesta ancho.
 * Pasado un mes cae a fecha corta.
 */
export function tiempoRelativoCorto(iso) {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1)  return 'ahora'
  if (min < 60) return `${min} min`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `${hrs} h`
  const dias = Math.floor(hrs / 24)
  if (dias < 30) return `${dias} d`
  return fechaCorta(iso)
}

/**
 * Días transcurridos desde una fecha. Sirve para decidir color sin
 * tener que parsear el texto que devuelven las funciones de arriba.
 */
export function diasDesde(iso) {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

/** "6 ago 26" — columnas de tabla */
export function fechaCorta(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-VE', {
    day: '2-digit', month: 'short', year: '2-digit',
  })
}

/** "6 de agosto de 2026" — detalles */
export function fechaLarga(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-VE', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

/** "6 ago 2026, 3:41 p. m." — cuando importa la hora exacta */
export function fechaHora(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-VE', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

/**
 * Color según qué tan reciente es un acceso. Permite leer la columna
 * de un vistazo: verde = activo esta semana, gris = tibio, tenue = frío.
 */
export function colorActividad(iso) {
  const dias = diasDesde(iso)
  if (dias === null) return '#CBD5E1'   // nunca ingresó
  if (dias <= 7)     return '#1B7A3E'   // activo
  if (dias <= 30)    return '#64748B'   // tibio
  return '#94A3B8'                      // frío
}