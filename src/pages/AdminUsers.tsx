import React, { useEffect, useState } from 'react'
import {
  getAllUserAccounts,
  createUserAccount,
  deleteUserAccount,
  updateUserEnabled,
  updateUserRole,
  updateUserPermission,
  getLoginHistory,
  getCurrentUserSync,
  UserAccount,
  UserRole,
} from '@/utils/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Shield, UserPlus, Trash2, Clock, RefreshCw } from 'lucide-react'

const ROLE_LABELS: Record<UserRole, string> = {
  sales: 'Sales',
  design: 'Design',
  worker: 'Worker',
  manager: 'Manager',
  admin: 'Admin',
}

const ROLE_COLORS: Record<UserRole, string> = {
  sales: 'bg-blue-100 text-blue-800',
  design: 'bg-purple-100 text-purple-800',
  worker: 'bg-orange-100 text-orange-800',
  manager: 'bg-green-100 text-green-800',
  admin: 'bg-red-100 text-red-800',
}

export default function AdminUsers() {
  const currentUser = getCurrentUserSync()
  const [users, setUsers] = useState<UserAccount[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ username: '', password: '', role: 'sales' as UserRole })
  const [createError, setCreateError] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<UserAccount | null>(null)


  const loadData = async () => {
    setLoading(true)
    const [usersData, historyData] = await Promise.all([
      getAllUserAccounts(),
      getLoginHistory(),
    ])
    setUsers(usersData)
    setHistory(historyData)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const handleCreate = async () => {
    if (!createForm.username || !createForm.password) {
      setCreateError('กรุณากรอกข้อมูลให้ครบ')
      return
    }
    setCreateLoading(true)
    setCreateError('')
    const res = await createUserAccount(createForm.username, createForm.password, createForm.role)
    setCreateLoading(false)
    if (!res.ok) {
      setCreateError(res.message || 'สร้างผู้ใช้ไม่สำเร็จ')
      return
    }
    setShowCreate(false)
    setCreateForm({ username: '', password: '', role: 'sales' })
    loadData()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await deleteUserAccount(deleteTarget.userId)
    setDeleteTarget(null)
    loadData()
  }

  const handleToggleEnabled = async (user: UserAccount) => {
    await updateUserEnabled(user.userId, !user.enabled)
    loadData()
  }

  const handleRoleChange = async (user: UserAccount, role: UserRole) => {
    await updateUserRole(user.userId, role)
    loadData()
  }

  const handlePermissionChange = async (user: UserAccount, enabled: boolean) => {
    await updateUserPermission(user.userId, 'canAccessStationAccessory', enabled)
    loadData()
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-7 w-7 text-red-600" />
        <h1 className="text-2xl font-bold">จัดการผู้ใช้งาน</h1>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="mb-6">
          <TabsTrigger value="users">ผู้ใช้ทั้งหมด</TabsTrigger>
          <TabsTrigger value="history">ประวัติการเข้าสู่ระบบ</TabsTrigger>
        </TabsList>

        {/* Tab: Users */}
        <TabsContent value="users">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">ทั้งหมด {users.length} คน</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadData}>
                <RefreshCw className="h-4 w-4 mr-1" /> รีเฟรช
              </Button>
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <UserPlus className="h-4 w-4 mr-1" /> เพิ่มผู้ใช้
              </Button>
            </div>
          </div>

          {loading ? (
            <p className="text-center text-gray-400 py-12">กำลังโหลด...</p>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <Card key={user.userId} className={!user.enabled ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-4">
                      {/* Username + Role */}
                      <div className="flex-1 min-w-[160px]">
                        <p className="font-semibold">{user.username}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[user.role]}`}>
                          {ROLE_LABELS[user.role]}
                        </span>
                      </div>

                      {/* Role Selector */}
                      <div className="w-36">
                        <Select
                          value={user.role}
                          onValueChange={(v) => handleRoleChange(user, v as UserRole)}
                          disabled={user.userId === currentUser.id}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Station Accessory Permission */}
                      <div className="flex items-center gap-2 text-sm">
                        <Switch
                          checked={user.permissions?.canAccessStationAccessory ?? false}
                          onCheckedChange={(v) => handlePermissionChange(user, v)}
                          disabled={user.role === 'sales' || user.role === 'manager' || user.role === 'admin'}
                        />
                        <span className="text-gray-600 text-xs">Station Accessory</span>
                      </div>

                      {/* Enable/Disable */}
                      <div className="flex items-center gap-2 text-sm">
                        <Switch
                          checked={user.enabled}
                          onCheckedChange={() => handleToggleEnabled(user)}
                          disabled={user.userId === currentUser.id}
                        />
                        <span className={user.enabled ? 'text-green-600' : 'text-red-500'}>
                          {user.enabled ? 'เปิดใช้' : 'ปิดใช้'}
                        </span>
                      </div>

                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteTarget(user)}
                        disabled={user.userId === currentUser.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Login History */}
        <TabsContent value="history">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">100 รายการล่าสุด</p>
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-1" /> รีเฟรช
            </Button>
          </div>
          {loading ? (
            <p className="text-center text-gray-400 py-12">กำลังโหลด...</p>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {history.length === 0 && (
                    <p className="text-center text-gray-400 py-8">ยังไม่มีประวัติ</p>
                  )}
                  {history.map((h, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3">
                      <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{h.username}</p>
                        <p className="text-xs text-gray-400 truncate max-w-xs">{h.user_agent}</p>
                      </div>
                      <p className="text-xs text-gray-500 shrink-0">
                        {new Date(h.logged_in_at).toLocaleString('th-TH')}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog: Create User */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มผู้ใช้ใหม่</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Username</Label>
              <Input
                value={createForm.username}
                onChange={(e) => setCreateForm((s) => ({ ...s, username: e.target.value }))}
                placeholder="เช่น Sale_John"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm((s) => ({ ...s, password: e.target.value }))}
                placeholder="รหัสผ่านอย่างน้อย 6 ตัว"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select
                value={createForm.role}
                onValueChange={(v) => setCreateForm((s) => ({ ...s, role: v as UserRole }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {createError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{createError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>ยกเลิก</Button>
            <Button onClick={handleCreate} disabled={createLoading}>
              {createLoading ? 'กำลังสร้าง...' : 'สร้างผู้ใช้'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirm Delete */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบผู้ใช้</DialogTitle>
          </DialogHeader>
          <p className="py-2">ต้องการลบ <strong>{deleteTarget?.username}</strong> ใช่หรือไม่? ข้อมูลทั้งหมดของผู้ใช้นี้จะถูกลบถาวร</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>ยกเลิก</Button>
            <Button variant="destructive" onClick={handleDelete}>ลบ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
