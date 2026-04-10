import { supabase, supabaseAdmin } from './supabase'

export type UserRole = 'sales' | 'design' | 'worker' | 'manager' | 'admin'

export interface AuthUser {
  id: string
  username: string
  role: UserRole
  enabled: boolean
}

export interface UserPermissions {
  canAccessStationAccessory?: boolean
}

export interface UserAccount {
  id: string
  userId: string
  username: string
  role: UserRole
  enabled: boolean
  permissions?: UserPermissions
  createdAt: string
}

/**
 * Login ด้วย Supabase Auth
 * - บันทึก login history
 * - ดึง role จาก user_profiles
 */
export async function login(
  username: string,
  password: string
): Promise<{ ok: boolean; message?: string; user?: AuthUser }> {
  // Supabase Auth ใช้ email ดังนั้น username จะถูก map เป็น email ภายใน
  const email = `${username}@internal.app`

  // sign out session เก่าก่อนเสมอ เพื่อบังคับ 1 session ต่อ user
  await supabase.auth.signOut()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    return { ok: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }
  }

  // ดึง profile และตรวจสอบ enabled
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', data.user.id)
    .single()

  if (profileError || !profile) {
    await supabase.auth.signOut()
    return { ok: false, message: 'ไม่พบข้อมูลผู้ใช้' }
  }

  if (!profile.enabled) {
    await supabase.auth.signOut()
    return { ok: false, message: 'บัญชีนี้ถูกระงับ กรุณาติดต่อผู้ดูแลระบบ' }
  }

  // สร้าง session token ใหม่ และบันทึกลง DB (บังคับ 1 session)
  const sessionToken = crypto.randomUUID()
  await supabase
    .from('user_profiles')
    .update({ active_session_token: sessionToken })
    .eq('user_id', data.user.id)

  // เก็บ token ใน localStorage
  localStorage.setItem('sessionToken', sessionToken)

  // บันทึก login history
  await supabase.from('login_histories').insert({
    user_id: data.user.id,
    username: profile.username,
    user_agent: navigator.userAgent,
  })

  return {
    ok: true,
    user: {
      id: data.user.id,
      username: profile.username,
      role: profile.role as UserRole,
      enabled: profile.enabled,
    },
  }
}

/** Logout */
export async function logout(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    // clear session token ใน DB
    await supabase
      .from('user_profiles')
      .update({ active_session_token: null })
      .eq('user_id', session.user.id)
  }
  await supabase.auth.signOut()
  localStorage.removeItem('sessionToken')
  localStorage.removeItem('authUser')
}

/** ดึง current user และตรวจสอบ session token (บังคับ 1 session) */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const localToken = localStorage.getItem('sessionToken')
  if (!localToken) {
    await supabase.auth.signOut()
    return null
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .single()

  if (!profile || !profile.enabled) {
    await supabase.auth.signOut()
    localStorage.removeItem('sessionToken')
    localStorage.removeItem('authUser')
    return null
  }

  // ถ้า token ไม่ตรง แปลว่ามีคนล็อกอินที่อื่น → kick ออก
  if (profile.active_session_token !== localToken) {
    await supabase.auth.signOut()
    localStorage.removeItem('sessionToken')
    localStorage.removeItem('authUser')
    return null
  }

  return {
    id: session.user.id,
    username: profile.username,
    role: profile.role as UserRole,
    enabled: profile.enabled,
  }
}

/** ดึง current user แบบ sync จาก localStorage (ใช้สำหรับ initial render) */
export function getCurrentUserSync(): AuthUser | null {
  try {
    const raw = localStorage.getItem('authUser')
    if (!raw) return null
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

/** บันทึก user ลง localStorage สำหรับ sync access */
export function cacheUser(user: AuthUser | null): void {
  try {
    if (user) {
      localStorage.setItem('authUser', JSON.stringify(user))
    } else {
      localStorage.removeItem('authUser')
    }
  } catch {
    // ignore
  }
}

export function isAuthenticated(): boolean {
  return getCurrentUserSync() !== null
}

// ---- Admin: จัดการ User ----

/** สร้าง user ใหม่ (Admin only) */
export async function createUserAccount(
  username: string,
  password: string,
  role: UserRole
): Promise<{ ok: boolean; message?: string }> {
  const email = `${username}@internal.app`

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error || !data.user) {
    return { ok: false, message: error?.message || 'สร้างผู้ใช้ไม่สำเร็จ' }
  }

  const { error: profileError } = await supabaseAdmin.from('user_profiles').insert({
    user_id: data.user.id,
    username,
    role,
    enabled: true,
    permissions: {},
  })

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(data.user.id)
    return { ok: false, message: 'สร้าง profile ไม่สำเร็จ' }
  }

  return { ok: true }
}

/** ลบ user (Admin only) */
export async function deleteUserAccount(
  userId: string
): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (error) return { ok: false, message: error.message }
  return { ok: true }
}

/** ดึง user ทั้งหมด (Admin only) */
export async function getAllUserAccounts(): Promise<UserAccount[]> {
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: true })

  if (error || !data) return []

  return data.map((p) => ({
    id: p.id,
    userId: p.user_id,
    username: p.username,
    role: p.role as UserRole,
    enabled: p.enabled,
    permissions: p.permissions || {},
    createdAt: p.created_at,
  }))
}

/** เปิด/ปิด user (Admin only) */
export async function updateUserEnabled(userId: string, enabled: boolean): Promise<void> {
  await supabaseAdmin.from('user_profiles').update({ enabled }).eq('user_id', userId)
}

/** อัปเดต role (Admin only) */
export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  await supabaseAdmin.from('user_profiles').update({ role }).eq('user_id', userId)
}

/** อัปเดต permission (Admin only) */
export async function updateUserPermission(
  userId: string,
  permission: keyof UserPermissions,
  value: boolean
): Promise<void> {
  const { data } = await supabaseAdmin
    .from('user_profiles')
    .select('permissions')
    .eq('user_id', userId)
    .single()

  const permissions = { ...(data?.permissions || {}), [permission]: value }
  await supabaseAdmin.from('user_profiles').update({ permissions }).eq('user_id', userId)
}

/** ดึง login history (Admin only) */
export async function getLoginHistory(userId?: string) {
  let query = supabaseAdmin
    .from('login_histories')
    .select('*')
    .order('logged_in_at', { ascending: false })
    .limit(100)

  if (userId) query = query.eq('user_id', userId)

  const { data } = await query
  return data || []
}

// ---- Permission Helpers ----

export function hasPermission(user: AuthUser | null, requiredRole: UserRole | UserRole[]): boolean {
  if (!user || !user.enabled) return false
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
  return roles.includes(user.role)
}

export function canEdit(user: AuthUser | null): boolean {
  if (!user || !user.enabled) return false
  return user.role !== 'worker' && user.role !== 'design'
}

export function canDeleteHistory(user: AuthUser | null): boolean {
  if (!user || !user.enabled) return false
  return user.role === 'sales' || user.role === 'manager' || user.role === 'admin'
}

export function canSaveHistory(user: AuthUser | null): boolean {
  if (!user || !user.enabled) return false
  return user.role !== 'design' && user.role !== 'worker'
}

export function isManager(user: AuthUser | null): boolean {
  return user?.role === 'manager' && user?.enabled === true
}

export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === 'admin' && user?.enabled === true
}

export function isAdminOrManager(user: AuthUser | null): boolean {
  return isAdmin(user) || isManager(user)
}

export function canAccessStationAccessory(user: AuthUser | null): boolean {
  if (!user || !user.enabled) return false
  return user.role === 'sales' || user.role === 'manager' || user.role === 'admin'
}
