import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, Package, Clock, AlertTriangle, Wallet,
  ArrowRight, RefreshCw,
} from 'lucide-react'
import { usePanelGerencia, CORREDOR } from '../../hooks/useGerencia'
import { useDeudaTotal } from '../../hooks/useLiquidaciones'
import GerenciaLayout from '../../components/layout/GerenciaLayout'

const MONO = 'IBM Plex Mono, ui-monospace, monospace'

const fmtUSD = n =>
  `$${(Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
const fmtCOP = n =>
  `$${(Number(n) || 0).toLocaleString('es-CO')}`

function duracion(horas) {
  if (horas == null) return '—'
  if (horas < 24) return `${Math.round(horas)} h`
  const dias = horas / 24
  return `${dias.toFixed(dias < 10 ? 1 : 0)} d`
}

export default function Panel() {
  const navigate = useNavigate()
  const { data, isLoading, refetch, isFetching } = usePanelGerencia()
  const { data: deuda } = useDeudaTotal()

  return (
    <GerenciaLayout
      titulo="Panel"
      descripcion="El estado del negocio ahora mismo"
      acciones={
        <button onClick={() => refetch()} disabled={isFetching}
          className="px-3 py-2 rounded-lg border border-slate-200 text-slate-500
            hover:text-slate-700 hover:border-slate-300 transition text-[13px]
            font-medium flex items-center gap-2 disabled:opacity-50">
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          Actualizar
        </button>
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-32">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent
            rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6 max-w-[1400px]">

          {/* ══════════════════════════════════════════════════════════════
              EL CORREDOR
              Los paquetes recorren físicamente Maicao → Maracaibo. Verlos
              como estaciones de esa ruta hace que un cuello de botella se
              lea como lo que es: acumulación en un punto del camino.
              ══════════════════════════════════════════════════════════════ */}
          <section className="bg-white rounded-2xl p-7"
            style={{ border: '1px solid #E8EDF5' }}>

            <div className="flex items-baseline justify-between mb-7">
              <div>
                <h2 className="text-[13px] font-bold tracking-wider text-slate-400">
                  EL CORREDOR
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {data.totalEnCirculacion} paquetes en camino ·{' '}
                  <span className="font-semibold" style={{ color: '#1565C0' }}>
                    {fmtUSD(data.valorEnCirculacion)}
                  </span>{' '}
                  en tránsito
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-medium
                text-slate-400">
                <span className="w-2 h-2 rounded-full" style={{ background: '#B45309' }} />
                pasado su tiempo objetivo
              </div>
            </div>

            {/* La ruta */}
            <div className="flex items-start">
              {CORREDOR.map((estacion, i) => {
                const cantidad = data.conteo[estacion.estado] ?? 0
                const atascados = data.atascoPorEstado[estacion.estado] ?? 0
                const esFinal = estacion.estado === 'ENTREGADO'
                const ultimo = i === CORREDOR.length - 1

                return (
                  <div key={estacion.estado} className="flex-1 flex items-start">
                    {/* Estación */}
                    <div className="flex flex-col items-center flex-1 min-w-0">
                      {/* Punto sobre la línea */}
                      <div className="relative w-full flex items-center justify-center
                        h-4 mb-4">
                        {/* Tramo izquierdo */}
                        {i > 0 && (
                          <div className="absolute left-0 right-1/2 h-[2px]"
                            style={{ background: '#DBE3ED' }} />
                        )}
                        {/* Tramo derecho */}
                        {!ultimo && (
                          <div className="absolute left-1/2 right-0 h-[2px]"
                            style={{ background: '#DBE3ED' }} />
                        )}
                        {/* Nodo */}
                        <div className="relative z-10 rounded-full"
                          style={{
                            width: esFinal ? 14 : 12,
                            height: esFinal ? 14 : 12,
                            background: esFinal ? '#1B7A3E'
                                      : cantidad > 0 ? '#1565C0' : '#FFFFFF',
                            border: cantidad > 0 || esFinal
                              ? 'none' : '2px solid #DBE3ED',
                            boxShadow: atascados > 0
                              ? '0 0 0 4px rgba(180,83,9,0.16)' : 'none',
                          }} />
                      </div>

                      {/* Cifra */}
                      <p className="text-[32px] font-black leading-none tracking-tight"
                        style={{
                          fontFamily: MONO,
                          color: esFinal ? '#1B7A3E'
                                : cantidad > 0 ? '#0D2B5E' : '#CBD5E1',
                        }}>
                        {cantidad}
                      </p>

                      <p className="text-[13px] font-semibold text-slate-700 mt-2">
                        {estacion.etiqueta}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {estacion.lugar}
                      </p>

                      {atascados > 0 && (
                        <div className="mt-2 px-2 py-0.5 rounded-full text-[10px]
                          font-bold flex items-center gap-1"
                          style={{ background: '#FEF3C7', color: '#B45309' }}>
                          <AlertTriangle size={10} />
                          {atascados} demorado{atascados > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>

                    {/* Flecha entre estaciones */}
                    {!ultimo && (
                      <div className="flex-shrink-0 pt-[3px] px-1">
                        <ArrowRight size={14} style={{ color: '#C5D0DE' }} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          {/* ══ CIFRAS DEL MES ══ */}
          <section className="grid grid-cols-4 gap-4">
            <Cifra
              icono={TrendingUp}
              etiqueta="Ingresos del mes"
              valor={fmtUSD(data.ingresosMes)}
              detalle={`${data.entregadosMes} entregas`}
              color="#1565C0"
              destacado
            />
            <Cifra
              icono={Wallet}
              etiqueta="Utilidad del mes"
              valor={fmtUSD(data.utilidadMes)}
              detalle={`${fmtUSD(data.trasladosMes)} en traslados`}
              color="#1B7A3E"
              destacado
            />
            <Cifra
              icono={Package}
              etiqueta="Recibidos este mes"
              valor={data.recibidosMes}
              detalle={`${data.totalHistorico} en total`}
              color="#5B21B6"
            />
            <Cifra
              icono={Clock}
              etiqueta="Ciclo promedio"
              valor={duracion(data.cicloPromedio)}
              detalle="de bodega a entrega"
              color="#B45309"
            />
          </section>

          {/* ══ ATASCOS + DEUDA ══ */}
          <div className="grid grid-cols-3 gap-4 items-start">

            {/* Atascos */}
            <section className="col-span-2 bg-white rounded-2xl overflow-hidden"
              style={{ border: '1px solid #E8EDF5' }}>
              <div className="px-6 py-4 flex items-center justify-between"
                style={{ borderBottom: '1px solid #F1F5F9' }}>
                <div>
                  <h2 className="text-[13px] font-bold tracking-wider text-slate-400">
                    NECESITAN ATENCIÓN
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Paquetes que pasaron su tiempo objetivo
                  </p>
                </div>
                {data.atascados.length > 0 && (
                  <span className="text-2xl font-black" style={{
                    fontFamily: MONO,
                    color: data.atascados.some(p => p.critico) ? '#DC2626' : '#B45309',
                  }}>
                    {data.atascados.length}
                  </span>
                )}
              </div>

              {data.atascados.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center
                    mx-auto mb-3" style={{ background: '#E6F4EC' }}>
                    <Package size={22} style={{ color: '#1B7A3E' }} />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">
                    Todo se mueve a tiempo
                  </p>
                  <p className="text-[13px] text-slate-400 mt-1">
                    Ningún paquete lleva más de lo esperado en su etapa
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50 max-h-[340px] overflow-y-auto">
                  {data.atascados.slice(0, 12).map(p => (
                    <div key={p.id}
                      className="px-6 py-3 flex items-center gap-4 hover:bg-slate-50/60
                        transition">
                      <div className="w-1 h-9 rounded-full flex-shrink-0"
                        style={{ background: p.critico ? '#DC2626' : '#F0B429' }} />

                      <div className="min-w-0 w-40">
                        <p className="text-[13px] font-semibold text-slate-700 truncate"
                          style={{ fontFamily: MONO }}>
                          {p.tracking_externo ?? p.codigo}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {p.cliente_nombre ?? 'Cliente'}
                        </p>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-slate-500">
                          {CORREDOR.find(c => c.estado === p.estado)?.etiqueta
                            ?? p.estado}
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="text-[13px] font-bold"
                          style={{
                            fontFamily: MONO,
                            color: p.critico ? '#DC2626' : '#B45309',
                          }}>
                          {duracion(p.horasEnEstado)}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          objetivo {duracion(p.objetivo)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {data.atascados.length > 12 && (
                    <button onClick={() => navigate('/gerencia/paquetes')}
                      className="w-full px-6 py-3 text-[12px] font-medium
                        text-slate-400 hover:text-slate-600 transition">
                      Ver los {data.atascados.length - 12} restantes
                    </button>
                  )}
                </div>
              )}
            </section>

            {/* Deuda viva */}
            <section className="bg-white rounded-2xl p-6"
              style={{ border: '1px solid #E8EDF5' }}>
              <h2 className="text-[13px] font-bold tracking-wider text-slate-400 mb-1">
                POR PAGAR
              </h2>
              <p className="text-sm text-slate-500 mb-5">
                Trabajo hecho, aún sin liquidar
              </p>

              {deuda ? (
                <>
                  <div className="mb-5">
                    <p className="text-[11px] text-slate-400 mb-1">A conductores</p>
                    <p className="text-3xl font-black leading-none"
                      style={{ fontFamily: MONO, color: '#1565C0' }}>
                      {fmtUSD(deuda.conductoresUSD)}
                      <span className="text-[11px] font-medium text-slate-400 ml-1.5">
                        USD
                      </span>
                    </p>
                  </div>

                  <div className="mb-6">
                    <p className="text-[11px] text-slate-400 mb-1">A bodegueros</p>
                    <p className="text-3xl font-black leading-none"
                      style={{ fontFamily: MONO, color: '#B45309' }}>
                      {fmtCOP(deuda.bodeguerosCOP)}
                      <span className="text-[11px] font-medium text-slate-400 ml-1.5">
                        COP
                      </span>
                    </p>
                  </div>

                  <div className="pt-4" style={{ borderTop: '1px solid #F1F5F9' }}>
                    <p className="text-[12px] text-slate-400 mb-3">
                      {deuda.conductoresPendientes + deuda.bodeguerosPendientes === 0
                        ? 'Nadie con saldo pendiente'
                        : `${deuda.conductoresPendientes + deuda.bodeguerosPendientes} personas esperando pago`}
                    </p>
                    <button onClick={() => navigate('/gerencia/cierres')}
                      className="w-full py-2.5 rounded-lg text-white text-[13px]
                        font-semibold transition active:scale-[0.98]"
                      style={{ background: '#0D2B5E' }}>
                      Ir a liquidar
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-8 flex justify-center">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent
                    rounded-full animate-spin" />
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </GerenciaLayout>
  )
}

// ── Tarjeta de cifra ──
function Cifra({ icono: Icono, etiqueta, valor, detalle, color, destacado }) {
  return (
    <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #E8EDF5' }}>
      <div className="flex items-center gap-2 mb-3">
        <Icono size={15} style={{ color }} />
        <p className="text-[11px] font-semibold tracking-wide text-slate-400">
          {etiqueta.toUpperCase()}
        </p>
      </div>
      <p className={`${destacado ? 'text-[34px]' : 'text-[30px]'} font-black
        leading-none tracking-tight`}
        style={{ fontFamily: MONO, color: destacado ? color : '#0D2B5E' }}>
        {valor}
      </p>
      <p className="text-[12px] text-slate-400 mt-2">{detalle}</p>
    </div>
  )
}
