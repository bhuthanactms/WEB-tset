/**
 * กรณีพิเศษ: PEA + Stand-alone + จำนวนเครื่อง = 1 + กำลัง 60–240 kW
 * ใช้เฉพาะการคำนวณ/อ่านค่า TR→MDB และ MDB ที่เกี่ยวข้อง (ไม่ใช้กับ MEA)
 */

export const SPECIAL_STANDALONE_SINGLE_KW_MIN = 60;
export const SPECIAL_STANDALONE_SINGLE_KW_MAX = 240;

/** Sheet1 (__rowNum__) สำหรับอ่าน Wiring Size / Conduit / MCCB Main */
export const SPECIAL_STANDALONE_TR_MDB_ROW_BY_KW: Record<number, number> = {
  60: 191,
  80: 192,
  120: 193,
  160: 194,
  180: 195,
  200: 195,
  240: 196,
};

export const SPECIAL_STANDALONE_UNDERGROUND =
  'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน';
export const SPECIAL_STANDALONE_TRAY = 'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา';

/** คอลัมน์ Sheet1 กรณีพิเศษ — กลุ่ม 5 ฝังใต้ดิน */
export const SPECIAL_UNDERGROUND_WIRING_SIZE_COLS = [
  '__EMPTY_106', '__EMPTY_107', '__EMPTY_108', '__EMPTY_109', '__EMPTY_110',
  '__EMPTY_111', '__EMPTY_112', '__EMPTY_113', '__EMPTY_114', '__EMPTY_115',
];
export const SPECIAL_UNDERGROUND_CONDUIT_COLS = ['__EMPTY_122', '__EMPTY_123', '__EMPTY_124'];

/** คอลัมน์ Sheet1 กรณีพิเศษ — TRAY */
export const SPECIAL_TRAY_WIRING_SIZE_COLS = [
  '__EMPTY_130', '__EMPTY_131', '__EMPTY_132', '__EMPTY_133', '__EMPTY_134',
  '__EMPTY_135', '__EMPTY_136', '__EMPTY_137', '__EMPTY_138', '__EMPTY_139',
];
export const SPECIAL_TRAY_SIZE_COL = '__EMPTY_145';

export type SpecialStandaloneSingleArgs = {
  powerAuthority?: string;
  chargerInstallationType?: string;
  numberOfChargers?: string | number;
  charger?: string;
  chargerTypeMode?: string;
  multiChargers?: string[];
  chargerSummary?: Array<{ kw?: number; name?: string }>;
};

export function extractChargerKwValue(chargerStr: string): number {
  const match = String(chargerStr || '').match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/** คืน kW ของเครื่องเดียวถ้าเข้าเงื่อนไขพิเศษ (PEA เท่านั้น) ไม่งั้นคืน null */
export function getSpecialStandaloneSingleKw(args: SpecialStandaloneSingleArgs): number | null {
  if (String(args.powerAuthority || '').toUpperCase() !== 'PEA') return null;

  const installType = (args.chargerInstallationType || 'stand-alone').toLowerCase();
  if (installType === 'group') return null;

  const n = Math.max(0, parseInt(String(args.numberOfChargers ?? '0'), 10) || 0);
  if (n !== 1) return null;

  let kw = 0;
  if (args.chargerTypeMode === 'any') {
    const name = (args.multiChargers || []).find((x) => String(x || '').trim());
    kw = name ? extractChargerKwValue(name) : 0;
  } else if (args.chargerSummary?.[0]?.kw != null && args.chargerSummary[0].kw !== undefined) {
    kw = Number(args.chargerSummary[0].kw) || 0;
    if (!kw && args.chargerSummary[0].name) {
      kw = extractChargerKwValue(String(args.chargerSummary[0].name));
    }
  } else if (args.charger) {
    kw = extractChargerKwValue(args.charger);
  }

  if (kw < SPECIAL_STANDALONE_SINGLE_KW_MIN || kw > SPECIAL_STANDALONE_SINGLE_KW_MAX) {
    return null;
  }
  return kw;
}

export function isSpecialStandaloneSingle(args: SpecialStandaloneSingleArgs): boolean {
  return getSpecialStandaloneSingleKw(args) != null;
}

export function getSpecialStandaloneTrMdbSheet1Row(kw: number): number | undefined {
  return SPECIAL_STANDALONE_TR_MDB_ROW_BY_KW[kw];
}

/** 60–120 kW ไม่มีตัวเลือก TRAY */
export function specialStandaloneAllowsTray(kw: number): boolean {
  return kw >= 160 && kw <= SPECIAL_STANDALONE_SINGLE_KW_MAX;
}

export function getSpecialStandaloneTrMdbWiringOptions(kw: number): string[] {
  if (specialStandaloneAllowsTray(kw)) {
    return [SPECIAL_STANDALONE_UNDERGROUND, SPECIAL_STANDALONE_TRAY];
  }
  return [SPECIAL_STANDALONE_UNDERGROUND];
}

/** กรณีพิเศษ 240 kW ใน StationAccessory: underground +1 / TRAY +4 จากแถวเดิม */
export function getSpecialStandalone240TrMdbRowDelta(wiringType: string): number {
  const t = String(wiringType || '');
  if (t.includes('TRAY')) return 4;
  if (t.includes('ฝังใต้ดิน') || t.includes('กลุ่ม 5')) return 1;
  return 0;
}

export function isUndergroundWiringType(wiringType: string): boolean {
  const t = String(wiringType || '');
  return t.includes('ฝังใต้ดิน') || t.includes('กลุ่ม 5');
}

export function isTrayWiringType(wiringType: string): boolean {
  return String(wiringType || '').includes('TRAY');
}
