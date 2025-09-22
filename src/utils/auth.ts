/**
 * Simple authentication utilities with in-memory credentials and localStorage persistence.
 * This module provides: login, logout, getCurrentUser helpers for a basic demo auth flow.
 */

export interface AuthUser {
  /** Logged-in username */
  username: string
}

/** Hardcoded demo accounts - temporary use only */
const DEMO_USERS: Array<{ username: string; password: string }> = [
  { username: 'admin', usernameDisplay: 'admin', password: 'admin123' } as any, // keep display alignment
  { username: 'user1', password: 'pass123' },
  { username: 'demo', password: 'demo123' },
  { username: 'guest', password: 'guest123' },
  // เพิ่ม sale users ให้ล็อกอินได้จริง
  { username: 'sale01', password: 'Eicsale01' },
  { username: 'sale02', password: 'Ctmssale01' },
  { username: 'sale03', password: 'Saleei01' },
  { username: 'sale04', password: 'Eicsale02' },
  { username: 'sale05', password: 'Ctmssale02' }
]

// Storage key used to persist the authenticated user
const STORAGE_KEY = 'authUser'

/**
 * Attempts to authenticate the user against the in-memory list.
 * On success, persists the user in localStorage.
 */
export function login(username: string, password: string): { ok: boolean; message?: string; user?: AuthUser } {
  const found = DEMO_USERS.find((u) => u.username === username && u.password === password)
  if (!found) {
    return { ok: false, message: 'Invalid username or password.' }
  }
  const user: AuthUser = { username: found.username }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } catch {
    // ignore storage errors in demo
  }
  return { ok: true, user }
}

/** Removes the current authenticated user from storage. */
export function logout(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

/** Returns the authenticated user from storage, or null if none. */
export function getCurrentUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

/** Returns true if a user is currently authenticated. */
export function isAuthenticated(): boolean {
  return getCurrentUser() !== null
}

/** Returns a copy of the demo users for UI hints. */
export function getDemoUsers(): Array<{ username: string; password: string }> {
  return DEMO_USERS.map((u) => ({ username: u.username, password: u.password }))
}

/** Returns 5 static sale users with different passwords */
export function getSaleUsers() {
  return [
    { username: 'sale01', password: 'Eicsale01' },
    { username: 'sale02', password: 'Ctmssale01' },
    { username: 'sale03', password: 'Saleei01' },
    { username: 'sale04', password: 'Eicsale02' },
    { username: 'sale05', password: 'Ctmssale02' },
  ]
}
