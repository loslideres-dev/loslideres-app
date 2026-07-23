import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

// Auth
import Login           from './pages/auth/Login'
import AuthCallback    from './pages/auth/AuthCallback'
import ForgotPassword  from './pages/auth/ForgotPassword'
import ConfirmarCorreo from './pages/auth/ConfirmarCorreo'
import Onboarding      from './pages/auth/Onboarding'

// Cliente
import Casillero       from './pages/cliente/Casillero'
import Paquetes        from './pages/cliente/Paquetes'
import DetallePaquete  from './pages/cliente/DetallePaquete'
import Perfil          from './pages/cliente/Perfil'

// Bodeguero
import Recepcion       from './pages/bodeguero/Recepcion'
import Registros       from './pages/bodeguero/Registros'

// Admin
import Dashboard       from './pages/admin/Dashboard'
import PaquetesAdmin   from './pages/admin/Paquetes'
import Tarifas         from './pages/admin/Tarifas'
import Auditoria       from './pages/admin/Auditoria'
import Usuarios        from './pages/admin/Usuarios'

// Guards
function PrivateRoute({ children, roles }) {
  const session   = useAuthStore(s => s.session)
  const userRoles = useAuthStore(s => s.roles)
  if (!session) return <Navigate to="/login" replace />
  if (roles && !roles.some(r => userRoles.includes(r))) {
    return <Navigate to="/login" replace />
  }
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Públicas */}
        <Route path="/login"                 element={<Login />} />
        <Route path="/auth/callback"         element={<AuthCallback />} />
        <Route path="/auth/forgot-password"  element={<ForgotPassword />} />
        <Route path="/auth/confirmar-correo" element={<ConfirmarCorreo />} />

        {/* Onboarding — requiere sesión, no requiere perfil completo */}
        <Route path="/onboarding" element={
          <PrivateRoute><Onboarding /></PrivateRoute>
        }/>

        {/* Cliente */}
        <Route path="/cliente/casillero" element={
          <PrivateRoute roles={['cliente','admin']}><Casillero /></PrivateRoute>
        }/>
        <Route path="/cliente/paquetes" element={
          <PrivateRoute roles={['cliente','admin']}><Paquetes /></PrivateRoute>
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

        {/* Admin */}
        <Route path="/admin/dashboard" element={
          <PrivateRoute roles={['admin']}><Dashboard /></PrivateRoute>
        }/>
        <Route path="/admin/paquetes" element={
          <PrivateRoute roles={['admin']}><PaquetesAdmin /></PrivateRoute>
        }/>
        <Route path="/admin/tarifas" element={
          <PrivateRoute roles={['admin']}><Tarifas /></PrivateRoute>
        }/>
        <Route path="/admin/auditoria" element={
          <PrivateRoute roles={['admin']}><Auditoria /></PrivateRoute>
        }/>
        <Route path="/admin/usuarios" element={
          <PrivateRoute roles={['admin']}><Usuarios /></PrivateRoute>
        }/>

        {/* Default */}
        <Route path="/"  element={<Navigate to="/login" replace />} />
        <Route path="*"  element={<Navigate to="/login" replace />} />

      </Routes>
    </BrowserRouter>
  )
}
