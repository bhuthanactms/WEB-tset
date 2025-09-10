import { HashRouter, Route, Routes } from 'react-router'
import HomePage from './pages/Home'
import LoginPage from './pages/Login'
import AppHeader from './components/layout/AppHeader'
import { isAuthenticated } from '@/utils/auth'
import React, { useEffect, useState } from 'react'

/**
 * RequireAuth - guards child content. If not authenticated, redirects to /login.
 * Uses hash navigation directly to comply with current router constraints.
 */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean>(isAuthenticated())

  useEffect(() => {
    if (!authed) {
      // Redirect to login if not authenticated
      window.location.hash = '#/login'
    }
  }, [authed])

  // Re-check auth on hash changes (basic sync)
  useEffect(() => {
    const onHash = () => setAuthed(isAuthenticated())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  if (!authed) return null
  return <>{children}</>
}

export default function App() {
  return (
    <HashRouter>
      {/* Global navigation header */}
      <AppHeader />

      <Routes>
        <Route
          path="/"
          element={
            <RequireAuth>
              <HomePage />
            </RequireAuth>
          }
        />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </HashRouter>
  )
}
