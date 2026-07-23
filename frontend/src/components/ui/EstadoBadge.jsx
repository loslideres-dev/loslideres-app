import { ESTADO_COLORS } from '../../constants/roles'

export default function EstadoBadge({ estado, size = 'sm' }) {
  const { bg, text, label } = ESTADO_COLORS[estado] ?? {
    bg: 'bg-slate-100', text: 'text-slate-600', label: estado
  }
  const sz = size === 'sm' ? 'text-xs px-2.5 py-1' : 'text-sm px-3 py-1.5'
  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${sz} ${bg} ${text}`}>
      {label}
    </span>
  )
}
