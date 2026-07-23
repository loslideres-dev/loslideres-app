import { ESTADO_COLORS } from '../../constants/roles'

export default function EstadoBadge({ estado }) {
  const { bg, text, label } = ESTADO_COLORS[estado] ?? {
    bg: 'bg-slate-100', text: 'text-slate-600', label: estado
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full
      text-xs font-semibold ${bg} ${text}`}>
      {label}
    </span>
  )
}