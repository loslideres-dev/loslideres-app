import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

// ── Carga inmediata ───────────────────────────────────────────────────────────
// Login es la primera pantalla de quien no tiene sesión. Diferirla solo
// agregaría un spinner de más antes del formulario.
import Login from './pages/auth/Login'

// ── Carga diferida ────────────────────────────────────────────────────────────
// Cada pantalla se descarga solo al navegar a ella. Un bodeguero con datos
// móviles en Maicao ya no baja el código de reportes ni de gráficos.

// Auth
const AuthCallback    = lazy(() => import('./pages/auth/AuthCallback'))
const ForgotPassword  = lazy(() => import('./pages/auth/ForgotPassword'))
const ConfirmarCorreo = lazy(() => import('./pages/auth/ConfirmarCorreo'))
const Onboarding      = lazy(() => import('./pages/auth/Onboarding'))

// Cliente
const Casillero       = lazy(() => import('./pages/cliente/Casillero'))
const PaquetesCliente = lazy(() => import('./pages/cliente/PaquetesCliente'))
const DetallePaquete  = lazy(() => import('./pages/cliente/DetallePaquete'))
const Perfil          = lazy(() => import('./pages/cliente/Perfil'))

// Bodeguero
const Recepcion        = lazy(() => import('./pages/bodeguero/Recepcion'))
const Registros        = lazy(() => import('./pages/bodeguero/Registros'))
const ReporteBodeguero = lazy(() => import('./pages/bodeguero/ReporteBodeguero'))

// Conductor
const Entregas         = lazy(() => import('./pages/conductor/Entregas'))
const ReporteConductor = lazy(() => import('./pages/conductor/ReporteConductor'))

// Admin — ReporteAdmin arrastra Recharts, la dependencia más pesada de la app.
// Diferirlo es lo que más peso le quita al bundle inicial.
const Dashboard     = lazy(() => import('./pages/admin/Dashboard'))
const PaquetesAdmin = lazy(() => import('./pages/admin/PaquetesAdmin'))
const Tarifas       = lazy(() => import('./pages/admin/Tarifas'))
const Usuarios      = lazy(() => import('./pages/admin/Usuarios'))
const Liquidaciones = lazy(() => import('./pages/admin/Liquidaciones'))
const ReporteAdmin  = lazy(() => import('./pages/admin/ReporteAdmin'))

// Gerencia — consola de escritorio. Todo el módulo va diferido: quien opera
// desde el celular nunca descarga este código.
const PanelGerencia   = lazy(() => import('./pages/gerencia/Panel'))
const GerenciaGastos     = lazy(() => import('./pages/gerencia/Gastos'))
const GerenciaResultados = lazy(() => import('./pages/gerencia/Resultados'))
const GerenciaReparto    = lazy(() => import('./pages/gerencia/Reparto'))
const GerenciaCierres    = lazy(() => import('./pages/gerencia/Cierres'))
const GerenciaPaquetes   = lazy(() => import('./pages/gerencia/PaquetesGer'))
const GerenciaUsuarios   = lazy(() => import('./pages/gerencia/UsuariosGer'))
const GerenciaAjustes    = lazy(() => import('./pages/gerencia/Ajustes'))
const GerenciaAuditoria  = lazy(() => import('./pages/gerencia/Auditoria'))
const GerenciaSLA        = lazy(() => import('./pages/gerencia/SLA'))

// ── Pantalla de carga entre rutas ─────────────────────────────────────────────
function CargandoPantalla() {
  return (
    <div className="h-[100dvh] flex items-center justify-center"
      style={{ background: '#F4F6FA' }}>
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent
        rounded-full animate-spin" />
    </div>
  )
}

// ── Guard ─────────────────────────────────────────────────────────────────────
function PrivateRoute({ children, roles }) {
  const session   = useAuthStore(s => s.session)
  const userRoles = useAuthStore(s => s.roles)

  if (!session) return <Navigate to="/login" replace />

  if (roles && roles.length > 0) {
    const tieneAcceso = roles.some(r => userRoles.includes(r))
    if (!tieneAcceso) {
      if (userRoles.includes('admin'))
        return <Navigate to="/admin/dashboard" replace />
      if (userRoles.includes('bodeguero'))
        return <Navigate to="/bodeguero/recepcion" replace />
      if (userRoles.includes('conductor'))
        return <Navigate to="/conductor/entregas" replace />
      return <Navigate to="/cliente/casillero" replace />
    }
  }

  return children
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<CargandoPantalla />}>
        <Routes>

        {/* Públicas */}
        <Route path="/login"                 element={<Login />} />
        <Route path="/auth/callback"         element={<AuthCallback />} />
        <Route path="/auth/forgot-password"  element={<ForgotPassword />} />
        <Route path="/auth/confirmar-correo" element={<ConfirmarCorreo />} />

        {/* Onboarding */}
        <Route path="/onboarding" element={
          <PrivateRoute><Onboarding /></PrivateRoute>
        }/>

        {/* Cliente */}
        <Route path="/cliente/casillero" element={
          <PrivateRoute roles={['cliente','admin']}><Casillero /></PrivateRoute>
        }/>
        <Route path="/cliente/paquetes" element={
          <PrivateRoute roles={['cliente','admin']}><PaquetesCliente /></PrivateRoute>
        }/>
        <Route path="/cliente/paquetes/:id" element={
          <PrivateRoute roles={['cliente','admin']}><DetallePaquete /></PrivateRoute>
        }/>
        <Route path="/cliente/perfil" element={
          <PrivateRoute roles={['cliente','admin']}><Perfil /></PrivateRoute>
        }/>

        {/* Bodeguero */}
        <Route path="/bodeguero/recepcion" element={
          <PrivateRoute roles={['bodeguero','admin']}><Recepcion /></PrivateRoute>
        }/>
        <Route path="/bodeguero/registros" element={
          <PrivateRoute roles={['bodeguero','admin']}><Registros /></PrivateRoute>
        }/>
        <Route path="/bodeguero/reporte" element={
          <PrivateRoute roles={['bodeguero','admin']}><ReporteBodeguero /></PrivateRoute>
        }/>

        {/* Conductor */}
        <Route path="/conductor/entregas" element={
          <PrivateRoute roles={['conductor','admin']}><Entregas /></PrivateRoute>
        }/>
        <Route path="/conductor/reporte" element={
          <PrivateRoute roles={['conductor','admin']}><ReporteConductor /></PrivateRoute>
        }/>

        {/* Admin (Auditoría oculta temporalmente) */}
        <Route path="/admin/dashboard" element={
          <PrivateRoute roles={['admin']}><Dashboard /></PrivateRoute>
        }/>
        <Route path="/admin/paquetes" element={
          <PrivateRoute roles={['admin']}><PaquetesAdmin /></PrivateRoute>
        }/>
        <Route path="/admin/tarifas" element={
          <PrivateRoute roles={['admin']}><Tarifas /></PrivateRoute>
        }/>
        <Route path="/admin/usuarios" element={
          <PrivateRoute roles={['admin']}><Usuarios /></PrivateRoute>
        }/>
        <Route path="/admin/liquidaciones" element={
          <PrivateRoute roles={['admin']}><Liquidaciones /></PrivateRoute>
        }/>
        <Route path="/admin/reportes" element={
          <PrivateRoute roles={['admin']}><ReporteAdmin /></PrivateRoute>
        }/>

        {/* ── Gerencia (escritorio) ── */}
        <Route path="/gerencia" element={
          <PrivateRoute roles={['gerente']}><PanelGerencia /></PrivateRoute>
        }/>
        <Route path="/gerencia/paquetes" element={
          <PrivateRoute roles={['gerente']}><GerenciaPaquetes /></PrivateRoute>
        }/>
        <Route path="/gerencia/sla" element={
          <PrivateRoute roles={['gerente']}><GerenciaSLA /></PrivateRoute>
        }/>
        <Route path="/gerencia/resultados" element={
          <PrivateRoute roles={['gerente']}><GerenciaResultados /></PrivateRoute>
        }/>
        <Route path="/gerencia/gastos" element={
          <PrivateRoute roles={['gerente']}><GerenciaGastos /></PrivateRoute>
        }/>
        <Route path="/gerencia/cierres" element={
          <PrivateRoute roles={['gerente']}><GerenciaCierres /></PrivateRoute>
        }/>
        <Route path="/gerencia/socios" element={
          <PrivateRoute roles={['gerente']}><GerenciaReparto /></PrivateRoute>
        }/>
        <Route path="/gerencia/usuarios" element={
          <PrivateRoute roles={['gerente']}><GerenciaUsuarios /></PrivateRoute>
        }/>
        <Route path="/gerencia/ajustes" element={
          <PrivateRoute roles={['gerente']}><GerenciaAjustes /></PrivateRoute>
        }/>
        <Route path="/gerencia/auditoria" element={
          <PrivateRoute roles={['gerente']}><GerenciaAuditoria /></PrivateRoute>
        }/>

        {/* Default */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
