import { HashRouter, Route, Routes } from 'react-router'
import HomePage from './pages/Home'
import LoginPage from './pages/Login'
import AdminUsersPage from './pages/AdminUsers'
import AppHeader from './components/layout/AppHeader'
import { isAuthenticated, getCurrentUserSync } from '@/utils/auth'
import React, { useEffect, useState } from 'react'
import StationAccessory from './pages/StationAccessory'

// Guard: ต้อง login ก่อน
function RequireAuth({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean>(isAuthenticated())

  useEffect(() => {
    if (!authed) window.location.hash = '#/login'
  }, [authed])

  useEffect(() => {
    const onHash = () => setAuthed(isAuthenticated())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  if (!authed) return null
  return <>{children}</>
}

// Guard: ต้องไม่ใช่ worker หรือ design (redirect กลับ home)
function RequireStationAccess({ children }: { children: React.ReactNode }) {
  const user = getCurrentUserSync()
  if (user?.role === 'worker' || user?.role === 'design') {
    window.location.hash = '#/'
    return null
  }
  return <>{children}</>
}

// Guard: ต้องเป็น admin เท่านั้น
function RequireAdmin({ children }: { children: React.ReactNode }) {
  const user = getCurrentUserSync()
  if (user?.role !== 'admin') {
    window.location.hash = '#/'
    return null
  }
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
        <Route
          path="/admin/users"
          element={
            <RequireAuth>
              <RequireAdmin>
                <AdminUsersPage />
              </RequireAdmin>
            </RequireAuth>
          }
        />
        <Route
          path="/station-accessory"
          element={
            <RequireAuth>
              <RequireStationAccess>
                <StationAccessory />
              </RequireStationAccess>
            </RequireAuth>
          }
        />
      </Routes>
    </HashRouter>
  )
}
