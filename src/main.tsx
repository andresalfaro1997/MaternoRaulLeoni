import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { DialogProvider } from './components/Dialogs'
import { Layout } from './components/Layout'
import LoginPage from './pages/LoginPage'
import PersonalPage from './pages/PersonalPage'
import UsuariosPage from './pages/UsuariosPage'
import ProfilePage from './pages/ProfilePage'
import HorarioPage from './pages/HorarioPage'
import './index.css'
import './transitions.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <DialogProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<Layout />}>
                <Route index element={<PersonalPage />} />
                <Route path="trabajadores" element={<Navigate to="/" replace />} />
                <Route path="grupos" element={<Navigate to="/" replace />} />
                <Route path="perfil" element={<ProfilePage />} />
                <Route path="horario" element={<HorarioPage />} />
                <Route path="usuarios" element={<UsuariosPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </DialogProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
