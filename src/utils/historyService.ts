import { supabaseAdmin } from './supabase'
import { getCurrentUserSync } from './auth'

export interface HistoryEntry {
  id: number
  customerCode: string
  dataType: 'home' | 'station-accessory' | 'combined'
  data: any
  homeData?: any
  stationData?: any
  savedAt: string
  savedBy?: string
}

/** upsert customer แล้ว save history */
export async function saveHistory(
  customerCode: string,
  dataType: 'home' | 'station-accessory' | 'combined',
  homeData?: any,
  stationData?: any
): Promise<{ ok: boolean; message?: string }> {
  const user = getCurrentUserSync()
  if (!user) return { ok: false, message: 'ไม่ได้ login' }

  const code = customerCode.trim()

  // 1. upsert customer
  const { data: customer, error: customerError } = await supabaseAdmin
    .from('customers')
    .upsert({ customer_code: code }, { onConflict: 'customer_code' })
    .select('id')
    .single()

  if (customerError || !customer) {
    return { ok: false, message: 'บันทึก customer ไม่สำเร็จ' }
  }

  // 2. เตรียม data ตาม dataType
  const data =
    dataType === 'home'
      ? homeData
      : dataType === 'station-accessory'
      ? stationData
      : { home: homeData, stationAccessory: stationData }

  // 3. insert history
  const { error } = await supabaseAdmin.from('customer_histories').insert({
    customer_id: customer.id,
    customer_code: code,
    data_type: dataType,
    data,
  })

  if (error) return { ok: false, message: 'บันทึก history ไม่สำเร็จ' }

  return { ok: true }
}

/** ดึง history ทั้งหมด */
export async function getHistory(): Promise<HistoryEntry[]> {
  const { data, error } = await supabaseAdmin
    .from('customer_histories')
    .select('*')
    .order('saved_at', { ascending: false })

  if (error || !data) return []

  return data.map((h) => ({
    id: h.id,
    customerCode: h.customer_code,
    dataType: h.data_type as HistoryEntry['dataType'],
    data: h.data,
    homeData: h.data_type === 'home' ? h.data : h.data?.home,
    stationData: h.data_type === 'station-accessory' ? h.data : h.data?.stationAccessory,
    savedAt: h.saved_at,
  }))
}

/** ดึง history ล่าสุดของแต่ละ customerCode */
export async function getLatestHistory(): Promise<HistoryEntry[]> {
  const { data, error } = await supabaseAdmin
    .from('customer_histories')
    .select('*')
    .order('saved_at', { ascending: false })

  if (error || !data) return []

  // deduplicate — เอาแค่ล่าสุดของแต่ละ customerCode
  const seen = new Map<string, HistoryEntry>()
  for (const h of data) {
    if (!seen.has(h.customer_code)) {
      seen.set(h.customer_code, {
        id: h.id,
        customerCode: h.customer_code,
        dataType: h.data_type as HistoryEntry['dataType'],
        data: h.data,
        homeData: h.data_type === 'home' ? h.data : h.data?.home,
        stationData: h.data_type === 'station-accessory' ? h.data : h.data?.stationAccessory,
        savedAt: h.saved_at,
      })
    }
  }

  return Array.from(seen.values())
}

/** ลบ history ทั้งหมดของ customerCode */
export async function deleteHistory(customerCode: string): Promise<{ ok: boolean }> {
  const { error } = await supabaseAdmin
    .from('customer_histories')
    .delete()
    .eq('customer_code', customerCode.trim())

  return { ok: !error }
}
