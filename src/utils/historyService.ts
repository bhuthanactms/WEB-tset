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

export interface HistoryGroup {
  groupKey: string
  items: HistoryEntry[]
  latestSavedAt: string
}

export const EIC_GROUP_KEY = 'EIC'

/** รหัสแบบ EIC_ชื่องาน ถือเป็นกลุ่ม EIC */
export function isEicCustomerCode(customerCode: string): boolean {
  return /^EIC_/i.test(customerCode.trim())
}

/** ดึง prefix รหัสลูกค้าสำหรับจัดกลุ่ม — EIC_xxx → EIC, "PB69015 120*2" → PB69015 */
export function getHistoryGroupKey(customerCode: string): string {
  const trimmed = customerCode.trim()
  if (!trimmed) return trimmed
  if (isEicCustomerCode(trimmed)) return EIC_GROUP_KEY
  return trimmed.split(/\s+/)[0]
}

/** จัดกลุ่มประวัติตาม prefix รหัสลูกค้า (EIC_* รวมกลุ่ม EIC) */
export function groupHistoryEntries(entries: HistoryEntry[]): HistoryGroup[] {
  const groups = new Map<string, { displayKey: string; items: HistoryEntry[] }>()

  for (const item of entries) {
    const token = getHistoryGroupKey(item.customerCode)
    const normalizedKey = isEicCustomerCode(item.customerCode)
      ? EIC_GROUP_KEY
      : token.toUpperCase()
    if (!normalizedKey) continue

    if (!groups.has(normalizedKey)) {
      groups.set(normalizedKey, {
        displayKey: normalizedKey === EIC_GROUP_KEY ? EIC_GROUP_KEY : token,
        items: [],
      })
    }
    groups.get(normalizedKey)!.items.push(item)
  }

  return Array.from(groups.values())
    .map(({ displayKey, items }) => {
      // ภายในกลุ่ม: เอาเฉพาะเวอร์ชันล่าสุดของแต่ละ customerCode ที่แตกต่างกัน
      const latestByCode = new Map<string, HistoryEntry>()
      for (const item of items) {
        const codeKey = item.customerCode.trim()
        const existing = latestByCode.get(codeKey)
        if (!existing || new Date(item.savedAt).getTime() > new Date(existing.savedAt).getTime()) {
          latestByCode.set(codeKey, item)
        }
      }

      const sortedItems = Array.from(latestByCode.values()).sort(
        (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
      )
      return {
        groupKey: displayKey,
        items: sortedItems,
        latestSavedAt: sortedItems[0]?.savedAt ?? '',
      }
    })
    .sort((a, b) => new Date(b.latestSavedAt).getTime() - new Date(a.latestSavedAt).getTime())
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

  // 1. find or create customer
  let customerId: number | null = null

  const { data: existing } = await supabaseAdmin
    .from('customers')
    .select('id')
    .eq('customer_code', code)
    .maybeSingle()

  if (existing) {
    customerId = existing.id
  } else {
    const now = new Date().toISOString()
    const { data: created, error: createError } = await supabaseAdmin
      .from('customers')
      .insert({ customer_code: code, created_at: now, updated_at: now })
      .select('id')
      .single()
    if (createError || !created) {
      return { ok: false, message: 'บันทึก customer ไม่สำเร็จ: ' + createError?.message }
    }
    customerId = created.id
  }

  if (!customerId) {
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
    customer_id: customerId,
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
