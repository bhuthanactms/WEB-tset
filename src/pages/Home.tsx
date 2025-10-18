/**
 * Home page - EV Station Calculator
 * Provides a comprehensive calculator for electric vehicle station requirements
 * including power authority selection, transformer sizing, and cost analysis.
 */

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Calculator, Zap, Battery, Settings, Cable } from 'lucide-react'
import axios from 'axios'
import * as XLSX from 'xlsx'
import { useNavigate } from 'react-router-dom'

/** Form state interface */
interface CalculatorForm {
  powerAuthority: 'PEA' | 'MEA'
  charger: string
  numberOfChargers: string
  trWiringType: string
  chargerWiringType: string
}

/** Results interface */
interface CalculatorResults {
  totalPower: number
  transformerSize: number
  inOfCharger: number
  inAllCharger: number
}

/** Charger data interface */
interface ChargerData {
  name: string
  power: number
  inOfCharger: number
  inAllCharger: number
  meaRow: number
  peaRow: number
  meaData: {
    inOfCharger: number
    inAllCharger: number
    cableSize: string
    cableSizeMm: string
    conduitSize: string
    conduitSizeMm: string
    mccbMain: string
    main2: string
    cost: string
  }
  peaData: {
    inOfCharger: number
    inAllCharger: number
    cableSize: string
    cableSizeMm: string
    conduitSize: string
    conduitSizeMm: string
    mccbMain: string
    main2: string
    cost: string
  }
}

/** Transformer data interface */
interface TransformerData {
  mea: {
    [key: string]: {
      trSize: string
      trWiringType: string
      trWiringTypeUnit: string
      trCableSize: string
      trCableSizeUnit: string
      mccbMain: string
      main2: string
    }
  }
  pea: {
    [key: string]: {
      trSize: string
      trWiringType: string
      trWiringTypeUnit: string
      trCableSize: string
      trCableSizeUnit: string
      mccbMain: string
      main2: string
    }
  }
}

/** Mapped Excel data interface */
interface MappedExcelData {
  chargers: ChargerData[]
  transformers: TransformerData
}

// ==================== EXCEL MAPPING CONFIGURATION ====================
// This section contains all Excel position mappings to decouple from hardcoded positions

// Excel Column Mappings - Define which columns contain what data
const EXCEL_COLUMNS = {
  // Main data columns
  IN_OF_CHARGER: '__EMPTY_2',
  TRANSFORMER_SIZE: '__EMPTY',
  
  // MDB/MCCB columns
  MCCB_MAIN_AT: '__EMPTY_11',
  MCCB_MAIN_AF: '__EMPTY_14',
  MDB_SUB_MEA: '__EMPTY_29',
  MDB_SUB_PEA: '__EMPTY_27',
  
  // TR Wiring Size columns for different wiring types
  TR_WIRING_AIR: ['__EMPTY_15', '__EMPTY_16', '__EMPTY_17', '__EMPTY_18', '__EMPTY_19', '__EMPTY_20', '__EMPTY_21', '__EMPTY_22', '__EMPTY_23', '__EMPTY_24'],
  TR_WIRING_UNDERGROUND: ['__EMPTY_36', '__EMPTY_37', '__EMPTY_38', '__EMPTY_39', '__EMPTY_40', '__EMPTY_41', '__EMPTY_42', '__EMPTY_43', '__EMPTY_44', '__EMPTY_45'],
  TR_WIRING_TRAY: ['__EMPTY_57', '__EMPTY_58', '__EMPTY_59', '__EMPTY_60', '__EMPTY_61', '__EMPTY_62', '__EMPTY_63', '__EMPTY_64', '__EMPTY_65', '__EMPTY_66'],
  TR_WIRING_LADDER: ['__EMPTY_78', '__EMPTY_79', '__EMPTY_80', '__EMPTY_81', '__EMPTY_82', '__EMPTY_83', '__EMPTY_84', '__EMPTY_85', '__EMPTY_86', '__EMPTY_87'],
  
  // TR Wire Conduit columns
  TR_CONDUIT_AIR: { cols: ['__EMPTY_32', '__EMPTY_33', '__EMPTY_34', '__EMPTY_35'], unit: 'นิ้ว' },
  TR_CONDUIT_UNDERGROUND: { cols: ['__EMPTY_53', '__EMPTY_54', '__EMPTY_55'], unit: 'มม.' },
  TR_CONDUIT_TRAY: { cols: ['__EMPTY_74'], unit: 'ซม.' },
  TR_CONDUIT_LADDER: { cols: ['__EMPTY_95'], unit: 'ซม.' },
  
  // Charger Wiring Cable columns (MEA)
  CHARGER_CABLE_MEA_AIR: ['__EMPTY_33', '__EMPTY_34', '__EMPTY_35', '__EMPTY_36', '__EMPTY_37', '__EMPTY_38', '__EMPTY_39', '__EMPTY_40', '__EMPTY_41', '__EMPTY_42', '__EMPTY_43', '__EMPTY_44', '__EMPTY_45'],
  CHARGER_CABLE_MEA_UNDERGROUND: ['__EMPTY_57', '__EMPTY_58', '__EMPTY_59', '__EMPTY_60', '__EMPTY_61', '__EMPTY_62', '__EMPTY_63', '__EMPTY_64', '__EMPTY_65', '__EMPTY_66', '__EMPTY_67', '__EMPTY_68', '__EMPTY_69'],
  
  // Charger Wiring Cable columns (PEA)
  CHARGER_CABLE_PEA_AIR: ['__EMPTY_31', '__EMPTY_32', '__EMPTY_33', '__EMPTY_34', '__EMPTY_35', '__EMPTY_36', '__EMPTY_37', '__EMPTY_38', '__EMPTY_39', '__EMPTY_40', '__EMPTY_41', '__EMPTY_42', '__EMPTY_43'],
  CHARGER_CABLE_PEA_UNDERGROUND: ['__EMPTY_55', '__EMPTY_56', '__EMPTY_57', '__EMPTY_58', '__EMPTY_59', '__EMPTY_60', '__EMPTY_61', '__EMPTY_62', '__EMPTY_63', '__EMPTY_64', '__EMPTY_65', '__EMPTY_66', '__EMPTY_67'],
  
  // Charger Wire Conduit columns (MEA)
  CHARGER_CONDUIT_MEA_AIR: { cols: ['__EMPTY_50', '__EMPTY_51', '__EMPTY_52', '__EMPTY_53', '__EMPTY_54', '__EMPTY_55'], unit: 'นิ้ว' },
  CHARGER_CONDUIT_MEA_UNDERGROUND: { cols: ['__EMPTY_74', '__EMPTY_75', '__EMPTY_76', '__EMPTY_77', '__EMPTY_78', '__EMPTY_79'], unit: 'มม.' },
  
  // Charger Wire Conduit columns (PEA)
  CHARGER_CONDUIT_PEA_AIR: { cols: ['__EMPTY_48', '__EMPTY_49', '__EMPTY_50', '__EMPTY_51', '__EMPTY_52', '__EMPTY_53'], unit: 'นิ้ว' },
  CHARGER_CONDUIT_PEA_UNDERGROUND: { cols: ['__EMPTY_72', '__EMPTY_73', '__EMPTY_74', '__EMPTY_75', '__EMPTY_76', '__EMPTY_77'], unit: 'มม.' },
} as const;

// Transformer sizing thresholds - Maps current (A) to Excel row numbers
const TRANSFORMER_SIZING = {
  MEA: [
    { maxCurrent: 444.1, row: 33 },
    { maxCurrent: 555.1, row: 34 },
    { maxCurrent: 699.4, row: 35 },
    { maxCurrent: 888.2, row: 36 },
    { maxCurrent: 1110.3, row: 37 },
    { maxCurrent: 1387.8, row: 38 },
    { maxCurrent: 1665.4, row: 39 },
    { maxCurrent: 2220.6, row: 40 },
    { maxCurrent: 2775.7, row: 41 },
  ],
  PEA: [
    { maxCurrent: 115.4, row: 76 },
    { maxCurrent: 184.7, row: 77 },
    { maxCurrent: 288.6, row: 78 },
    { maxCurrent: 363.7, row: 79 },
    { maxCurrent: 461.8, row: 80 },
    { maxCurrent: 577.3, row: 81 },
    { maxCurrent: 727.4, row: 82 },
    { maxCurrent: 923.7, row: 83 },
    { maxCurrent: 1154.7, row: 84 },
    { maxCurrent: 1443.4, row: 85 },
    { maxCurrent: 1732.1, row: 86 },
    { maxCurrent: 2305.4, row: 87 },
    { maxCurrent: 2886.8, row: 88 },
  ]
} as const;

// Wiring type name mappings to configuration keys
const WIRING_TYPE_CONFIG = {
  TR_WIRING: {
    'ร้อยท่อเดินในอากาศ กลุ่ม 2': { size: 'TR_WIRING_AIR', conduit: 'TR_CONDUIT_AIR' },
    'ร้อยท่อฝังใต้ดิน กลุ่ม 5': { size: 'TR_WIRING_UNDERGROUND', conduit: 'TR_CONDUIT_UNDERGROUND' },
    'ราง TRAY ไม่มีฝา': { size: 'TR_WIRING_TRAY', conduit: 'TR_CONDUIT_TRAY' },
    'ราง LADDER ไม่มีฝา': { size: 'TR_WIRING_LADDER', conduit: 'TR_CONDUIT_LADDER' },
  },
  CHARGER_WIRING: {
    MEA: {
      'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ': { cable: 'CHARGER_CABLE_MEA_AIR', conduit: 'CHARGER_CONDUIT_MEA_AIR' },
      'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน': { cable: 'CHARGER_CABLE_MEA_UNDERGROUND', conduit: 'CHARGER_CONDUIT_MEA_UNDERGROUND' },
    },
    PEA: {
      'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ': { cable: 'CHARGER_CABLE_PEA_AIR', conduit: 'CHARGER_CONDUIT_PEA_AIR' },
      'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน': { cable: 'CHARGER_CABLE_PEA_UNDERGROUND', conduit: 'CHARGER_CONDUIT_PEA_UNDERGROUND' },
    }
  }
} as const;

// Helper function to get transformer row number based on current
const getTransformerRow = (current: number, authority: 'MEA' | 'PEA'): number | undefined => {
  const sizing = TRANSFORMER_SIZING[authority];
  const found = sizing.find(s => current <= s.maxCurrent);
  return found?.row;
};

// Helper function to get MDB Sub column based on authority
const getMDBSubColumn = (authority: 'MEA' | 'PEA'): string => {
  return authority === 'MEA' ? EXCEL_COLUMNS.MDB_SUB_MEA : EXCEL_COLUMNS.MDB_SUB_PEA;
};

// Helper function to get TR wiring configuration
const getTRWiringConfig = (wiringType: string) => {
  return WIRING_TYPE_CONFIG.TR_WIRING[wiringType as keyof typeof WIRING_TYPE_CONFIG.TR_WIRING];
};

// Helper function to get charger wiring configuration
const getChargerWiringConfig = (authority: 'MEA' | 'PEA', wiringType: string) => {
  return WIRING_TYPE_CONFIG.CHARGER_WIRING[authority][wiringType as keyof typeof WIRING_TYPE_CONFIG.CHARGER_WIRING.MEA];
};

// ==================== END OF CONFIGURATION ====================

/**
 * Home component - Main EV Station Calculator interface
 */
export default function Home(): React.JSX.Element {
  // เพิ่ม state สำหรับประเภทการเลือก Charger Type
  const [chargerTypeMode, setChargerTypeMode] = useState<'same' | 'any'>('same');
  const [multiChargers, setMultiChargers] = useState<string[]>([]);

  const [form, setForm] = useState<CalculatorForm>({
    powerAuthority: '' as any,
    charger: '',
    numberOfChargers: '',
    trWiringType: '',
    chargerWiringType: ''
  });

  const [results, setResults] = useState<CalculatorResults | null>(null)
  const [excelData, setExcelData] = useState<any[]>([]);
  const [mappedData, setMappedData] = useState<MappedExcelData | null>(null);
  const navigate = useNavigate();

  /** Handle form input changes */
  const handleInputChange = (field: keyof CalculatorForm, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  /** Extract power value from charger string */
  const extractPowerValue = (chargerStr: string): number => {
    const match = chargerStr.match(/(\d+)/)
    return match ? parseInt(match[1]) : 50
  }

  // Mapping Charger Type กับเซลล์ใน Excel
  const chargerToExcelCell: Record<string, { mea?: string; pea?: string }> = {
    '30 kW': { mea: 'C6', pea: 'C54' },
    '40 kW': { mea: 'C7', pea: 'C55' },
    '60 kW': { mea: 'C8', pea: 'C56' },
    '80 kW': { mea: 'C9', pea: 'C57' },
    '120 kW': { mea: 'C10', pea: 'C58' },
    '160 kW': { mea: 'C11', pea: 'C59' },
    '200 kW': { mea: 'C12', pea: 'C60' },
    '240 kW': { mea: 'C13', pea: 'C61' },
    '320 kW': { mea: 'C14', pea: 'C62' },
    '360 kW': { mea: 'C15', pea: 'C63' },
    '480 kW': { mea: 'C16', pea: 'C64' },
    '600 kW': { mea: 'C17', pea: 'C65' },
    '600 kW Prime+': { mea: 'C18', pea: 'C66' },
    '640 kW Prime+': { mea: 'C19', pea: 'C67' },
    '720 kW Prime+': { mea: 'C21', pea: 'C69' },
    '800 kW Prime+': { mea: 'C23', pea: 'C71' },
  };

  /** Map Excel data to structured format */
  const mapExcelData = (data: any[]): MappedExcelData => {
    const chargers: ChargerData[] = [];
    const transformers: TransformerData = {
      mea: {},
      pea: {}
    };

    // Map charger data
    Object.entries(chargerToExcelCell).forEach(([chargerName, cells]) => {
      const power = extractPowerValue(chargerName);
      const meaRow = cells.mea ? parseInt(cells.mea.replace('C', '')) : 0;
      const peaRow = cells.pea ? parseInt(cells.pea.replace('C', '')) : 0;

      const meaRowData = data.find(r => r.__rowNum__ === meaRow);
      console.log('meaRowData', meaRowData);
      const peaRowData = data.find(r => r.__rowNum__ === peaRow);
      console.log('peaRowData', peaRowData);

      const charger: ChargerData = {
        name: chargerName,
        power,
        inOfCharger: 0,
        inAllCharger: 0,
        meaRow,
        peaRow,
        meaData: {
          inOfCharger: meaRowData?.['__EMPTY_2'] || 0,
          inAllCharger: meaRowData?.['__EMPTY_2'] || 0,
          cableSize: meaRowData?.['__EMPTY_3'] || '',
          cableSizeMm: meaRowData?.['__EMPTY_4'] || '',
          conduitSize: meaRowData?.['__EMPTY_5'] || '',
          conduitSizeMm: meaRowData?.['__EMPTY_6'] || '',
          mccbMain: meaRowData?.['__EMPTY_11'] || '',
          main2: meaRowData?.['__EMPTY_14'] || '',
          cost: meaRowData?.['__EMPTY_29'] || ''
        },
        peaData: {
          inOfCharger: peaRowData?.['__EMPTY_2'] || 0,
          inAllCharger: peaRowData?.['__EMPTY_2'] || 0,
          cableSize: peaRowData?.['__EMPTY_3'] || '',
          cableSizeMm: peaRowData?.['__EMPTY_4'] || '',
          conduitSize: peaRowData?.['__EMPTY_5'] || '',
          conduitSizeMm: peaRowData?.['__EMPTY_6'] || '',
          mccbMain: peaRowData?.['__EMPTY_11'] || '',
          main2: peaRowData?.['__EMPTY_14'] || '',
          cost: peaRowData?.['__EMPTY_27'] || ''
        }
      };

      // Set the primary values based on current form selection
      charger.inOfCharger = form.powerAuthority === 'MEA' ? charger.meaData.inOfCharger : charger.peaData.inOfCharger;
      charger.inAllCharger = form.powerAuthority === 'MEA' ? charger.meaData.inAllCharger : charger.peaData.inAllCharger;

      chargers.push(charger);
    });

    // Map transformer data for MEA (rows 33-41)
    for (let i = 33; i <= 41; i++) {
      const row = data.find(r => r.__rowNum__ === i);
      if (row) {
        const key = `row_${i}`;
        transformers.mea[key] = {
          trSize: row['__EMPTY'] || '',
          trWiringType: row['__EMPTY_1'] || '',
          trWiringTypeUnit: row['__EMPTY_2'] || '',
          trCableSize: row['__EMPTY_3'] || '',
          trCableSizeUnit: row['__EMPTY_4'] || '',
          mccbMain: row['__EMPTY_11'] || '',
          main2: row['__EMPTY_14'] || ''
        };
      }
    }

    // Map transformer data for PEA (rows 76-88)
    for (let i = 76; i <= 88; i++) {
      const row = data.find(r => r.__rowNum__ === i);
      if (row) {
        const key = `row_${i}`;
        transformers.pea[key] = {
          trSize: row['__EMPTY'] || '',
          trWiringType: row['__EMPTY_1'] || '',
          trWiringTypeUnit: row['__EMPTY_2'] || '',
          trCableSize: row['__EMPTY_3'] || '',
          trCableSizeUnit: row['__EMPTY_4'] || '',
          mccbMain: row['__EMPTY_11'] || '',
          main2: row['__EMPTY_14'] || ''
        };
      }
    }

    return { chargers, transformers };
  };

  /** Helper functions to access mapped data */
  const getChargerData = (chargerName: string): ChargerData | undefined => {
    return mappedData?.chargers.find(c => c.name === chargerName);
  };

  const getChargerDataByAuthority = (chargerName: string, authority: 'MEA' | 'PEA') => {
    const charger = getChargerData(chargerName);
    if (!charger) return null;
    return authority === 'MEA' ? charger.meaData : charger.peaData;
  };

  const getTransformerData = (authority: 'MEA' | 'PEA', rowKey: string) => {
    return mappedData?.transformers[authority.toLowerCase() as keyof TransformerData]?.[rowKey];
  };

  const findTransformerByPower = (authority: 'MEA' | 'PEA', power: number) => {
    const transformerData = mappedData?.transformers[authority.toLowerCase() as keyof TransformerData];
    if (!transformerData) return null;

    // This is a simplified approach - you might need to adjust based on your actual transformer selection logic
    const entries = Object.entries(transformerData);
    return entries.find(([_, data]) => {
      // Add your transformer selection logic here based on power requirements
      return data.trSize && data.trSize !== '';
    })?.[1];
  };

  /**
   * USAGE EXAMPLES - How to use the new mapped data structure:
   * 
   * // Get charger data by name
   * const charger30kW = getChargerData('30 kW');
   * console.log(charger30kW?.power); // 30
   * console.log(charger30kW?.meaData.cableSize); // Cable size for MEA
   * console.log(charger30kW?.peaData.cableSize); // Cable size for PEA
   * 
   * // Get charger data by authority
   * const meaData = getChargerDataByAuthority('30 kW', 'MEA');
   * console.log(meaData?.inOfCharger); // In value for MEA
   * console.log(meaData?.cableSize); // Cable size for MEA
   * console.log(meaData?.mccbMain); // MCCB main for MEA
   * 
   * // Get transformer data
   * const trData = getTransformerData('MEA', 'row_33');
   * console.log(trData?.trSize); // Transformer size
   * console.log(trData?.mccbMain); // MCCB main
   * 
   * // Access all chargers
   * mappedData?.chargers.forEach(charger => {
   *   console.log(`${charger.name}: ${charger.power}kW`);
   *   console.log(`MEA In: ${charger.meaData.inOfCharger}`);
   *   console.log(`PEA In: ${charger.peaData.inOfCharger}`);
   * });
   * 
   * // Access transformer data by authority
   * Object.entries(mappedData?.transformers.mea || {}).forEach(([key, data]) => {
   *   console.log(`${key}: ${data.trSize} - ${data.mccbMain}A`);
   * });
   */

  // ดึงค่าจาก Excel ตาม Power Authority และ Charger Type
  const getInFromExcel = (type: 'inOfCharger' | 'inAllCharger') => {
    const charger = form.charger;
    const numberOfChargers = parseInt(form.numberOfChargers) || 1;
    
    // Use mapped data instead of raw Excel data
    const chargerData = getChargerDataByAuthority(charger, form.powerAuthority);
    if (!chargerData) return undefined;
    
    if (type === 'inOfCharger') return chargerData.inOfCharger;
    if (type === 'inAllCharger') return chargerData.inAllCharger * numberOfChargers;
    return undefined;
  };

  // ฟังก์ชันเลือก TR size ตาม Power Authority และผลรวม In all charger
  const getTRSizeFromExcel = (inAllCharger: number) => {
    const trRowNum = getTransformerRow(inAllCharger, form.powerAuthority);
    if (!trRowNum) return '-';
    
    const transformerData = getTransformerData(form.powerAuthority, `row_${trRowNum}`);
    return transformerData ? transformerData.trSize : '-';
  };

  /** Calculate EV station requirements */
  const calculateResults = () => {
    console.log('=== Calculate Results Debug ===');
    console.log('Form data:', form);
    console.log('Charger type mode:', chargerTypeMode);
    console.log('Multi chargers:', multiChargers);

    let inOfCharger = 0;
    let inAllCharger = 0;
    let totalPower = 0;

    if (chargerTypeMode === 'any') {
      // กรณี Any type kW
      console.log('=== Any type kW calculation ===');
      const multi = getMultiChargersIn();
      console.log('Multi chargers In:', multi);
      inAllCharger = multi.reduce((sum, item) => sum + item.in, 0);
      inOfCharger = multi.length === 1 ? multi[0].in : 0;
      totalPower = multiChargers.filter(name => name !== '').reduce((sum, chargerName) => {
        return sum + extractPowerValue(chargerName);
      }, 0);
      console.log('Any type - inOfCharger:', inOfCharger, 'inAllCharger:', inAllCharger, 'totalPower:', totalPower);
    } else {
      // กรณี Same kW
      console.log('=== Same kW calculation ===');
      const powerPerStation = extractPowerValue(form.charger)
      const numberOfChargers = parseInt(form.numberOfChargers) || 1
      console.log('Power per station:', powerPerStation, 'Number of chargers:', numberOfChargers);

      // ใช้ค่าจาก Excel เท่านั้น
      const inOfChargerExcel = getInFromExcel('inOfCharger');
      const inAllChargerExcel = getInFromExcel('inAllCharger');
      console.log('Excel values - inOfCharger:', inOfChargerExcel, 'inAllCharger:', inAllChargerExcel);

      inOfCharger = typeof inOfChargerExcel === 'number'
        ? inOfChargerExcel
        : 0;

      inAllCharger = typeof inAllChargerExcel === 'number'
        ? inAllChargerExcel
        : 0;

      totalPower = numberOfChargers * powerPerStation;
      console.log('Same type - inOfCharger:', inOfCharger, 'inAllCharger:', inAllCharger, 'totalPower:', totalPower);
    }

    setResults({
      totalPower,
      transformerSize: 0, // ไม่ใช้สูตรคำนวณเองอีกต่อไป
      inOfCharger,
      inAllCharger
    })
  }

  /** Reset form to empty values */
  const resetForm = () => {
    setForm({
      powerAuthority: '' as any, // หรือ undefined ถ้า type อนุญาต
      charger: '',
      numberOfChargers: '',
      trWiringType: '',
      chargerWiringType: ''
    });
    setResults(null);
  }

  // Charger options
  const chargerOptions = [
    '30 kW', '40 kW', '60 kW', '80 kW', '120 kW', '160 kW', '200 kW',
    '240 kW', '320 kW', '480 kW', '600 kW', '600 kW Prime+',
    '640 kW Prime+', '720 kW Prime+', '800 kW Prime+'
  ]

  // Number of chargers options
  const numberOfChargersOptions = Array.from({ length: 12 }, (_, i) => (i + 1).toString())

  // TR wiring type options
  const trWiringTypeOptions = [
    'ร้อยท่อเดินในอากาศ กลุ่ม 2',
    'ร้อยท่อฝังใต้ดิน กลุ่ม 5',
    'ราง TRAY ไม่มีฝา',
    'ราง LADDER ไม่มีฝา'
  ]

  // Charger wiring type options
  const chargerWiringTypeOptions = [
    'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ',
    'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน'
  ]

  const fetchExcelData = async () => {
    // Convert Google Sheets sharing URL to direct download URL
    const googleSheetsUrl = 'https://docs.google.com/spreadsheets/d/1l1BLnJs2mgV19cO9u_Az-OjU3dLYj4YA/edit?usp=sharing&ouid=111737986991833013743&rtpof=true&sd=true';
    const fileId = googleSheetsUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
    const excelFileUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx&usp=sharing`;
    try {
      const response = await axios.get(excelFileUrl, { responseType: 'arraybuffer' });
      const workbook = XLSX.read(response.data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      console.log('sheetName', sheetName);
      const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      console.log('jsonData', jsonData);
      
      // Normalize all column names to __EMPTY_X format
      const normalizedData = jsonData.map((row: any) => {
        const normalizedRow: any = {};
        const keys = Object.keys(row);
        
        keys.forEach((key, index) => {
          if (key === '__rowNum__') {
            normalizedRow[key] = row[key];
          } else {
            // Convert all other columns to __EMPTY_X format
            normalizedRow[`__EMPTY_${index}`] = row[key];
          }
        });
        
        return normalizedRow;
      });
      setExcelData(normalizedData);
      console.log('normalizedData', normalizedData);
      
      // Map the data to structured format
      const mapped = mapExcelData(normalizedData);
      console.log('mapped', mapped);
      setMappedData(mapped);
    } catch (error) {
      console.error("Error fetching Excel file:", error);
    }
  };

  // Call fetchExcelData on component mount
  useEffect(() => {
    fetchExcelData();
  }, []);

  useEffect(() => {
    // log ดูโครงสร้าง excelData
    if (excelData.length > 0) {
      console.log('excelData sample:', excelData.slice(0, 5));
      console.log('excelData columns for row 6 (30kW MEA):', excelData.find(r => r.__rowNum__ === 6));
      console.log('excelData columns for row 54 (30kW PEA):', excelData.find(r => r.__rowNum__ === 54));

      // Debug: ดูข้อมูล Transformer rows
      console.log('MEA Transformer rows (33-41):');
      for (let i = 33; i <= 41; i++) {
        const row = excelData.find(r => r.__rowNum__ === i);
        if (row) {
          console.log(`Row ${i}:`, row);
        }
      }

      console.log('PEA Transformer rows (76-88):');
      for (let i = 76; i <= 88; i++) {
        const row = excelData.find(r => r.__rowNum__ === i);
        if (row) {
          console.log(`Row ${i}:`, row);
        }
      }
    }
  }, [excelData]);

  // Debug mapped data structure
  useEffect(() => {
    if (mappedData) {
      console.log('=== MAPPED DATA STRUCTURE ===');
      console.log('Chargers:', mappedData.chargers);
      console.log('Sample charger (30 kW):', getChargerData('30 kW'));
      console.log('Sample MEA data for 30 kW:', getChargerDataByAuthority('30 kW', 'MEA'));
      console.log('Sample PEA data for 30 kW:', getChargerDataByAuthority('30 kW', 'PEA'));
      console.log('MEA Transformers:', mappedData.transformers.mea);
      console.log('PEA Transformers:', mappedData.transformers.pea);
    }
  }, [mappedData]);

  // เมื่อเลือก Number of Chargers ใหม่ ถ้าเลือก Any type kW ให้ reset multiChargers
  useEffect(() => {
    if (chargerTypeMode === 'any') {
      const n = parseInt(form.numberOfChargers) || 1;
      setMultiChargers(Array(n).fill(''));
    }
  }, [form.numberOfChargers, chargerTypeMode]);

  // Sync multiChargers array size with numberOfChargers and mode
  useEffect(() => {
    const n = parseInt(form.numberOfChargers) || 1;
    if (chargerTypeMode === 'any') {
      setMultiChargers(prev => {
        let arr = Array.isArray(prev) ? [...prev] : [];
        if (arr.length < n) {
          arr = arr.concat(Array(n - arr.length).fill(''));
        } else if (arr.length > n) {
          arr = arr.slice(0, n);
        }
        return arr;
      });
    } else {
      // ถ้าเปลี่ยนกลับเป็น single ให้ reset multiChargers
      setMultiChargers([]);
    }
  }, [form.numberOfChargers, chargerTypeMode]);

  // ฟังก์ชันเปลี่ยนค่าแต่ละ Charger
  const handleMultiChargerChange = (idx: number, value: string) => {
    setMultiChargers(prev => {
      let next: string[] = Array.isArray(prev) ? [...prev] : [];
      const n = parseInt(form.numberOfChargers) || 1;
      while (next.length < n) next.push('');
      next[idx] = value;
      if (next.length > n) next = next.slice(0, n);
      return next;
    });
  };

  // ฟังก์ชันดึงค่า In ของแต่ละเครื่อง (ใช้กับ Any type kW)
  const getMultiChargersIn = () => {
    return multiChargers
      .filter((chargerName) => typeof chargerName === 'string' && chargerName !== '')
      .map((chargerName) => {
        const chargerData = getChargerDataByAuthority(chargerName, form.powerAuthority);
        if (!chargerData) return { name: chargerName, in: 0 };
        
        const value = chargerData.inOfCharger;
        if (typeof value !== 'number' || isNaN(value)) return { name: chargerName, in: 0 };
        return { name: chargerName, in: value };
      });
  };

  // ฟังก์ชันดึง TR Wiring Size (CV) ตาม Power Authority และ TR Wiring Type
  const getTRWiringSizeCV = () => {
    const inAll = chargerTypeMode === 'any'
      ? getMultiChargersIn().reduce((sum, item) => sum + item.in, 0)
      : results?.inAllCharger || 0;
    
    const trRowNum = getTransformerRow(inAll, form.powerAuthority);
    if (!trRowNum) return '';

    const trRow = excelData.find(r => r.__rowNum__ === trRowNum);
    if (!trRow) return '';

    // Get column configuration using helper function
    const config = getTRWiringConfig(form.trWiringType);
    if (!config) return '';
    
    const cols = EXCEL_COLUMNS[config.size as keyof typeof EXCEL_COLUMNS] as readonly string[] | string[];
    if (!cols || typeof cols === 'string') return '';

    // Debug: ดูข้อมูลที่ดึงมา
    console.log(`TR Wiring Size Debug - Row ${trRowNum}:`, trRow);
    console.log(`TR Wiring Type: ${form.trWiringType}`);
    console.log(`Columns to check:`, cols);

    // ดึงค่าทุกคอลัมน์มาต่อกัน (เว้นวรรค)
    const values = cols.map(col => {
      const val = trRow[col];
      console.log(`Column ${col}: ${val}`);
      return val;
    }).filter(Boolean).join(' ');

    console.log(`Final TR Wiring Size: "${values}"`);
    return values;
  };

  // เพิ่มฟังก์ชันดึง TR Wire conduit ตาม Power Authority และ TR Wiring Type
  const getTRWireConduit = () => {
    const inAll = chargerTypeMode === 'any'
      ? getMultiChargersIn().reduce((sum, item) => sum + item.in, 0)
      : results?.inAllCharger || 0;
    
    const trRowNum = getTransformerRow(inAll, form.powerAuthority);
    if (!trRowNum) return '';

    const trRow = excelData.find(r => r.__rowNum__ === trRowNum);
    if (!trRow) return '';

    // Get column configuration using helper function
    const wiringConfig = getTRWiringConfig(form.trWiringType);
    if (!wiringConfig) return '';
    
    const conduitConfig = EXCEL_COLUMNS[wiringConfig.conduit as keyof typeof EXCEL_COLUMNS] as { cols: readonly string[] | string[]; unit: string };
    if (!conduitConfig || typeof conduitConfig === 'string' || Array.isArray(conduitConfig)) return '';

    const values = conduitConfig.cols.map(col => trRow[col]).filter(Boolean).join(' ');
    if (!values) return '';
    return `${values} ${conduitConfig.unit}`;
  };

  // เพิ่มฟังก์ชันดึง TR Wiring Size (CV) แยกแต่ละ Charger
  const getTRWiringSizeCVs = () => {
    // Get column configuration using helper function
    const config = getTRWiringConfig(form.trWiringType);
    if (!config) return [];
    
    const cols = EXCEL_COLUMNS[config.size as keyof typeof EXCEL_COLUMNS] as readonly string[] | string[];
    if (!cols || typeof cols === 'string') return [];

    const inAll = chargerTypeMode === 'any'
      ? getMultiChargersIn().reduce((sum, item) => sum + item.in, 0)
      : results?.inAllCharger || 0;
    
    const trRowNum = getTransformerRow(inAll, form.powerAuthority);
    if (!trRowNum) return [];

    const trRow = excelData.find(r => r.__rowNum__ === trRowNum);
    if (!trRow) return [];

    // Debug: ดูข้อมูลที่ดึงมา
    console.log(`TR Wiring Size CVs Debug - Row ${trRowNum}:`, trRow);
    console.log(`TR Wiring Type: ${form.trWiringType}`);
    console.log(`Columns to check:`, cols);

    // ดึงค่าทุกคอลัมน์มาต่อกัน (เว้นวรรค)
    const value = cols.map(col => {
      const val = trRow[col];
      console.log(`Column ${col}: ${val}`);
      return val;
    }).filter(Boolean).join(' ');

    console.log(`Final TR Wiring Size CVs: "${value}"`);

    // คืน array ตามจำนวนเครื่อง
    const numChargers = parseInt(form.numberOfChargers) || 1;
    return Array(numChargers).fill(value);
  };

  // เพิ่มฟังก์ชันดึง Charger Wiring cable ตาม Power Authority และ Charger Wiring Type
  const getChargerWiringCable = () => {
    // Get column configuration using helper function
    const wiringConfig = getChargerWiringConfig(form.powerAuthority, form.chargerWiringType);
    if (!wiringConfig) return '';
    
    const cols = EXCEL_COLUMNS[wiringConfig.cable as keyof typeof EXCEL_COLUMNS] as readonly string[] | string[];
    if (!cols || typeof cols === 'string') return '';

    // หา row ของแต่ละ In of charger (แต่ละเครื่อง)
    if (chargerTypeMode === 'any') {
      return multiChargers
        .filter(name => name !== '')
        .map((chargerName, idx) => {
          const cell = chargerToExcelCell[chargerName];
          let rowNum: number | undefined;
          if (form.powerAuthority === 'MEA' && cell?.mea) {
            rowNum = parseInt(cell.mea.replace('C', ''));
          }
          if (form.powerAuthority === 'PEA' && cell?.pea) {
            rowNum = parseInt(cell.pea.replace('C', ''));
          }
          if (!rowNum) return `Charger${idx + 1}: -`;
          const row = excelData.find(r => r.__rowNum__ === rowNum);
          if (!row) return `Charger${idx + 1}: -`;
          const value = cols.map(col => row[col]).filter(Boolean).join(' ');
          return `Charger${idx + 1}: ${value}`;
        });
    } else {
      // Same kW: ทุกเครื่องใช้ row เดียวกัน
      const cell = chargerToExcelCell[form.charger];
      let rowNum: number | undefined;
      if (form.powerAuthority === 'MEA' && cell?.mea) {
        rowNum = parseInt(cell.mea.replace('C', ''));
      }
      if (form.powerAuthority === 'PEA' && cell?.pea) {
        rowNum = parseInt(cell.pea.replace('C', ''));
      }
      if (!rowNum) return [];
      const row = excelData.find(r => r.__rowNum__ === rowNum);
      if (!row) return [];
      const value = cols.map(col => row[col]).filter(Boolean).join(' ');
      const numChargers = parseInt(form.numberOfChargers) || 1;
      return Array(numChargers).fill(`Charger1: ${value}`).map((v, i) =>
        `Charger${i + 1}: ${value}`
      );
    }
  };

  // ฟังก์ชันดึง Charger Wire conduit ตาม Power Authority และ Charger Wiring Type
  const getChargerWireConduit = () => {
    // Get column configuration using helper function
    const wiringConfig = getChargerWiringConfig(form.powerAuthority, form.chargerWiringType);
    if (!wiringConfig) return null;
    
    const conduitConfig = EXCEL_COLUMNS[wiringConfig.conduit as keyof typeof EXCEL_COLUMNS] as { cols: readonly string[] | string[]; unit: string };
    if (!conduitConfig || typeof conduitConfig === 'string' || Array.isArray(conduitConfig)) return null;

    const { cols, unit } = conduitConfig;

    if (chargerTypeMode === 'any') {
      return multiChargers
        .filter(name => name !== '')
        .map((chargerName, idx) => {
          const cell = chargerToExcelCell[chargerName];
          let rowNum: number | undefined;
          if (form.powerAuthority === 'MEA' && cell?.mea) {
            rowNum = parseInt(cell.mea.replace('C', ''));
          }
          if (form.powerAuthority === 'PEA' && cell?.pea) {
            rowNum = parseInt(cell.pea.replace('C', ''));
          }
          if (!rowNum) return `Charger${idx + 1}: -`;
          const row = excelData.find(r => r.__rowNum__ === rowNum);
          if (!row) return `Charger${idx + 1}: -`;
          const value = cols.map(col => row[col]).filter(Boolean).join(' ');
          return `Charger${idx + 1}: ${value} ${unit}`;
        });
    } else {
      const cell = chargerToExcelCell[form.charger];
      let rowNum: number | undefined;
      if (form.powerAuthority === 'MEA' && cell?.mea) {
        rowNum = parseInt(cell.mea.replace('C', ''));
      }
      if (form.powerAuthority === 'PEA' && cell?.pea) {
        rowNum = parseInt(cell.pea.replace('C', ''));
      }
      if (!rowNum) return [];
      const row = excelData.find(r => r.__rowNum__ === rowNum);
      if (!row) return [];
      const value = cols.map(col => row[col]).filter(Boolean).join(' ');
      const numChargers = parseInt(form.numberOfChargers) || 1;
      return Array(numChargers).fill(`Charger1: ${value} ${unit}`).map((v, i) =>
        `Charger${i + 1}: ${value} ${unit}`
      );
    }
  };

  // เพิ่มฟังก์ชันสำหรับเปลี่ยน label
  function getTrWireLabel(trWiringType: string) {
    if (trWiringType === 'ราง TRAY ไม่มีฝา') return 'TR Wire tray :';
    if (trWiringType === 'ราง LADDER ไม่มีฝา') return 'TR Wire ladder :';
    return 'TR Wire conduit :';
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 relative">
      {/* Next Button (top-right corner) */}
      <button
        onClick={() => {
          // ส่งข้อมูลที่ต้องการไปหน้า StationAccessory
          navigate('/station-accessory', {
            state: {
              powerAuthority: form.powerAuthority,
              numberOfChargers: form.numberOfChargers,
              transformer: getTRSizeFromExcel(
                chargerTypeMode === 'any'
                  ? getMultiChargersIn().reduce((sum, item) => sum + item.in, 0)
                  : results?.inAllCharger || 0
              ),
              trWiringType: form.trWiringType,
              trWiringSize: getTRWiringSizeCVs()[0] || '',
              trWireConduit: getTRWireConduit() || '',
              // Legacy MDB summary for backward compatibility
              mdb: (() => {
                let trRowNum: number | undefined = undefined;
                if (form.powerAuthority === 'MEA') {
                  const steps = [
                    { max: 444.1, row: 33 },
                    { max: 555.1, row: 34 },
                    { max: 699.4, row: 35 },
                    { max: 888.2, row: 36 },
                    { max: 1110.3, row: 37 },
                    { max: 1387.8, row: 38 },
                    { max: 1665.4, row: 39 },
                    { max: 2220.6, row: 40 },
                    { max: 2775.7, row: 41 },
                  ];
                  const inAll = chargerTypeMode === 'any'
                    ? getMultiChargersIn().reduce((sum, item) => sum + item.in, 0)
                    : results?.inAllCharger || 0;
                  const found = steps.find(s => inAll <= s.max);
                  trRowNum = found?.row;
                } else if (form.powerAuthority === 'PEA') {
                  const steps = [
                    { max: 115.4, row: 76 },
                    { max: 184.7, row: 77 },
                    { max: 288.6, row: 78 },
                    { max: 363.7, row: 79 },
                    { max: 461.8, row: 80 },
                    { max: 577.3, row: 81 },
                    { max: 727.4, row: 82 },
                    { max: 923.7, row: 83 },
                    { max: 1154.7, row: 84 },
                    { max: 1443.4, row: 85 },
                    { max: 1732.1, row: 86 },
                    { max: 2305.4, row: 87 },
                    { max: 2886.8, row: 88 },
                  ];
                  const inAll = chargerTypeMode === 'any'
                    ? getMultiChargersIn().reduce((sum, item) => sum + item.in, 0)
                    : results?.inAllCharger || 0;
                  const found = steps.find(s => inAll <= s.max);
                  trRowNum = found?.row;
                }
                const trRow = excelData.find(r => r.__rowNum__ === trRowNum);
                const mccbMain = trRow ? trRow.__EMPTY_11 : '-';
                return mccbMain ? `${mccbMain} A` : '-';
              })(),
              // New detailed MDB fields
              mdbMainAt: (() => {
                let trRowNum: number | undefined = undefined;
                if (form.powerAuthority === 'MEA') {
                  const steps = [
                    { max: 444.1, row: 33 },
                    { max: 555.1, row: 34 },
                    { max: 699.4, row: 35 },
                    { max: 888.2, row: 36 },
                    { max: 1110.3, row: 37 },
                    { max: 1387.8, row: 38 },
                    { max: 1665.4, row: 39 },
                    { max: 2220.6, row: 40 },
                    { max: 2775.7, row: 41 },
                  ];
                  const inAll = chargerTypeMode === 'any'
                    ? getMultiChargersIn().reduce((sum, item) => sum + item.in, 0)
                    : results?.inAllCharger || 0;
                  const found = steps.find(s => inAll <= s.max);
                  trRowNum = found?.row;
                } else if (form.powerAuthority === 'PEA') {
                  const steps = [
                    { max: 115.4, row: 76 },
                    { max: 184.7, row: 77 },
                    { max: 288.6, row: 78 },
                    { max: 363.7, row: 79 },
                    { max: 461.8, row: 80 },
                    { max: 577.3, row: 81 },
                    { max: 727.4, row: 82 },
                    { max: 923.7, row: 83 },
                    { max: 1154.7, row: 84 },
                    { max: 1443.4, row: 85 },
                    { max: 1732.1, row: 86 },
                    { max: 2305.4, row: 87 },
                    { max: 2886.8, row: 88 },
                  ];
                  const inAll = chargerTypeMode === 'any'
                    ? getMultiChargersIn().reduce((sum, item) => sum + item.in, 0)
                    : results?.inAllCharger || 0;
                  const found = steps.find(s => inAll <= s.max);
                  trRowNum = found?.row;
                }
                const trRow = excelData.find(r => r.__rowNum__ === trRowNum);
                const mccbMain = trRow ? trRow.__EMPTY_11 : '';
                return mccbMain ? `${mccbMain} A` : '';
              })(),
              mdbMainAf: (() => {
                let trRowNum: number | undefined = undefined;
                if (form.powerAuthority === 'MEA') {
                  const steps = [
                    { max: 444.1, row: 33 },
                    { max: 555.1, row: 34 },
                    { max: 699.4, row: 35 },
                    { max: 888.2, row: 36 },
                    { max: 1110.3, row: 37 },
                    { max: 1387.8, row: 38 },
                    { max: 1665.4, row: 39 },
                    { max: 2220.6, row: 40 },
                    { max: 2775.7, row: 41 },
                  ];
                  const inAll = chargerTypeMode === 'any'
                    ? getMultiChargersIn().reduce((sum, item) => sum + item.in, 0)
                    : results?.inAllCharger || 0;
                  const found = steps.find(s => inAll <= s.max);
                  trRowNum = found?.row;
                } else if (form.powerAuthority === 'PEA') {
                  const steps = [
                    { max: 115.4, row: 76 },
                    { max: 184.7, row: 77 },
                    { max: 288.6, row: 78 },
                    { max: 363.7, row: 79 },
                    { max: 461.8, row: 80 },
                    { max: 577.3, row: 81 },
                    { max: 727.4, row: 82 },
                    { max: 923.7, row: 83 },
                    { max: 1154.7, row: 84 },
                    { max: 1443.4, row: 85 },
                    { max: 1732.1, row: 86 },
                    { max: 2305.4, row: 87 },
                    { max: 2886.8, row: 88 },
                  ];
                  const inAll = chargerTypeMode === 'any'
                    ? getMultiChargersIn().reduce((sum, item) => sum + item.in, 0)
                    : results?.inAllCharger || 0;
                  const found = steps.find(s => inAll <= s.max);
                  trRowNum = found?.row;
                }
                const trRow = excelData.find(r => r.__rowNum__ === trRowNum);
                const main2 = trRow ? trRow.__EMPTY_14 : '';
                return main2 ? `${main2} A` : '';
              })(),
              mdbSubs: (() => {
                if (chargerTypeMode === 'any') {
                  return multiChargers.map((chargerName) => {
                    const cell = chargerToExcelCell[chargerName];
                    let rowNum: number | undefined;
                    if (form.powerAuthority === 'MEA' && cell?.mea) {
                      rowNum = parseInt(cell.mea.replace('C', ''));
                    }
                    if (form.powerAuthority === 'PEA' && cell?.pea) {
                      rowNum = parseInt(cell.pea.replace('C', ''));
                    }
                    const row = excelData.find(r => r.__rowNum__ === rowNum);
                    const val = form.powerAuthority === 'MEA'
                      ? (row ? row.__EMPTY_29 || '-' : '-')
                      : (row ? row.__EMPTY_27 || '-' : '-');
                    return `${val} A`;
                  });
                } else {
                  const cell = chargerToExcelCell[form.charger];
                  let rowNum: number | undefined;
                  if (form.powerAuthority === 'MEA' && cell?.mea) {
                    rowNum = parseInt(cell.mea.replace('C', ''));
                  }
                  if (form.powerAuthority === 'PEA' && cell?.pea) {
                    rowNum = parseInt(cell.pea.replace('C', ''));
                  }
                  const row = excelData.find(r => r.__rowNum__ === rowNum);
                  const value = form.powerAuthority === 'MEA'
                    ? (row ? row.__EMPTY_29 || '-' : '-')
                    : (row ? row.__EMPTY_27 || '-' : '-');
                  const numChargers = parseInt(form.numberOfChargers) || 1;
                  return Array(numChargers).fill(`${value} A`);
                }
              })(),
              mdbLighting: '10 A',
              mdbCommu: '10 A',
              chargerWiringType: form.chargerWiringType,
              chargerWiringCable: Array.isArray(getChargerWiringCable()) ? getChargerWiringCable()[0] : getChargerWiringCable(),
              chargerWireConduit: Array.isArray(getChargerWireConduit()) ? (getChargerWireConduit()?.[0] ?? '') : (getChargerWireConduit() ?? ''),
              chargerWiringCableAll: (() => {
                const v = getChargerWiringCable();
                if (Array.isArray(v)) return v;
                const n = parseInt(form.numberOfChargers) || 1;
                return Array(n).fill(v);
              })(),
              chargerWireConduitAll: (() => {
                const v = getChargerWireConduit();
                const norm = (s: string) => (s || '').replace(/^Charger\d+:\s*/i, '').trim();
                if (Array.isArray(v)) return v.map(norm);
                const n = parseInt(form.numberOfChargers) || 1;
                return Array(n).fill(norm((v as unknown as string) || ''));
              })(),
              chargerDistance: 0, // เพิ่มช่องกรอกในหน้า StationAccessory
              trDistance: 0, // เพิ่มช่องกรอกในหน้า StationAccessory
            }
          });
        }}
        className="absolute top-8 right-8 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded shadow-lg z-10"
      >
        Next
      </button>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">EV Station Calculator</h1>
          </div>
          <p className="text-lg text-gray-600">Calculate power requirements for electric vehicle charging stations</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left side: Input Form */}
          <div>
            {/* --- Input Form --- */}
            <Card className="shadow-xl border-0 overflow-hidden mb-6">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Settings className="h-5 w-5" />
                  Station Configuration
                </CardTitle>
                <CardDescription className="text-blue-100">
                  Configure your EV station parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Power Authority */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">
                      Power Authority <span className="text-xs text-gray-400">(หน่วยงานไฟฟ้า)</span>
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        className={`flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-orange-50 cursor-pointer ${form.powerAuthority === 'PEA' ? 'bg-orange-100 border-orange-300' : ''
                          }`}
                        onClick={() => setForm(f => ({ ...f, powerAuthority: 'PEA' }))}
                      >
                        <Checkbox
                          id="PEA"
                          checked={form.powerAuthority === 'PEA'}
                          onCheckedChange={(checked) => {
                            if (checked) setForm(f => ({ ...f, powerAuthority: 'PEA' }));
                          }}
                          className="text-orange-500 border-orange-400 data-[state=checked]:bg-orange-500"
                        />
                        <Label htmlFor="PEA" className="font-medium cursor-pointer text-orange-700">PEA</Label>
                      </div>
                      <div
                        className={`flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-violet-50 cursor-pointer ${form.powerAuthority === 'MEA' ? 'bg-violet-100 border-violet-300' : ''
                          }`}
                        onClick={() => setForm(f => ({ ...f, powerAuthority: 'MEA' }))}
                      >
                        <Checkbox
                          id="MEA"
                          checked={form.powerAuthority === 'MEA'}
                          onCheckedChange={(checked) => {
                            if (checked) setForm(f => ({ ...f, powerAuthority: 'MEA' }));
                          }}
                          className="text-violet-500 border-violet-400 data-[state=checked]:bg-violet-500"
                        />
                        <Label htmlFor="MEA" className="font-medium cursor-pointer text-violet-700">MEA</Label>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Charger Type Mode */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">
                      Charger Type
                    </Label>
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="same"
                          checked={chargerTypeMode === 'same'}
                          onCheckedChange={() => setChargerTypeMode('same')}
                        />
                        <Label htmlFor="same" className="font-medium cursor-pointer">
                          Single kW <span className="text-xs text-gray-400">(ประเภทเดียว)</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="any"
                          checked={chargerTypeMode === 'any'}
                          onCheckedChange={() => setChargerTypeMode('any')}
                        />
                        <Label htmlFor="any" className="font-medium cursor-pointer">
                          Multiple kW <span className="text-xs text-gray-400">(หลายประเภท)</span>
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Number of chargers */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">
                      Number of Chargers <span className="text-xs text-gray-400">(จำนวนเครื่องชาร์จ)</span>
                    </Label>
                    <Select value={form.numberOfChargers} onValueChange={(value) => setForm(f => ({ ...f, numberOfChargers: value }))}>
                      <SelectTrigger className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Select number of chargers (Units)" />
                      </SelectTrigger>
                      <SelectContent>
                        {numberOfChargersOptions.map((option) => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Charger Type Selection */}
                  {chargerTypeMode === 'any' ? (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700">
                        Charger Type Selection
                      </Label>
                      {multiChargers.map((val, idx) => (
                        <div key={idx} className="mb-2">
                          <Label>Charger{idx + 1}</Label>
                          <Select value={val} onValueChange={v => handleMultiChargerChange(idx, v)}>
                            <SelectTrigger className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                              <SelectValue placeholder={`Select Charger${idx + 1} type `} />
                            </SelectTrigger>
                            <SelectContent>
                              {chargerOptions.map((option) => (
                                <SelectItem key={option} value={option}>{option}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700">
                        Charger Type Selection <span className="text-xs text-gray-400">(การเลือกประเภทของที่ชาร์จ)</span>
                      </Label>
                      <Select value={form.charger} onValueChange={(value) => setForm(f => ({ ...f, charger: value }))}>
                        <SelectTrigger className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                          <SelectValue placeholder="Select charger type" />
                        </SelectTrigger>
                        <SelectContent>
                          {chargerOptions.map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Separator />

                  {/* TR Wiring Type */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">
                      TR to MDB <span className="text-xs text-gray-400">(การเดินสาย หม้อแปลง ถึง MDB)</span>
                    </Label>
                    <Select value={form.trWiringType} onValueChange={(value) => setForm(f => ({ ...f, trWiringType: value }))}>
                      <SelectTrigger className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Select TR wiring type" />
                      </SelectTrigger>
                      <SelectContent>
                        {trWiringTypeOptions.map((option) => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Charger Wiring Type */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">
                      MDB to Charger <span className="text-xs text-gray-400">(การเดินสาย MDB ถึง เครื่องชาร์จ)</span>
                    </Label>
                    <Select value={form.chargerWiringType} onValueChange={(value) => setForm(f => ({ ...f, chargerWiringType: value }))}>
                      <SelectTrigger className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Select charger wiring type" />
                      </SelectTrigger>
                      <SelectContent>
                        {chargerWiringTypeOptions.map((option) => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={calculateResults}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 h-12 text-white font-medium shadow-lg"
                    >
                      <Calculator className="h-5 w-5 mr-2" />
                      Calculate
                    </Button>
                    <Button
                      onClick={resetForm}
                      variant="outline"
                      className="flex-1 bg-transparent h-12 font-medium border-gray-300 hover:bg-gray-50"
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Right side: 4 summary cards (top) + Chargers + TR to MDB Summary Card */}
          <div>
            {/* --- 4 Summary Cards (Top) --- */}
            {results && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Total Power */}
                <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Total Power</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-900">
                      {(
                        (
                          (chargerTypeMode === 'any'
                            ? getMultiChargersIn().reduce((sum, item) => sum + item.in, 0)
                            : results?.inAllCharger || 0
                          ) * Math.sqrt(3) * 400
                        ) / 1000
                      ).toFixed(2)} kVA
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      (In all Charger × √3 × 400 ÷ 1000)
                    </div>
                  </CardContent>
                </Card>
                {/* Transformer Size */}
                <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Battery className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Transformer Size</span>
                    </div>
                    <div className="text-2xl font-bold text-green-900 flex items-center">
                      {getTRSizeFromExcel(
                        chargerTypeMode === 'any'
                          ? getMultiChargersIn().reduce((sum, item) => sum + item.in, 0)
                          : results?.inAllCharger || 0
                      )}
                      <span className="text-2xl font-bold text-green-900 ml-1">kVA</span>
                    </div>
                  </CardContent>
                </Card>
                {/* Power Authority Card */}
                <Card className={
                  form.powerAuthority === 'PEA'
                    ? "bg-orange-50 border border-orange-100 shadow-none"
                    : "bg-violet-50 border border-violet-100 shadow-none"
                }>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={
                        form.powerAuthority === 'PEA'
                          ? "h-5 w-5 rounded-full bg-orange-400 inline-block"
                          : "h-5 w-5 rounded-full bg-violet-900 inline-block"
                      } />
                      <span className={
                        form.powerAuthority === 'PEA'
                          ? "text-sm font-medium text-orange-800"
                          : "text-sm font-medium text-violet-800"
                      }>
                        Power Authority
                      </span>
                    </div>
                    <div className={
                      form.powerAuthority === 'PEA'
                        ? "text-2xl font-bold text-orange-700"
                        : "text-2xl font-bold text-violet-800"
                    }>
                      {form.powerAuthority || '-'}
                    </div>
                  </CardContent>
                </Card>
                {/* MDB Card */}
                <Card className="bg-yellow-50 border border-yellow-100 shadow-none">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="h-5 w-5 rounded-full bg-yellow-400 inline-block" />
                      <span className="text-sm font-medium text-yellow-800">MDB (MCCB Main)</span>
                    </div>
                    <div className="text-2xl font-bold text-yellow-700">
                      {(() => {
                        let trRowNum: number | undefined = undefined;
                        if (form.powerAuthority === 'MEA') {
                          const steps = [
                            { max: 444.1, row: 33 },
                            { max: 555.1, row: 34 },
                            { max: 699.4, row: 35 },
                            { max: 888.2, row: 36 },
                            { max: 1110.3, row: 37 },
                            { max: 1387.8, row: 38 },
                            { max: 1665.4, row: 39 },
                            { max: 2220.6, row: 40 },
                            { max: 2775.7, row: 41 },
                          ];
                          const inAll = chargerTypeMode === 'any'
                            ? getMultiChargersIn().reduce((sum, item) => sum + item.in, 0)
                            : results?.inAllCharger || 0;
                          const found = steps.find(s => inAll <= s.max);
                          trRowNum = found?.row;
                        } else if (form.powerAuthority === 'PEA') {
                          const steps = [
                            { max: 115.4, row: 76 },
                            { max: 184.7, row: 77 },
                            { max: 288.6, row: 78 },
                            { max: 363.7, row: 79 },
                            { max: 461.8, row: 80 },
                            { max: 577.3, row: 81 },
                            { max: 727.4, row: 82 },
                            { max: 923.7, row: 83 },
                            { max: 1154.7, row: 84 },
                            { max: 1443.4, row: 85 },
                            { max: 1732.1, row: 86 },
                            { max: 2305.4, row: 87 },
                            { max: 2886.8, row: 88 },
                          ];
                          const inAll = chargerTypeMode === 'any'
                            ? getMultiChargersIn().reduce((sum, item) => sum + item.in, 0)
                            : results?.inAllCharger || 0;
                          const found = steps.find(s => inAll <= s.max);
                          trRowNum = found?.row;
                        }
                        const trRow = excelData.find(r => r.__rowNum__ === trRowNum);
                        const mccbMain = trRow ? trRow.__EMPTY_11 : '-';
                        return mccbMain ? `${mccbMain} A` : '-';
                      })()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      MCCB Main (AT)
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            {/* --- Sammary Horizontal Summary (ใหม่) --- */}
            <Card className="shadow-lg border-0 mb-6">
              <CardHeader className="bg-gradient-to-r from-blue-100 to-cyan-100 border-b">
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  Summary for Charger
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-2">
                  {/* Horizontal summary for each charger */}
                  {chargerTypeMode === 'any' ? (
                    getMultiChargersIn().length > 0 ? (
                      getMultiChargersIn().map((item, idx) => {
                        const cableArr = getChargerWiringCable();
                        const cable = Array.isArray(cableArr) ? cableArr[idx] || '-' : (typeof cableArr === 'string' ? cableArr : '-');
                        const conduitArr = getChargerWireConduit();
                        const conduit = Array.isArray(conduitArr) ? conduitArr[idx] || '-' : (typeof conduitArr === 'string' ? conduitArr : '-');
                        return (
                          <div key={idx} className="flex flex-wrap gap-4 items-center text-base">
                            <span className="font-semibold text-gray-900">
                              Charger{idx + 1}: {multiChargers[idx] || '-'}
                            </span>
                            <span className="text-gray-700">
                              In: {item.in.toFixed(2)} A
                            </span>
                            <span className="text-gray-700">
                              Cable (CV/THW): {cable.replace(/^Charger\d+:\s*/, '')}
                            </span>
                            <span className="text-gray-700">
                              Conduit: {conduit.replace(/^Charger\d+:\s*/, '')}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-gray-400">-</div>
                    )
                  ) : (
                    (() => {
                      const num = parseInt(form.numberOfChargers) || 1;
                      const cableArr = getChargerWiringCable();
                      const conduitArr = getChargerWireConduit();
                      return Array.from({ length: num }).map((_, idx) => (
                        <div key={idx} className="flex flex-wrap gap-4 items-center text-base">
                          <span className="font-semibold text-gray-900">
                            Charger{idx + 1}: {form.charger}
                          </span>
                          <span className="text-gray-700">
                            In: {results?.inOfCharger !== undefined ? results.inOfCharger.toFixed(2) : '-'} A
                          </span>
                          <span className="text-gray-700">
                            Cable (CV/THW): {Array.isArray(cableArr) ? (cableArr[idx] ? cableArr[idx].replace(/^Charger\d+:\s*/, '') : '-') : (typeof cableArr === 'string' ? cableArr : '-')}
                          </span>
                          <span className="text-gray-700">
                            Conduit: {Array.isArray(conduitArr) ? (conduitArr[idx] ? conduitArr[idx].replace(/^Charger\d+:\s*/, '') : '-') : (typeof conduitArr === 'string' ? conduitArr : '-')}
                          </span>
                        </div>
                      ));
                    })()
                  )}
                  {/* In of all Charger summary */}
                  <div className="mt-4 font-semibold text-blue-900 text-base">
                    In of all Charger:{" "}
                    {chargerTypeMode === 'any'
                      ? getMultiChargersIn().reduce((sum, item) => sum + item.in, 0).toFixed(2)
                      : results?.inAllCharger !== undefined
                        ? results.inAllCharger.toFixed(2)
                        : '-'
                    }
                    <span className="ml-1">A</span>
                  </div>
                  <div className="font-semibold text-blue-900 text-base">
                    Charger Wiring Type: <span className="font-normal">{form.chargerWiringType}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* --- TR to MDB Summary Card --- */}
            {results ? (
              <div className="space-y-6">
                <Card className="shadow-lg border-0">
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b">
                    <CardTitle className="flex items-center gap-2 text-gray-800">
                      TR to MDB
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Power Authority */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-700">Power Authority:</span>
                        <span className="font-semibold text-gray-900">{form.powerAuthority}</span>
                      </div>
                      {/* Transformer */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-700">Transformer:</span>
                        <span className="font-semibold text-gray-900 text-base flex items-center">
                          {getTRSizeFromExcel(
                            chargerTypeMode === 'any'
                              ? getMultiChargersIn().reduce((sum, item) => sum + item.in, 0)
                              : results?.inAllCharger || 0
                          )}
                          <span className="text-base text-gray-900 ml-1">kVA</span>
                        </span>
                      </div>
                      {/* TR Wiring Type */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-700">TR Wiring Type:</span>
                        <span className="font-semibold text-gray-900 text-sm">{form.trWiringType}</span>
                      </div>
                      {/* TR Wiring Size (CV) */}
                      {(form.trWiringType && form.powerAuthority && getTRWiringSizeCVs().length > 0) && (
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-700">TR Wiring Size (CV/THW):</span>
                          <span className="font-semibold text-gray-900 text-sm">
                            {getTRWiringSizeCVs()[0]}
                          </span>
                        </div>
                      )}
                      {/* TR Wire conduit */}
                      {(form.trWiringType && form.powerAuthority && getTRWireConduit()) && (
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-700">{getTrWireLabel(form.trWiringType)}</span>
                          <span className="font-semibold text-gray-900 text-sm">{getTRWireConduit()}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* --- MDB to Charger Summary Card (moved here) --- */}
                <Card className="shadow-lg border-0 mb-4">
                  <CardHeader className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-b">
                    <CardTitle className="flex items-center gap-2 text-yellow-800">
                      MDB to Charger
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* MDB */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-700">MDB :</span>
                        <div className="flex flex-col items-end">
                          {/* ...existing MDB summary logic... */}
                          {(() => {
                            let trRowNum: number | undefined = undefined;
                            if (form.powerAuthority === 'MEA') {
                              const steps = [
                                { max: 444.1, row: 33 },
                                { max: 555.1, row: 34 },
                                { max: 699.4, row: 35 },
                                { max: 888.2, row: 36 },
                                { max: 1110.3, row: 37 },
                                { max: 1387.8, row: 38 },
                                { max: 1665.4, row: 39 },
                                { max: 2220.6, row: 40 },
                                { max: 2775.7, row: 41 },
                              ];
                              const inAll = chargerTypeMode === 'any'
                                ? getMultiChargersIn().reduce((sum, item) => sum + item.in, 0)
                                : results?.inAllCharger || 0;
                              const found = steps.find(s => inAll <= s.max);
                              trRowNum = found?.row;
                            } else if (form.powerAuthority === 'PEA') {
                              const steps = [
                                { max: 115.4, row: 76 },
                                { max: 184.7, row: 77 },
                                { max: 288.6, row: 78 },
                                { max: 363.7, row: 79 },
                                { max: 461.8, row: 80 },
                                { max: 577.3, row: 81 },
                                { max: 727.4, row: 82 },
                                { max: 923.7, row: 83 },
                                { max: 1154.7, row: 84 },
                                { max: 1443.4, row: 85 },
                                { max: 1732.1, row: 86 },
                                { max: 2305.4, row: 87 },
                                { max: 2886.8, row: 88 },
                              ];
                              const inAll = chargerTypeMode === 'any'
                                ? getMultiChargersIn().reduce((sum, item) => sum + item.in, 0)
                                : results?.inAllCharger || 0;
                              const found = steps.find(s => inAll <= s.max);
                              trRowNum = found?.row;
                            }
                            const trRow = excelData.find(r => r.__rowNum__ === trRowNum);
                            const mccbMain = trRow ? trRow.__EMPTY_11 : '-';
                            const main2 = trRow ? trRow.__EMPTY_14 : '-';
                            // MCCB Sub
                            let mccbSubs: string[] = [];
                            if (chargerTypeMode === 'any') {
                              mccbSubs = multiChargers.map((chargerName) => {
                                const cell = chargerToExcelCell[chargerName];
                                let rowNum: number | undefined;
                                if (form.powerAuthority === 'MEA' && cell?.mea) {
                                  rowNum = parseInt(cell.mea.replace('C', ''));
                                }
                                if (form.powerAuthority === 'PEA' && cell?.pea) {
                                  rowNum = parseInt(cell.pea.replace('C', ''));
                                }
                                const row = excelData.find(r => r.__rowNum__ === rowNum);
                                if (form.powerAuthority === 'MEA') {
                                  return row ? row.__EMPTY_29 || '-' : '-';
                                } else {
                                  return row ? row.__EMPTY_27 || '-' : '-';
                                }
                              });
                            } else {
                              const cell = chargerToExcelCell[form.charger];
                              let rowNum: number | undefined;
                              if (form.powerAuthority === 'MEA' && cell?.mea) {
                                rowNum = parseInt(cell.mea.replace('C', ''));
                              }
                              if (form.powerAuthority === 'PEA' && cell?.pea) {
                                rowNum = parseInt(cell.pea.replace('C', ''));
                              }
                              const row = excelData.find(r => r.__rowNum__ === rowNum);
                              const value =
                                form.powerAuthority === 'MEA'
                                  ? (row ? row.__EMPTY_29 || '-' : '-')
                                  : (row ? row.__EMPTY_27 || '-' : '-');
                              const numChargers = parseInt(form.numberOfChargers) || 1;
                              mccbSubs = Array(numChargers).fill(value);
                            }
                            return (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-gray-700">&nbsp;&nbsp;&nbsp;&nbsp;MCCB Main</span>
                                  <span className="font-semibold text-gray-900">
                                    {/* เพิ่มช่องว่างหลัง Main */}
                                    <span style={{ marginRight: '0.5rem' }}></span>
                                    {mccbMain && (
                                      <>
                                        <span style={{ marginRight: '0.5rem' }}>{mccbMain}</span>
                                        A <span className="text-gray-400 text-xs ml-1">(AT)</span>
                                        <span style={{ margin: '0 0.5rem' }}>/</span>
                                        <span style={{ marginRight: '0.5rem' }}>{main2}</span>
                                        A <span className="text-gray-400 text-xs ml-1">(AF)</span>
                                      </>
                                    )}
                                  </span>
                                </div>
                                {mccbSubs.map((val, idx) => (
                                  <div key={idx} className="flex items-center justify-between">
                                    <span className="font-medium text-gray-700">&nbsp;&nbsp;&nbsp;&nbsp;MCCB Sub C{idx + 1}</span>
                                    <span className="font-semibold text-gray-900">{val} A</span>
                                  </div>
                                ))}
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-gray-700">&nbsp;&nbsp;&nbsp;&nbsp;MCCB for Lighting</span>
                                  <span className="font-semibold text-gray-900">10 A</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-gray-700">&nbsp;&nbsp;&nbsp;&nbsp;MCCB for Commu</span>
                                  <span className="font-semibold text-gray-900">10 A</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      {/* Selected Charger */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-700">Selected Charger:</span>
                        <span className="font-semibold text-gray-900 text-sm">
                          {chargerTypeMode === 'any'
                            ? multiChargers.filter(Boolean).length > 0
                              ? Object.entries(
                                multiChargers.filter(Boolean).reduce((acc, name) => {
                                  acc[name] = (acc[name] || 0) + 1;
                                  return acc;
                                }, {} as Record<string, number>)
                              ).map(([name, count], idx) => (
                                <span key={name}>
                                  {idx > 0 && ', '}
                                  {name} x {count}
                                </span>
                              ))
                              : '-'
                            : form.charger
                              ? `${form.charger} x ${form.numberOfChargers || 1}`
                              : '-'
                          }
                        </span>
                      </div>
                      {/* Charger Wiring Type */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-700">Charger Wiring Type:</span>
                        <span className="font-semibold text-gray-900 text-sm">{form.chargerWiringType}</span>
                      </div>
                      {/* Charger Wiring Cable */}
                      {(form.chargerWiringType && form.powerAuthority) && (
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-700">Charger Wiring Cable (CV/THW):</span>
                          <div className="flex flex-col items-end">
                            {(() => {
                              const cableData = getChargerWiringCable();
                              return Array.isArray(cableData)
                                ? cableData.map((val: string, idx: number) => (
                                  <span key={idx} className="font-semibold text-gray-900 text-sm">{val}</span>
                                ))
                                : <span className="font-semibold text-gray-900 text-sm">{cableData}</span>
                            })()}
                          </div>
                        </div>
                      )}
                      {/* Charger Wire conduit */}
                      {(form.chargerWiringType && form.powerAuthority && getChargerWireConduit()) && (
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-700">Charger Wire conduit:</span>
                          <div className="flex flex-col items-end">
                            {Array.isArray(getChargerWireConduit())
                              ? getChargerWireConduit()!.map((val: string, idx: number) => (
                                <span key={idx} className="font-semibold text-gray-900 text-sm">{val}</span>
                              ))
                              : getChargerWireConduit() != null
                                ? <span className="font-semibold text-gray-900 text-sm">{getChargerWireConduit()}</span>
                                : null
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* --- Chargers Summary Card (ย้ายมาไว้ใต้ TR to MDB) --- */}
                <Card className="shadow-lg border-0">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
                    <CardTitle className="flex items-center gap-2 text-blue-800">
                      Chargers
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Charger */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-700">Charger:</span>
                        {chargerTypeMode === 'any' ? (
                          <div className="flex flex-col gap-1">
                            {multiChargers.map((name, idx) => (
                              <span key={idx} className="ml-6 font-semibold text-gray-900">
                                Charger{idx + 1}: {name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="font-semibold text-gray-900">{form.charger}</span>
                        )}
                      </div>
                      {/* Number of Chargers */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-700">Number of Chargers:</span>
                        <span className="font-semibold text-gray-900">
                          {form.numberOfChargers || '-'}
                        </span>
                      </div>
                      {/* In of Charger */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-700">In of Charger:</span>
                        <span className="font-semibold text-gray-900 text-base">
                          {chargerTypeMode === 'any'
                            ? (
                              getMultiChargersIn().length > 0
                                ? (
                                  <span>
                                    {getMultiChargersIn().map((item, idx) => (
                                      <span key={idx}>
                                        {idx > 0 && ', '}
                                        Charger{idx + 1}: {item.in.toFixed(2)} A
                                      </span>
                                    ))}
                                  </span>
                                )
                                : '-'
                            )
                            : results?.inOfCharger !== undefined
                              ? results.inOfCharger.toFixed(2) + ' A'
                              : '-'
                          }
                        </span>
                      </div>
                      {/* In of all Charger */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-700">In of all Charger:</span>
                        <span className="font-semibold text-gray-900 text-base">
                          {chargerTypeMode === 'any'
                            ? getMultiChargersIn().reduce((sum, item) => sum + item.in, 0).toFixed(2)
                            : results?.inAllCharger !== undefined
                              ? results.inAllCharger.toFixed(2)
                              : '-'
                          }
                          <span className="text-base text-gray-900 ml-1">A</span>
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="h-full flex items-center justify-center border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-white">
                <CardContent className="text-center p-8">
                  <div className="p-4 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <Calculator className="h-10 w-10 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">Ready to Calculate</h3>
                  <p className="text-gray-500 max-w-sm">
                    Configure your EV station parameters and click "Calculate" to see the detailed electrical analysis and recommendations.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Component to fetch and display Excel data from OneDrive
 */
function ExcelFromOneDrive() {
  const [sheetsData, setSheetsData] = useState<{ name: string; data: any[][] }[]>([]);

  useEffect(() => {
    const fileUrl = "https://1drv.ms/x/c/8811C791092F5560/EQZSFFUZXuJLt8bhY7mFrggBGj1UMbTIlCMFTSvLpAbKcA";

    fetch(fileUrl, { mode: 'cors' })
      .then(res => res.blob())
      .then(blob => blob.arrayBuffer())
      .then(buffer => {
        const workbook = XLSX.read(buffer, { type: "array" });
        const allSheets = workbook.SheetNames.map(sheetName => ({
          name: sheetName,
          data: XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 }) as any[][]
        }));
        setSheetsData(allSheets);
      })
      .catch(err => {
        console.error("ไม่สามารถโหลดไฟล์ Excel จาก OneDrive ได้:", err);
      });
  }, []);

  return (
    <div>
      <h2>Excel Data from OneDrive (ทุกแผ่น)</h2>
      {sheetsData.map(sheet => (
        <div key={sheet.name} style={{ marginBottom: 32 }}>
          <h3>Sheet: {sheet.name}</h3>
          <table border={1}>
            <tbody>
              {sheet.data.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => <td key={j}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}