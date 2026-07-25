import { useState } from 'react'
import { DollarSign, Save, Loader2, Package, Truck } from 'lucide-react'
import { useTarifas, useActualizarTarifa } from '../../hooks/useTarifas'
import { useConfig, useGuardarConfig } from '../../hooks/useConfig'
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

      </div>
    </AdminLayout>
  )
}
