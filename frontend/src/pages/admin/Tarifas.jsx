import { useState } from 'react'
import { DollarSign, Save, Loader2 } from 'lucide-react'
import { useTarifas, useActualizarTarifa } from '../../hooks/useTarifas'
import AdminLayout from '../../components/layout/AdminLayout'
import Toast from '../../components/ui/Toast'

const TAMANIO_INFO = {
  S:  { label: 'S — Pequeño',      color: '#0EA5E9' },
  M:  { label: 'M — Mediano',      color: '#F59E0B' },
  L:  { label: 'L — Grande',       color: '#8B5CF6' },
  XL: { label: 'XL — Extra grande', color: '#EF4444' },
}

export default function Tarifas() {
  const { data: tarifas = [], isLoading } = useTarifas()
  const { mutateAsync: actualizar, isPending } = useActualizarTarifa()
  const [precios, setPrecios]   = useState({})
  const [toast,   setToast]     = useState({ show: false, msg: '', type: 'success' })
  const [guardando, setGuardando] = useState(null)

  const getPrecio = (t) => precios[t.id] ?? t.precio_usd?.toString() ?? ''
  const setP = (id, val) => setPrecios(p => ({ ...p, [id]: val }))

  const handleGuardar = async (t) => {
    setGuardando(t.id)
    try {
      await actualizar({
        id:         t.id,
        precio_usd: parseFloat(precios[t.id] ?? t.precio_usd),
        descripcion: t.descripcion,
        tamanioLabel: t.tamanio,
      })
      setToast({ show: true, msg: `Tarifa ${t.tamanio} actualizada`, type: 'success' })
    } catch {
      setToast({ show: true, msg: 'Error al guardar', type: 'error' })
    } finally {
      setGuardando(null)
    }
  }

  return (
    <AdminLayout title="Tabla de tarifas">
      <Toast message={toast.msg} show={toast.show} type={toast.type}
        onHide={() => setToast(t => ({ ...t, show: false }))} />

      <div className="px-5 py-4">
        <p className="text-slate-500 text-sm mb-5">
          Los cambios aplican a los paquetes nuevos. El precio anterior queda registrado en auditoría.
        </p>

        {isLoading
          ? <div className="flex justify-center py-10">
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          : <div className="space-y-3">
              {tarifas.map(t => {
                const info = TAMANIO_INFO[t.tamanio] ?? { label: t.tamanio, color: '#1565C0' }
                return (
                  <div key={t.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: info.color + '20' }}>
                        <DollarSign size={18} style={{ color: info.color }} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-800">{info.label}</p>
                        <p className="text-xs text-slate-400">{t.descripcion}</p>
                      </div>
                    </div>
                    <div className="px-5 pb-4 flex gap-3">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                        <input type="number" value={getPrecio(t)}
                          onChange={e => setP(t.id, e.target.value)}
                          className="w-full pl-8 pr-12 py-3 rounded-xl border border-slate-200
                            text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">USD</span>
                      </div>
                      <button onClick={() => handleGuardar(t)}
                        disabled={guardando === t.id}
                        className="px-4 py-3 rounded-xl text-white font-semibold text-sm
                          flex items-center gap-2 disabled:opacity-50"
                        style={{ background: '#1565C0' }}>
                        {guardando === t.id
                          ? <Loader2 size={16} className="animate-spin" />
                          : <Save size={16} />}
                      </button>
                    </div>
                    <div className="px-5 pb-3">
                      <p className="text-xs text-slate-400">
                        Última actualización: {new Date(t.fecha_actualizacion).toLocaleDateString('es-VE')}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
        }
      </div>
    </AdminLayout>
  )
}
