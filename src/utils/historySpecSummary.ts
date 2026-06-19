import type { HistoryEntry } from './historyService'
import { EIC_GROUP_KEY, getHistoryGroupKey, isEicCustomerCode } from './historyService'

export interface HistorySpecLine {
  label: string
  value: string
}

/** ชื่องานย่อย — EIC_xxx → xxx, PB69015 120*2 → 120*2 */
export function getHistoryJobName(customerCode: string, groupKey?: string): string {
  const trimmed = customerCode.trim()
  if (!trimmed) return trimmed

  if (isEicCustomerCode(trimmed)) {
    const suffix = trimmed.replace(/^EIC_/i, '').trim()
    return suffix || trimmed
  }

  const prefix = (groupKey || getHistoryGroupKey(trimmed)).trim()
  if (!prefix) return trimmed

  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const suffix = trimmed.replace(new RegExp(`^${escaped}\\s*`, 'i'), '').trim()
  return suffix || trimmed
}

function pickHomeData(entry: HistoryEntry): any | null {
  if (entry.homeData) return entry.homeData
  if (entry.dataType === 'home') return entry.data
  return null
}

function compact(value: unknown): string {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

function stripChargerPrefix(value: string): string {
  return value.replace(/^Charger\d+:\s*/i, '').trim()
}

function joinNonEmpty(parts: string[], sep = '\n'): string {
  return parts.map(compact).filter(Boolean).join(sep)
}

function formatWiringBlock(type: string, cableSize?: string, conduit?: string): string {
  const lines: string[] = []
  if (type) lines.push(type)
  if (cableSize) lines.push(`ขนาดสาย: ${cableSize}`)
  if (conduit) lines.push(`ท่อ/ราง: ${conduit}`)
  return joinNonEmpty(lines)
}

function formatCableList(raw: unknown): string {
  if (Array.isArray(raw)) {
    return raw.map((v) => stripChargerPrefix(compact(v))).filter(Boolean).join('\n')
  }
  const single = stripChargerPrefix(compact(raw))
  return single
}

function formatChargerKwLine(home: any, form: any): string {
  const installLabel = home.chargerInstallationType === 'group' ? 'Group Charger' : 'Stand-alone'

  if (home.chargerTypeMode === 'any' && Array.isArray(home.multiChargers)) {
    const chargers = home.multiChargers.filter((c: string) => compact(c))
    if (chargers.length > 0) {
      return `${installLabel}\n${chargers.join('\n')}`
    }
  }

  if (Array.isArray(home.chargerSummary) && home.chargerSummary.length > 0) {
    const lines = home.chargerSummary.map((c: any) => {
      const name = compact(c?.name)
      const kw = c?.kw != null && c.kw !== '' ? `${c.kw} kW` : ''
      const count = compact(form.numberOfChargers)
      if (name && kw) return `${name} (${kw})`
      return name || kw
    }).filter(Boolean)
    const count = compact(form.numberOfChargers)
    const header = count ? `${count} เครื่อง` : ''
    return joinNonEmpty([header, ...lines])
  }

  const charger = compact(form.charger)
  const count = compact(form.numberOfChargers)
  if (charger && count) return `${installLabel}\n${charger} × ${count} เครื่อง`
  if (charger) return `${installLabel}\n${charger}`
  if (count) return `${count} เครื่อง`
  return installLabel
}

function formatMdbMainSub(home: any): string {
  const mainParts: string[] = []
  const mdb = compact(home.mdb)
  if (mdb) mainParts.push(`Main ${mdb}`)
  const at = compact(home.mdbMainAt)
  const af = compact(home.mdbMainAf)
  if (at) mainParts.push(`AT ${at}`)
  if (af) mainParts.push(`AF ${af}`)

  const subs = Array.isArray(home.mdbSubs)
    ? home.mdbSubs.map(compact).filter((s) => s && s !== '-')
    : []

  const lines: string[] = []
  if (mainParts.length) lines.push(`Main: ${mainParts.join(' / ')}`)
  if (subs.length) {
    lines.push(`Sub: ${subs.map((s, i) => `MCCB${i + 1} ${s}`).join(', ')}`)
  }
  return joinNonEmpty(lines)
}

function formatTrLandMdb(home: any, form: any): string {
  const blocks: string[] = []

  const trType = compact(form.trWiringType)
  const trCable = compact(home.trWiringSize)
  const trConduit = compact(home.trWireConduit)
  if (trType) {
    blocks.push(formatWiringBlock(`TR → MDB: ${trType}`, trCable, trConduit))
  }

  const trToLand = compact(form.trToLand)
  if (trToLand) {
    blocks.push(formatWiringBlock(`TR → Land: ${trToLand}`))
  }

  const landMdb = compact(form.landToMdb)
  if (landMdb) {
    blocks.push(formatWiringBlock(`Land → MDB: ${landMdb}`))
  }

  return joinNonEmpty(blocks, '\n\n')
}

function formatMdbToCharger(home: any, form: any): string {
  const types = Array.isArray(form.chargerWiringType)
    ? form.chargerWiringType.map(compact).filter(Boolean).join(' | ')
    : compact(form.chargerWiringType)

  const cables = formatCableList(home.chargerWiringCableAll ?? home.chargerWiringCable)
  const conduits = formatCableList(home.chargerWireConduitAll ?? home.chargerWireConduit)

  if (!types && !cables && !conduits) return ''

  const lines: string[] = []
  if (types) lines.push(types)
  if (cables) lines.push(`ขนาดสาย:\n${cables}`)
  if (conduits) lines.push(`ท่อ/ราง:\n${conduits}`)
  return joinNonEmpty(lines)
}

function formatChargerToTerminal(home: any, form: any): string {
  if (home.chargerInstallationType !== 'group') return ''

  const wiringType = compact(form.terminalWiringType || home.terminalWiringType)
  const details = Array.isArray(home.terminalWiringDetails) ? home.terminalWiringDetails : []

  if (details.length > 0) {
    const blocks = details.map((d: any, idx: number) => {
      const size = compact(d?.terminalSize)
      const cable = compact(d?.cable)
      const conduit = compact(d?.conduitTray)
      const title = size ? `Terminal ${idx + 1} (${size})` : `Terminal ${idx + 1}`
      return formatWiringBlock(
        wiringType ? `${title}: ${wiringType}` : title,
        cable,
        conduit
      )
    })
    return joinNonEmpty(blocks, '\n\n')
  }

  const cable = compact(home.terminalWireConduit)
  return formatWiringBlock(wiringType, '', cable)
}

function formatTerminalGroup(home: any, form: any): string {
  if (home.chargerInstallationType !== 'group') return ''

  const count = compact(form.numberOfTerminals || home.numberOfTerminals)
  const sizes = Array.isArray(form.terminalSizes)
    ? form.terminalSizes.map(compact).filter(Boolean)
    : compact(form.terminalSize || home.terminalSize)
      ? compact(form.terminalSize || home.terminalSize).split(',').map((s) => s.trim()).filter(Boolean)
      : []

  const lines: string[] = []
  if (count) lines.push(`${count} จุด`)
  if (sizes.length) lines.push(`ขนาด: ${sizes.join(', ')}`)
  return joinNonEmpty(lines)
}

function pushLine(lines: HistorySpecLine[], label: string, value: string) {
  const v = value.trim()
  if (v) lines.push({ label, value: v })
}

/** สรุปสเปคแบบ YouTube description — label + เนื้อหาด้านล่าง */
export function buildHistorySpecSummary(entry: HistoryEntry): HistorySpecLine[] {
  const home = pickHomeData(entry)
  if (!home) return []

  const form = home.form || {}
  const lines: HistorySpecLine[] = []

  pushLine(lines, 'การไฟฟ้า', compact(form.powerAuthority))
  pushLine(lines, 'หม้อแปลง', compact(home.transformer || home.transformerSize))
  pushLine(lines, 'ประเภทสาย TR, Land→MDB พร้อมขนาด', formatTrLandMdb(home, form))
  pushLine(lines, 'MDB Main / Sub', formatMdbMainSub(home))
  pushLine(lines, 'ประเภทสาย MDB to Charger พร้อมขนาด', formatMdbToCharger(home, form))
  pushLine(lines, 'Charger (จำนวน / kW)', formatChargerKwLine(home, form))
  pushLine(lines, 'ประเภทสาย Charger to Terminal (Group Charger) พร้อมขนาด', formatChargerToTerminal(home, form))
  pushLine(lines, 'Terminal (Group Charger)', formatTerminalGroup(home, form))

  return lines
}
