
/**
 * AppHeader - Navigation header for the application
 * Displays user info, navigation buttons, and signout functionality
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { User, LogOut, ArrowLeft, ArrowRight, Menu, Search, X, Home, Users, Settings } from 'lucide-react'
import { getCurrentUser, logout, isManager, isAdmin, isAdminOrManager, canEdit, canDeleteHistory, canSaveHistory, getAllUserAccounts, updateUserAccount, updateUserPermission, createUserAccount, deleteUserAccount, UserAccount, UserRole } from '@/utils/auth'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useNavigate, useLocation } from 'react-router-dom'
import { Trash2 } from 'lucide-react'

/**
 * AppHeader component - Main application header
 */
interface SavedHistory {
  customerCode: string
  page: 'home' | 'station-accessory' | 'combined'
  data: any
  homeData?: any
  stationData?: any
  savedAt: string
  lastUpdated?: string
}

export default function AppHeader(): React.JSX.Element {
  const currentUser = getCurrentUser()
  const navigate = useNavigate()
  const location = useLocation()
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false)
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false)
  const [history, setHistory] = useState<SavedHistory[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([])

  // Create user form state
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<UserRole>('sales')

  // Use useMemo to stabilize currentUser reference
  const currentUserId = React.useMemo(() => currentUser?.username || null, [currentUser?.username])
  const isAdminOrManagerUser = React.useMemo(() => isAdminOrManager(currentUser), [currentUser?.username, currentUser?.role])

  // Use useCallback to memoize loadHistory function to prevent infinite loops
  const loadHistory = React.useCallback(() => {
    try {
      const allKeys = Object.keys(localStorage)
      const historyMap = new Map<string, SavedHistory>()

      // Load combined data (key format: ev_combined_data_${customerCode})
      allKeys.forEach(key => {
        if (key.startsWith('ev_combined_data_')) {
          try {
            const combinedData = JSON.parse(localStorage.getItem(key) || '{}')
            if (combinedData.customerCode) {
              historyMap.set(combinedData.customerCode, {
                customerCode: combinedData.customerCode,
                page: 'combined',
                data: combinedData,
                homeData: combinedData.home,
                stationData: combinedData.stationAccessory,
                savedAt: combinedData.savedAt || new Date().toISOString(),
                lastUpdated: combinedData.lastUpdated
              })
            }
          } catch (e) {
            // Skip invalid entries
          }
        }
      })

      // Load timestamped history keys and current data keys
      allKeys.forEach(key => {
        // Check for timestamped keys: ev_calculator_form_data_${customerCode}_${timestamp}
        if (key.startsWith('ev_calculator_form_data_') && key !== 'ev_calculator_form_data') {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}')
            if (data.customerCode) {
              const existing = historyMap.get(data.customerCode)
              if (!existing || new Date(data.savedAt || 0).getTime() > new Date(existing.savedAt).getTime()) {
                historyMap.set(data.customerCode, {
                  customerCode: data.customerCode,
                  page: existing?.stationData ? 'combined' : 'home',
                  data: data,
                  homeData: data,
                  stationData: existing?.stationData,
                  savedAt: data.savedAt || new Date().toISOString()
                })
              } else if (existing && !existing.homeData) {
                existing.homeData = data
                if (existing.stationData) existing.page = 'combined'
              }
            }
          } catch (e) {
            // Skip invalid entries
          }
        }
        // Check for timestamped keys: ev_station_accessory_form_data_${customerCode}_${timestamp}
        if (key.startsWith('ev_station_accessory_form_data_') && key !== 'ev_station_accessory_form_data') {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}')
            if (data.customerCode) {
              const existing = historyMap.get(data.customerCode)
              if (!existing || new Date(data.savedAt || 0).getTime() > new Date(existing.savedAt).getTime()) {
                historyMap.set(data.customerCode, {
                  customerCode: data.customerCode,
                  page: existing?.homeData ? 'combined' : 'station-accessory',
                  data: data,
                  homeData: existing?.homeData,
                  stationData: data,
                  savedAt: data.savedAt || new Date().toISOString()
                })
              } else if (existing && !existing.stationData) {
                existing.stationData = data
                if (existing.homeData) existing.page = 'combined'
              }
            }
          } catch (e) {
            // Skip invalid entries
          }
        }
      })

      // Load current data keys (key format: ev_calculator_form_data or ev_station_accessory_form_data) - ไม่มี timestamp
      const currentHomeData = localStorage.getItem('ev_calculator_form_data')
      const currentStationData = localStorage.getItem('ev_station_accessory_form_data')

      if (currentHomeData) {
        try {
          const data = JSON.parse(currentHomeData)
          if (data.customerCode) {
            const existing = historyMap.get(data.customerCode)
            if (!existing) {
              historyMap.set(data.customerCode, {
                customerCode: data.customerCode,
                page: 'home',
                data: data,
                homeData: data,
                savedAt: data.savedAt || new Date().toISOString()
              })
            } else if (!existing.homeData || new Date(data.savedAt || 0).getTime() > new Date(existing.savedAt).getTime()) {
              existing.homeData = data
              if (existing.stationData) existing.page = 'combined'
            }
          }
        } catch (e) {
          // Skip invalid entries
        }
      }

      if (currentStationData) {
        try {
          const data = JSON.parse(currentStationData)
          if (data.customerCode) {
            const existing = historyMap.get(data.customerCode)
            if (!existing) {
              historyMap.set(data.customerCode, {
                customerCode: data.customerCode,
                page: 'station-accessory',
                data: data,
                stationData: data,
                savedAt: data.savedAt || new Date().toISOString()
              })
            } else if (!existing.stationData || new Date(data.savedAt || 0).getTime() > new Date(existing.savedAt).getTime()) {
              existing.stationData = data
              if (existing.homeData) existing.page = 'combined'
            }
          }
        } catch (e) {
          // Skip invalid entries
        }
      }

      // Convert map to array and sort by savedAt (newest first)
      const historyItems = Array.from(historyMap.values())
      historyItems.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
      setHistory(historyItems)
    } catch (error) {
      console.error('Error loading history:', error)
    }
  }, [])

  useEffect(() => {
    loadHistory()
    if (isAdminOrManagerUser) {
      setUserAccounts(getAllUserAccounts())
    }
  }, [loadHistory, isAdminOrManagerUser])

  const handleSignOut = () => {
    logout()
    window.location.hash = '#/login'
  }

  const handleBack = () => {
    window.history.back()
  }

  const handleForward = () => {
    window.history.forward()
  }

  const handleGoHome = () => {
    console.log('🏠 handleGoHome called - Reset and exit history')
    try {
      // ลบข้อมูลปัจจุบันใน localStorage (แต่ไม่ลบประวัติการบันทึก)
      localStorage.removeItem('ev_calculator_form_data')
      localStorage.removeItem('ev_station_accessory_form_data')
      // ลบ flag ที่บอกว่าโหลดจากประวัติ
      sessionStorage.removeItem('loaded_from_history')
      // ตั้ง flag เพื่อบอกให้หน้าแรก reset form
      sessionStorage.setItem('reset_form_on_load', 'true')
      console.log('✅ Cleared current data and set reset_form_on_load flag')
      
      // ถ้าอยู่ที่หน้า Station Accessory ให้ navigate ไปหน้าแรก
      if (location.pathname === '/station-accessory') {
        navigate('/', { replace: true })
        console.log('✅ Navigate to home page')
        // Force reload เพื่อให้ useEffect ทำงาน
        setTimeout(() => {
          window.location.reload()
        }, 100)
      } else {
        // ถ้าอยู่ที่หน้า Home แล้ว ให้ reload เพื่อ reset form
        console.log('✅ Already on home page, reloading to reset form')
        window.location.reload()
      }
    } catch (error) {
      console.error('❌ Error in handleGoHome:', error)
      alert('เกิดข้อผิดพลาดในการรีเซ็ท')
    }
  }

  const handleLoadHistory = (item: SavedHistory, targetPage?: 'home' | 'station-accessory') => {
    const target = targetPage || item.page

    if (target === 'home' || target === 'combined') {
      // Load home data
      const homeData = item.homeData || item.data
      if (homeData) {
        localStorage.setItem('ev_calculator_form_data', JSON.stringify(homeData))
      }
      if (target === 'home' || !targetPage) {
        // ตั้ง flag เพื่อบอกว่าโหลดจากประวัติ
        sessionStorage.setItem('loaded_from_history', 'true')
        navigate('/', { state: { loadData: homeData } })
        setIsHistoryOpen(false)
        // ไม่ต้อง reload เพราะจะทำให้ state หายไป
        return
      }
    }

    if (target === 'station-accessory' || target === 'combined') {
      // Load station accessory data
      const stationData = item.stationData || item.data
      if (stationData) {
        localStorage.setItem('ev_station_accessory_form_data', JSON.stringify(stationData))
        console.log('💾 Saved stationData to localStorage:', stationData)
      }
      // Also load home data if available for context
      if (item.homeData) {
        const homeData = item.homeData
        localStorage.setItem('ev_calculator_form_data', JSON.stringify(homeData))
        console.log('💾 Saved homeData to localStorage:', homeData)
      }
      if (target === 'station-accessory' || !targetPage) {
        // ส่งทั้ง stationData และ homeData ไปใน state
        navigate('/station-accessory', {
          state: {
            loadData: stationData,
            homeData: item.homeData,
            ...item.homeData // Spread homeData เพื่อให้เข้าถึงได้โดยตรง
          }
        })
        setIsHistoryOpen(false)
        console.log('✅ Navigated to StationAccessory with data:', { stationData, homeData: item.homeData })
        // ไม่ต้อง reload เพราะจะทำให้ state หายไป
        return
      }
    }
  }

  const handleDeleteHistory = (item: SavedHistory, e: React.MouseEvent) => {
    e.stopPropagation() // ป้องกันไม่ให้ trigger การคลิกที่ parent

    // เฉพาะ Sales, Manager, และ Admin เท่านั้นที่สามารถลบได้
    if (!canDeleteHistory(currentUser)) {
      alert('⚠️ คุณไม่มีสิทธิ์ลบประวัติ (Read-only mode)')
      return
    }

    if (!confirm(`คุณต้องการลบประวัติของรหัสลูกค้า "${item.customerCode}" หรือไม่?`)) {
      return
    }

    try {
      // ลบ combined data
      const combinedKey = `ev_combined_data_${item.customerCode}`
      localStorage.removeItem(combinedKey)

      // ลบ individual page data
      localStorage.removeItem('ev_calculator_form_data')
      localStorage.removeItem('ev_station_accessory_form_data')

      // ลบข้อมูลที่มี customerCode ตรงกันทั้งหมด
      const allKeys = Object.keys(localStorage)
      allKeys.forEach(key => {
        if (key.startsWith('ev_calculator_form_data_') ||
          key.startsWith('ev_station_accessory_form_data_') ||
          key.startsWith('ev_combined_form_data_')) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}')
            if (data.customerCode === item.customerCode) {
              localStorage.removeItem(key)
            }
          } catch (e) {
            // Skip invalid entries
          }
        }
      })

      // Reload history
      loadHistory()
      alert('✅ ลบประวัติสำเร็จ!')
    } catch (error) {
      console.error('Error deleting history:', error)
      alert('❌ เกิดข้อผิดพลาดในการลบประวัติ')
    }
  }

  const filteredHistory = history.filter(item =>
    item.customerCode.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Left side - Home button, Hamburger menu and Navigation buttons */}
        <div className="flex items-center gap-2">
          {(location.pathname === '/' || location.pathname === '/station-accessory') && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('🏠 Home button clicked - Reset and exit history')
                handleGoHome()
              }}
              title="รีเซ็ทและออกจากหน้าประวัติ (Reset & Exit History)"
              className="bg-red-50 hover:bg-red-100 text-red-600 border-red-300 hover:border-red-400"
            >
              <Home className="h-4 w-4" />
            </Button>
          )}
          <Sheet open={isHistoryOpen} onOpenChange={(open) => {
            setIsHistoryOpen(open);
            if (open) {
              loadHistory(); // Reload history when opening
            }
          }}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <SheetTitle className="flex items-center justify-between">
                  <span>ประวัติการบันทึก</span>
                  {isAdminOrManager(currentUser) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsUserManagementOpen(true)
                        setUserAccounts(getAllUserAccounts())
                      }}
                      className="ml-2"
                    >
                      <Users className="h-4 w-4 mr-1" />
                      User Management
                    </Button>
                  )}
                </SheetTitle>
                <SheetDescription>
                  {!canSaveHistory(currentUser) ? 'โหมดอ่านอย่างเดียว (Read-only)' : 'ค้นหาและเลือกประวัติที่บันทึกไว้'}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="ค้นหารหัสลูกค้า..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {filteredHistory.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      {searchTerm ? 'ไม่พบข้อมูลที่ค้นหา' : 'ไม่มีประวัติการบันทึก'}
                    </div>
                  ) : (
                    filteredHistory.map((item, index) => (
                      <div
                        key={index}
                        className="p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="font-semibold text-lg">{item.customerCode}</div>
                            <div className="text-sm text-gray-500 mt-1">
                              {item.page === 'combined'
                                ? 'ทั้ง 2 หน้า (Home + Station Accessory)'
                                : item.page === 'home'
                                  ? 'หน้าแรก (Home)'
                                  : 'ถอดต้นทุน (Station Accessory)'}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {new Date(item.savedAt).toLocaleString('th-TH')}
                            </div>
                          </div>
                          {canDeleteHistory(currentUser) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => handleDeleteHistory(item, e)}
                              title="ลบประวัติ"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="flex gap-2 mt-3">
                          {(item.page === 'home' || item.page === 'combined') && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleLoadHistory(item, 'home')}
                            >
                              เปิดหน้า Home
                            </Button>
                          )}
                          {(item.page === 'station-accessory' || item.page === 'combined') && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleLoadHistory(item, 'station-accessory')}
                            >
                              เปิดหน้า Station
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* User Management Sheet for Manager */}
          {isAdminOrManager(currentUser) && (
            <Sheet open={isUserManagementOpen} onOpenChange={setIsUserManagementOpen}>
              <SheetContent side="left" className="w-[500px] sm:w-[600px]">
                <SheetHeader>
                  <SheetTitle>User Management</SheetTitle>
                  <SheetDescription>
                    จัดการการเข้าถึงของผู้ใช้ (Sales, Design, Worker)
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-4">
                  <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                    <div className="space-y-3">
                      <div className="font-semibold text-lg">Sales Users</div>
                      {userAccounts.filter(u => u.role === 'sales').map((account) => (
                        <div key={account.username} className="p-3 border rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{account.username}</div>
                              <div className="text-sm text-gray-500">Role: {account.role}</div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-600">Enabled</span>
                                <Checkbox
                                  checked={account.enabled}
                                  onCheckedChange={(checked) => {
                                    updateUserAccount(account.username, checked === true)
                                    setUserAccounts(getAllUserAccounts())
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Separator />
                    <div className="space-y-3">
                      <div className="font-semibold text-lg">Design Users</div>
                      {userAccounts.filter(u => u.role === 'design').map((account) => (
                        <div key={account.username} className="p-3 border rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{account.username}</div>
                              <div className="text-sm text-gray-500">Role: {account.role}</div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-600">Enabled</span>
                                <Checkbox
                                  checked={account.enabled}
                                  onCheckedChange={(checked) => {
                                    updateUserAccount(account.username, checked === true)
                                    setUserAccounts(getAllUserAccounts())
                                  }}
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-600">Access Station Accessory</span>
                                <Checkbox
                                  checked={account.permissions?.canAccessStationAccessory || false}
                                  onCheckedChange={(checked) => {
                                    updateUserPermission(account.username, 'canAccessStationAccessory', checked === true)
                                    setUserAccounts(getAllUserAccounts())
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Separator />
                    <div className="space-y-3">
                      <div className="font-semibold text-lg">Worker Users</div>
                      {userAccounts.filter(u => u.role === 'worker').map((account) => (
                        <div key={account.username} className="p-3 border rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{account.username}</div>
                              <div className="text-sm text-gray-500">Role: {account.role}</div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-600">Enabled</span>
                                <Checkbox
                                  checked={account.enabled}
                                  onCheckedChange={(checked) => {
                                    updateUserAccount(account.username, checked === true)
                                    setUserAccounts(getAllUserAccounts())
                                  }}
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-600">Access Station Accessory</span>
                                <Checkbox
                                  checked={account.permissions?.canAccessStationAccessory || false}
                                  onCheckedChange={(checked) => {
                                    updateUserPermission(account.username, 'canAccessStationAccessory', checked === true)
                                    setUserAccounts(getAllUserAccounts())
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          )}

          {/* Create User Sheet for ADMIN */}
          {isAdmin(currentUser) && (
            <Sheet open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
              <SheetContent side="right" className="w-[400px] sm:w-[500px]">
                <SheetHeader>
                  <SheetTitle>สร้าง User ใหม่</SheetTitle>
                  <SheetDescription>
                    สร้าง user account ใหม่พร้อมกำหนด role
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div>
                    <Label htmlFor="new-username">Username</Label>
                    <Input
                      id="new-username"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="กรอก username"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-password">Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="กรอก password"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-role">Role</Label>
                    <Select value={newRole} onValueChange={(value) => setNewRole(value as UserRole)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="เลือก role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="design">Design</SelectItem>
                        <SelectItem value="worker">Worker</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={() => {
                        if (!newUsername.trim() || !newPassword.trim()) {
                          alert('⚠️ กรุณากรอก username และ password')
                          return
                        }
                        const result = createUserAccount(newUsername.trim(), newPassword, newRole)
                        if (result.ok) {
                          alert('✅ สร้าง user สำเร็จ!')
                          setUserAccounts(getAllUserAccounts())
                          setIsCreateUserOpen(false)
                          setNewUsername('')
                          setNewPassword('')
                          setNewRole('sales')
                        } else {
                          alert(`❌ ${result.message || 'เกิดข้อผิดพลาดในการสร้าง user'}`)
                        }
                      }}
                      className="flex-1"
                    >
                      สร้าง User
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCreateUserOpen(false)
                        setNewUsername('')
                        setNewPassword('')
                        setNewRole('sales')
                      }}
                    >
                      ยกเลิก
                    </Button>
                  </div>

                  {/* Show custom users list with delete option */}
                  <div className="mt-6">
                    <div className="font-semibold mb-3">Custom Users (ที่สร้างเอง)</div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {userAccounts.filter(u => {
                        // Check if user is in custom users (not in default USER_ACCOUNTS)
                        const defaultUsernames = ['Sale_game', 'Sale_Ton', 'Sale_Tak', 'sale.sp', 'Technic_A',
                          'design01', 'design02', 'design03', 'design04', 'design05',
                          'worker01', 'worker02', 'worker03', 'worker04', 'worker05',
                          'manager01', 'manager02', 'manager03', 'manager04', 'manager05',
                          'admin01', 'admin02', 'admin03', 'admin04', 'admin05']
                        return !defaultUsernames.includes(u.username)
                      }).map((account) => (
                        <div key={account.username} className="flex items-center justify-between p-2 border rounded-lg">
                          <div>
                            <div className="font-medium">{account.username}</div>
                            <div className="text-xs text-gray-500">Role: {account.role}</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              if (confirm(`คุณต้องการลบ user "${account.username}" หรือไม่?`)) {
                                const result = deleteUserAccount(account.username)
                                if (result.ok) {
                                  alert('✅ ลบ user สำเร็จ!')
                                  setUserAccounts(getAllUserAccounts())
                                } else {
                                  alert(`❌ ${result.message || 'เกิดข้อผิดพลาดในการลบ user'}`)
                                }
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {userAccounts.filter(u => {
                        const defaultUsernames = ['Sale_game', 'Sale_Ton', 'Sale_Tak', 'sale.sp', 'Technic_A',
                          'design01', 'design02', 'design03', 'design04', 'design05',
                          'worker01', 'worker02', 'worker03', 'worker04', 'worker05',
                          'manager01', 'manager02', 'manager03', 'manager04', 'manager05',
                          'admin01', 'admin02', 'admin03', 'admin04', 'admin05']
                        return !defaultUsernames.includes(u.username)
                      }).length === 0 && (
                          <div className="text-sm text-gray-500 text-center py-4">
                            ยังไม่มี custom users
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          )}

          <Button variant="outline" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleForward}>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Right side - User info, create user (ADMIN), and signout */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-blue-600" />
            <span className="font-medium">{currentUser?.username || 'Guest'}</span>
          </div>
          <Separator orientation="vertical" className="h-6" />
          {isAdmin(currentUser) && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsCreateUserOpen(true)
                  setNewUsername('')
                  setNewPassword('')
                  setNewRole('sales')
                }}
                className="bg-gray-100 hover:bg-gray-200"
                title="สร้าง User ใหม่"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Separator orientation="vertical" className="h-6" />
            </>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={handleSignOut}
            className="bg-red-600 hover:bg-red-700"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Signout
          </Button>
        </div>
      </div>
    </header>
  )
}
