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

/**
 * Home component - Main EV Station Calculator interface
 */
export default function Home(): JSX.Element {
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

  // ดึงค่าจาก Excel ตาม Power Authority และ Charger Type
  const getInFromExcel = (type: 'inOfCharger' | 'inAllCharger') => {
    const charger = form.charger;
    const numberOfChargers = parseInt(form.numberOfChargers) || 1;
    const cell = chargerToExcelCell[charger];
    if (!cell) return undefined;

    // ดึงเลข row จาก cell เช่น 'C7' => 7
    let rowNum: number | undefined;
    if (form.powerAuthority === 'MEA' && cell.mea) {
      rowNum = parseInt(cell.mea.replace('C', ''));
    }
    if (form.powerAuthority === 'PEA' && cell.pea) {
      rowNum = parseInt(cell.pea.replace('C', ''));
    }
    if (rowNum === undefined) return undefined;

    // หา row ที่ __rowNum__ === rowNum
    const row = excelData.find((r) => r.__rowNum__ === rowNum);
    if (!row) return undefined;
    const colKey = '__EMPTY_2'; // ทั้ง MEA และ PEA ใช้ __EMPTY_2
    const value = row[colKey];

    if (typeof value !== 'number' || isNaN(value)) return undefined;
    if (type === 'inOfCharger') return value;
    if (type === 'inAllCharger') return value * numberOfChargers;
    return undefined;
  };

  // ฟังก์ชันเลือก TR size ตาม Power Authority และผลรวม In all charger
  const getTRSizeFromExcel = (inAllCharger: number) => {
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
      const found = steps.find(s => inAllCharger <= s.max); // ใช้ <=
      if (found) {
        const row = excelData.find(r => r.__rowNum__ === found.row);
        return row ? row.__EMPTY : '-';
      }
      return '-';
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
      const found = steps.find(s => inAllCharger <= s.max); // ใช้ <=
      if (found) {
        const row = excelData.find(r => r.__rowNum__ === found.row);
        return row ? row.__EMPTY : '-';
      }
      return '-';
    }
    return '-';
  };

  /** Calculate EV station requirements */
  const calculateResults = () => {
    let inOfCharger = 0;
    let inAllCharger = 0;
    let totalPower = 0;

    if (chargerTypeMode === 'any') {
      // กรณี Any type kW
      const multi = getMultiChargersIn();
      inAllCharger = multi.reduce((sum, item) => sum + item.in, 0);
      inOfCharger = multi.length === 1 ? multi[0].in : 0;
      totalPower = multiChargers.filter(name => name !== '').reduce((sum, chargerName) => {
        return sum + extractPowerValue(chargerName);
      }, 0);
    } else {
      // กรณี Same kW
      const powerPerStation = extractPowerValue(form.charger)
      const numberOfChargers = parseInt(form.numberOfChargers) || 1

      // ใช้ค่าจาก Excel เท่านั้น
      const inOfChargerExcel = getInFromExcel('inOfCharger');
      const inAllChargerExcel = getInFromExcel('inAllCharger');

      inOfCharger = typeof inOfChargerExcel === 'number'
        ? inOfChargerExcel
        : 0;

      inAllCharger = typeof inAllChargerExcel === 'number'
        ? inAllChargerExcel
        : 0;

      totalPower = numberOfChargers * powerPerStation;
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
    const googleSheetsUrl = 'https://docs.google.com/spreadsheets/d/1l1BLnJs2mgV19cO9u_Az-OjU3dLYj4YA/edit?usp=sharing&ouid=100443117052270919276&rtpof=true&sd=true';
    const fileId = googleSheetsUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
    const excelFileUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx&usp=sharing`;
    try {
      const response = await axios.get(excelFileUrl, { responseType: 'arraybuffer' });
      const workbook = XLSX.read(response.data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      setExcelData(jsonData);
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
    }
  }, [excelData]);

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
        const cell = chargerToExcelCell[chargerName];
        if (!cell) return { name: chargerName, in: 0 };
        let rowNum: number | undefined;
        if (form.powerAuthority === 'MEA' && cell.mea) {
          rowNum = parseInt(cell.mea.replace('C', ''));
        }
        if (form.powerAuthority === 'PEA' && cell.pea) {
          rowNum = parseInt(cell.pea.replace('C', ''));
        }
        if (rowNum === undefined) return { name: chargerName, in: 0 };
        const row = excelData.find((r) => r.__rowNum__ === rowNum);
        if (!row) return { name: chargerName, in: 0 };
        const colKey = '__EMPTY_2'; // ทั้ง MEA และ PEA ใช้ __EMPTY_2
        const value = row[colKey];

        if (typeof value !== 'number' || isNaN(value)) return { name: chargerName, in: 0 };
        return { name: chargerName, in: value };
      });
  };

  // ฟังก์ชันดึง TR Wiring Size (CV) ตาม Power Authority และ TR Wiring Type
  const getTRWiringSizeCV = () => {
    // หา rowNum ของ Transformer ที่เลือก
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
    if (!trRowNum) return '';

    const trRow = excelData.find(r => r.__rowNum__ === trRowNum);
    if (!trRow) return '';

    // Mapping TR Wiring Type to columns
    const wiringTypeToCols: Record<string, string[]> = {
      'ร้อยท่อเดินในอากาศ กลุ่ม 2': [
        '__EMPTY_15', '__EMPTY_16', '__EMPTY_17', '__EMPTY_18', '__EMPTY_19', '__EMPTY_20', '__EMPTY_21', '__EMPTY_22', '__EMPTY_23', '__EMPTY_24'
      ], // P-Y
      'ร้อยท่อฝังใต้ดิน กลุ่ม 5': [
        '__EMPTY_36', '__EMPTY_37', '__EMPTY_38', '__EMPTY_39', '__EMPTY_40', '__EMPTY_41', '__EMPTY_42', '__EMPTY_43', '__EMPTY_44', '__EMPTY_45'
      ], // AK-AT
      'ราง TRAY ไม่มีฝา': [
        '__EMPTY_57', '__EMPTY_58', '__EMPTY_59', '__EMPTY_60', '__EMPTY_61', '__EMPTY_62', '__EMPTY_63', '__EMPTY_64', '__EMPTY_65', '__EMPTY_66'
      ], // BF-BO
      'ราง LADDER ไม่มีฝา': [
        '__EMPTY_78', '__EMPTY_79', '__EMPTY_80', '__EMPTY_81', '__EMPTY_82', '__EMPTY_83', '__EMPTY_84', '__EMPTY_85', '__EMPTY_86', '__EMPTY_87'
      ], // CA-CJ
    };

    const cols = wiringTypeToCols[form.trWiringType];
    if (!cols) return '';

    // ดึงค่าทุกคอลัมน์มาต่อกัน (เว้นวรรค)
    const values = cols.map(col => trRow[col]).filter(Boolean).join(' ');
    return values;
  };

  // เพิ่มฟังก์ชันดึง TR Wire conduit ตาม Power Authority และ TR Wiring Type
  const getTRWireConduit = () => {
    // หา rowNum ของ Transformer ที่เลือก (เหมือน getTRWiringSizeCV)
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
    if (!trRowNum) return '';

    const trRow = excelData.find(r => r.__rowNum__ === trRowNum);
    if (!trRow) return '';

    // Mapping TR Wiring Type to columns and units
    const wiringTypeToColsAndUnit: Record<string, { cols: string[]; unit: string }> = {
      'ร้อยท่อเดินในอากาศ กลุ่ม 2': {
        cols: ['__EMPTY_32', '__EMPTY_33', '__EMPTY_34', '__EMPTY_35'], // AG-AJ
        unit: 'นิ้ว'
      },
      'ร้อยท่อฝังใต้ดิน กลุ่ม 5': {
        cols: ['__EMPTY_53', '__EMPTY_54', '__EMPTY_55'], // BB-BD
        unit: 'มม.'
      },
      'ราง TRAY ไม่มีฝา': {
        cols: ['__EMPTY_74'], // BW
        unit: 'ซม.'
      },
      'ราง LADDER ไม่มีฝา': {
        cols: ['__EMPTY_95'], // CR
        unit: 'ซม.'
      },
    };

    const config = wiringTypeToColsAndUnit[form.trWiringType];
    if (!config) return '';

    const values = config.cols.map(col => trRow[col]).filter(Boolean).join(' ');
    if (!values) return '';
    return `${values} ${config.unit}`;
  };

  // เพิ่มฟังก์ชันดึง TR Wiring Size (CV) แยกแต่ละ Charger
  const getTRWiringSizeCVs = () => {
    // Mapping TR Wiring Type to columns
    const wiringTypeToCols: Record<string, string[]> = {
      'ร้อยท่อเดินในอากาศ กลุ่ม 2': [
        '__EMPTY_15', '__EMPTY_16', '__EMPTY_17', '__EMPTY_18', '__EMPTY_19', '__EMPTY_20', '__EMPTY_21', '__EMPTY_22', '__EMPTY_23', '__EMPTY_24'
      ], // P-Y
      'ร้อยท่อฝังใต้ดิน กลุ่ม 5': [
        '__EMPTY_36', '__EMPTY_37', '__EMPTY_38', '__EMPTY_39', '__EMPTY_40', '__EMPTY_41', '__EMPTY_42', '__EMPTY_43', '__EMPTY_44', '__EMPTY_45'
      ], // AK-AT
      'ราง TRAY ไม่มีฝา': [
        '__EMPTY_57', '__EMPTY_58', '__EMPTY_59', '__EMPTY_60', '__EMPTY_61', '__EMPTY_62', '__EMPTY_63', '__EMPTY_64', '__EMPTY_65', '__EMPTY_66'
      ], // BF-BO
      'ราง LADDER ไม่มีฝา': [
        '__EMPTY_78', '__EMPTY_79', '__EMPTY_80', '__EMPTY_81', '__EMPTY_82', '__EMPTY_83', '__EMPTY_84', '__EMPTY_85', '__EMPTY_86', '__EMPTY_87'
      ], // CA-CJ
    };

    const cols = wiringTypeToCols[form.trWiringType];
    if (!cols) return [];

    // หา rowNum ของ Transformer ที่เลือก
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
    if (!trRowNum) return '';

    const trRow = excelData.find(r => r.__rowNum__ === trRowNum);
    if (!trRow) return '';

    // ดึงค่าทุกคอลัมน์มาต่อกัน (เว้นวรรค)
    const value = cols.map(col => trRow[col]).filter(Boolean).join(' ');

    // คืน array ตามจำนวนเครื่อง
    const numChargers = parseInt(form.numberOfChargers) || 1;
    return Array(numChargers).fill(value);
  };

  // เพิ่มฟังก์ชันดึง Charger Wiring cable ตาม Power Authority และ Charger Wiring Type
  const getChargerWiringCable = () => {
    // Mapping Charger Wiring Type to columns
    const wiringTypeToCols: Record<string, string[]> = form.powerAuthority === 'MEA'
      ? {
        'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ': [
          '__EMPTY_33', '__EMPTY_34', '__EMPTY_35', '__EMPTY_36', '__EMPTY_37', '__EMPTY_38', '__EMPTY_39', '__EMPTY_40', '__EMPTY_41', '__EMPTY_42', '__EMPTY_43', '__EMPTY_44', '__EMPTY_45'
        ], // AH-AT
        'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน': [
          '__EMPTY_57', '__EMPTY_58', '__EMPTY_59', '__EMPTY_60', '__EMPTY_61', '__EMPTY_62', '__EMPTY_63', '__EMPTY_64', '__EMPTY_65', '__EMPTY_66', '__EMPTY_67', '__EMPTY_68', '__EMPTY_69'
        ], // BF-BR
      }
      : {
        'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ': [
          '__EMPTY_31', '__EMPTY_32', '__EMPTY_33', '__EMPTY_34', '__EMPTY_35', '__EMPTY_36', '__EMPTY_37', '__EMPTY_38', '__EMPTY_39', '__EMPTY_40', '__EMPTY_41', '__EMPTY_42', '__EMPTY_43'
        ], // AF-AR
        'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน': [
          '__EMPTY_55', '__EMPTY_56', '__EMPTY_57', '__EMPTY_58', '__EMPTY_59', '__EMPTY_60', '__EMPTY_61', '__EMPTY_62', '__EMPTY_63', '__EMPTY_64', '__EMPTY_65', '__EMPTY_66', '__EMPTY_67'
        ], // BD-BP
      };

    const cols = wiringTypeToCols[form.chargerWiringType];
    if (!cols) return '';

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
    // เงื่อนไข MEA
    if (form.powerAuthority === 'MEA') {
      if (form.chargerWiringType === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ') {
        // คอลัมน์ AY-BD (index 50-55) = ['__EMPTY_50', '__EMPTY_51', '__EMPTY_52', '__EMPTY_53', '__EMPTY_54', '__EMPTY_55']
        const cols = ['__EMPTY_50', '__EMPTY_51', '__EMPTY_52', '__EMPTY_53', '__EMPTY_54', '__EMPTY_55'];
        if (chargerTypeMode === 'any') {
          return multiChargers
            .filter(name => name !== '')
            .map((chargerName, idx) => {
              const cell = chargerToExcelCell[chargerName];
              let rowNum: number | undefined;
              if (cell?.mea) rowNum = parseInt(cell.mea.replace('C', ''));
              if (!rowNum) return `Charger${idx + 1}: -`;
              const row = excelData.find(r => r.__rowNum__ === rowNum);
              if (!row) return `Charger${idx + 1}: -`;
              const value = cols.map(col => row[col]).filter(Boolean).join(' ');
              return `Charger${idx + 1}: ${value} นิ้ว`;
            });
        } else {
          const cell = chargerToExcelCell[form.charger];
          let rowNum: number | undefined;
          if (cell?.mea) rowNum = parseInt(cell.mea.replace('C', ''));
          if (!rowNum) return [];
          const row = excelData.find(r => r.__rowNum__ === rowNum);
          if (!row) return [];
          const value = cols.map(col => row[col]).filter(Boolean).join(' ');
          const numChargers = parseInt(form.numberOfChargers) || 1;
          return Array(numChargers).fill(`Charger1: ${value} นิ้ว`).map((v, i) =>
            `Charger${i + 1}: ${value} นิ้ว`
          );
        }
      }
      if (form.chargerWiringType === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน') {
        // คอลัมน์ BW-CB (index 74-79) = ['__EMPTY_74', '__EMPTY_75', '__EMPTY_76', '__EMPTY_77', '__EMPTY_78', '__EMPTY_79']
        const cols = ['__EMPTY_74', '__EMPTY_75', '__EMPTY_76', '__EMPTY_77', '__EMPTY_78', '__EMPTY_79'];
        if (chargerTypeMode === 'any') {
          return multiChargers
            .filter(name => name !== '')
            .map((chargerName, idx) => {
              const cell = chargerToExcelCell[chargerName];
              let rowNum: number | undefined;
              if (cell?.mea) rowNum = parseInt(cell.mea.replace('C', ''));
              if (!rowNum) return `Charger${idx + 1}: -`;
              const row = excelData.find(r => r.__rowNum__ === rowNum);
              if (!row) return `Charger${idx + 1}: -`;
              const value = cols.map(col => row[col]).filter(Boolean).join(' ');
              return `Charger${idx + 1}: ${value} มม.`;
            });
        } else {
          const cell = chargerToExcelCell[form.charger];
          let rowNum: number | undefined;
          if (cell?.mea) rowNum = parseInt(cell.mea.replace('C', ''));
          if (!rowNum) return [];
          const row = excelData.find(r => r.__rowNum__ === rowNum);
          if (!row) return [];
          const value = cols.map(col => row[col]).filter(Boolean).join(' ');
          const numChargers = parseInt(form.numberOfChargers) || 1;
          return Array(numChargers).fill(`Charger1: ${value} มม.`).map((v, i) =>
            `Charger${i + 1}: ${value} มม.`
          );
        }
      }
    }
    // เงื่อนไข PEA
    if (form.powerAuthority === 'PEA') {
      if (form.chargerWiringType === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ') {
        // คอลัมน์ AW-BB (index 48-53) = ['__EMPTY_48', '__EMPTY_49', '__EMPTY_50', '__EMPTY_51', '__EMPTY_52', '__EMPTY_53']
        const cols = ['__EMPTY_48', '__EMPTY_49', '__EMPTY_50', '__EMPTY_51', '__EMPTY_52', '__EMPTY_53'];
        if (chargerTypeMode === 'any') {
          return multiChargers
            .filter(name => name !== '')
            .map((chargerName, idx) => {
              const cell = chargerToExcelCell[chargerName];
              let rowNum: number | undefined;
              if (cell?.pea) rowNum = parseInt(cell.pea.replace('C', ''));
              if (!rowNum) return `Charger${idx + 1}: -`;
              const row = excelData.find(r => r.__rowNum__ === rowNum);
              if (!row) return `Charger${idx + 1}: -`;
              const value = cols.map(col => row[col]).filter(Boolean).join(' ');
              return `Charger${idx + 1}: ${value} นิ้ว`;
            });
        } else {
          const cell = chargerToExcelCell[form.charger];
          let rowNum: number | undefined;
          if (cell?.pea) rowNum = parseInt(cell.pea.replace('C', ''));
          if (!rowNum) return [];
          const row = excelData.find(r => r.__rowNum__ === rowNum);
          if (!row) return [];
          const value = cols.map(col => row[col]).filter(Boolean).join(' ');
          const numChargers = parseInt(form.numberOfChargers) || 1;
          return Array(numChargers).fill(`Charger1: ${value} นิ้ว`).map((v, i) =>
            `Charger${i + 1}: ${value} นิ้ว`
          );
        }
      }
      if (form.chargerWiringType === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน') {
        // คอลัมน์ BU-BZ (index 72-77) = ['__EMPTY_72', '__EMPTY_73', '__EMPTY_74', '__EMPTY_75', '__EMPTY_76', '__EMPTY_77']
        const cols = ['__EMPTY_72', '__EMPTY_73', '__EMPTY_74', '__EMPTY_75', '__EMPTY_76', '__EMPTY_77'];
        if (chargerTypeMode === 'any') {
          return multiChargers
            .filter(name => name !== '')
            .map((chargerName, idx) => {
              const cell = chargerToExcelCell[chargerName];
              let rowNum: number | undefined;
              if (cell?.pea) rowNum = parseInt(cell.pea.replace('C', ''));
              if (!rowNum) return `Charger${idx + 1}: -`;
              const row = excelData.find(r => r.__rowNum__ === rowNum);
              if (!row) return `Charger${idx + 1}: -`;
              const value = cols.map(col => row[col]).filter(Boolean).join(' ');
              return `Charger${idx + 1}: ${value} มม.`;
            });
        } else {
          const cell = chargerToExcelCell[form.charger];
          let rowNum: number | undefined;
          if (cell?.pea) rowNum = parseInt(cell.pea.replace('C', ''));
          if (!rowNum) return [];
          const row = excelData.find(r => r.__rowNum__ === rowNum);
          if (!row) return [];
          const value = cols.map(col => row[col]).filter(Boolean).join(' ');
          const numChargers = parseInt(form.numberOfChargers) || 1;
          return Array(numChargers).fill(`Charger1: ${value} มม.`).map((v, i) =>
            `Charger${i + 1}: ${value} มม.`
          );
        }
      }
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
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

            {/* --- Station Accessory Card --- */}
            <Card className="shadow-xl border-0 overflow-hidden mb-6">
              <CardHeader className="bg-gradient-to-r from-emerald-600 to-cyan-600 text-white">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Settings className="h-5 w-5" />
                  Station Accessory
                </CardTitle>
                <CardDescription className="text-emerald-100">
                  รายการอุปกรณ์เสริมสถานี (ยังไม่เชื่อมต่อระบบ)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* 1. ทาสีพื้น */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      ทาสีพื้น
                    </Label>
                    <Select>
                      <SelectTrigger className="h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500">
                        <SelectValue placeholder="เลือกประเภทการทาสีพื้น" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="border">ทาเส้นขอบ</SelectItem>
                        <SelectItem value="border-symbol">ทาเส้นขอบพร้อมสัญลักษณ์</SelectItem>
                        <SelectItem value="border-symbol-fill">ทาเส้นขอบพร้อมสัญลักษณ์และพื้น</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* 2. หลังคาคลุมช่องจอด */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      หลังคาคลุมช่องจอด (กว้าง x ยาว เมตร)
                    </Label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        className="w-20 border rounded px-2 py-1"
                        placeholder="กว้าง"
                        min={0}
                      />
                      <span className="self-center">x</span>
                      <input
                        type="number"
                        className="w-20 border rounded px-2 py-1"
                        placeholder="ยาว"
                        min={0}
                      />
                      <span className="self-center">เมตร</span>
                    </div>
                  </div>
                  {/* 3. หลังคาคลุมเฉพาะ MDB */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      หลังคาคลุมเฉพาะ MDB (ตรม.)
                    </Label>
                    <input
                      type="number"
                      className="w-32 border rounded px-2 py-1"
                      placeholder="พื้นที่ ตรม."
                      min={0}
                    />
                  </div>
                  {/* 4. หลังคาคลุมเฉพาะ Charger (เลือกอย่างใดอย่างหนึ่ง แต่ให้ติ๊กเลือก) */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      หลังคาคลุมเฉพาะ Charger
                    </Label>
                    <div className="flex gap-6">
                                 git checkout -b feature/ev-calc                                git checkout -b feature/ev-calc                                git checkout -b feature/ev-calc                                git checkout -b feature/ev-calc                                git checkout -b feature/ev-calc           <div className="flex items-center space-x-2">
                        <Checkbox
                          id="roof-composit"
                          name="roof-charger"
                          // checked={roofType === 'composit'}
                          // onCheckedChange={() => setRoofType('composit')}
                        />
                        <Label htmlFor="roof-composit" className="cursor-pointer">แบบ composit</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="roof-normal"
                          name="roof-charger"
                          // checked={roofType === 'normal'}
                          // onCheckedChange={() => setRoofType('normal')}
                        />
                        <Label htmlFor="roof-normal" className="cursor-pointer">แบบธรรมดา</Label>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      * เลือกได้อย่างใดอย่างหนึ่ง (ควรเลือกแค่ 1 อัน)
                    </div>
                  </div>
                  {/* 5. ค่าเดินทาง */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      ค่าเดินทาง (กิโลเมตร)
                    </Label>
                    <input
                      type="number"
                      className="w-32 border rounded px-2 py-1"
                      placeholder="ระยะทาง"
                      min={0}
                    />
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
                          <span className="font-medium text-gray-700">TR Wire conduit :</span>
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
                            {getChargerWiringCable() && Array.isArray(getChargerWiringCable())
                              ? getChargerWiringCable().map((val: string, idx: number) => (
                                <span key={idx} className="font-semibold text-gray-900 text-sm">{val}</span>
                              ))
                              : <span className="font-semibold text-gray-900 text-sm">{getChargerWiringCable()}</span>
                            }
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