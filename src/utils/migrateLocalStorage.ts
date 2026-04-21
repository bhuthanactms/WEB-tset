import { saveHistory } from './historyService'

const MIGRATION_KEY = 'supabase_migration_done_v1'

interface LocalHistoryItem {
  customerCode: string
  dataType: 'home' | 'station-accessory' | 'combined'
  homeData?: any
  stationData?: any
}

/** อ่าน history ทั้งหมดจาก localStorage */
function readLocalHistory(): LocalHistoryItem[] {
  const map = new Map<string, LocalHistoryItem>()

  try {
    const allKeys = Object.keys(localStorage)

    // อ่าน combined data (ev_combined_data_${customerCode})
    allKeys.forEach(key => {
      if (key.startsWith('ev_combined_data_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}')
          if (data.customerCode) {
            map.set(data.customerCode, {
              customerCode: data.customerCode,
              dataType: 'combined',
              homeData: data.home,
              stationData: data.stationAccessory,
            })
          }
        } catch {}
      }
    })

    // อ่าน home data (ev_calculator_form_data_${code}_${timestamp})
    allKeys.forEach(key => {
      if (key.startsWith('ev_calculator_form_data_') && key !== 'ev_calculator_form_data') {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}')
          if (data.customerCode && !map.has(data.customerCode)) {
            map.set(data.customerCode, {
              customerCode: data.customerCode,
              dataType: 'home',
              homeData: data,
            })
          }
        } catch {}
      }
    })

    // อ่าน station data (ev_station_accessory_form_data_${code}_${timestamp})
    allKeys.forEach(key => {
      if (key.startsWith('ev_station_accessory_form_data_') && key !== 'ev_station_accessory_form_data') {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}')
          if (data.customerCode) {
            const existing = map.get(data.customerCode)
            if (existing) {
              existing.stationData = data
              existing.dataType = 'combined'
            } else {
              map.set(data.customerCode, {
                customerCode: data.customerCode,
                dataType: 'station-accessory',
                stationData: data,
              })
            }
          }
        } catch {}
      }
    })
  } catch {}

  return Array.from(map.values())
}

/**
 * รัน migration ครั้งเดียว — อ่านจาก localStorage แล้ว insert เข้า Supabase
 * ถ้าเคยรันแล้วจะข้ามไป
 */
export async function migrateLocalStorageToSupabase(): Promise<void> {
  // ถ้าเคย migrate แล้ว ข้ามไป
  if (localStorage.getItem(MIGRATION_KEY)) return

  const items = readLocalHistory()
  if (items.length === 0) {
    localStorage.setItem(MIGRATION_KEY, 'true')
    return
  }

  console.log(`[Migration] พบข้อมูล ${items.length} รายการใน localStorage กำลัง migrate...`)

  let success = 0
  for (const item of items) {
    try {
      const result = await saveHistory(
        item.customerCode,
        item.dataType,
        item.homeData,
        item.stationData
      )
      if (result.ok) success++
    } catch {}
  }

  console.log(`[Migration] migrate สำเร็จ ${success}/${items.length} รายการ`)

  // Mark ว่า migrate แล้ว
  localStorage.setItem(MIGRATION_KEY, 'true')
}
