import { useNavigate } from 'react-router-dom'
import { Hammer, ArrowRight } from 'lucide-react'
import GerenciaLayout from '../../components/layout/GerenciaLayout'

// Pantalla puente para las secciones que llegan en fases posteriores.
// Muestra qué va a hacer la sección y, cuando ya existe una versión en la
// app móvil, ofrece el enlace en vez de dejar al usuario en un callejón.
export default function EnConstruccion({
  titulo, descripcion, fase, queHara, alternativa,
}) {
  const navigate = useNavigate()

  return (
    <GerenciaLayout titulo={titulo} descripcion={descripcion}>
      <div className="max-w-2xl">
        <div className="bg-white rounded-2xl p-10" style={{ border: '1px solid #E8EDF5' }}>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: '#EEF2F8' }}>
              <Hammer size={20} style={{ color: '#1565C0' }} />
            </div>
            <div>
              <p className="text-[11px] font-bold tracking-widest text-slate-400">
                FASE {fase}
              </p>
              <p className="text-base font-bold text-slate-800">
                Aún no está construida
              </p>
            </div>
          </div>

          <p className="text-[13px] font-semibold tracking-wider text-slate-400 mb-3">
            QUÉ VA A HACER
          </p>
          <ul className="space-y-2 mb-8">
            {queHara.map((linea, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-600">
                <span className="w-1 h-1 rounded-full mt-2 flex-shrink-0"
                  style={{ background: '#4FC3F7' }} />
                {linea}
              </li>
            ))}
          </ul>

          {alternativa && (
            <div className="pt-6" style={{ borderTop: '1px solid #F1F5F9' }}>
              <p className="text-sm text-slate-500 mb-3">{alternativa.texto}</p>
              <button onClick={() => navigate(alternativa.path)}
                className="px-4 py-2.5 rounded-lg text-white text-[13px] font-semibold
                  flex items-center gap-2 transition active:scale-[0.98]"
                style={{ background: '#1565C0' }}>
                {alternativa.label}
                <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    </GerenciaLayout>
  )
}
