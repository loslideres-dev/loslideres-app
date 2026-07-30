import { useState, useMemo, useRef } from 'react'
import {
  Plus, Minus, Trash2, Copy, Check, Info, Package, RotateCcw, Percent,
  MessageCircle, Send,
} from 'lucide-react'
import { useTarifas } from '../../hooks/useTarifas'
import { TAMANIOS, BODEGA_INFO } from '../../constants/roles'
import {
  sugerirTalla, ORDEN_TALLAS, TALLA_A_COTIZAR,
  LIMITES_CM, LIMITES_KG,
  MIN_CAJAS_DESCUENTO, PCT_DESCUENTO, DESCUENTO_INCLUYE_XL,
} from '../../lib/tallas'
import AdminLayout from '../../components/layout/AdminLayout'
import Toast from '../../components/ui/Toast'

// Se manda a la web comercial, no a la app: el prospecto todavía no tiene
// cuenta, y la landing es la que explica el servicio y enlaza al registro.
const URL_WEB = 'www.loslideresencomiendas.com'

const COLOR_TALLA = { S: '#0EA5E9', M: '#1565C0', L: '#8B5CF6', XL: '#B45309' }

// Precios de respaldo, por si la tabla `tarifas` no respondiera.
// Nunca deberían usarse: son los mismos valores semilla de constants/roles.js.
const PRECIO_FALLBACK = Object.fromEntries(
  TAMANIOS.map(t => [t.value, t.precio]),
)

/**
 * Quita todo lo que viva fuera del plano básico de Unicode (emojis, banderas,
 * pictogramas). Esos caracteres se codifican como pares subrogados y el trayecto
 * wa.me → WhatsApp Desktop los parte a la mitad: cada mitad llega como "�".
 * Se comprobó en producción: 📦 🎁 📍 👉 llegaron rotos, mientras → × · −
 * llegaron intactos por estar dentro del BMP.
 *
 * Las plantillas ya no llevan emojis, pero el nombre del cliente lo escribe una
 * persona: si teclea uno, lo limpiamos antes de enviar.
 */
const sinSubrogados = s => s.replace(/[\u{10000}-\u{10FFFF}]/gu, '')

let secuencia = 0
const nuevaLinea = () => ({
  id: `l${++secuencia}`,
  largo: '', ancho: '', alto: '', peso: '',
  cantidad: 1,
  tallaManual: null,   // null = la talla la decide la fórmula
})

// Sin decimales cuando el monto es redondo, que es lo normal en las tarifas.
const fmt = n => (Number.isInteger(n) ? String(n) : n.toFixed(2))

// Sin número: WhatsApp abre el selector de chat con el texto ya puesto.
const abrirWhatsApp = texto => {
  if (!texto) return
  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener')
}

const pieDelMensaje = () => ([
  '',
  `*Bodega en Maicao:* ${BODEGA_INFO.calle}, ${BODEGA_INFO.barrio}`,
  `Regístrate en ${URL_WEB} y recibe tu código de casillero.`,
])

export default function Calculadora() {
  const { data: tarifas = [] } = useTarifas()

  const [lineas, setLineas] = useState(() => [nuevaLinea()])
  const [para,   setPara]   = useState('')
  const [descuentoActivo, setDescuentoActivo] = useState(true)
  const [copiado, setCopiado] = useState(false)
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' })
  const timerRef = useRef(null)

  // Precio por talla: manda la tabla de Supabase, no la constante del código.
  const precios = useMemo(() => {
    const mapa = { ...PRECIO_FALLBACK }
    for (const t of tarifas) {
      if (t?.tamanio && t?.precio_usd != null) {
        mapa[t.tamanio] = Number(t.precio_usd)
      }
    }
    return mapa
  }, [tarifas])

  // ── Edición de líneas ───────────────────────────────────────────────────────
  const editar = (id, campo, valor) =>
    setLineas(ls => ls.map(l => (l.id === id ? { ...l, [campo]: valor } : l)))

  const cambiarCantidad = (id, delta) =>
    setLineas(ls => ls.map(l =>
      l.id === id ? { ...l, cantidad: Math.max(1, l.cantidad + delta) } : l,
    ))

  const fijarTalla = (id, talla) =>
    setLineas(ls => ls.map(l => (l.id === id ? { ...l, tallaManual: talla } : l)))

  const agregar  = () => setLineas(ls => [...ls, nuevaLinea()])
  const eliminar = id => setLineas(ls => ls.filter(l => l.id !== id))
  const limpiar  = () => {
    setLineas([nuevaLinea()])
    setPara('')
    setDescuentoActivo(true)
  }

  // ── Lista de precios estándar ───────────────────────────────────────────────
  // Para quien solo pregunta "¿cuánto cobran?" y todavía no tiene medidas.
  // Los precios salen de la tabla `tarifas` y los rangos de lib/tallas, así que
  // si cambias una tarifa en Ajustes, este mensaje cambia solo.
  const listaPrecios = useMemo(() => {
    const L = []

    L.push('*LOS LÍDERES ENCOMIENDAS*')
    L.push('_Precios de envío Maicao → Maracaibo_')
    L.push('')

    if (para.trim()) {
      L.push(`Hola ${para.trim()},`)
      L.push('')
    }

    ORDEN_TALLAS.forEach(t => {
      const precio = precios[t]
      if (precio == null) return

      const cm = LIMITES_CM.find(c => c.talla === t)
      const kg = LIMITES_KG.find(c => c.talla === t)
      const rango = cm && kg
        ? `hasta ${cm.max} cm o ${kg.max} kg`
        : 'más grande o más pesado, a cotizar'

      L.push(`*${t}* — ${t === TALLA_A_COTIZAR ? 'desde ' : ''}$${fmt(precio)} · ${rango}`)
    })

    L.push('')
    L.push('La talla se define por lo que resulte mayor entre medidas y peso.')
    L.push(`Desde ${MIN_CAJAS_DESCUENTO} cajas en un mismo envío: `
      + `*${Math.round(PCT_DESCUENTO * 100)}% de descuento*.`)
    L.push('')
    L.push('Incluye entrega a domicilio en Maracaibo.')
    L.push(...pieDelMensaje())

    return sinSubrogados(L.join('\n'))
  }, [precios, para])

  // ── Cálculo ─────────────────────────────────────────────────────────────────
  const calculadas = useMemo(() => lineas.map(l => {
    const auto  = sugerirTalla(l)
    const talla = l.tallaManual ?? auto
    const precio = talla ? precios[talla] ?? null : null
    const aCotizar = talla === TALLA_A_COTIZAR
    return {
      ...l,
      talla,
      auto,
      precio,
      aCotizar,
      subtotal: precio != null ? precio * l.cantidad : null,
      tieneDatos: Boolean(talla),
    }
  }), [lineas, precios])

  const validas = calculadas.filter(l => l.tieneDatos)

  // Las cajas se cuentan por bulto, no por línea: 4 cajas iguales son 4 cajas.
  const bultos  = validas.reduce((s, l) => s + l.cantidad, 0)
  const bruto   = validas.reduce((s, l) => s + (l.subtotal ?? 0), 0)
  const hayACotizar = validas.some(l => l.aCotizar)

  const califica = bultos >= MIN_CAJAS_DESCUENTO
  const aplicaDescuento = califica && descuentoActivo

  // Las XL cuentan para llegar a las 10 cajas pero no entran en la base.
  const baseDescuento = validas
    .filter(l => DESCUENTO_INCLUYE_XL || !l.aCotizar)
    .reduce((s, l) => s + (l.subtotal ?? 0), 0)

  const montoDescuento = aplicaDescuento
    ? Math.round(baseDescuento * PCT_DESCUENTO * 100) / 100
    : 0

  const total = bruto - montoDescuento
  const hayXLFueraDeBase = aplicaDescuento && !DESCUENTO_INCLUYE_XL && hayACotizar
  const faltanCajas = MIN_CAJAS_DESCUENTO - bultos

  // ── Mensaje de cotización ───────────────────────────────────────────────────
  // Compacto a propósito: se lee en un teléfono, dentro de un chat. La jerarquía
  // se arma con el negrita y la cursiva de WhatsApp, no con iconos.
  const mensaje = useMemo(() => {
    if (validas.length === 0) return ''
    const L = []

    L.push('*LOS LÍDERES ENCOMIENDAS*')
    L.push('_Cotización Maicao → Maracaibo_')
    L.push('')

    if (para.trim()) {
      L.push(`Hola ${para.trim()},`)
      L.push('')
    }

    validas.forEach((l, i) => {
      const medidas = [l.largo, l.ancho, l.alto].every(v => Number(v) > 0)
        ? `${Number(l.largo)}×${Number(l.ancho)}×${Number(l.alto)} cm`
        : null
      const peso = Number(l.peso) > 0 ? `${Number(l.peso)} kg` : null
      const detalle = [medidas, peso].filter(Boolean).join(' · ')

      L.push(`${i + 1}. *${l.talla}*${detalle ? ` · ${detalle}` : ''}`)
      L.push(l.aCotizar
        ? `   ${l.cantidad} × desde $${fmt(l.precio)} = *desde $${fmt(l.subtotal)}*`
        : `   ${l.cantidad} × $${fmt(l.precio)} = *$${fmt(l.subtotal)}*`)
    })

    L.push('')

    if (aplicaDescuento) {
      L.push(`Subtotal ${bultos} cajas: $${fmt(bruto)}`)
      L.push(`Descuento por volumen ${Math.round(PCT_DESCUENTO * 100)}%: −$${fmt(montoDescuento)}`)
    }

    L.push(hayACotizar
      ? `*TOTAL: desde $${fmt(total)} USD*`
      : `*TOTAL: $${fmt(total)} USD*`)

    if (aplicaDescuento) {
      L.push(`_$${(total / bultos).toFixed(2)} por caja_`)
    }

    L.push('')
    L.push('Incluye entrega a domicilio en Maracaibo. '
      + 'El precio se confirma al medir y pesar en bodega.')

    if (hayACotizar) {
      L.push(`_Las XL se cotizan según el caso; el monto es el mínimo${
        hayXLFueraDeBase ? ' y no entran en el descuento' : ''}._`)
    }

    L.push(...pieDelMensaje())

    return sinSubrogados(L.join('\n'))
  }, [validas, bruto, total, bultos, montoDescuento, aplicaDescuento,
      hayACotizar, hayXLFueraDeBase, para])

  // ── Copiar ──────────────────────────────────────────────────────────────────
  const copiar = async () => {
    if (!mensaje) return
    try {
      await navigator.clipboard.writeText(mensaje)
    } catch {
      // Safari viejo o contexto sin permisos: respaldo con textarea oculto.
      const ta = document.createElement('textarea')
      ta.value = mensaje
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
      } catch {
        setToast({ show: true, msg: 'No se pudo copiar', type: 'error' })
        document.body.removeChild(ta)
        return
      }
      document.body.removeChild(ta)
    }
    setCopiado(true)
    setToast({ show: true, msg: 'Mensaje copiado', type: 'success' })
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopiado(false), 2200)
  }

  return (
    <AdminLayout title="Calculadora">
      <Toast message={toast.msg} show={toast.show} type={toast.type}
        onHide={() => setToast(t => ({ ...t, show: false }))} />

      <div className="px-5 py-4">

        {/* ── Lista de precios estándar ── */}
        {/* Fondo verde y no blanco: en blanco se leía como tarjeta informativa.
            El verde es el mismo de WhatsApp y del botón de enviar de abajo, así
            que el color ya significa "esto manda un mensaje". */}
        <button onClick={() => abrirWhatsApp(listaPrecios)}
          className="w-full rounded-2xl px-4 py-3 mb-4
            flex items-center gap-3 active:scale-95 transition text-left"
          style={{ background: '#E6F4EC', border: '1px solid #A7D8BC' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#1B7A3E' }}>
            <MessageCircle size={19} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: '#14532D' }}>
              Enviar lista de precios
            </p>
            <p className="text-xs leading-snug" style={{ color: '#1B7A3E' }}>
              Tarifas por tamaño, para quien pregunta sin medidas
            </p>
          </div>
          <Send size={16} className="flex-shrink-0" style={{ color: '#1B7A3E' }} />
        </button>

        {/* ── Para quién (opcional) ── */}
        <input value={para} onChange={e => setPara(e.target.value)}
          placeholder="¿Para quién es? (opcional)"
          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white
            text-sm outline-none focus:ring-2 focus:ring-blue-500 mb-4" />

        {/* ── Líneas ── */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-400 tracking-wider">PAQUETES</p>
          <button onClick={limpiar}
            className="text-xs text-slate-400 flex items-center gap-1 active:scale-95">
            <RotateCcw size={12} /> Limpiar
          </button>
        </div>

        <div className="space-y-3 mb-3">
          {calculadas.map((l, i) => (
            <div key={l.id} className="bg-white rounded-2xl shadow-sm p-4">

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg flex items-center justify-center
                    text-[11px] font-bold text-slate-500 bg-slate-100 font-mono">
                    {i + 1}
                  </span>
                  {l.talla
                    ? <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: COLOR_TALLA[l.talla] + '18', color: COLOR_TALLA[l.talla] }}>
                        Talla {l.talla}
                      </span>
                    : <span className="text-[11px] text-slate-300">Sin datos</span>}
                </div>
                {lineas.length > 1 && (
                  <button onClick={() => eliminar(l.id)} className="p-1 active:scale-90">
                    <Trash2 size={15} className="text-slate-300" />
                  </button>
                )}
              </div>

              {/* Medidas y peso */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  { campo: 'largo', label: 'Largo cm' },
                  { campo: 'ancho', label: 'Ancho cm' },
                  { campo: 'alto',  label: 'Alto cm'  },
                  { campo: 'peso',  label: 'Peso kg'  },
                ].map(({ campo, label }) => (
                  <div key={campo}>
                    <p className="text-[10px] text-slate-400 mb-1 text-center">{label}</p>
                    <input type="number" inputMode="decimal" min="0"
                      value={l[campo]}
                      onChange={e => editar(l.id, campo, e.target.value)}
                      placeholder="—"
                      className="w-full px-1 py-2.5 rounded-xl border border-slate-200
                        text-sm font-mono text-center outline-none
                        focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
              </div>

              {/* Talla manual */}
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-[10px] text-slate-400 mr-1">Talla</span>
                {ORDEN_TALLAS.map(t => {
                  const activa = l.talla === t
                  return (
                    <button key={t} onClick={() => fijarTalla(l.id, t)}
                      className="flex-1 py-1.5 rounded-lg text-[11px] font-bold
                        active:scale-95 transition"
                      style={activa
                        ? { background: COLOR_TALLA[t], color: '#fff' }
                        : { background: '#F1F5F9', color: '#94A3B8' }}>
                      {t}
                    </button>
                  )
                })}
                {l.tallaManual && (
                  <button onClick={() => fijarTalla(l.id, null)}
                    className="text-[10px] text-blue-600 font-medium px-1 active:scale-95">
                    auto
                  </button>
                )}
              </div>

              {/* Cantidad y subtotal */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={() => cambiarCantidad(l.id, -1)}
                    disabled={l.cantidad <= 1}
                    className="w-8 h-8 rounded-lg bg-slate-100 flex items-center
                      justify-center active:scale-90 disabled:opacity-40">
                    <Minus size={14} className="text-slate-500" />
                  </button>
                  <span className="w-7 text-center text-sm font-mono font-bold text-slate-700">
                    {l.cantidad}
                  </span>
                  <button onClick={() => cambiarCantidad(l.id, 1)}
                    className="w-8 h-8 rounded-lg bg-slate-100 flex items-center
                      justify-center active:scale-90">
                    <Plus size={14} className="text-slate-500" />
                  </button>
                </div>

                <div className="text-right">
                  {l.subtotal != null ? (
                    <>
                      <p className="text-base font-mono font-bold text-slate-800">
                        {l.aCotizar && (
                          <span className="text-[11px] font-normal text-slate-400">desde </span>
                        )}
                        ${fmt(l.subtotal)}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {l.cantidad} × ${fmt(l.precio)}
                      </p>
                    </>
                  ) : (
                    <p className="text-[11px] text-slate-300">Pon medidas o peso</p>
                  )}
                </div>
              </div>

              {l.aCotizar && (
                <p className="text-[11px] mt-2.5 leading-snug" style={{ color: '#B45309' }}>
                  XL va a cotizar. ${fmt(l.precio)} es el mínimo, confírmalo antes de cerrar.
                </p>
              )}
            </div>
          ))}
        </div>

        <button onClick={agregar}
          className="w-full py-3.5 rounded-2xl border-2 border-dashed border-slate-200
            text-sm font-medium text-slate-400 flex items-center justify-center gap-2
            active:scale-95 transition mb-4">
          <Plus size={16} /> Agregar paquete
        </button>

        {/* ── Descuento por volumen ── */}
        {califica ? (
          <button onClick={() => setDescuentoActivo(v => !v)}
            className="w-full rounded-2xl px-4 py-3 flex items-center gap-3 mb-4
              active:scale-95 transition text-left"
            style={{
              background: descuentoActivo ? '#E6F4EC' : '#fff',
              border: `1px solid ${descuentoActivo ? '#A7D8BC' : '#E8EDF5'}`,
            }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: descuentoActivo ? '#1B7A3E20' : '#F1F5F9' }}>
              <Percent size={16} style={{ color: descuentoActivo ? '#1B7A3E' : '#94A3B8' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold"
                style={{ color: descuentoActivo ? '#14532D' : '#64748B' }}>
                Descuento por volumen ({Math.round(PCT_DESCUENTO * 100)}%)
              </p>
              <p className="text-[11px]"
                style={{ color: descuentoActivo ? '#1B7A3E' : '#94A3B8' }}>
                {bultos} cajas en un solo envío
              </p>
            </div>
            <div className="w-11 h-6 rounded-full transition relative flex-shrink-0"
              style={{ background: descuentoActivo ? '#1B7A3E' : '#CBD5E1' }}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white
                transition-all ${descuentoActivo ? 'left-[22px]' : 'left-0.5'}`} />
            </div>
          </button>
        ) : bultos > 0 && (
          <p className="text-[11px] text-center text-slate-400 mb-4">
            {faltanCajas === 1
              ? 'Falta 1 caja para el descuento por volumen.'
              : `Faltan ${faltanCajas} cajas para el descuento por volumen.`}
          </p>
        )}

        {/* ── Total ── */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: '#0D2B5E' }}>
          {aplicaDescuento && (
            <div className="space-y-1.5 mb-3 pb-3"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.14)' }}>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: '#8FB0DA' }}>Subtotal · {bultos} cajas</span>
                <span className="font-mono text-white">${fmt(bruto)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: '#4FC3F7' }}>
                  Descuento {Math.round(PCT_DESCUENTO * 100)}%
                </span>
                <span className="font-mono" style={{ color: '#4FC3F7' }}>
                  −${fmt(montoDescuento)}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-wider mb-1"
                style={{ color: '#4FC3F7' }}>
                TOTAL ESTIMADO
              </p>
              <p className="text-3xl font-mono font-bold text-white leading-none">
                {hayACotizar && (
                  <span className="text-sm font-normal" style={{ color: '#4FC3F7' }}>desde </span>
                )}
                ${fmt(total)}
              </p>
            </div>
            <p className="text-[11px] text-right flex-shrink-0" style={{ color: '#8FB0DA' }}>
              {bultos} {bultos === 1 ? 'caja' : 'cajas'}
              <br />
              {bultos > 0 ? `$${(total / bultos).toFixed(2)} c/u` : 'USD'}
            </p>
          </div>
        </div>

        {/* ── Recordatorio interno: no viaja en el mensaje al cliente ── */}
        <div className="rounded-xl px-4 py-3 flex gap-2.5 mb-4"
          style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <Info size={15} className="flex-shrink-0 mt-0.5" style={{ color: '#B45309' }} />
          <p className="text-xs leading-relaxed" style={{ color: '#92400E' }}>
            No incluye fletes ni cobros a destino dentro de Colombia. Si el paquete
            llega a la bodega con flete por cobrar, súmalo al tarifar.
          </p>
        </div>

        {/* ── Enviar cotización ── */}
        {mensaje ? (
          <div className="pb-2">
            <button onClick={() => abrirWhatsApp(mensaje)}
              className="w-full py-4 rounded-2xl text-white text-sm font-semibold
                flex items-center justify-center gap-2 active:scale-95 transition"
              style={{ background: '#1B7A3E' }}>
              <MessageCircle size={18} /> WhatsApp
            </button>
            <button onClick={copiar}
              className="w-full mt-2 py-2 text-xs text-slate-400 flex items-center
                justify-center gap-1.5 active:scale-95">
              {copiado
                ? <><Check size={13} style={{ color: '#1B7A3E' }} /> Copiado</>
                : <><Copy size={13} /> Copiar mensaje</>}
            </button>
          </div>
        ) : (
          <div className="text-center py-6">
            <Package size={28} className="text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">
              Escribe las medidas o el peso para armar la cotización.
            </p>
          </div>
        )}

      </div>
    </AdminLayout>
  )
}
