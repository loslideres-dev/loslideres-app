import { supabase } from '../lib/supabase'

// Crea una o varias notificaciones. Nunca bloquea el flujo principal.
export async function crearNotificacion({ usuarioId, tipo, titulo, mensaje, paqueteId = null }) {
  try {
    await supabase.from('notificaciones').insert({
      usuario_id: usuarioId,
      tipo,
      titulo,
      mensaje,
      paquete_id: paqueteId,
    })
  } catch (e) {
    console.error('Error creando notificación:', e)
  }
}

// Notifica a TODOS los administradores
export async function notificarAdmins({ tipo, titulo, mensaje, paqueteId = null }) {
  try {
    const { data: admins } = await supabase.from('admin_ids').select('id')
    if (!admins?.length) return
    const filas = admins.map(a => ({
      usuario_id: a.id,
      tipo, titulo, mensaje, paquete_id: paqueteId,
    }))
    await supabase.from('notificaciones').insert(filas)
  } catch (e) {
    console.error('Error notificando admins:', e)
  }
}
