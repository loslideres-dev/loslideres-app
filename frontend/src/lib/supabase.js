import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ── Helpers de auditoría ──────────────────────────────────────────────────────
export async function registrarAuditoria({
  evento, entidad, entidadId, valorAnterior = null, valorNuevo = null
}) {
  try {
    await supabase.from('auditoria').insert({
      evento,
      entidad,
      entidad_id:     entidadId?.toString(),
      valor_anterior: valorAnterior,
      valor_nuevo:    valorNuevo,
    })
  } catch (e) {
    // La auditoría nunca debe bloquear el flujo principal
    console.error('Audit log error:', e)
  }
}
