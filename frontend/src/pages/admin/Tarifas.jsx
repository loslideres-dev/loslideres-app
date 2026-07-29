import { useState } from 'react'
import {
  Save, Loader2, Package, Truck, CreditCard, Coins,
  Plus, Trash2, Check, X,
} from 'lucide-react'
import { useTarifas, useActualizarTarifa } from '../../hooks/useTarifas'
import { useConfig, useGuardarConfig } from '../../hooks/useConfig'
import {
  useMonedas, useActualizarMoneda,
  useMetodosPago, useGuardarMetodoPago, useEliminarMetodoPago,
  useTasasVigentes, useGuardarTasa,
} from '../../hooks/usePagos'
import AdminLayout from '../../components/layout/AdminLayout'
import Toast from '../../components/ui/Toast'

const TAMANIO_INFO = {
  S:  { label: 'Pequeño',      desc: 'Sobre, celular, caja de zapatos', color: '#0EA5E9' },
  M:  { label: 'Mediano',      desc: 'Caja hasta ~50 cm por lado',      color: '#F59E0B' },
  L:  { label: 'Grande',       desc: 'Caja hasta ~80 cm por lado',      color: '#8B5CF6' },
  XL: { label: 'Extra grande', desc: 'Electrodomésticos, bultos',       color: '#EF4444' },
}

function formatCOP(n) {
  return new Intl.NumberFormat('es-CO').format(Number(n) || 0)
}

export default function Tarifas() {
  const { data: tarifas = [], isLoading }      = useTarifas()
  const { mutateAsync: actualizarTarifa }      = useActualizarTarifa()
  const { data: tarifaBodeguero }              = useConfig('tarifa_bodeguero_por_paquete')
  const { mutateAsync: guardarConfig }         = useGuardarConfig()

  const [precios,   setPrecios]   = useState({})   // ediciones de tarifas por tamaño
  const [montoBod,  setMontoBod]  = useState(null) // edición del monto bodeguero
  const [savingTar, setSavingTar] = useState(false)
  const [savingBod, setSavingBod] = useState(false)
  const [toast,     setToast]     = useState({ show: false, msg: '', type: 'success' })

  const getPrecio = (t) => precios[t.id] ?? t.precio_usd?.toString() ?? ''
  const setP = (id, val) => setPrecios(p => ({ ...p, [id]: val }))

  const montoBodValor = montoBod ?? tarifaBodeguero ?? '10000'

  // Guardar todas las tarifas de tamaño juntas
  const handleGuardarTarifas = async () => {
    setSavingTar(true)
    try {
      // Ordenar por tamaño S,M,L,XL para guardar coherente
      for (const t of tarifas) {
        const nuevoPrecio = parseFloat(precios[t.id] ?? t.precio_usd)
        if (nuevoPrecio !== Number(t.precio_usd)) {
          await actualizarTarifa({
            id:          t.id,
            precio_usd:  nuevoPrecio,
            descripcion: t.descripcion,
            tamanioLabel: t.tamanio,
          })
        }
      }
      setToast({ show: true, msg: 'Tarifas actualizadas ✓', type: 'success' })
      setPrecios({})
    } catch {
      setToast({ show: true, msg: 'Error al guardar las tarifas', type: 'error' })
    } finally {
      setSavingTar(false)
    }
  }

  const handleGuardarBodeguero = async () => {
    setSavingBod(true)
    try {
      await guardarConfig({
        clave: 'tarifa_bodeguero_por_paquete',
        valor: parseInt(montoBodValor, 10) || 0,
      })
      setToast({ show: true, msg: 'Pago al bodeguero actualizado ✓', type: 'success' })
      setMontoBod(null)
    } catch {
      setToast({ show: true, msg: 'Error al guardar', type: 'error' })
    } finally {
      setSavingBod(false)
    }
  }

  // Ordenar tarifas por tamaño
  const orden = { S: 0, M: 1, L: 2, XL: 3 }
  const tarifasOrdenadas = [...tarifas].sort(
    (a, b) => (orden[a.tamanio] ?? 9) - (orden[b.tamanio] ?? 9)
  )

  const hayCambiosTarifas = Object.keys(precios).length > 0
  const hayCambiosBod = montoBod !== null && montoBod !== (tarifaBodeguero ?? '10000')

  return (
    <AdminLayout title="Tarifas">
      <Toast message={toast.msg} show={toast.show} type={toast.type}
        onHide={() => setToast(t => ({ ...t, show: false }))} />

      <div className="px-5 py-4 space-y-5">

        {/* ══ TARIFAS POR TAMAÑO ══ */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: '#EEF2F8' }}>
              <Package size={16} style={{ color: '#1565C0' }} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Precio por tamaño</h2>
              <p className="text-xs text-slate-400">Lo que paga el cliente por envío (USD)</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent
                rounded-full animate-spin" />
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm divide-y divide-slate-50">
              {tarifasOrdenadas.map(t => {
                const info = TAMANIO_INFO[t.tamanio] ?? { label: t.tamanio, desc: '', color: '#1565C0' }
                return (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                    {/* Badge tamaño */}
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center
                      flex-shrink-0 font-black text-sm"
                      style={{ background: info.color + '18', color: info.color }}>
                      {t.tamanio}
                    </div>
                    {/* Nombre */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{info.label}</p>
                      <p className="text-xs text-slate-400 truncate">{info.desc}</p>
                    </div>
                    {/* Input precio */}
                    <div className="relative w-24 flex-shrink-0">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2
                        text-slate-400 text-sm font-bold">$</span>
                      <input type="number" inputMode="decimal" value={getPrecio(t)}
                        onChange={e => setP(t.id, e.target.value)}
                        className="w-full pl-6 pr-2 py-2.5 rounded-xl border border-slate-200
                          text-sm font-bold text-right outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <button onClick={handleGuardarTarifas}
            disabled={!hayCambiosTarifas || savingTar}
            className="w-full mt-3 py-3.5 rounded-xl text-white font-semibold text-sm
              flex items-center justify-center gap-2 disabled:opacity-40
              active:scale-95 transition"
            style={{ background: '#1565C0' }}>
            {savingTar
              ? <Loader2 size={18} className="animate-spin" />
              : <Save size={18} />}
            {hayCambiosTarifas ? 'Guardar tarifas' : 'Sin cambios'}
          </button>
        </div>

        {/* ══ PAGO AL BODEGUERO ══ */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: '#FEF3C7' }}>
              <Truck size={16} style={{ color: '#B45309' }} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Pago al bodeguero</h2>
              <p className="text-xs text-slate-400">Comisión por cada paquete recibido (COP)</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="text-xs text-slate-400">Monto por paquete recibido</label>
            <div className="flex gap-2 mt-1.5">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2
                  text-slate-400 text-sm font-bold">$</span>
                <input type="number" inputMode="numeric"
                  value={montoBodValor}
                  onChange={e => setMontoBod(e.target.value)}
                  className="w-full pl-8 pr-14 py-3 rounded-xl border border-slate-200
                    text-lg font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2
                  text-slate-400 text-xs">COP</span>
              </div>
              <button onClick={handleGuardarBodeguero}
                disabled={!hayCambiosBod || savingBod}
                className="px-5 rounded-xl text-white font-semibold text-sm
                  flex items-center gap-2 disabled:opacity-40 active:scale-95 transition"
                style={{ background: '#1565C0' }}>
                {savingBod
                  ? <Loader2 size={16} className="animate-spin" />
                  : <Save size={16} />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Equivale a <span className="font-semibold text-slate-600">
                ${formatCOP(montoBodValor)} COP
              </span> por cada paquete que registra el bodeguero. Se usa en su reporte.
            </p>
          </div>
        </div>

        {/* ══ MÉTODOS DE PAGO ══ */}
        <SeccionMetodosPago onToast={(msg, type) => setToast({ show: true, msg, type })} />

        {/* ══ MONEDAS Y TASAS ══ */}
        <SeccionMonedas onToast={(msg, type) => setToast({ show: true, msg, type })} />

      </div>
    </AdminLayout>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Métodos de pago
//
// Habilitar o deshabilitar un método es un toggle. Los métodos en uso no se
// pueden borrar desde aquí — se desactivan, para no romper el histórico de
// paquetes que ya los usaron.
// ═══════════════════════════════════════════════════════════════════════════
function SeccionMetodosPago({ onToast }) {
  const { data: metodos = [], isLoading } = useMetodosPago(false)
  const { data: monedas = [] }            = useMonedas()
  const { mutateAsync: guardar }          = useGuardarMetodoPago()
  const { mutateAsync: eliminar }         = useEliminarMetodoPago()

  const [nuevo,  setNuevo]  = useState(null)
  const [guardando, setGuardando] = useState(false)

  const toggleActivo = async (m) => {
    try {
      await guardar({ id: m.id, activo: !m.activo })
      onToast(`${m.nombre} ${!m.activo ? 'habilitado' : 'deshabilitado'}`, 'success')
    } catch {
      onToast('Error al cambiar el método', 'error')
    }
  }

  const handleCrear = async () => {
    if (!nuevo?.nombre?.trim() || !nuevo?.moneda_codigo) return
    setGuardando(true)
    try {
      await guardar({
        nombre:              nuevo.nombre.trim(),
        moneda_codigo:       nuevo.moneda_codigo,
        requiere_referencia: !!nuevo.requiere_referencia,
        activo:              true,
        orden:               metodos.length + 1,
      })
      onToast('Método de pago creado ✓', 'success')
      setNuevo(null)
    } catch (e) {
      onToast(
        e.message?.includes('duplicate') ? 'Ya existe un método con ese nombre'
                                         : 'Error al crear el método',
        'error',
      )
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async (m) => {
    try {
      await eliminar(m.id)
      onToast('Método eliminado', 'success')
    } catch {
      onToast('No se puede eliminar: hay paquetes que lo usan. Deshabilítalo.', 'error')
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: '#EDE9FE' }}>
          <CreditCard size={16} style={{ color: '#5B21B6' }} />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-bold text-slate-800">Métodos de pago</h2>
          <p className="text-xs text-slate-400">
            Formas en que el cliente puede pagar
          </p>
        </div>
        <button onClick={() => setNuevo({ nombre: '', moneda_codigo: 'USD' })}
          className="w-8 h-8 rounded-lg text-white flex items-center justify-center
            active:scale-95" style={{ background: '#1565C0' }}>
          <Plus size={16} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 size={20} className="animate-spin text-slate-300" />
        </div>
      ) : (
        <div className="space-y-2">
          {metodos.map(m => (
            <div key={m.id}
              className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-semibold
                    ${m.activo ? 'text-slate-800' : 'text-slate-400'}`}>
                    {m.nombre}
                  </p>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      background: m.activo ? '#EEF2F8' : '#F1F5F9',
                      color:      m.activo ? '#1565C0' : '#94A3B8',
                    }}>
                    {m.moneda_codigo}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {m.requiere_referencia ? 'Requiere referencia' : 'Sin referencia'}
                  {!m.monedas?.activo && ' · moneda inactiva'}
                </p>
              </div>

              {/* Toggle */}
              <button onClick={() => toggleActivo(m)}
                className="w-11 h-6 rounded-full transition relative flex-shrink-0"
                style={{ background: m.activo ? '#1B7A3E' : '#CBD5E1' }}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white
                  transition-all ${m.activo ? 'left-[22px]' : 'left-0.5'}`} />
              </button>

              <button onClick={() => handleEliminar(m)}
                className="text-slate-300 hover:text-red-500 transition flex-shrink-0">
                <Trash2 size={15} />
              </button>
            </div>
          ))}

          {/* Formulario de creación */}
          {nuevo && (
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3
              border-2" style={{ borderColor: '#1565C0' }}>
              <input type="text" autoFocus placeholder="Nombre del método"
                value={nuevo.nombre}
                onChange={e => setNuevo(n => ({ ...n, nombre: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200
                  text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              <select value={nuevo.moneda_codigo}
                onChange={e => setNuevo(n => ({ ...n, moneda_codigo: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200
                  text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500">
                {monedas.map(mo => (
                  <option key={mo.codigo} value={mo.codigo}>
                    {mo.codigo} — {mo.nombre}{!mo.activo ? ' (inactiva)' : ''}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" checked={!!nuevo.requiere_referencia}
                  onChange={e => setNuevo(n => ({ ...n, requiere_referencia: e.target.checked }))}
                  className="w-4 h-4 rounded" />
                Requiere número de referencia
              </label>
              <div className="flex gap-2">
                <button onClick={handleCrear}
                  disabled={!nuevo.nombre.trim() || guardando}
                  className="flex-1 py-2.5 rounded-xl text-white font-semibold text-xs
                    flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95"
                  style={{ background: '#1565C0' }}>
                  {guardando
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Check size={14} />}
                  Crear
                </button>
                <button onClick={() => setNuevo(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200
                    text-slate-500 text-xs font-semibold active:scale-95">
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Monedas y tasas de cambio
//
// La tasa se expresa como "cuántas unidades equivalen a 1 dólar".
// Se guarda con fecha, así que el histórico queda y los cobros viejos
// conservan la tasa con que se hicieron.
// ═══════════════════════════════════════════════════════════════════════════
function SeccionMonedas({ onToast }) {
  const { data: monedas = [], isLoading } = useMonedas()
  const { data: tasas = {} }              = useTasasVigentes()
  const { mutateAsync: actualizarMoneda } = useActualizarMoneda()
  const { mutateAsync: guardarTasa }      = useGuardarTasa()

  const [edit, setEdit] = useState({})
  const [guardando, setGuardando] = useState(null)

  const toggleMoneda = async (m) => {
    try {
      await actualizarMoneda({ codigo: m.codigo, activo: !m.activo })
      onToast(`${m.nombre} ${!m.activo ? 'habilitada' : 'deshabilitada'}`, 'success')
    } catch {
      onToast('Error al cambiar la moneda', 'error')
    }
  }

  const handleGuardarTasa = async (m) => {
    const valor = parseFloat(edit[m.codigo])
    if (!valor || valor <= 0) return
    setGuardando(m.codigo)
    try {
      await guardarTasa({ moneda_codigo: m.codigo, valor_por_usd: valor })
      onToast(`Tasa de ${m.codigo} actualizada ✓`, 'success')
      setEdit(e => ({ ...e, [m.codigo]: undefined }))
    } catch {
      onToast('Error al guardar la tasa', 'error')
    } finally {
      setGuardando(null)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: '#E6F4EC' }}>
          <Coins size={16} style={{ color: '#1B7A3E' }} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-800">Monedas y tasas</h2>
          <p className="text-xs text-slate-400">
            Cuántas unidades equivalen a 1 dólar
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 size={20} className="animate-spin text-slate-300" />
        </div>
      ) : (
        <div className="space-y-2">
          {monedas.map(m => {
            const tasaActual = tasas[m.codigo]
            const valorEdit  = edit[m.codigo]
            const hayCambio  = valorEdit !== undefined && valorEdit !== ''

            return (
              <div key={m.codigo} className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center
                    text-sm font-black flex-shrink-0"
                    style={{
                      background: m.activo ? '#EEF2F8' : '#F1F5F9',
                      color:      m.activo ? '#1565C0' : '#94A3B8',
                    }}>
                    {m.simbolo}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold
                        ${m.activo ? 'text-slate-800' : 'text-slate-400'}`}>
                        {m.codigo}
                      </p>
                      {m.es_base && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: '#E6F4EC', color: '#1B7A3E' }}>
                          base
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{m.nombre}</p>
                  </div>

                  {!m.es_base && (
                    <button onClick={() => toggleMoneda(m)}
                      className="w-11 h-6 rounded-full transition relative flex-shrink-0"
                      style={{ background: m.activo ? '#1B7A3E' : '#CBD5E1' }}>
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white
                        transition-all ${m.activo ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  )}
                </div>

                {m.es_base ? (
                  <p className="text-xs text-slate-400 pl-12">
                    Moneda de cuenta del negocio. Los precios se fijan aquí.
                  </p>
                ) : (
                  <div className="pl-12">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input type="number" inputMode="decimal"
                          placeholder={tasaActual?.valor_por_usd?.toString() ?? 'Sin tasa'}
                          value={valorEdit ?? ''}
                          onChange={e => setEdit(x => ({ ...x, [m.codigo]: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200
                            text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2
                          text-slate-400 text-[10px]">
                          {m.codigo} = 1 USD
                        </span>
                      </div>
                      <button onClick={() => handleGuardarTasa(m)}
                        disabled={!hayCambio || guardando === m.codigo}
                        className="px-4 rounded-xl text-white font-semibold text-sm
                          flex items-center disabled:opacity-40 active:scale-95"
                        style={{ background: '#1565C0' }}>
                        {guardando === m.codigo
                          ? <Loader2 size={15} className="animate-spin" />
                          : <Save size={15} />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">
                      {tasaActual?.fecha
                        ? `Tasa actual: ${Number(tasaActual.valor_por_usd).toLocaleString('es-CO')} · registrada el ${new Date(tasaActual.fecha + 'T12:00:00').toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })}`
                        : 'Sin tasa registrada — hay que cargarla antes de cobrar en esta moneda'}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
