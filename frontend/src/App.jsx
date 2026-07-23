import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Login          from './pages/auth/Login'
import AuthCallback   from './pages/auth/AuthCallback'
import ForgotPassword from './pages/auth/ForgotPassword'
import Casillero      from './pages/cliente/Casillero'
import Paquetes       from './pages/cliente/Paquetes'

const Placeholder = ({ title }) => (
  <div className="min-h-screen flex items-center justify-center"
    style={{ background: '#F4F6FA' }}>
    <div className="text-center">
      <div className="text-4xl mb-3">🚧</div>
      <p className="text-slate-600 font-medium">{title}</p>
      <p className="text-slate-400 text-sm mt-1">En desarrollo</p>
    </div>
  </div>
)

function PrivateRoute({ children }) {
  const session = useAuthStore((s) => s.session)
  return session ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"                element={<Login />} />
        <Route path="/auth/callback"        element={<AuthCallback />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />

        <Route path="/cliente/casillero" element={
          <PrivateRoute><Casillero /></PrivateRoute>
        }/>
        <Route path="/cliente/paquetes" element={
          <PrivateRoute><Paquetes /></PrivateRoute>
        }/>
        <Route path="/cliente/perfil" element={
          <PrivateRoute><Placeholder title="Perfil" /></PrivateRoute>
        }/>
        <Route path="/bodeguero/recepcion" element={
          <PrivateRoute><Placeholder title="Recepción bodeguero" /></PrivateRoute>
        }/>
        <Route path="/admin/dashboard" element={
          <PrivateRoute><Placeholder title="Dashboard admin" /></PrivateRoute>
        }/>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}