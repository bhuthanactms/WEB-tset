/**
 * Simple authentication utilities with role-based access control.
 * This module provides: login, logout, getCurrentUser, and role management helpers.
 */

export type UserRole = 'sales' | 'design' | 'worker' | 'manager' | 'admin'

export interface AuthUser {
  /** Logged-in username */
  username: string
  /** User role */
  role: UserRole
  /** Account enabled status */
  enabled: boolean
}

export interface UserPermissions {
  canAccessStationAccessory?: boolean
}

export interface UserAccount {
  username: string
  password: string
  role: UserRole
  enabled: boolean
  permissions?: UserPermissions
}

// User accounts - 5 users per role
const USER_ACCOUNTS: UserAccount[] = [
  // Sales users (5 users)
  { username: 'Sale_game', password: 'game1234', role: 'sales', enabled: true },
  { username: 'Sale_Ton', password: 'Ton2345', role: 'sales', enabled: true },
  { username: 'Sale_Tak', password: 'Tak3456', role: 'sales', enabled: true },
  { username: 'sale.sp', password: 'Sale001', role: 'sales', enabled: true },
  { username: 'Technic_A', password: 'tech4567', role: 'sales', enabled: true },

  // Design users (5 users)
  { username: 'design01', password: 'Design001', role: 'design', enabled: true },
  { username: 'design02', password: 'Design002', role: 'design', enabled: true },
  { username: 'design03', password: 'Design003', role: 'design', enabled: true },
  { username: 'design04', password: 'Design004', role: 'design', enabled: true },
  { username: 'design05', password: 'Design005', role: 'design', enabled: true },

  // Worker users (5 users)
  { username: 'worker01', password: 'Worker001', role: 'worker', enabled: true },
  { username: 'worker02', password: 'Worker002', role: 'worker', enabled: true },
  { username: 'worker03', password: 'Worker003', role: 'worker', enabled: true },
  { username: 'worker04', password: 'Worker004', role: 'worker', enabled: true },
  { username: 'worker05', password: 'Worker005', role: 'worker', enabled: true },

  // Manager users (5 users)
  { username: 'manager01', password: 'Manager001', role: 'manager', enabled: true },
  { username: 'manager02', password: 'Manager002', role: 'manager', enabled: true },
  { username: 'manager03', password: 'Manager003', role: 'manager', enabled: true },
  { username: 'manager04', password: 'Manager004', role: 'manager', enabled: true },
  { username: 'manager05', password: 'Manager005', role: 'manager', enabled: true },

  // Admin users (5 users)
  { username: 'admin01', password: 'Admin001', role: 'admin', enabled: true },
  { username: 'admin02', password: 'Admin002', role: 'admin', enabled: true },
  { username: 'admin03', password: 'Admin003', role: 'admin', enabled: true },
  { username: 'admin04', password: 'Admin004', role: 'admin', enabled: true },
  { username: 'admin05', password: 'Admin005', role: 'admin', enabled: true },
]

// Storage keys
const STORAGE_KEY = 'authUser'
const USER_MANAGEMENT_KEY = 'userManagement'
const USER_PERMISSIONS_KEY = 'userPermissions'
const CUSTOM_USERS_KEY = 'customUsers'

interface UserManagementData {
  [username: string]: boolean
}

interface UserPermissionsData {
  [username: string]: UserPermissions
}

/**
 * Get user management settings from localStorage
 */
export function getUserManagement(): Map<string, boolean> {
  try {
    const stored = localStorage.getItem(USER_MANAGEMENT_KEY)
    if (!stored) return new Map()
    const data: UserManagementData = JSON.parse(stored)
    return new Map(Object.entries(data))
  } catch {
    return new Map()
  }
}

/**
 * Save user management settings to localStorage
 */
export function saveUserManagement(management: Map<string, boolean>): void {
  try {
    const data = Object.fromEntries(management)
    localStorage.setItem(USER_MANAGEMENT_KEY, JSON.stringify(data))
  } catch {
    // ignore storage errors
  }
}

/**
 * Get user permissions from localStorage
 */
export function getUserPermissions(): Map<string, UserPermissions> {
  try {
    const stored = localStorage.getItem(USER_PERMISSIONS_KEY)
    if (!stored) return new Map()
    const data: UserPermissionsData = JSON.parse(stored)
    return new Map(Object.entries(data))
  } catch {
    return new Map()
  }
}

/**
 * Save user permissions to localStorage
 */
export function saveUserPermissions(permissions: Map<string, UserPermissions>): void {
  try {
    const data = Object.fromEntries(permissions)
    localStorage.setItem(USER_PERMISSIONS_KEY, JSON.stringify(data))
  } catch {
    // ignore storage errors
  }
}

/**
 * Get custom users from localStorage
 */
function getCustomUsers(): UserAccount[] {
  try {
    const stored = localStorage.getItem(CUSTOM_USERS_KEY)
    if (!stored) return []
    return JSON.parse(stored) as UserAccount[]
  } catch {
    return []
  }
}

/**
 * Save custom users to localStorage
 */
function saveCustomUsers(users: UserAccount[]): void {
  try {
    localStorage.setItem(CUSTOM_USERS_KEY, JSON.stringify(users))
  } catch {
    // ignore storage errors
  }
}

/**
 * Create a new user account (ADMIN only)
 */
export function createUserAccount(username: string, password: string, role: UserRole): { ok: boolean; message?: string } {
  // Check if username already exists
  const allAccounts = getAllUserAccounts()
  if (allAccounts.some(acc => acc.username === username)) {
    return { ok: false, message: 'Username already exists' }
  }

  // Create new user
  const newUser: UserAccount = {
    username,
    password,
    role,
    enabled: true,
    permissions: {}
  }

  // Add to custom users
  const customUsers = getCustomUsers()
  customUsers.push(newUser)
  saveCustomUsers(customUsers)

  return { ok: true }
}

/**
 * Delete a custom user account (ADMIN only)
 */
export function deleteUserAccount(username: string): { ok: boolean; message?: string } {
  const customUsers = getCustomUsers()
  const filtered = customUsers.filter((u: UserAccount) => u.username !== username)

  if (filtered.length === customUsers.length) {
    return { ok: false, message: 'User not found' }
  }

  saveCustomUsers(filtered)

  // Also remove from management and permissions
  const management = getUserManagement()
  management.delete(username)
  saveUserManagement(management)

  const permissions = getUserPermissions()
  permissions.delete(username)
  saveUserPermissions(permissions)

  return { ok: true }
}

/**
 * Get all user accounts (including custom users)
 */
export function getAllUserAccounts(): UserAccount[] {
  const management = getUserManagement()
  const permissions = getUserPermissions()
  const customUsers = getCustomUsers()

  // Combine default and custom users
  const allAccounts = [...USER_ACCOUNTS, ...customUsers]

  return allAccounts.map(account => ({
    ...account,
    enabled: management.get(account.username) ?? account.enabled,
    permissions: permissions.get(account.username) || {}
  }))
}

/**
 * Update user account enabled status
 */
export function updateUserAccount(username: string, enabled: boolean): void {
  const management = getUserManagement()
  management.set(username, enabled)
  saveUserManagement(management)
}

/**
 * Update user permission
 */
export function updateUserPermission(username: string, permission: keyof UserPermissions, value: boolean): void {
  const permissions = getUserPermissions()
  const userPerms = permissions.get(username) || {}
  userPerms[permission] = value
  permissions.set(username, userPerms)
  saveUserPermissions(permissions)
}

/**
 * Get user permission
 */
export function getUserPermission(username: string, permission: keyof UserPermissions): boolean | undefined {
  const permissions = getUserPermissions()
  return permissions.get(username)?.[permission]
}

/**
 * Attempts to authenticate the user against the user accounts.
 * On success, persists the user in localStorage.
 */
export function login(username: string, password: string): { ok: boolean; message?: string; user?: AuthUser } {
  const management = getUserManagement()
  const customUsers = getCustomUsers()

  // Check in default accounts first
  let account = USER_ACCOUNTS.find(
    (u) => u.username === username && u.password === password
  )

  // If not found, check custom users
  if (!account) {
    account = customUsers.find(
      (u) => u.username === username && u.password === password
    )
  }

  if (!account) {
    return { ok: false, message: 'Invalid username or password.' }
  }

  // Check if account is enabled
  const isEnabled = management.get(username) ?? account.enabled
  if (!isEnabled) {
    return { ok: false, message: 'This account has been disabled. Please contact your manager.' }
  }

  const user: AuthUser = {
    username: account.username,
    role: account.role,
    enabled: isEnabled
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } catch {
    // ignore storage errors
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
    if (!raw) {
      console.log('⚠️ getCurrentUser: No user in localStorage')
      return null
    }
    const user = JSON.parse(raw) as AuthUser
    console.log('👤 getCurrentUser:', user)
    return user
  } catch (error) {
    console.error('❌ getCurrentUser error:', error)
    return null
  }
}

/** Returns true if a user is currently authenticated. */
export function isAuthenticated(): boolean {
  return getCurrentUser() !== null
}

/** Check if user has permission to access a feature */
export function hasPermission(user: AuthUser | null, requiredRole: UserRole | UserRole[]): boolean {
  if (!user) return false
  if (!user.enabled) return false

  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
  return roles.includes(user.role)
}

/** Check if user can access Station Accessory page */
export function canAccessStationAccessory(user: AuthUser | null): boolean {
  if (!user) {
    console.log('❌ canAccessStationAccessory: No user')
    return false
  }
  if (!user.enabled) {
    console.log('❌ canAccessStationAccessory: User disabled')
    return false
  }

  // Sales, Manager, and Admin can always access
  if (user.role === 'sales' || user.role === 'manager' || user.role === 'admin') {
    console.log('✅ canAccessStationAccessory: Allowed for role:', user.role)
    return true
  }

  // Check custom permission for other roles (Design, Worker)
  const customPermission = getUserPermission(user.username, 'canAccessStationAccessory')
  console.log('🔍 canAccessStationAccessory: Custom permission:', customPermission, 'for role:', user.role)
  return customPermission === true
}

/** Check if user can edit (not read-only) */
export function canEdit(user: AuthUser | null): boolean {
  if (!user) return false
  if (!user.enabled) return false

  // Worker and Design are read-only (cannot edit, save, or delete)
  return user.role !== 'worker' && user.role !== 'design'
}

/** Check if user can delete history */
export function canDeleteHistory(user: AuthUser | null): boolean {
  if (!user) return false
  if (!user.enabled) return false

  // Only Sales, Manager, and Admin can delete history
  return user.role === 'sales' || user.role === 'manager' || user.role === 'admin'
}

/** Check if user can save/edit history */
export function canSaveHistory(user: AuthUser | null): boolean {
  if (!user) return false
  if (!user.enabled) return false

  // Design and Worker cannot save/edit history
  return user.role !== 'design' && user.role !== 'worker'
}

/** Check if user is Manager */
export function isManager(user: AuthUser | null): boolean {
  return user?.role === 'manager' && user?.enabled === true
}

/** Check if user is Admin */
export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === 'admin' && user?.enabled === true
}

/** Check if user is Admin or Manager */
export function isAdminOrManager(user: AuthUser | null): boolean {
  return isAdmin(user) || isManager(user)
}
