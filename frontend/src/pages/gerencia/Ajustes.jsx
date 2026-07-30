import { useState, useEffect } from 'react'
import {
  Save, Loader2, Package, Warehouse, CreditCard, Coins, Plus, Trash2,
  Check, X, PiggyBank, Receipt,
} from 'lucide-react'
import { useTarifas, useActualizarTarifa } from '../../hooks/useTarifas'
import { useConfig, useGuardarConfig } from '../../hooks/useConfig'
import {
  useMonedas, useActualizarMoneda, useMetodosPago, useGuardarMetodoPago,
  useEliminarMetodoPago, useTasasVigentes, useGuardarTasa,
} from '../../hooks/usePagos'
import { useCategoriasGasto, useGuardarCategoria } from '../../hooks/useContabilidad'
import GerenciaLayout from '../../components/layout/GerenciaLayout'

const MONO = 'IBM Plex Mono, ui-monospace, monospace'
const TAMANIOS = ['S', 'M', 'L', 'XL']

export default function Ajustes() {
  const [toast, setToast] = useState(null)
  const avisar = (msg, tipo = 'ok') => setToast({ msg, tipo })

  return (
    <GerenciaLayout
      titulo="Ajustes"
      descripcion="Tarifas, monedas, métodos de pago y parámetros del negocio"
    >
      {toast && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium"
          style={{
            background: toast.tipo === 'error' ? '#FEE2E2' : '#E6F4EC',
            color:      toast.tipo === 'error' ? '#991B1B' : '#166534',
          }}>
          {toast.msg}
        </div>
      )}

      <div className="grid grid-cols-2 gap-5 max-w-[1400px] items-start">
        <div className="space-y-5">
          <Tarifas avisar={avisar} />
          <PagoBodeguero avisar={avisar} />
          <FondoReserva avisar={avisar} />
        </div>
        <div className="space-y-5">
          <Monedas avisar={avisar} />
          <MetodosPago avisar={avisar} />
          <Categorias avisar={avisar} />
        </div>
      </div>
    </GerenciaLayout>
  )
}

// ── Tarifas por tamaño ──
function Tarifas({ avisar }) {
  const { data: tarifas = [], isLoading } = useTarifas()
  const { mutateAsync: guardar, isPending } = useActualizarTarifa()
  const [valores, setValores] = useState({})

  useEffect(() => {
    if (tarifas.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValores(Object.fromEntries(
        tarifas.map(t => [t.tamanio, String(t.precio ?? '')])
      ))
    }
  }, [tarifas])

  const hayCambios = tarifas.some(
    t => valores[t.tamanio] !== undefined &&
         parseFloat(valores[t.tamanio]) !== Number(t.precio)
  )

  const handleGuardar = async () => {
    try {
      for (const t of tarifas) {
        const nuevo = parseFloat(valores[t.tamanio])
        if (!isNaN(nuevo) && nuevo !== Number(t.precio)) {
          await guardar({ id: t.id, precio: nuevo })
        }
      }
      avisar('Tarifas actualizadas')
    } catch {
      avisar('No se pudieron guardar las tarifas', 'error')
    }
  }

  return (
    <Panel icono={Package} titulo="Tarifas al cliente"
      desc="Precio en dólares según el tamaño del paquete" color="#1565C0">
      {isLoading ? <Cargando /> : (
        <>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {TAMANIOS.map(tam => {
              const t = tarifas.find(x => x.tamanio === tam)
              if (!t) return null
              return (
                <div key={tam}>
                  <p className="text-[11px] font-bold text-slate-400 text-center mb-1.5">
                    {tam}
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2
                      text-slate-400 text-[13px]">$</span>
                    <input type="number" inputMode="decimal"
                      value={valores[tam] ?? ''}
                      onChange={e => setValores(v => ({ ...v, [tam]: e.target.value }))}
                      className="w-full pl-7 pr-2 py-2.5 rounded-xl border border-slate-200
                        text-[15px] font-bold text-center outline-none
                        focus:ring-2 focus:ring-blue-500"
                      style={{ fontFamily: MONO }} />
                  </div>
                </div>
              )
            })}
          </div>
          <BotonGuardar onClick={handleGuardar} disabled={!hayCambios || isPending}
            cargando={isPending} />
        </>
      )}
    </Panel>
  )
}

// ── Pago al bodeguero ──
function PagoBodeguero({ avisar }) {
  const { data: valor, isLoading } = useConfig('tarifa_bodeguero_por_paquete')
  const { mutateAsync: guardar, isPending } = useGuardarConfig()
  const [monto, setMonto] = useState('')

  useEffect(() => {
    if (valor != null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMonto(String(valor))
    }
  }, [valor])

  const cambio = monto !== '' && monto !== String(valor)

  return (
    <Panel icono={Warehouse} titulo="Pago al bodeguero"
      desc="Monto fijo en pesos por cada paquete que recibe" color="#B45309">
      {isLoading ? <Cargando /> : (
        <>
          <div className="relative mb-4">
            <span className="absolute left-4 top-1/2 -translate-y-1/2
              text-slate-400 text-sm">$</span>
            <input type="number" inputMode="numeric" value={monto}
              onChange={e => setMonto(e.target.value)}
              className="w-full pl-9 pr-16 py-3 rounded-xl border border-slate-200
                text-xl font-bold outline-none focus:ring-2 focus:ring-blue-500"
              style={{ fontFamily: MONO }} />
            <span className="absolute right-4 top-1/2 -translate-y-1/2
              text-slate-400 text-[11px]">COP</span>
          </div>
          <BotonGuardar
            onClick={async () => {
              try {
                await guardar({ clave: 'tarifa_bodeguero_por_paquete', valor: monto })
                avisar('Pago al bodeguero actualizado')
              } catch { avisar('No se pudo guardar', 'error') }
            }}
            disabled={!cambio || isPending} cargando={isPending} />
        </>
      )}
    </Panel>
  )
}

// ── Fondo de reserva ──
function FondoReserva({ avisar }) {
  const { data: valor, isLoading } = useConfig('fondo_reserva_pct')
  const { mutateAsync: guardar, isPending } = useGuardarConfig()
  const [pct, setPct] = useState('')

  useEffect(() => {
    if (valor != null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPct(String(valor))
    }
  }, [valor])

  const cambio = pct !== '' && pct !== String(valor)
  const activo = parseFloat(pct) > 0

  return (
    <Panel icono={PiggyBank} titulo="Fondo de reserva"
      desc="Porcentaje de la utilidad que se aparta antes de repartir"
      color="#5B21B6">
      {isLoading ? <Cargando /> : (
        <>
          <div className="relative mb-3">
            <input type="number" inputMode="decimal" min="0" max="100" value={pct}
              onChange={e => setPct(e.target.value)}
              className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200
                text-xl font-bold outline-none focus:ring-2 focus:ring-blue-500"
              style={{ fontFamily: MONO }} />
            <span className="absolute right-4 top-1/2 -translate-y-1/2
              text-slate-400 text-sm">%</span>
          </div>
          <p className="text-[12px] text-slate-400 leading-relaxed mb-4">
            {activo
              ? `Se aparta el ${pct}% de cada mes cerrado. Cuando el fondo llegue al monto que quieras, pon 0 para volver a repartir todo.`
              : 'Desactivado: se reparte el 100% de la utilidad entre los socios.'}
          </p>
          <BotonGuardar
            onClick={async () => {
              try {
                await guardar({ clave: 'fondo_reserva_pct', valor: pct })
                avisar('Fondo de reserva actualizado')
              } catch { avisar('No se pudo guardar', 'error') }
            }}
            disabled={!cambio || isPending} cargando={isPending} />
        </>
      )}
    </Panel>
  )
}

// ── Monedas y tasas ──
function Monedas({ avisar }) {
  const { data: monedas = [], isLoading } = useMonedas()
  const { data: tasas = {} } = useTasasVigentes()
  const { mutateAsync: actualizar } = useActualizarMoneda()
  const { mutateAsync: guardarTasa } = useGuardarTasa()
  const [edit, setEdit] = useState({})
  const [guardando, setGuardando] = useState(null)

  return (
    <Panel icono={Coins} titulo="Monedas y tasas"
      desc="Cuántas unidades equivalen a un dólar" color="#1B7A3E">
      {isLoading ? <Cargando /> : (
        <div className="space-y-3">
          {monedas.map(m => {
            const tasa = tasas[m.codigo]
            const val = edit[m.codigo]
            return (
              <div key={m.codigo} className="rounded-xl p-4"
                style={{ background: '#FAFBFD', border: '1px solid #F1F5F9' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center
                    text-[13px] font-black flex-shrink-0"
                    style={{
                      background: m.activo ? '#EEF2F8' : '#F1F5F9',
                      color:      m.activo ? '#1565C0' : '#94A3B8',
                    }}>
                    {m.simbolo}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold"
                        style={{ color: m.activo ? '#334155' : '#94A3B8' }}>
                        {m.codigo}
                      </span>
                      {m.es_base && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: '#E6F4EC', color: '#1B7A3E' }}>BASE</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">{m.nombre}</p>
                  </div>
                  {!m.es_base && (
                    <Toggle activo={m.activo} onClick={async () => {
                      try {
                        await actualizar({ codigo: m.codigo, activo: !m.activo })
                        avisar(`${m.nombre} ${!m.activo ? 'habilitada' : 'deshabilitada'}`)
                      } catch { avisar('No se pudo cambiar', 'error') }
                    }} />
                  )}
                </div>

                {!m.es_base && (
                  <div className="flex gap-2">
                    <input type="number" inputMode="decimal"
                      placeholder={tasa?.valor_por_usd?.toString() ?? 'Sin tasa'}
                      value={val ?? ''}
                      onChange={e => setEdit(x => ({ ...x, [m.codigo]: e.target.value }))}
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-200
                        text-[13px] font-bold outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ fontFamily: MONO }} />
                    <button
                      onClick={async () => {
                        const v = parseFloat(val)
                        if (!v || v <= 0) return
                        setGuardando(m.codigo)
                        try {
                          await guardarTasa({ moneda_codigo: m.codigo, valor_por_usd: v })
                          avisar(`Tasa de ${m.codigo} actualizada`)
                          setEdit(x => ({ ...x, [m.codigo]: undefined }))
                        } catch { avisar('No se pudo guardar la tasa', 'error') }
                        finally { setGuardando(null) }
                      }}
                      disabled={!val || guardando === m.codigo}
                      className="px-3 rounded-lg text-white flex items-center
                        disabled:opacity-30" style={{ background: '#1565C0' }}>
                      {guardando === m.codigo
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Save size={14} />}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Panel>
  )
}

// ── Métodos de pago ──
function MetodosPago({ avisar }) {
  const { data: metodos = [], isLoading } = useMetodosPago(false)
  const { data: monedas = [] } = useMonedas()
  const { mutateAsync: guardar } = useGuardarMetodoPago()
  const { mutateAsync: eliminar } = useEliminarMetodoPago()
  const [nuevo, setNuevo] = useState(null)
  const [creando, setCreando] = useState(false)

  return (
    <Panel icono={CreditCard} titulo="Métodos de pago"
      desc="Formas en que el cliente puede pagar" color="#5B21B6"
      accion={
        <button onClick={() => setNuevo({ nombre: '', moneda_codigo: 'USD' })}
          className="w-7 h-7 rounded-lg text-white flex items-center justify-center
            active:scale-95" style={{ background: '#1565C0' }}>
          <Plus size={14} />
        </button>
      }>
      {isLoading ? <Cargando /> : (
        <div className="space-y-2">
          {metodos.map(m => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: '#FAFBFD', border: '1px solid #F1F5F9' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold"
                    style={{ color: m.activo ? '#334155' : '#94A3B8' }}>
                    {m.nombre}
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                    style={{
                      background: m.activo ? '#EEF2F8' : '#F1F5F9',
                      color:      m.activo ? '#1565C0' : '#94A3B8',
                    }}>
                    {m.moneda_codigo}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {m.requiere_referencia ? 'Requiere referencia' : 'Sin referencia'}
                </p>
              </div>
              <Toggle activo={m.activo} onClick={async () => {
                try {
                  await guardar({ id: m.id, activo: !m.activo })
                  avisar(`${m.nombre} ${!m.activo ? 'habilitado' : 'deshabilitado'}`)
                } catch { avisar('No se pudo cambiar', 'error') }
              }} />
              <button onClick={async () => {
                try {
                  await eliminar(m.id)
                  avisar('Método eliminado')
                } catch {
                  avisar('Hay paquetes que lo usan. Deshabilítalo en vez de borrarlo.', 'error')
                }
              }} className="text-slate-300 hover:text-red-500 transition">
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {nuevo && (
            <div className="rounded-xl p-4 space-y-3"
              style={{ border: '2px solid #1565C0' }}>
              <input type="text" autoFocus placeholder="Nombre del método"
                value={nuevo.nombre}
                onChange={e => setNuevo(n => ({ ...n, nombre: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200
                  text-[13px] outline-none focus:ring-2 focus:ring-blue-500" />
              <select value={nuevo.moneda_codigo}
                onChange={e => setNuevo(n => ({ ...n, moneda_codigo: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200
                  text-[13px] bg-white outline-none focus:ring-2 focus:ring-blue-500">
                {monedas.map(mo => (
                  <option key={mo.codigo} value={mo.codigo}>
                    {mo.codigo} — {mo.nombre}{!mo.activo ? ' (inactiva)' : ''}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-[12px] text-slate-600">
                <input type="checkbox" checked={!!nuevo.requiere_referencia}
                  onChange={e => setNuevo(n => ({ ...n, requiere_referencia: e.target.checked }))}
                  className="w-4 h-4 rounded" />
                Requiere número de referencia
              </label>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (!nuevo.nombre.trim()) return
                    setCreando(true)
                    try {
                      await guardar({
                        nombre: nuevo.nombre.trim(),
                        moneda_codigo: nuevo.moneda_codigo,
                        requiere_referencia: !!nuevo.requiere_referencia,
                        activo: true,
                        orden: metodos.length + 1,
                      })
                      avisar('Método creado')
                      setNuevo(null)
                    } catch (e) {
                      avisar(e.message?.includes('duplicate')
                        ? 'Ya existe un método con ese nombre'
                        : 'No se pudo crear', 'error')
                    } finally { setCreando(false) }
                  }}
                  disabled={!nuevo.nombre.trim() || creando}
                  className="flex-1 py-2 rounded-lg text-white text-[12px] font-semibold
                    flex items-center justify-center gap-1.5 disabled:opacity-40"
                  style={{ background: '#1565C0' }}>
                  {creando ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  Crear
                </button>
                <button onClick={() => setNuevo(null)}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-slate-500">
                  <X size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}

// ── Categorías de gasto ──
function Categorias({ avisar }) {
  const { data: cats = [], isLoading } = useCategoriasGasto(false)
  const { mutateAsync: guardar } = useGuardarCategoria()
  const [nueva, setNueva] = useState('')
  const [creando, setCreando] = useState(false)

  return (
    <Panel icono={Receipt} titulo="Categorías de gasto"
      desc="Cómo se clasifican los egresos del negocio" color="#DC2626">
      {isLoading ? <Cargando /> : (
        <div className="space-y-2">
          {cats.map(c => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
              style={{ background: '#FAFBFD', border: '1px solid #F1F5F9' }}>
              <div className="flex-1 min-w-0">
                <span className="text-[13px] font-medium"
                  style={{ color: c.activo ? '#334155' : '#94A3B8' }}>
                  {c.nombre}
                </span>
                <span className="text-[10px] text-slate-400 ml-2">{c.tipo}</span>
              </div>
              <Toggle activo={c.activo} onClick={async () => {
                try {
                  await guardar({ id: c.id, activo: !c.activo })
                  avisar(`${c.nombre} ${!c.activo ? 'habilitada' : 'deshabilitada'}`)
                } catch { avisar('No se pudo cambiar', 'error') }
              }} />
            </div>
          ))}

          <div className="flex gap-2 pt-1">
            <input type="text" value={nueva} onChange={e => setNueva(e.target.value)}
              placeholder="Nueva categoría"
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200
                text-[13px] outline-none focus:ring-2 focus:ring-blue-500" />
            <button
              onClick={async () => {
                if (!nueva.trim()) return
                setCreando(true)
                try {
                  await guardar({
                    nombre: nueva.trim(), tipo: 'operativo',
                    activo: true, orden: cats.length + 1,
                  })
                  avisar('Categoría creada')
                  setNueva('')
                } catch { avisar('No se pudo crear', 'error') }
                finally { setCreando(false) }
              }}
              disabled={!nueva.trim() || creando}
              className="px-3 rounded-lg text-white flex items-center disabled:opacity-30"
              style={{ background: '#1565C0' }}>
              {creando ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            </button>
          </div>
        </div>
      )}
    </Panel>
  )
}

// ── Auxiliares ──
function Panel({ icono: Icono, titulo, desc, color, accion, children }) {
  return (
    <section className="bg-white rounded-2xl p-6" style={{ border: '1px solid #E8EDF5' }}>
      <div className="flex items-start gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: color + '18' }}>
          <Icono size={17} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-slate-800">{titulo}</h2>
          <p className="text-[12px] text-slate-400 mt-0.5">{desc}</p>
        </div>
        {accion}
      </div>
      {children}
    </section>
  )
}

function Toggle({ activo, onClick }) {
  return (
    <button onClick={onClick}
      className="w-10 h-5 rounded-full transition relative flex-shrink-0"
      style={{ background: activo ? '#1B7A3E' : '#CBD5E1' }}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all
        ${activo ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

function BotonGuardar({ onClick, disabled, cargando }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-full py-2.5 rounded-xl text-white text-[13px] font-semibold
        flex items-center justify-center gap-2 disabled:opacity-30 transition"
      style={{ background: '#1565C0' }}>
      {cargando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
      Guardar
    </button>
  )
}

function Cargando() {
  return (
    <div className="py-6 flex justify-center">
      <Loader2 size={18} className="animate-spin text-slate-300" />
    </div>
  )
}
