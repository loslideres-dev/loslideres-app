import { useState } from 'react'
import {
  DollarSign, TrendingUp, Package, Truck, Warehouse,
  Users, CreditCard, Wallet, AlertCircle,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LineChart, Line, CartesianGrid,
} from 'recharts'
import {
  useReporteAdmin, useEstadoCuenta, useReportePorPersona,
} from '../../hooks/useReporteAdmin'
import AdminLayout from '../../components/layout/AdminLayout'

const TABS = [
  { label: 'Operativo',  value: 'operativo',  icon: Package },
  { label: 'Financiero', value: 'financiero', icon: Wallet  },
]

const PERIODOS = [
  { label: 'Hoy',    value: 'hoy'    },
  { label: 'Semana', value: 'semana' },
  { label: 'Mes',    value: 'mes'    },
  { label: 'Todo',   value: 'todo'   },
]

const ESTADO_COLOR = {
  RECIBIDO:    '#94A3B8',
  TARIFADO:    '#F59E0B',
  EN_TRANSITO: '#0EA5E9',
  EN_REPARTO:  '#8B5CF6',
  ENTREGADO:   '#1B7A3E',
}
const ESTADO_LABEL = {
  RECIBIDO: 'Recibido', TARIFADO: 'Tarifado', EN_TRANSITO: 'En tránsito',
  EN_REPARTO: 'En reparto', ENTREGADO: 'Entregado',
}
const TAM_COLOR = { S: '#0EA5E9', M: '#F59E0B', L: '#8B5CF6', XL: '#EF4444' }

const fmtUSD = n => `$${(Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
const fmtCOP = n => `$${(Number(n) || 0).toLocaleString('es-CO')}`

export default function ReporteAdmin() {
  const [tab,     setTab]     = useState('operativo')
  const [periodo, setPeriodo] = useState('mes')
  const { data, isLoading }           = useReporteAdmin(periodo)
  const { data: cuenta }              = useEstadoCuenta(periodo)
  const { data: porPersona }          = useReportePorPersona(periodo)

  const estadoData = data
    ? Object.entries(data.porEstado).map(([k, v]) => ({
        name: ESTADO_LABEL[k] ?? k, value: v, color: ESTADO_COLOR[k] ?? '#94A3B8',
      }))
    : []
  const tamanioData = data
    ? Object.entries(data.porTamanio)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: k, cantidad: v, color: TAM_COLOR[k] }))
    : []
  const metodoData = data
    ? Object.entries(data.porMetodo).map(([k, v]) => ({ name: k, value: v }))
    : []

  return (
    <AdminLayout title="Reportes">
      <div className="px-5 py-4">

        {/* Selector de periodo */}
        <div className="flex gap-2 mb-5">
          {PERIODOS.map(p => (
            <button key={p.value} onClick={() => setPeriodo(p.value)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition active:scale-95
                ${periodo === p.value ? 'text-white' : 'bg-white text-slate-500 border border-slate-200'}`}
              style={periodo === p.value ? { background: '#1565C0' } : {}}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {TABS.map(t => (
            <button key={t.value} onClick={() => setTab(t.value)}
              className={`flex-1 py-3 rounded-xl text-xs font-semibold flex items-center
                justify-center gap-2 transition active:scale-95
                ${tab === t.value
                  ? 'text-white'
                  : 'bg-white text-slate-500 border border-slate-200'}`}
              style={tab === t.value ? { background: '#0D2B5E' } : {}}>
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent
              rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">

            {/* ══════════════ OPERATIVO ══════════════ */}
            {tab === 'operativo' && (
              <>
            {/* ══ OPERACIÓN ══ */}
            <Section icon={Package} title="Operación">
              <div className="grid grid-cols-4 gap-2 mb-4">
                <MiniCard label="Total" valor={data.totalPaquetes} />
                <MiniCard label="Entregados" valor={data.entregados} />
                <MiniCard label="Pendientes" valor={data.pendientes} />
                <MiniCard label="T. entrega"
                  valor={data.tiempoPromedioHoras >= 24
                    ? `${(data.tiempoPromedioHoras / 24).toFixed(1)}d`
                    : `${Math.round(data.tiempoPromedioHoras)}h`} />
              </div>

              {/* Dona por estado */}
              {estadoData.length > 0 && (
                <div className="bg-white rounded-2xl p-4 shadow-sm mb-3">
                  <p className="text-xs font-semibold text-slate-400 mb-2">PAQUETES POR ESTADO</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={estadoData} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2}>
                        {estadoData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 justify-center mt-1">
                    {estadoData.map((e, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: e.color }} />
                        <span className="text-xs text-slate-500">{e.name} ({e.value})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Barras por tamaño */}
              {tamanioData.length > 0 && (
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <p className="text-xs font-semibold text-slate-400 mb-2">PAQUETES POR TAMAÑO</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={tamanioData}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false}
                        tick={{ fontSize: 12, fill: '#94a3b8' }} />
                      <YAxis hide />
                      <Tooltip cursor={{ fill: '#F4F6FA' }} />
                      <Bar dataKey="cantidad" radius={[6, 6, 0, 0]}>
                        {tamanioData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Section>

            {/* ══ TENDENCIA ══ */}
            {data.tendencia.length > 0 && (
              <Section icon={TrendingUp} title="Tendencia">
                <div className="bg-white rounded-2xl p-4 shadow-sm mb-3">
                  <p className="text-xs font-semibold text-slate-400 mb-2">PAQUETES POR DÍA</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={data.tendencia}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="fecha" axisLine={false} tickLine={false}
                        tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <YAxis hide />
                      <Tooltip />
                      <Line type="monotone" dataKey="cantidad" stroke="#1565C0"
                        strokeWidth={2.5} dot={{ r: 3, fill: '#1565C0' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

              </Section>
            )}

            {/* ══ RANKINGS ══ */}
            <Section icon={Users} title="Rankings">
              <RankCard icon={Truck} titulo="Top conductores"
                items={data.topConductores.map(c => ({
                  nombre: c.nombre, valor: `${c.entregas} entregas`,
                }))} />
              <RankCard icon={Warehouse} titulo="Top bodegueros"
                items={data.topBodegueros.map(b => ({
                  nombre: b.nombre, valor: `${b.cantidad} paquetes`,
                }))} />
              <RankCard icon={Users} titulo="Clientes más frecuentes"
                items={data.topClientes.map(c => ({
                  nombre: c.nombre, valor: `${c.cantidad} paquetes`,
                }))} />
            </Section>
              </>
            )}

            {/* ══════════════ FINANCIERO ══════════════ */}
            {tab === 'financiero' && (
              <>
            {/* ══ FINANCIERO ══ */}
            <Section icon={DollarSign} title="Resumen financiero">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <BigCard label="Ingresos" valor={fmtUSD(data.ingresos)}
                  sub="cobrado a clientes" color="#1565C0" icon={DollarSign} />
                <BigCard label="Ganancia neta" valor={fmtUSD(data.ganancia)}
                  sub="ingresos − traslados" color="#1B7A3E" icon={TrendingUp} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <MiniCard label="A conductores" valor={fmtUSD(data.pagoConductores)} sub="USD" />
                <MiniCard label="A bodegueros" valor={fmtCOP(data.pagoBodegueros)} sub="COP" />
                <MiniCard label="Ticket prom." valor={fmtUSD(data.ticketPromedio)} sub="por paquete" />
              </div>
            </Section>

            {/* ══ ESTADO DE CUENTA ══ */}
            {cuenta && (
              <Section icon={Wallet} title="Estado de cuenta">
                <div className="bg-white rounded-2xl p-4 shadow-sm mb-3">
                  <div className="space-y-2.5">
                    <FilaCuenta label="Ingresos" sub="cobrado a clientes"
                      valor={fmtUSD(cuenta.ingresos)} color="#1B7A3E" />
                    <FilaCuenta label="Traslados a conductores" sub="egreso USD"
                      valor={`− ${fmtUSD(cuenta.egresoConductoresUSD)}`} color="#DC2626" />
                    <div className="pt-2.5 border-t-2 border-slate-100 flex items-center
                      justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-800">Utilidad</p>
                        <p className="text-[10px] text-slate-400">
                          margen {cuenta.margenPct.toFixed(1)}%
                        </p>
                      </div>
                      <p className="text-xl font-black"
                        style={{ color: cuenta.utilidadUSD >= 0 ? '#1B7A3E' : '#DC2626' }}>
                        {fmtUSD(cuenta.utilidadUSD)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Comisiones en COP — moneda separada */}
                <div className="bg-white rounded-2xl p-4 shadow-sm mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Warehouse size={14} style={{ color: '#B45309' }} />
                    <p className="text-xs font-semibold text-slate-400">
                      COMISIONES A BODEGUEROS
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      Generado en el periodo · {fmtCOP(cuenta.tarifaBodeguero)} por paquete
                    </p>
                    <p className="text-lg font-black" style={{ color: '#B45309' }}>
                      {fmtCOP(cuenta.egresoBodeguerosCOP)}
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-300 mt-1">
                    COP · no se mezcla con los montos en USD
                  </p>
                </div>

                {/* Deuda viva */}
                <div className="rounded-2xl p-4"
                  style={{ background: cuenta.personasConSaldo > 0 ? '#FFFBEB' : '#F0FDF4',
                           border: `1px solid ${cuenta.personasConSaldo > 0 ? '#FDE68A' : '#BBF7D0'}` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={14}
                      style={{ color: cuenta.personasConSaldo > 0 ? '#B45309' : '#1B7A3E' }} />
                    <p className="text-xs font-semibold"
                      style={{ color: cuenta.personasConSaldo > 0 ? '#92400E' : '#166534' }}>
                      PENDIENTE POR PAGAR AHORA
                    </p>
                  </div>
                  {cuenta.personasConSaldo === 0 ? (
                    <p className="text-sm font-medium" style={{ color: '#166534' }}>
                      Todo liquidado — no hay saldos pendientes
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-lg font-black" style={{ color: '#B45309' }}>
                            {fmtUSD(cuenta.deudaConductoresUSD)}
                          </p>
                          <p className="text-[10px]" style={{ color: '#92400E' }}>
                            a conductores (USD)
                          </p>
                        </div>
                        <div>
                          <p className="text-lg font-black" style={{ color: '#B45309' }}>
                            {fmtCOP(cuenta.deudaBodeguerosCOP)}
                          </p>
                          <p className="text-[10px]" style={{ color: '#92400E' }}>
                            a bodegueros (COP)
                          </p>
                        </div>
                      </div>
                      <p className="text-[10px] mt-2" style={{ color: '#92400E' }}>
                        {cuenta.personasConSaldo}{' '}
                        {cuenta.personasConSaldo === 1 ? 'persona' : 'personas'} con saldo ·
                        {' '}liquida desde la pestaña Cierres
                      </p>
                    </>
                  )}
                </div>

                {/* Ya pagado en el periodo */}
                {(cuenta.pagadoConductoresUSD > 0 || cuenta.pagadoBodeguerosCOP > 0) && (
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <MiniCard label="Pagado a conduct."
                      valor={fmtUSD(cuenta.pagadoConductoresUSD)} sub="USD en el periodo" />
                    <MiniCard label="Pagado a bodeg."
                      valor={fmtCOP(cuenta.pagadoBodeguerosCOP)} sub="COP en el periodo" />
                  </div>
                )}
              </Section>
            )}

            {/* ══ MÉTODO DE PAGO ══ */}
            {metodoData.length > 0 && (
              <Section icon={CreditCard} title="Método de pago">
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="space-y-2">
                    {metodoData.sort((a, b) => b.value - a.value).map((m, i) => {
                      const total = metodoData.reduce((s, x) => s + x.value, 0)
                      const pct = total ? Math.round((m.value / total) * 100) : 0
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-600 font-medium">{m.name}</span>
                            <span className="text-slate-400">{m.value} ({pct}%)</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full" style={{
                              width: `${pct}%`, background: '#1565C0',
                            }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </Section>
            )}

            {/* ══ DESEMPEÑO POR PERSONA ══ */}
            {porPersona && (
              <Section icon={Users} title="Por persona">
                {/* Conductores */}
                <div className="bg-white rounded-2xl p-4 shadow-sm mb-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Truck size={15} style={{ color: '#1565C0' }} />
                    <p className="text-xs font-semibold text-slate-500">Conductores</p>
                  </div>
                  {porPersona.conductores.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-2">
                      Sin entregas en el periodo
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {porPersona.conductores.map(c => (
                        <div key={c.id} className="pb-3 border-b border-slate-50 last:border-0
                          last:pb-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold text-slate-700 truncate">
                              {c.nombre}
                              {c.esAdmin && (
                                <span className="text-[9px] font-medium ml-1.5 px-1.5 py-0.5
                                  rounded-full" style={{ background: '#EEF2F8', color: '#1565C0' }}>
                                  admin
                                </span>
                              )}
                            </p>
                            <p className="text-sm font-bold" style={{ color: '#1565C0' }}>
                              {c.entregas} {c.entregas === 1 ? 'entrega' : 'entregas'}
                            </p>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">
                              Generó {fmtUSD(c.ingresos)} en ingresos
                            </span>
                            <span className="font-semibold"
                              style={{ color: c.traslados > 0 ? '#B45309' : '#94A3B8' }}>
                              {c.traslados > 0 ? `${fmtUSD(c.traslados)} en traslados` : 'sin costo'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bodegueros */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Warehouse size={15} style={{ color: '#B45309' }} />
                    <p className="text-xs font-semibold text-slate-500">Bodegueros</p>
                  </div>
                  {porPersona.bodegueros.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-2">
                      Sin recepciones en el periodo
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {porPersona.bodegueros.map(b => (
                        <div key={b.id} className="pb-3 border-b border-slate-50 last:border-0
                          last:pb-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold text-slate-700 truncate">
                              {b.nombre}
                            </p>
                            <p className="text-sm font-bold" style={{ color: '#1565C0' }}>
                              {b.recibidos} {b.recibidos === 1 ? 'paquete' : 'paquetes'}
                            </p>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Comisión generada</span>
                            <span className="font-semibold" style={{ color: '#B45309' }}>
                              {fmtCOP(b.comisionCOP)} COP
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Section>
            )}
              </>
            )}

          </div>
        )}
      </div>
    </AdminLayout>
  )
}

// ── Subcomponentes ──
function Section({ icon: Icon, title, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: '#EEF2F8' }}>
          <Icon size={15} style={{ color: '#1565C0' }} />
        </div>
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function BigCard({ label, valor, sub, color, icon: Icon }) {
  return (
    <div className="rounded-2xl p-4 text-white" style={{ background: color }}>
      <Icon size={20} className="mb-2 opacity-80" />
      <p className="text-2xl font-black leading-tight">{valor}</p>
      <p className="text-xs font-medium opacity-90 mt-0.5">{label}</p>
      <p className="text-[10px] opacity-70">{sub}</p>
    </div>
  )
}

function FilaCuenta({ label, sub, valor, color }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-700">{label}</p>
        {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
      </div>
      <p className="text-base font-bold" style={{ color }}>{valor}</p>
    </div>
  )
}

function MiniCard({ label, valor, sub }) {
  return (
    <div className="bg-white rounded-xl p-3 shadow-sm text-center">
      <p className="text-lg font-black text-slate-800 leading-tight">{valor}</p>
      <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
      {sub && <p className="text-[9px] text-slate-300">{sub}</p>}
    </div>
  )
}

function RankCard({ icon: Icon, titulo, items }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm mb-3">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={15} style={{ color: '#1565C0' }} />
        <p className="text-xs font-semibold text-slate-500">{titulo}</p>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-2">Sin datos en el periodo</p>
      ) : (
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full flex items-center justify-center
                text-[10px] font-bold flex-shrink-0"
                style={{
                  background: i === 0 ? '#FEF3C7' : '#F1F5F9',
                  color: i === 0 ? '#B45309' : '#64748B',
                }}>
                {i + 1}
              </span>
              <span className="flex-1 text-sm text-slate-700 truncate">{it.nombre}</span>
              <span className="text-xs font-semibold text-slate-500">{it.valor}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
