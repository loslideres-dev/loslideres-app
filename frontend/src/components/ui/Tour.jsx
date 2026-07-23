import { useState } from 'react'
import { Package, MapPin, Bell, ArrowRight, X } from 'lucide-react'

const PASOS = [
  {
    icon:  Package,
    color: '#1565C0',
    title: '¡Bienvenido a Los Líderes!',
    desc:  'Recibe tus compras de Amazon, Shein, Temu y cualquier tienda directamente en tu puerta en Maracaibo.',
  },
  {
    icon:  MapPin,
    color: '#0EA5E9',
    title: 'Tu código de casillero',
    desc:  'Tienes un código único (LID-XXXX). Agrégalo a la dirección al comprar y sabremos que el paquete es tuyo cuando llegue a Maicao.',
  },
  {
    icon:  Bell,
    color: '#8B5CF6',
    title: 'Te avisamos en cada paso',
    desc:  'Recibirás una notificación por WhatsApp cuando tu paquete llegue a la bodega, cuando tenga precio asignado y cuando esté en camino.',
  },
  {
    icon:  MapPin,
    color: '#10B981',
    title: 'Completa tu dirección',
    desc:  'Para poder entregarte tus paquetes necesitamos tu dirección exacta en Maracaibo y tu número de WhatsApp. ¡Tarda menos de un minuto!',
    cta:   'Completar mi perfil',
  },
]

export default function Tour({ onFinish }) {
  const [paso, setPaso] = useState(0)
  const actual = PASOS[paso]
  const Icon   = actual.icon
  const ultimo = paso === PASOS.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(13,43,94,0.85)', backdropFilter: 'blur(4px)' }}>

      <div className="w-full max-w-lg bg-white rounded-t-3xl p-8 pb-10
        animate-in slide-in-from-bottom-4 duration-300">

        {/* Skip */}
        <div className="flex justify-end mb-4">
          <button onClick={onFinish}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
            <X size={14} /> Saltar
          </button>
        </div>

        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: actual.color + '18' }}>
          <Icon size={38} style={{ color: actual.color }} />
        </div>

        {/* Text */}
        <h2 className="text-slate-800 text-xl font-bold text-center mb-3">
          {actual.title}
        </h2>
        <p className="text-slate-500 text-sm text-center leading-relaxed mb-8">
          {actual.desc}
        </p>

        {/* Dots */}
        <div className="flex justify-center gap-2 mb-6">
          {PASOS.map((_, i) => (
            <div key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width:      i === paso ? 24 : 8,
                background: i === paso ? '#1565C0' : '#E2E8F0',
              }} />
          ))}
        </div>

        {/* Button */}
        <button
          onClick={() => ultimo ? onFinish() : setPaso(p => p + 1)}
          className="w-full py-4 rounded-2xl text-white font-semibold text-sm
            flex items-center justify-center gap-2 active:scale-95 transition"
          style={{ background: '#1565C0' }}>
          {ultimo
            ? (actual.cta ?? 'Empezar')
            : <><span>Siguiente</span><ArrowRight size={18} /></>
          }
        </button>
      </div>
    </div>
  )
}