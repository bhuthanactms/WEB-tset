
/**
 * AppHeader - Navigation header for the application
 * Displays user info, navigation buttons, and signout functionality
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { User, LogOut, ArrowLeft, ArrowRight, Menu, Search, Home, Users, Settings } from 'lucide-react'
import { getCurrentUserSync, logout, isAdmin, canDeleteHistory, canSaveHistory } from '@/utils/auth'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
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
  const currentUser = getCurrentUserSync()
  const navigate = useNavigate()
  const location = useLocation()
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [history, setHistory] = useState<SavedHistory[]>([])
  const [searchTerm, setSearchTerm] = useState('')


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

      // ไม่รวม current draft (key หลักที่ไม่มี timestamp) ในรายการ history
      // เพื่อให้ popup Save/Load แสดงเฉพาะรายการที่ผู้ใช้กดบันทึกจริง

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
  }, [loadHistory])

  const handleSignOut = async () => {
    await logout()
    window.location.hash = '#/login'
  }

  const handleBack = () => {
    // ถ้าอยู่ที่หน้า Station Accessory ให้ navigate ไปหน้า Home โดยตรง
    if (location.pathname === '/station-accessory') {
      console.log('🔙 Back button clicked - Navigating to Home')
      // ตั้ง flag เพื่อบอกให้ Home.tsx restore draft
      sessionStorage.setItem('back_navigation', 'true')
      // เปลี่ยน hash เป็น #/ ก่อน
      window.location.hash = '#/'
      setTimeout(() => {
        const currentHash = window.location.hash
        if (currentHash === '#/' || currentHash === '') {
          console.log('⚠️ Hash changed but component may not re-render, reloading')
          window.location.reload()
        }
      }, 100)
    } else {
      // ถ้าอยู่ที่หน้า Home หรือหน้าอื่น ให้ย้อนกลับตามประวัติ
      window.history.back()
    }
  }

  const handleForward = () => {
    if (location.pathname === '/station-accessory') {
      console.log('➡️ Forward button clicked - Already at Station Accessory, no forward available')
      return
    } else {
      // ถ้าอยู่ที่ Home และกด Forward ไป StationAccessory ให้ set flag เพื่อ restore draft
      sessionStorage.setItem('back_navigation_station', 'true')
      window.history.forward()
    }
  }

  const handleGoHome = () => {
    console.log('🏠 handleGoHome called - Reset and exit history')
    try {
      // ลบข้อมูลปัจจุบันใน localStorage (แต่ไม่ลบประวัติการบันทึก)
      localStorage.removeItem('ev_calculator_form_data')
      localStorage.removeItem('ev_station_accessory_form_data')
      localStorage.removeItem('ev_calculator_form_draft')
      localStorage.removeItem('ev_station_accessory_form_draft')
      sessionStorage.removeItem('ev_last_station_accessory_nav_state')
      // ลบ flag ที่บอกว่าโหลดจากประวัติ
      sessionStorage.removeItem('loaded_from_history')
      sessionStorage.removeItem('back_navigation')
      sessionStorage.removeItem('back_navigation_station')
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
                  {isAdmin(currentUser) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { window.location.hash = '#/admin/users' }}
                      className="ml-2"
                    >
                      <Users className="h-4 w-4 mr-1" />
                      จัดการ User
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
                onClick={() => { window.location.hash = '#/admin/users' }}
                className="bg-gray-100 hover:bg-gray-200"
                title="จัดการ User"
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
