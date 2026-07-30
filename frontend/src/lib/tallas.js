/**
 * Tallas de paquete — fuente única de verdad.
 *
 * Hasta v0.6.0 la talla se sugería solo por el lado más largo, con la función
 * `sugerirTamanio()` que vivía dentro de Recepcion.jsx. La calculadora de
 * cotización necesita exactamente la misma regla: si cotizamos con una tabla
 * y el bodeguero registra con otra, prometemos un precio y cobramos otro.
 *
 * Por eso la lógica se saca a este archivo. Recepción debería importar de aquí
 * en lugar de tener su propia copia.
 *
 * Regla de negocio (decisión de José, julio 2026): la talla es la MAYOR entre
 * la que sale por volumen y la que sale por peso. Es el criterio de peso
 * facturable que usa cualquier courier.
 */

export const ORDEN_TALLAS = ['S', 'M', 'L', 'XL']

/**
 * Cortes por lado más largo, en centímetros.
 * Vienen del documento de procesos y de lo que ya hacía Recepción.
 */
export const LIMITES_CM = [
  { talla: 'S', max: 30 },
  { talla: 'M', max: 50 },
  { talla: 'L', max: 80 },
]

/**
 * Cortes por peso, en kilogramos.
 *
 * Calibrados contra un pedido real de 14 cajas de material promocional
 * (julio 2026). La primera propuesta fue 3/8/18 kg y reprecificaba de M a L
 * cajas medianas de libretas y bolsas, subiendo el pedido de $510 a $600 sin
 * que la operación costara un peso más.
 *
 * El cuello de botella del negocio es el VOLUMEN de la camioneta, no el peso:
 * 14 cajas de ~9 kg son ~126 kg, nada para una Hilux. Así que el peso no debe
 * reprecificar mercancía corriente; existe solo como defensa contra la caja
 * chica y muy densa, esa que ocupa poco pero se come la carga útil del viaje.
 *
 * Con 5/15/30 una caja de 25×20×20 con 20 kg de repuestos sigue saliendo L,
 * y con 35 kg sale XL, que era justo el caso que había que cubrir.
 */
export const LIMITES_KG = [
  { talla: 'S', max: 5 },
  { talla: 'M', max: 15 },
  { talla: 'L', max: 30 },
]

/** Talla que corresponde solo por dimensiones. `null` si no hay medidas. */
export function tallaPorMedidas(largo, ancho, alto) {
  const lado = Math.max(
    Number(largo) || 0,
    Number(ancho) || 0,
    Number(alto) || 0,
  )
  if (!lado) return null
  const corte = LIMITES_CM.find(c => lado <= c.max)
  return corte ? corte.talla : 'XL'
}

/** Talla que corresponde solo por peso. `null` si no hay peso. */
export function tallaPorPeso(pesoKg) {
  const kg = Number(pesoKg) || 0
  if (!kg) return null
  const corte = LIMITES_KG.find(c => kg <= c.max)
  return corte ? corte.talla : 'XL'
}

/**
 * Talla definitiva: la mayor entre volumen y peso.
 * Devuelve '' cuando no hay ni medidas ni peso, para poder usarla
 * directamente como valor de un <select> o de un estado controlado.
 */
export function sugerirTalla({ largo, ancho, alto, peso }) {
  const porMedidas = tallaPorMedidas(largo, ancho, alto)
  const porPeso    = tallaPorPeso(peso)

  if (!porMedidas && !porPeso) return ''
  if (!porMedidas) return porPeso
  if (!porPeso)    return porMedidas

  return ORDEN_TALLAS.indexOf(porPeso) > ORDEN_TALLAS.indexOf(porMedidas)
    ? porPeso
    : porMedidas
}

/**
 * Firma vieja, solo por medidas. Existe para que migrar Recepcion.jsx sea
 * cambiar un import y nada más. No la uses en código nuevo.
 */
export function sugerirTamanio(l, a, h) {
  return tallaPorMedidas(l, a, h) ?? ''
}

/**
 * XL no tiene precio cerrado: el documento de procesos lo dejó como
 * "a cotizar, mínimo 60 USD" porque un electrodoméstico y un bulto de ropa
 * caben en la misma letra y no cuestan lo mismo trasladarlos.
 */
export const TALLA_A_COTIZAR = 'XL'

/* ── Descuento por volumen ────────────────────────────────────────────────────
 * Desde 10 cajas en un mismo envío se aplica 10%: es un solo viaje y una sola
 * entrega, así que el costo marginal por caja cae.
 */
export const MIN_CAJAS_DESCUENTO = 10
export const PCT_DESCUENTO = 0.10

/**
 * Las XL quedan fuera de la BASE del descuento: su precio no es un precio, es
 * un piso a cotizar. Descontarle 10% dejaría el envío en $54, por debajo del
 * mínimo que fijó el negocio. Las XL sí cuentan para llegar a las 10 cajas;
 * simplemente no se descuentan.
 * Si algún día quieres incluirlas, cambia esto a true y nada más.
 */
export const DESCUENTO_INCLUYE_XL = false
