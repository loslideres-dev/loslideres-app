import { useState } from 'react'
import {
  Plus, Trash2, Loader2, Check, Receipt, Info, Lock,
} from 'lucide-react'
import {
  useGastos, useCategoriasGasto, useGuardarGasto, useEliminarGasto,
} from '../../hooks/useContabilidad'
import { useMonedas } from '../../hooks/usePagos'
import GerenciaLayout from '../../components/layout/GerenciaLayout'
import Toast from '../../components/ui/Toast'

const MONO = 'IBM Plex Mono, ui-monospace, monospace'
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio',
               'Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const fmt = (n, moneda = 'USD') => {
  const num = Number(n) || 0
  const locale = moneda === 'COP' ? 'es-CO' : 'en-US'
  const dec = moneda === 'COP' ? 0 : 2
  return `$${num.toLocaleString(locale, {
    minimumFractionDigits: dec, maximumFractionDigits: dec,
  })}`
}

const hoy = new Date()

export default function Gastos() {
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [mes,  setMes]  = useState(hoy.getMonth() + 1)
  const [form, setForm] = useState(null)
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' })

  const { data: gastos = [], isLoading } = useGastos({ anio, mes })
  const { data: categorias = [] }        = useCategoriasGasto()
  const { data: monedas = [] }           = useMonedas()
  const { mutateAsync: guardar, isPending: guardando } = useGuardarGasto()
  const { mutateAsync: eliminar }                      = useEliminarGasto()

  const monedasActivas = monedas.filter(m => m.activo)

  const totalDistribuible = gastos
    .filter(g => g.afecta_distribucion)
    .reduce((s, g) => s + (Number(g.monto_usd ?? g.monto) || 0), 0)
  const totalInformativo = gastos
    .filter(g => !g.afecta_distribucion)
    .reduce((s, g) => s + (Number(g.monto_usd ?? g.monto) || 0), 0)

  const hayCerrados = gastos.some(g => g.cierre_id)

  const abrirNuevo = () => setForm({
    fecha: new Date().toISOString().slice(0, 10),
    categoria_id: categorias[0]?.id ?? '',
    descripcion: '',
    monto: '',
    moneda: 'USD',
    afecta_distribucion: true,
    notas: '',
  })

  const handleGuardar = async () => {
    if (!form.descripcion.trim() || !form.monto || !form.categoria_id) return
    try {
      await guardar({
        id: form.id,
        fecha: form.fecha,
        categoria_id: form.categoria_id,
        descripcion: form.descripcion.trim(),
        monto: parseFloat(form.monto),
        moneda: form.moneda,
        afecta_distribucion: form.afecta_distribucion,
        notas: form.notas?.trim() || null,
      })
      setToast({ show: true, msg: form.id ? 'Gasto actualizado' : 'Gasto registrado', type: 'success' })
      setForm(null)
    } catch (e) {
      setToast({ show: true, msg: e.message ?? 'Error al guardar', type: 'error' })
    }
  }

  const handleEliminar = async (g) => {
    if (g.cierre_id) {
      setToast({
        show: true,
        msg: 'Este gasto pertenece a un mes cerrado. Reabre el mes para modificarlo.',
        type: 'error',
      })
      return
    }
    try {
      await eliminar(g.id)
      setToast({ show: true, msg: 'Gasto eliminado', type: 'success' })
    } catch {
      setToast({ show: true, msg: 'Error al eliminar', type: 'error' })
    }
  }

  return (
    <GerenciaLayout
      titulo="Gastos"
      descripcion="Egresos operativos del negocio"
      acciones={
        <>
          <SelectorPeriodo anio={anio} mes={mes} setAnio={setAnio} setMes={setMes} />
          <button onClick={abrirNuevo}
            className="px-4 py-2 rounded-lg text-white text-[13px] font-semibold
              flex items-center gap-2 transition active:scale-[0.98]"
            style={{ background: '#1565C0' }}>
            <Plus size={15} /> Registrar gasto
          </button>
        </>
      }
    >
      <Toast message={toast.msg} show={toast.show} type={toast.type}
        onHide={() => setToast(t => ({ ...t, show: false }))} />

      <div className="max-w-[1200px] space-y-5">

        {/* Totales */}
        <div className="grid grid-cols-3 gap-4">
          <Total
            etiqueta="Gastos del mes"
            valor={fmt(totalDistribuible)}
            detalle="se descuentan de la utilidad"
            color="#DC2626"
          />
          <Total
            etiqueta="Informativos"
            valor={fmt(totalInformativo)}
            detalle="no afectan el reparto"
            color="#94A3B8"
          />
          <Total
            etiqueta="Registros"
            valor={gastos.length}
            detalle={hayCerrados ? 'el mes está cerrado' : 'mes abierto'}
            color="#1565C0"
          />
        </div>

        {/* Formulario */}
        {form && (
          <div className="bg-white rounded-2xl p-6"
            style={{ border: '2px solid #1565C0' }}>
            <p className="text-[13px] font-bold tracking-wider text-slate-400 mb-5">
              {form.id ? 'EDITAR GASTO' : 'NUEVO GASTO'}
            </p>

            <div className="grid grid-cols-12 gap-4">
              <Campo label="Fecha" className="col-span-2">
                <input type="date" value={form.fecha}
                  onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                  className="input-g" />
              </Campo>

              <Campo label="Categoría" className="col-span-3">
                <select value={form.categoria_id}
                  onChange={e => setForm(f => ({ ...f, categoria_id: e.target.value }))}
                  className="input-g">
                  {categorias.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </Campo>

              <Campo label="Descripción" className="col-span-4">
                <input type="text" autoFocus value={form.descripcion}
                  placeholder="Railway julio, cinta de embalaje..."
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  className="input-g" />
              </Campo>

              <Campo label="Monto" className="col-span-2">
                <input type="number" inputMode="decimal" value={form.monto}
                  placeholder="0.00"
                  onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                  className="input-g" style={{ fontFamily: MONO, fontWeight: 700 }} />
              </Campo>

              <Campo label="Moneda" className="col-span-1">
                <select value={form.moneda}
                  onChange={e => setForm(f => ({ ...f, moneda: e.target.value }))}
                  className="input-g">
                  {monedasActivas.map(m => (
                    <option key={m.codigo} value={m.codigo}>{m.codigo}</option>
                  ))}
                </select>
              </Campo>
            </div>

            <label className="flex items-start gap-3 mt-5 p-4 rounded-xl cursor-pointer"
              style={{ background: form.afecta_distribucion ? '#FEF2F2' : '#F8FAFC' }}>
              <input type="checkbox" checked={form.afecta_distribucion}
                onChange={e => setForm(f => ({ ...f, afecta_distribucion: e.target.checked }))}
                className="w-4 h-4 mt-0.5 rounded" />
              <div>
                <p className="text-[13px] font-semibold text-slate-700">
                  Se descuenta de la utilidad a repartir
                </p>
                <p className="text-[12px] text-slate-500 mt-0.5">
                  Desmárcalo para registrar un costo que quieres conocer pero que
                  no entra en el reparto entre socios — por ejemplo el combustible,
                  que asume Administración.
                </p>
              </div>
            </label>

            <div className="flex gap-2 mt-5">
              <button onClick={handleGuardar}
                disabled={!form.descripcion.trim() || !form.monto || guardando}
                className="px-5 py-2.5 rounded-lg text-white text-[13px] font-semibold
                  flex items-center gap-2 disabled:opacity-40 transition active:scale-[0.98]"
                style={{ background: '#1565C0' }}>
                {guardando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                Guardar
              </button>
              <button onClick={() => setForm(null)}
                className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-500
                  text-[13px] font-semibold transition hover:bg-slate-50">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Tabla */}
        <div className="bg-white rounded-2xl overflow-hidden"
          style={{ border: '1px solid #E8EDF5' }}>
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 size={24} className="animate-spin text-slate-300" />
            </div>
          ) : gastos.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center
                mx-auto mb-3" style={{ background: '#F1F5F9' }}>
                <Receipt size={22} className="text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-600">
                Sin gastos en {MESES[mes - 1]}
              </p>
              <p className="text-[13px] text-slate-400 mt-1">
                Registra el hosting, el empaque y todo lo que salga del negocio
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #E8EDF5' }}>
                  <Th className="w-28">Fecha</Th>
                  <Th className="w-52">Categoría</Th>
                  <Th>Descripción</Th>
                  <Th className="w-36 text-right">Monto</Th>
                  <Th className="w-32 text-right">En USD</Th>
                  <Th className="w-12"></Th>
                </tr>
              </thead>
              <tbody>
                {gastos.map(g => (
                  <tr key={g.id} className="hover:bg-slate-50/60 transition group"
                    style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <Td className="text-slate-500" style={{ fontFamily: MONO }}>
                      {new Date(g.fecha + 'T12:00:00').toLocaleDateString('es-VE',
                        { day: '2-digit', month: 'short' })}
                    </Td>
                    <Td>
                      <span className="text-[12px] px-2 py-1 rounded-md font-medium"
                        style={{ background: '#EEF2F8', color: '#1565C0' }}>
                        {g.categorias_gasto?.nombre ?? '—'}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-700">{g.descripcion}</span>
                        {!g.afecta_distribucion && (
                          <span title="No se descuenta de la utilidad a repartir"
                            className="flex items-center gap-1 text-[10px] font-bold
                              px-1.5 py-0.5 rounded"
                            style={{ background: '#F1F5F9', color: '#64748B' }}>
                            <Info size={9} /> INFORMATIVO
                          </span>
                        )}
                        {g.cierre_id && (
                          <span title="Pertenece a un mes cerrado"
                            className="flex items-center gap-1 text-[10px] font-bold
                              px-1.5 py-0.5 rounded"
                            style={{ background: '#E6F4EC', color: '#1B7A3E' }}>
                            <Lock size={9} /> CERRADO
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td className="text-right font-bold text-slate-700"
                      style={{ fontFamily: MONO }}>
                      {fmt(g.monto, g.moneda)}
                      <span className="text-[10px] text-slate-400 ml-1">{g.moneda}</span>
                    </Td>
                    <Td className="text-right font-bold"
                      style={{
                        fontFamily: MONO,
                        color: g.afecta_distribucion ? '#DC2626' : '#94A3B8',
                      }}>
                      {fmt(g.monto_usd ?? g.monto)}
                    </Td>
                    <Td className="text-right">
                      {!g.cierre_id && (
                        <button onClick={() => handleEliminar(g)}
                          className="text-slate-300 hover:text-red-500 transition
                            opacity-0 group-hover:opacity-100">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <style>{`
        .input-g {
          width: 100%;
          padding: 0.55rem 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid #E2E8F0;
          font-size: 13px;
          background: white;
          outline: none;
          transition: box-shadow .15s, border-color .15s;
        }
        .input-g:focus {
          border-color: #1565C0;
          box-shadow: 0 0 0 3px rgba(21,101,192,.12);
        }
      `}</style>
    </GerenciaLayout>
  )
}

// ── Auxiliares ──
function SelectorPeriodo({ anio, mes, setAnio, setMes }) {
  const anios = [hoy.getFullYear(), hoy.getFullYear() - 1]
  return (
    <div className="flex items-center gap-2">
      <select value={mes} onChange={e => setMes(Number(e.target.value))}
        className="px-3 py-2 rounded-lg border border-slate-200 text-[13px]
          font-medium bg-white outline-none focus:border-blue-500">
        {MESES.map((m, i) => (
          <option key={m} value={i + 1}>{m}</option>
        ))}
      </select>
      <select value={anio} onChange={e => setAnio(Number(e.target.value))}
        className="px-3 py-2 rounded-lg border border-slate-200 text-[13px]
          font-medium bg-white outline-none focus:border-blue-500">
        {anios.map(a => <option key={a} value={a}>{a}</option>)}
      </select>
    </div>
  )
}

function Total({ etiqueta, valor, detalle, color }) {
  return (
    <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #E8EDF5' }}>
      <p className="text-[11px] font-semibold tracking-wide text-slate-400 mb-2">
        {etiqueta.toUpperCase()}
      </p>
      <p className="text-[30px] font-black leading-none tracking-tight"
        style={{ fontFamily: MONO, color }}>
        {valor}
      </p>
      <p className="text-[12px] text-slate-400 mt-2">{detalle}</p>
    </div>
  )
}

function Campo({ label, className, children }) {
  return (
    <div className={className}>
      <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

function Th({ children, className = '' }) {
  return (
    <th className={`px-5 py-3 text-[11px] font-bold tracking-wider text-slate-400
      text-left ${className}`}>
      {children}
    </th>
  )
}

function Td({ children, className = '', style }) {
  return (
    <td className={`px-5 py-3 text-[13px] ${className}`} style={style}>
      {children}
    </td>
  )
}
