import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORÍAS DE GASTO
// ═══════════════════════════════════════════════════════════════════════════

export function useCategoriasGasto(soloActivas = true) {
  return useQuery({
    queryKey: ['categorias-gasto', soloActivas],
    queryFn: async () => {
      let q = supabase.from('categorias_gasto').select('*').order('orden')
      if (soloActivas) q = q.eq('activo', true)
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
    staleTime: 5 * 60_000,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// GASTOS
// ═══════════════════════════════════════════════════════════════════════════

export function useGuardarCategoria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...campos }) => {
      const { error } = id
        ? await supabase.from('categorias_gasto').update(campos).eq('id', id)
        : await supabase.from('categorias_gasto').insert(campos)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorias-gasto'] }),
  })
}

export function useGastos({ anio, mes } = {}) {
  return useQuery({
    queryKey: ['gastos', anio, mes],
    queryFn: async () => {
      let q = supabase
        .from('gastos')
        .select('*, categorias_gasto:categoria_id (nombre, tipo)')
        .order('fecha', { ascending: false })

      if (anio && mes) {
        const desde = `${anio}-${String(mes).padStart(2, '0')}-01`
        const sig   = mes === 12 ? `${anio + 1}-01-01`
                                 : `${anio}-${String(mes + 1).padStart(2, '0')}-01`
        q = q.gte('fecha', desde).lt('fecha', sig)
      }

      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
    staleTime: 30_000,
  })
}

export function useGuardarGasto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...campos }) => {
      const { data: { user } } = await supabase.auth.getUser()

      // El equivalente en dólares se congela al registrar, con la tasa
      // vigente en ese momento.
      let monto_usd = campos.monto
      let tasa      = 1
      if (campos.moneda && campos.moneda !== 'USD') {
        const { data: t } = await supabase.rpc('tasa_vigente', {
          p_moneda: campos.moneda,
        })
        tasa = Number(t) || null
        monto_usd = tasa ? Number(campos.monto) / tasa : null
      }

      const registro = {
        ...campos,
        tasa_aplicada: tasa,
        monto_usd,
        registrado_por: user?.id ?? null,
      }

      if (id) {
        const { error } = await supabase.from('gastos').update(registro).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('gastos').insert(registro)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gastos'] })
      qc.invalidateQueries({ queryKey: ['resultado-mes'] })
    },
  })
}

export function useEliminarGasto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('gastos').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gastos'] })
      qc.invalidateQueries({ queryKey: ['resultado-mes'] })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// RESULTADO DEL MES
// ═══════════════════════════════════════════════════════════════════════════

// Cifras en vivo de un mes que aún no se ha cerrado.
export function useResultadoMes(anio, mes) {
  return useQuery({
    queryKey: ['resultado-mes', anio, mes],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('calcular_resultado_mes', {
        p_anio: anio,
        p_mes:  mes,
      })
      if (error) throw error
      return Array.isArray(data) ? data[0] : data
    },
    enabled: !!anio && !!mes,
    staleTime: 30_000,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// CIERRES MENSUALES
// ═══════════════════════════════════════════════════════════════════════════

export function useCierres() {
  return useQuery({
    queryKey: ['cierres'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cierres_mensuales')
        .select('*')
        .order('anio', { ascending: false })
        .order('mes',  { ascending: false })
      if (error) throw error
      return data ?? []
    },
    staleTime: 60_000,
  })
}

export function useCierreDe(anio, mes) {
  const { data: cierres = [] } = useCierres()
  return cierres.find(c => c.anio === anio && c.mes === mes) ?? null
}

export function useCerrarMes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ anio, mes, tasaCop, tasaVes, notas }) => {
      const { data, error } = await supabase.rpc('cerrar_mes', {
        p_anio:     anio,
        p_mes:      mes,
        p_tasa_cop: tasaCop,
        p_tasa_ves: tasaVes ?? null,
        p_notas:    notas ?? null,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cierres'] })
      qc.invalidateQueries({ queryKey: ['resultado-mes'] })
      qc.invalidateQueries({ queryKey: ['gastos'] })
      qc.invalidateQueries({ queryKey: ['distribuciones'] })
    },
  })
}

export function useReabrirMes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (cierreId) => {
      const { error } = await supabase.rpc('reabrir_mes', { p_cierre_id: cierreId })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cierres'] })
      qc.invalidateQueries({ queryKey: ['resultado-mes'] })
      qc.invalidateQueries({ queryKey: ['gastos'] })
      qc.invalidateQueries({ queryKey: ['distribuciones'] })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// SOCIOS Y DISTRIBUCIONES
// ═══════════════════════════════════════════════════════════════════════════

export function useSocios() {
  return useQuery({
    queryKey: ['socios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('socios')
        .select('*')
        .order('participacion', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    staleTime: 60_000,
  })
}

export function useGuardarSocio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...campos }) => {
      if (id) {
        const { error } = await supabase.from('socios').update(campos).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('socios').insert(campos)
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['socios'] }),
  })
}

export function useDistribuciones(cierreId = null) {
  return useQuery({
    queryKey: ['distribuciones', cierreId],
    queryFn: async () => {
      let q = supabase
        .from('distribuciones')
        .select('*, socios:socio_id (nombre), cierres_mensuales:cierre_id (anio, mes)')
        .order('created_at', { ascending: false })
      if (cierreId) q = q.eq('cierre_id', cierreId)
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
    staleTime: 30_000,
  })
}

export function useMarcarDistribucionPagada() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, metodo_pago, notas }) => {
      const { error } = await supabase
        .from('distribuciones')
        .update({
          estado: 'pagada',
          fecha_pago: new Date().toISOString(),
          metodo_pago: metodo_pago ?? null,
          notas: notas ?? null,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['distribuciones'] }),
  })
}
