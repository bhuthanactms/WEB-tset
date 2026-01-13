/**
 * Home page - EV Station Calculator
 * Provides a comprehensive calculator for electric vehicle station requirements
 * including power authority selection, transformer sizing, and cost analysis.
 */

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Calculator, Zap, Battery, Settings, Cable, Save, FolderOpen, Trash2 } from 'lucide-react'
import axios from 'axios'
import * as XLSX from 'xlsx'
import { useNavigate, useLocation } from 'react-router-dom'
import { getCurrentUser, canAccessStationAccessory, canSaveHistory } from '@/utils/auth'

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
  kWAllCharger: number
}

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
  const [customerCode, setCustomerCode] = useState<string>('');
  const navigate = useNavigate()
  const location = useLocation()

  // Save/Load functionality
  const STORAGE_KEY = 'ev_calculator_form_data';

  // Load saved data on mount
  useEffect(() => {
    console.log('🔄 Home useEffect triggered, location:', location.pathname)
    // ตรวจสอบว่ามี flag ที่บอกว่าให้ reset form หรือไม่ (จากปุ่ม Home)
    const resetFormOnLoad = sessionStorage.getItem('reset_form_on_load');
    console.log('🔍 resetFormOnLoad flag:', resetFormOnLoad)
    if (resetFormOnLoad) {
      console.log('🔄 Resetting form...')
      // ลบข้อมูลปัจจุบันใน localStorage (แต่ไม่ลบประวัติการบันทึก)
      localStorage.removeItem(STORAGE_KEY);
      // ลบ flag ที่บอกว่าโหลดจากประวัติ
      sessionStorage.removeItem('loaded_from_history');
      // Reset form state
      setForm({
        powerAuthority: '' as any,
        charger: '',
        numberOfChargers: '',
        trWiringType: '',
        chargerWiringType: ''
      });
      setResults(null);
      setCustomerCode('');
      setChargerTypeMode('same');
      setMultiChargers([]);
      // ล้าง flag
      sessionStorage.removeItem('reset_form_on_load');
      console.log('✅ Form reset - เคลียร์ข้อมูลทั้งหมดแล้ว (ประวัติการบันทึกยังคงอยู่)');
      return;
    }

    // ตรวจสอบว่ามี flag ที่บอกว่าโหลดจากประวัติหรือไม่
    const loadedFromHistory = sessionStorage.getItem('loaded_from_history');

    // Check if data is passed from navigation (priority)
    // ใช้ location.state จาก useLocation hook แทน window.history.state
    const locationState = location.state || (window.history.state && window.history.state.usr) || {};
    console.log('🔍 locationState:', locationState);
    console.log('🔍 location.state:', location.state);
    console.log('🔍 loadedFromHistory flag:', loadedFromHistory);

    if (locationState.loadData) {
      const loadData = locationState.loadData;
      console.log('📦 Loading data from navigation state:', loadData);
      // ตั้ง flag ว่าโหลดจากประวัติ
      sessionStorage.setItem('loaded_from_history', 'true');

      // โหลดข้อมูลทั้งหมด
      if (loadData.form) {
        setForm(loadData.form);
        console.log('✅ Set form:', loadData.form);
      }
      if (loadData.chargerTypeMode) {
        setChargerTypeMode(loadData.chargerTypeMode);
        console.log('✅ Set chargerTypeMode:', loadData.chargerTypeMode);
      }
      if (loadData.multiChargers) {
        setMultiChargers(loadData.multiChargers);
        console.log('✅ Set multiChargers:', loadData.multiChargers);
      }
      if (loadData.customerCode) {
        setCustomerCode(loadData.customerCode);
        console.log('✅ Set customerCode:', loadData.customerCode);
      }

      // โหลด results ถ้ามี
      if (loadData.results) {
        setResults(loadData.results);
        console.log('✅ Loaded results from navigation state:', loadData.results);
      } else {
        // ถ้าไม่มี results แต่มีข้อมูลครบถ้วน ให้คำนวณอัตโนมัติ
        if (loadData.form && loadData.form.powerAuthority &&
          ((loadData.form.charger && loadData.form.numberOfChargers) ||
            (loadData.chargerTypeMode === 'any' && loadData.multiChargers && loadData.multiChargers.length > 0))) {
          // เรียก calculateResults อัตโนมัติหลังจาก state อัพเดท
          setTimeout(() => {
            calculateResults();
            console.log('✅ Auto-calculated results after loading from navigation');
          }, 300);
        }
      }
      // ล้าง flag หลังจากโหลดเสร็จแล้ว
      sessionStorage.removeItem('loaded_from_history');
    } else if (loadedFromHistory) {
      // ถ้ามี flag แต่ไม่มี navigation state ให้โหลดจาก localStorage
      console.log('📦 Loading from localStorage (loaded_from_history flag set)');
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (parsed.form) {
            setForm(parsed.form);
            console.log('✅ Set form from localStorage:', parsed.form);
          }
          if (parsed.chargerTypeMode) {
            setChargerTypeMode(parsed.chargerTypeMode);
            console.log('✅ Set chargerTypeMode from localStorage:', parsed.chargerTypeMode);
          }
          if (parsed.multiChargers) {
            setMultiChargers(parsed.multiChargers);
            console.log('✅ Set multiChargers from localStorage:', parsed.multiChargers);
          }
          if (parsed.customerCode) {
            setCustomerCode(parsed.customerCode);
            console.log('✅ Set customerCode from localStorage:', parsed.customerCode);
          }
          // โหลด results ถ้ามี
          if (parsed.results) {
            setResults(parsed.results);
            console.log('✅ Loaded results from localStorage:', parsed.results);
          } else {
            // ถ้าไม่มี results แต่มีข้อมูลครบถ้วน ให้คำนวณอัตโนมัติ
            if (parsed.form && parsed.form.powerAuthority &&
              ((parsed.form.charger && parsed.form.numberOfChargers) ||
                (parsed.chargerTypeMode === 'any' && parsed.multiChargers && parsed.multiChargers.length > 0))) {
              setTimeout(() => {
                calculateResults();
                console.log('✅ Auto-calculated results after loading from localStorage');
              }, 300);
            }
          }
          console.log('✅ Loaded saved data from localStorage');
          // ล้าง flag หลังจากโหลดเสร็จแล้ว
          sessionStorage.removeItem('loaded_from_history');
        } catch (error) {
          console.error('❌ Error loading saved data:', error);
          sessionStorage.removeItem('loaded_from_history');
        }
      } else {
        // ถ้าไม่มีข้อมูลใน localStorage ให้ล้าง flag
        sessionStorage.removeItem('loaded_from_history');
      }
    } else {
      // โหลดจาก localStorage เฉพาะเมื่อไม่ได้โหลดจากประวัติ
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (parsed.form) setForm(parsed.form);
          if (parsed.chargerTypeMode) setChargerTypeMode(parsed.chargerTypeMode);
          if (parsed.multiChargers) setMultiChargers(parsed.multiChargers);
          if (parsed.customerCode) setCustomerCode(parsed.customerCode);
          // โหลด results ถ้ามี
          if (parsed.results) {
            setResults(parsed.results);
            console.log('✅ Loaded results from saved data:', parsed.results);
          }
          console.log('✅ Loaded saved data from localStorage');
        } catch (error) {
          console.error('❌ Error loading saved data:', error);
        }
      }
    }
  }, [location.pathname, location.state]);

  // Auto-calculate results when form data is loaded and excel data is ready
  useEffect(() => {
    // ถ้ามีข้อมูลครบถ้วนและยังไม่มี results และ excel data พร้อมแล้ว ให้คำนวณอัตโนมัติ
    if (form.powerAuthority && excelData.length > 0 && !results) {
      const hasEnoughData = chargerTypeMode === 'any'
        ? (multiChargers && multiChargers.length > 0 && multiChargers.some((c: string) => c !== ''))
        : (form.charger && form.numberOfChargers);

      if (hasEnoughData) {
        // รอให้ state อัพเดทเสร็จก่อน
        const timer = setTimeout(() => {
          calculateResults();
          console.log('✅ Auto-calculated results after form data loaded');
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [form.powerAuthority, form.charger, form.numberOfChargers, chargerTypeMode, multiChargers, excelData.length, results]);

  // Save data to localStorage
  const saveFormData = () => {
    if (!customerCode.trim()) {
      alert('⚠️ กรุณากรอกรหัสลูกค้าก่อนบันทึก');
      return;
    }

    // คำนวณผลลัพธ์ก่อนบันทึก (ถ้ายังไม่ได้กด calculate)
    let calculatedResults = results;
    if (!calculatedResults) {
      // คำนวณผลลัพธ์เบื้องต้น
      let inOfCharger = 0;
      let kWAllCharger = 0;
      let totalPower = 0;

      if (chargerTypeMode === 'any') {
        const multi = getMultiChargersIn();
        kWAllCharger = multiChargers.filter(name => name !== '').reduce((sum, chargerName) => {
          return sum + extractPowerValue(chargerName);
        }, 0);
        inOfCharger = multi.length === 1 ? multi[0].in : 0;
        totalPower = kWAllCharger;
      } else {
        const powerPerStation = extractPowerValue(form.charger);
        const numberOfChargers = parseInt(form.numberOfChargers) || 1;
        const inOfChargerExcel = getInFromExcel('inOfCharger');
        inOfCharger = typeof inOfChargerExcel === 'number' ? inOfChargerExcel : 0;
        kWAllCharger = powerPerStation * numberOfChargers;
        totalPower = numberOfChargers * powerPerStation;
      }

      calculatedResults = {
        totalPower,
        transformerSize: 0, // จะคำนวณจาก getTRSizeFromExcel
        inOfCharger,
        kWAllCharger
      };
    }

    // คำนวณข้อมูลเพิ่มเติมสำหรับการบันทึก (ถ้ามีข้อมูลครบถ้วน)
    const kWAllChargerValue = chargerTypeMode === 'any'
      ? multiChargers.filter(name => name !== '').reduce((sum, chargerName) => {
        return sum + extractPowerValue(chargerName);
      }, 0)
      : calculatedResults?.kWAllCharger || 0;

    const transformerSize = form.powerAuthority && kWAllChargerValue > 0
      ? getTRSizeFromExcel(kWAllChargerValue)
      : '';

    // คำนวณ transformer (ค่าที่แสดงใน UI) - เหมือนกับที่ส่งไปหน้า StationAccessory
    const transformer = form.powerAuthority && kWAllChargerValue > 0
      ? (() => {
        // ถ้าเป็น Row 32 (≤ 280 kW) ให้ส่ง "มิเตอร์แรงต่ำ 400 A"
        if (isRow32(kWAllChargerValue)) {
          return 'มิเตอร์แรงต่ำ 400 A';
        }
        // ถ้าไม่ใช่ ให้ส่งค่าจาก getTRSizeFromExcel
        return getTRSizeFromExcel(kWAllChargerValue);
      })()
      : '';

    // คำนวณข้อมูลเพิ่มเติม (ต้องมี form.trWiringType และ form.powerAuthority)
    const trWiringSize = form.trWiringType && form.powerAuthority
      ? (getTRWiringSizeCVs()[0] || '')
      : '';

    const trWireConduit = form.trWiringType && form.powerAuthority
      ? (getTRWireConduit() || '')
      : '';

    const trWiringRowNum = form.trWiringType && form.powerAuthority
      ? getTRWiringSizeCVsRowNumber()
      : undefined;

    const mdb = trWiringRowNum ? (() => {
      const trRow = excelData.find(r => r.__rowNum__ === trWiringRowNum);
      const mccbMain = trRow ? trRow.__EMPTY_7 : '-';
      return mccbMain ? `${mccbMain} A` : '-';
    })() : '';

    const mdbMainAt = trWiringRowNum ? (() => {
      const trRow = excelData.find(r => r.__rowNum__ === trWiringRowNum);
      const mccbMain = trRow ? trRow.__EMPTY_7 : '';
      return mccbMain ? `${mccbMain} A` : '';
    })() : '';

    const mdbMainAf = form.powerAuthority ? (() => {
      let trRowNum: number | undefined = undefined;
      if (form.powerAuthority === 'MEA') {
        const steps = [
          { max: 280, row: 32 },
          { max: 320, row: 33 },
          { max: 400, row: 34 },
          { max: 504, row: 35 },
          { max: 640, row: 36 },
          { max: 800, row: 37 },
          { max: 1000, row: 38 },
          { max: 1200, row: 39 },
          { max: 1600, row: 40 },
          { max: 2000, row: 41 },
        ];
        const found = steps.find(s => kWAllChargerValue <= s.max);
        trRowNum = found?.row;
      } else if (form.powerAuthority === 'PEA') {
        const steps = [
          { max: 80, row: 76 },
          { max: 128, row: 77 },
          { max: 200, row: 78 },
          { max: 252, row: 79 },
          { max: 320, row: 80 },
          { max: 400, row: 81 },
          { max: 504, row: 82 },
          { max: 640, row: 83 },
          { max: 800, row: 84 },
          { max: 1000, row: 85 },
          { max: 1200, row: 86 },
          { max: 1600, row: 87 },
          { max: 2000, row: 88 },
        ];
        const found = steps.find(s => kWAllChargerValue <= s.max);
        trRowNum = found?.row;
      }
      const trRow = excelData.find(r => r.__rowNum__ === trRowNum);
      const main2 = trRow ? trRow.__EMPTY_10 : '';
      return main2 ? `${main2} A` : '';
    })() : '';

    const chargerWiringCable = form.chargerWiringType && form.powerAuthority
      ? (Array.isArray(getChargerWiringCable()) ? getChargerWiringCable()[0] : getChargerWiringCable())
      : '';

    const chargerWireConduit = form.chargerWiringType && form.powerAuthority
      ? (Array.isArray(getChargerWireConduit()) ? (getChargerWireConduit()?.[0] ?? '') : (getChargerWireConduit() ?? ''))
      : '';

    const dataToSave = {
      customerCode: customerCode.trim(),
      form,
      chargerTypeMode,
      multiChargers,
      results: calculatedResults,
      transformerSize: transformerSize,
      transformer: transformer, // เพิ่ม transformer (ค่าที่แสดงใน UI)
      // ข้อมูลเพิ่มเติมจากการคำนวณ
      trWiringSize: trWiringSize,
      trWireConduit: trWireConduit,
      mdb: mdb,
      mdbMainAt: mdbMainAt,
      mdbMainAf: mdbMainAf,
      chargerWiringCable: chargerWiringCable,
      chargerWireConduit: chargerWireConduit,
      savedAt: new Date().toISOString()
    };
    try {
      // Save Home data
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));

      // Check if StationAccessory data exists for this customer
      const stationKey = 'ev_station_accessory_form_data';
      const stationData = localStorage.getItem(stationKey);
      let stationDataParsed = null;
      if (stationData) {
        try {
          stationDataParsed = JSON.parse(stationData);
          // Only use if same customer code
          if (stationDataParsed.customerCode !== customerCode.trim()) {
            stationDataParsed = null;
          }
        } catch (e) {
          console.error('Error parsing station data:', e);
        }
      }

      // Save combined data with customer code as key
      const combinedKey = `ev_combined_data_${customerCode.trim()}`;
      const combinedData = {
        customerCode: customerCode.trim(),
        home: dataToSave,
        stationAccessory: stationDataParsed,
        savedAt: new Date().toISOString(),
        lastUpdated: 'home'
      };
      localStorage.setItem(combinedKey, JSON.stringify(combinedData));

      // Also save with timestamp for history
      const key = `${STORAGE_KEY}_${customerCode.trim()}_${Date.now()}`;
      localStorage.setItem(key, JSON.stringify(dataToSave));

      alert('✅ บันทึกข้อมูลสำเร็จ!' + (stationDataParsed ? ' (รวมข้อมูลทั้ง 2 หน้า)' : ''));
      console.log('💾 Saved combined data:', combinedData);
    } catch (error) {
      console.error('❌ Error saving data:', error);
      alert('❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  // Load data from localStorage
  const loadFormData = () => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.form) setForm(parsed.form);
        if (parsed.chargerTypeMode) setChargerTypeMode(parsed.chargerTypeMode);
        if (parsed.multiChargers) setMultiChargers(parsed.multiChargers);
        if (parsed.customerCode) setCustomerCode(parsed.customerCode);
        // โหลด results ถ้ามี
        if (parsed.results) {
          setResults(parsed.results);
          console.log('✅ Loaded results from localStorage:', parsed.results);
        } else {
          // ถ้าไม่มี results แต่มีข้อมูลครบถ้วน ให้คำนวณอัตโนมัติ
          if (parsed.form && parsed.form.powerAuthority &&
            ((parsed.form.charger && parsed.form.numberOfChargers) ||
              (parsed.chargerTypeMode === 'any' && parsed.multiChargers && parsed.multiChargers.length > 0))) {
            // เรียก calculateResults อัตโนมัติหลังจาก state อัพเดท
            setTimeout(() => {
              calculateResults();
              console.log('✅ Auto-calculated results after loading data');
            }, 100);
          }
        }
        alert('✅ โหลดข้อมูลสำเร็จ!');
        console.log('📂 Loaded data from localStorage:', parsed);
      } catch (error) {
        console.error('❌ Error loading data:', error);
        alert('❌ เกิดข้อผิดพลาดในการโหลดข้อมูล');
      }
    } else {
      alert('⚠️ ไม่พบข้อมูลที่บันทึกไว้');
    }
  };

  // Clear saved data - ลบเฉพาะข้อมูลปัจจุบัน ไม่ลบประวัติ
  const clearSavedData = () => {
    if (confirm('คุณต้องการลบข้อมูลปัจจุบันที่แสดงอยู่หรือไม่?\n(ประวัติการบันทึกจะยังคงอยู่)')) {
      // ลบแค่ข้อมูลปัจจุบัน (key หลัก) ไม่ลบประวัติ
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem('loaded_from_history');
      // ล้าง form state ด้วย
      setForm({
        powerAuthority: '' as any,
        charger: '',
        numberOfChargers: '',
        trWiringType: '',
        chargerWiringType: ''
      });
      setResults(null);
      setCustomerCode('');
      setChargerTypeMode('same');
      setMultiChargers([]);
      alert('✅ ลบข้อมูลปัจจุบันสำเร็จ! (ประวัติการบันทึกยังคงอยู่)');
    }
  };

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
    '180 kW': { mea: 'C12', pea: 'C60' }, // ใช้ค่าเดียวกับ 200 kW
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

    // ใช้คอลัมน์ MEA. 24kV/416/240V: สำหรับทั้ง MEA และ PEA
    const colKey = 'MEA. 24kV/416/240V:';
    let value = (row as any)[colKey];

    // ถ้าไม่เจอ ลองหา key ที่มี "24kV" หรือ "416" หรือ "240V"
    if (value === undefined || value === null || value === '') {
      const keys = Object.keys(row);
      const foundKey = keys.find(k =>
        k.includes('24kV') &&
        k.includes('416') &&
        k.includes('240V')
      );
      if (foundKey) {
        value = (row as any)[foundKey];
        console.log(`[getInFromExcel] Found alternative key: ${foundKey} = ${value}`);
      }
    }

    if (typeof value !== 'number' || isNaN(value)) return undefined;
    if (type === 'inOfCharger') return value;
    if (type === 'inAllCharger') return value * numberOfChargers;
    return undefined;
  };

  // ฟังก์ชันตรวจสอบว่าเป็น Row 32 (≤ 280 kW) หรือไม่
  const isRow32 = (kWAllCharger: number): boolean => {
    return form.powerAuthority === 'MEA' && kWAllCharger <= 280;
  };

  // ฟังก์ชันเลือก TR size ตาม Power Authority และผลรวม kW All charger
  const getTRSizeFromExcel = (kWAllCharger: number) => {
    if (form.powerAuthority === 'MEA') {
      const steps = [
        { max: 280, row: 32 },
        { max: 320, row: 33 },
        { max: 400, row: 34 },
        { max: 504, row: 35 },
        { max: 640, row: 36 },
        { max: 800, row: 37 },
        { max: 1000, row: 38 },
        { max: 1200, row: 39 },
        { max: 1600, row: 40 },
        { max: 2000, row: 41 },
      ];
      const found = steps.find(s => kWAllCharger <= s.max); // ใช้ <=
      if (found) {
        const row = excelData.find(r => r.__rowNum__ === found.row);
        return row ? (row.Charger || '-') : '-';
      }
      return '-';
    } else if (form.powerAuthority === 'PEA') {
      const steps = [
        { max: 80, row: 76 },
        { max: 128, row: 77 },
        { max: 200, row: 78 },
        { max: 252, row: 79 },
        { max: 320, row: 80 },
        { max: 400, row: 81 },
        { max: 504, row: 82 },
        { max: 640, row: 83 },
        { max: 800, row: 84 },
        { max: 1000, row: 85 },
        { max: 1200, row: 86 },
        { max: 1600, row: 87 },
        { max: 2000, row: 88 },
      ];
      const found = steps.find(s => kWAllCharger <= s.max); // ใช้ <=
      if (found) {
        const row = excelData.find(r => r.__rowNum__ === found.row);
        return row ? (row.Charger || '-') : '-';
      }
      return '-';
    }
    return '-';
  };

  /** Calculate EV station requirements */
  const calculateResults = () => {
    console.log('=== Calculate Results Debug ===');
    console.log('Form data:', form);
    console.log('Charger type mode:', chargerTypeMode);
    console.log('Multi chargers:', multiChargers);

    let inOfCharger = 0;
    let kWAllCharger = 0;
    let totalPower = 0;

    if (chargerTypeMode === 'any') {
      // กรณี Any type kW
      console.log('=== Any type kW calculation ===');
      const multi = getMultiChargersIn();
      console.log('Multi chargers In:', multi);
      kWAllCharger = multiChargers.filter(name => name !== '').reduce((sum, chargerName) => {
        return sum + extractPowerValue(chargerName);
      }, 0);
      inOfCharger = multi.length === 1 ? multi[0].in : 0;
      totalPower = multiChargers.filter(name => name !== '').reduce((sum, chargerName) => {
        return sum + extractPowerValue(chargerName);
      }, 0);
      console.log('Any type - inOfCharger:', inOfCharger, 'kWAllCharger:', kWAllCharger, 'totalPower:', totalPower);
    } else {
      // กรณี Same kW
      console.log('=== Same kW calculation ===');
      const powerPerStation = extractPowerValue(form.charger)
      const numberOfChargers = parseInt(form.numberOfChargers) || 1
      console.log('Power per station:', powerPerStation, 'Number of chargers:', numberOfChargers);

      // ใช้ค่าจาก Excel เท่านั้น
      const inOfChargerExcel = getInFromExcel('inOfCharger');
      console.log('Excel values - inOfCharger:', inOfChargerExcel);

      inOfCharger = typeof inOfChargerExcel === 'number'
        ? inOfChargerExcel
        : 0;

      // คำนวณ kWAllCharger จาก Charger x numberOfChargers
      kWAllCharger = powerPerStation * numberOfChargers;

      totalPower = numberOfChargers * powerPerStation;
      console.log('Same type - inOfCharger:', inOfCharger, 'kWAllCharger:', kWAllCharger, 'totalPower:', totalPower);
    }

    setResults({
      totalPower,
      transformerSize: 0, // ไม่ใช้สูตรคำนวณเองอีกต่อไป
      inOfCharger,
      kWAllCharger
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
    setCustomerCode('');
    setChargerTypeMode('same');
    setMultiChargers([]);
    // ล้างแค่ sessionStorage (ไม่ลบข้อมูลที่บันทึกไว้ใน localStorage)
    sessionStorage.removeItem('loaded_from_history');
    // ไม่ลบข้อมูลที่บันทึกไว้ใน localStorage (เก็บไว้ถาวร)
    console.log('✅ Form reset (ข้อมูลที่บันทึกไว้ยังคงอยู่)');
  }

  // Charger options
  const chargerOptions = [
    '30 kW', '40 kW', '60 kW', '80 kW', '120 kW', '160 kW', '180 kW', '200 kW',
    '240 kW', '320 kW', '480 kW', '600 kW', '600 kW Prime+',
    '640 kW Prime+', '720 kW Prime+', '800 kW Prime+'
  ]

  // Number of chargers options
  const numberOfChargersOptions = Array.from({ length: 12 }, (_, i) => (i + 1).toString())

  // TR wiring type options
  const trWiringTypeOptions = [
    'ขนาดสายไฟ 3P 4W ร้อยท่อเดินในอากาศ กลุ่ม 2',
    'ขนาดสายไฟ 3P 4W ร้อยท่อฝังใต้ดิน กลุ่ม 5',
    'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา',
    'ขนาดสายไฟ 3P 4W ราง LADDER ไม่มีฝา'
  ]

  // Charger wiring type options
  const chargerWiringTypeOptions = [
    'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ',
    'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน',
    'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา',
    'ขนาดสายไฟ 3P 4W ราง LADDER ไม่มีฝา'
  ]

  const fetchExcelData = async () => {
    // Convert Google Sheets sharing URL to direct download URL
    const googleSheetsUrl = 'https://docs.google.com/spreadsheets/d/1yxZvBr0O9ZzFpQCgBeZIcQrKGq_x2wQz/edit?usp=sharing&ouid=111737986991833013743&rtpof=true&sd=true';
    const fileId = googleSheetsUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
    const excelFileUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx&usp=sharing`;

    console.log('🔄 กำลังโหลดข้อมูลจาก Google Sheets...');
    console.log('📄 Google Sheets URL:', googleSheetsUrl);
    console.log('📥 Excel File URL:', excelFileUrl);
    console.log('🆔 File ID:', fileId);

    try {
      const response = await axios.get(excelFileUrl, { responseType: 'arraybuffer' });
      console.log('✅ ดาวน์โหลดข้อมูลสำเร็จ, ขนาด:', response.data.byteLength, 'bytes');

      const workbook = XLSX.read(response.data, { type: 'array' });
      console.log('📊 จำนวน Sheets ทั้งหมด:', workbook.SheetNames.length);
      console.log('📋 รายชื่อ Sheets:', workbook.SheetNames);

      const sheetName = workbook.SheetNames[0];
      console.log('📝 Sheet ที่ใช้:', sheetName);

      const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      console.log('✅ อ่านข้อมูล Excel สำเร็จ');
      console.log('📊 จำนวนแถวข้อมูล:', jsonData.length);
      console.log('🔍 ตัวอย่างข้อมูล 5 แถวแรก:', jsonData.slice(0, 5));

      setExcelData(jsonData);
      console.log('✅ บันทึกข้อมูลลง state สำเร็จ');
    } catch (error) {
      console.error("❌ Error fetching Excel file:", error);
    }
  };

  // Call fetchExcelData on component mount
  useEffect(() => {
    fetchExcelData();
  }, []);

  useEffect(() => {
    // log ดูโครงสร้าง excelData
    if (excelData.length > 0) {
      console.log('excelData sample:', excelData.slice(0, 70));
      console.log('excelData columns for row 6 (30kW MEA):', excelData.find(r => r.__rowNum__ === 6));
      console.log('excelData columns for row 54 (30kW PEA):', excelData.find(r => r.__rowNum__ === 54));

      // Debug: ดูข้อมูล Transformer rows
      console.log('MEA Transformer rows (33-41):');
      for (let i = 32; i <= 41; i++) {
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

        // ใช้คอลัมน์ MEA. 24kV/416/240V: สำหรับทั้ง MEA และ PEA
        const colKey = 'MEA. 24kV/416/240V:';
        let value = (row as any)[colKey];

        // ถ้าไม่เจอ ลองหา key ที่มี "24kV" หรือ "416" หรือ "240V"
        if (value === undefined || value === null || value === '') {
          const keys = Object.keys(row);
          const foundKey = keys.find(k =>
            k.includes('24kV') &&
            k.includes('416') &&
            k.includes('240V')
          );
          if (foundKey) {
            value = (row as any)[foundKey];
            console.log(`[getMultiChargersIn] Found alternative key: ${foundKey} = ${value}`);
          }
        }

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
        { max: 400, row: 32 },
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
        ? multiChargers.filter(name => name !== '').reduce((sum, chargerName) => {
          return sum + extractPowerValue(chargerName);
        }, 0)
        : results?.kWAllCharger || 0;
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
        ? multiChargers.filter(name => name !== '').reduce((sum, chargerName) => {
          return sum + extractPowerValue(chargerName);
        }, 0)
        : results?.kWAllCharger || 0;
      const found = steps.find(s => inAll <= s.max);
      trRowNum = found?.row;
    }
    if (!trRowNum) return '';

    const trRow = excelData.find(r => r.__rowNum__ === trRowNum);
    if (!trRow) return '';

    // Mapping TR Wiring Type to columns
    const wiringTypeToCols: Record<string, string[]> = {
      'ขนาดสายไฟ 3P 4W ร้อยท่อเดินในอากาศ กลุ่ม 2': [
        '__EMPTY_11', '__EMPTY_12', '__EMPTY_13', '__EMPTY_14', '__EMPTY_15', '__EMPTY_16', '__EMPTY_17', '__EMPTY_18', '__EMPTY_19'
      ], // __EMPTY_11 to __EMPTY_19
      'ขนาดสายไฟ 3P 4W ร้อยท่อฝังใต้ดิน กลุ่ม 5': [
        '__EMPTY_30', '__EMPTY_31', '__EMPTY_32', '__EMPTY_33', '__EMPTY_34', '__EMPTY_35', '__EMPTY_36', '__EMPTY_37', '__EMPTY_38', '__EMPTY_39'
      ], // __EMPTY_30 to __EMPTY_39
      'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา': [
        '__EMPTY_51', '__EMPTY_52', '__EMPTY_53', '__EMPTY_54', '__EMPTY_55', '__EMPTY_56', '__EMPTY_57', '__EMPTY_58', '__EMPTY_59', '__EMPTY_60'
      ], // __EMPTY_51 to __EMPTY_60
      'ขนาดสายไฟ 3P 4W ราง LADDER ไม่มีฝา': [
        '__EMPTY_72', '__EMPTY_73', '__EMPTY_74', '__EMPTY_75', '__EMPTY_76', '__EMPTY_77', '__EMPTY_78', '__EMPTY_79', '__EMPTY_80', '__EMPTY_81'
      ], // __EMPTY_72 to __EMPTY_81
    };

    const cols = wiringTypeToCols[form.trWiringType];
    if (!cols) return '';

    // Debug: ดูข้อมูลที่ดึงมา
    console.log(`TR Wiring Size Debug - Row ${trRowNum}:`, trRow);
    console.log(`TR Wiring Type: ${form.trWiringType}`);
    console.log(`Columns to check:`, cols);

    // ดึงค่าทุกคอลัมน์มาต่อกัน (เว้นวรรค)
    let values = cols.map(col => {
      const val = trRow[col];
      console.log(`Column ${col}: ${val}`);
      return val;
    }).filter(Boolean).join(' ');

    // เพิ่ม " )" ต่อท้ายสำหรับ "ขนาดสายไฟ 3P 4W ร้อยท่อเดินในอากาศ กลุ่ม 2"
    if (form.trWiringType === 'ขนาดสายไฟ 3P 4W ร้อยท่อเดินในอากาศ กลุ่ม 2' && values) {
      values = values + ' )';
    }

    console.log(`Final TR Wiring Size: "${values}"`);
    return values;
  };

  // เพิ่มฟังก์ชันดึง TR Wire conduit ตาม Power Authority และ TR Wiring Type
  const getTRWireConduit = () => {
    // ใช้ row number จาก TR Wiring Size CVs แทน Transformer Size
    const trWiringRowNum = getTRWiringSizeCVsRowNumber();
    if (!trWiringRowNum) return '';

    const trRow = excelData.find(r => r.__rowNum__ === trWiringRowNum);
    if (!trRow) return '';

    console.log(`TR Wire Conduit Debug - Using TR Wiring Row ${trWiringRowNum}:`, trRow);

    // Mapping TR Wiring Type to columns and units
    const wiringTypeToColsAndUnit: Record<string, { cols: string[]; unit: string }> = {
      'ขนาดสายไฟ 3P 4W ร้อยท่อเดินในอากาศ กลุ่ม 2': {
        cols: ['__EMPTY_26', '__EMPTY_27', '__EMPTY_28'], // ตามที่ผู้ใช้ระบุ
        unit: 'นิ้ว'
      },
      'ขนาดสายไฟ 3P 4W ร้อยท่อฝังใต้ดิน กลุ่ม 5': {
        cols: ['__EMPTY_47', '__EMPTY_48', '__EMPTY_49'], // ตามที่ผู้ใช้ระบุ
        unit: 'มม.'
      },
      'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา': {
        cols: ['__EMPTY_68'], // ตามที่ผู้ใช้ระบุ
        unit: 'ซม.'
      },
      'ขนาดสายไฟ 3P 4W ราง LADDER ไม่มีฝา': {
        cols: ['__EMPTY_89'], // ตามที่ผู้ใช้ระบุ
        unit: 'ซม.'
      },
    };

    const config = wiringTypeToColsAndUnit[form.trWiringType];
    if (!config) return '';

    console.log(`TR Wire Conduit - Wiring Type: ${form.trWiringType}`);
    console.log(`TR Wire Conduit - Columns to check:`, config.cols);

    const values = config.cols.map(col => {
      const val = trRow[col];
      console.log(`TR Wire Conduit - Column ${col}: ${val}`);
      return val;
    }).filter(Boolean).join(' ');

    console.log(`TR Wire Conduit - Final values: "${values}"`);
    if (!values) return '';
    return `${values} ${config.unit}`;
  };

  // เพิ่มฟังก์ชันดึง TR Wiring Size (CV) แยกแต่ละ Charger
  const getTRWiringSizeCVs = () => {
    // Mapping TR Wiring Type to columns
    const wiringTypeToCols: Record<string, string[]> = {
      'ขนาดสายไฟ 3P 4W ร้อยท่อเดินในอากาศ กลุ่ม 2': [
        '__EMPTY_11', '__EMPTY_12', '__EMPTY_13', '__EMPTY_14', '__EMPTY_15', '__EMPTY_16', '__EMPTY_17', '__EMPTY_18', '__EMPTY_19'
      ], // __EMPTY_11 to __EMPTY_19
      'ขนาดสายไฟ 3P 4W ร้อยท่อฝังใต้ดิน กลุ่ม 5': [
        '__EMPTY_30', '__EMPTY_31', '__EMPTY_32', '__EMPTY_33', '__EMPTY_34', '__EMPTY_35', '__EMPTY_36', '__EMPTY_37', '__EMPTY_38', '__EMPTY_39'
      ], // __EMPTY_30 to __EMPTY_39
      'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา': [
        '__EMPTY_51', '__EMPTY_52', '__EMPTY_53', '__EMPTY_54', '__EMPTY_55', '__EMPTY_56', '__EMPTY_57', '__EMPTY_58', '__EMPTY_59', '__EMPTY_60'
      ], // __EMPTY_51 to __EMPTY_60
      'ขนาดสายไฟ 3P 4W ราง LADDER ไม่มีฝา': [
        '__EMPTY_72', '__EMPTY_73', '__EMPTY_74', '__EMPTY_75', '__EMPTY_76', '__EMPTY_77', '__EMPTY_78', '__EMPTY_79', '__EMPTY_80', '__EMPTY_81'
      ], // __EMPTY_72 to __EMPTY_81
    };

    const cols = wiringTypeToCols[form.trWiringType];
    if (!cols) return [];

    // หา rowNum ของ Transformer ที่เลือก
    let trRowNum: number | undefined = undefined;
    if (form.powerAuthority === 'MEA') {
      const steps = [
        { max: 280, row: 32 },
        { max: 320, row: 33 },
        { max: 400, row: 34 },
        { max: 504, row: 35 },
        { max: 640, row: 36 },
        { max: 800, row: 37 },
        { max: 1000, row: 38 },
        { max: 1200, row: 39 },
        { max: 1600, row: 40 },
        { max: 2000, row: 41 },
      ];
      const inAll = chargerTypeMode === 'any'
        ? multiChargers.filter(name => name !== '').reduce((sum, chargerName) => {
          return sum + extractPowerValue(chargerName);
        }, 0)
        : results?.kWAllCharger || 0;
      const found = steps.find(s => inAll <= s.max);
      trRowNum = found?.row;
    } else if (form.powerAuthority === 'PEA') {
      const steps = [
        { max: 80, row: 76 },
        { max: 128, row: 77 },
        { max: 200, row: 78 },
        { max: 252, row: 79 },
        { max: 320, row: 80 },
        { max: 400, row: 81 },
        { max: 504, row: 82 },
        { max: 640, row: 83 },
        { max: 800, row: 84 },
        { max: 1000, row: 85 },
        { max: 1200, row: 86 },
        { max: 1600, row: 87 },
        { max: 2000, row: 88 },
      ];
      const inAll = chargerTypeMode === 'any'
        ? multiChargers.filter(name => name !== '').reduce((sum, chargerName) => {
          return sum + extractPowerValue(chargerName);
        }, 0)
        : results?.kWAllCharger || 0;
      const found = steps.find(s => inAll <= s.max);
      trRowNum = found?.row;
    }
    if (!trRowNum) return '';

    const trRow = excelData.find(r => r.__rowNum__ === trRowNum);
    if (!trRow) return '';

    // Debug: ดูข้อมูลที่ดึงมา
    console.log(`TR Wiring Size CVs Debug - Row ${trRowNum}:`, trRow);
    console.log(`TR Wiring Type: ${form.trWiringType}`);
    console.log(`Columns to check:`, cols);

    // ดึงค่าทุกคอลัมน์มาต่อกัน (เว้นวรรค)
    let value = cols.map(col => {
      const val = trRow[col];
      console.log(`Column ${col}: ${val}`);
      return val;
    }).filter(Boolean).join(' ');

    // เพิ่ม " )" ต่อท้ายสำหรับ "ขนาดสายไฟ 3P 4W ร้อยท่อเดินในอากาศ กลุ่ม 2"
    if (form.trWiringType === 'ขนาดสายไฟ 3P 4W ร้อยท่อเดินในอากาศ กลุ่ม 2' && value) {
      value = value + ' )';
    }

    console.log(`Final TR Wiring Size CVs: "${value}"`);

    // คืน array ตามจำนวนเครื่อง
    const numChargers = parseInt(form.numberOfChargers) || 1;
    return Array(numChargers).fill(value);
  };

  // ฟังก์ชันดึง row number สำหรับ TR Wiring Size CVs
  const getTRWiringSizeCVsRowNumber = (): number | undefined => {
    let trRowNum: number | undefined = undefined;

    if (form.powerAuthority === 'MEA') {
      const steps = [
        { max: 280, row: 32 },
        { max: 320, row: 33 },
        { max: 400, row: 34 },
        { max: 504, row: 35 },
        { max: 640, row: 36 },
        { max: 800, row: 37 },
        { max: 1000, row: 38 },
        { max: 1200, row: 39 },
        { max: 1600, row: 40 },
        { max: 2000, row: 41 },
      ];
      const inAll = chargerTypeMode === 'any'
        ? multiChargers.filter(name => name !== '').reduce((sum, chargerName) => {
          return sum + extractPowerValue(chargerName);
        }, 0)
        : results?.kWAllCharger || 0;
      const found = steps.find(s => inAll <= s.max);
      trRowNum = found?.row;
    } else if (form.powerAuthority === 'PEA') {
      const steps = [
        { max: 80, row: 76 },
        { max: 128, row: 77 },
        { max: 200, row: 78 },
        { max: 252, row: 79 },
        { max: 320, row: 80 },
        { max: 400, row: 81 },
        { max: 504, row: 82 },
        { max: 640, row: 83 },
        { max: 800, row: 84 },
        { max: 1000, row: 85 },
        { max: 1200, row: 86 },
        { max: 1600, row: 87 },
        { max: 2000, row: 88 },
      ];
      const inAll = chargerTypeMode === 'any'
        ? multiChargers.filter(name => name !== '').reduce((sum, chargerName) => {
          return sum + extractPowerValue(chargerName);
        }, 0)
        : results?.kWAllCharger || 0;
      const found = steps.find(s => inAll <= s.max);
      trRowNum = found?.row;
    }

    console.log(`TR Wiring Size CVs Row Number Debug: ${trRowNum}`);
    return trRowNum;
  };

  // เพิ่มฟังก์ชันดึง Charger Wiring cable ตาม Power Authority และ Charger Wiring Type
  const getChargerWiringCable = () => {
    // Mapping Charger Wiring Type to columns
    const wiringTypeToCols: Record<string, string[]> = form.powerAuthority === 'MEA'
      ? {
        'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ': [
          '__EMPTY_27', '__EMPTY_28', '__EMPTY_29', '__EMPTY_30', '__EMPTY_31', '__EMPTY_32', '__EMPTY_33', '__EMPTY_34', '__EMPTY_35', '__EMPTY_36', '__EMPTY_37', '__EMPTY_38', '__EMPTY_39'
        ], // __EMPTY_27 to __EMPTY_39
        'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน': [
          '__EMPTY_51', '__EMPTY_52', '__EMPTY_53', '__EMPTY_54', '__EMPTY_55', '__EMPTY_56', '__EMPTY_57', '__EMPTY_58', '__EMPTY_59', '__EMPTY_60', '__EMPTY_61', '__EMPTY_62', '__EMPTY_63'
        ], // __EMPTY_51 to __EMPTY_63
        'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา': [
          '__EMPTY_77', '__EMPTY_78', '__EMPTY_79', '__EMPTY_80', '__EMPTY_81', '__EMPTY_82', '__EMPTY_83', '__EMPTY_84', '__EMPTY_85', '__EMPTY_86'
        ], // __EMPTY_77 to __EMPTY_86
        'ขนาดสายไฟ 3P 4W ราง LADDER ไม่มีฝา': [
          '__EMPTY_101', '__EMPTY_102', '__EMPTY_103', '__EMPTY_104', '__EMPTY_105', '__EMPTY_106', '__EMPTY_107', '__EMPTY_108', '__EMPTY_109', '__EMPTY_110'
        ], // __EMPTY_101 to __EMPTY_110
      }
      : {
        'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ': [
          '__EMPTY_25', '__EMPTY_26', '__EMPTY_27', '__EMPTY_28', '__EMPTY_29', '__EMPTY_30', '__EMPTY_31', '__EMPTY_32', '__EMPTY_33', '__EMPTY_34', '__EMPTY_35', '__EMPTY_36', '__EMPTY_37'
        ], // __EMPTY_25 to __EMPTY_37
        'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน': [
          '__EMPTY_49', '__EMPTY_50', '__EMPTY_51', '__EMPTY_52', '__EMPTY_53', '__EMPTY_54', '__EMPTY_55', '__EMPTY_56', '__EMPTY_57', '__EMPTY_58', '__EMPTY_59', '__EMPTY_60', '__EMPTY_61'
        ], // __EMPTY_49 to __EMPTY_61
        'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา': [
          '__EMPTY_75', '__EMPTY_76', '__EMPTY_77', '__EMPTY_78', '__EMPTY_79', '__EMPTY_80', '__EMPTY_81', '__EMPTY_82', '__EMPTY_83', '__EMPTY_84'
        ], // __EMPTY_75 to __EMPTY_84
        'ขนาดสายไฟ 3P 4W ราง LADDER ไม่มีฝา': [
          '__EMPTY_99', '__EMPTY_100', '__EMPTY_101', '__EMPTY_102', '__EMPTY_103', '__EMPTY_104', '__EMPTY_105', '__EMPTY_106', '__EMPTY_107', '__EMPTY_108'
        ], // __EMPTY_99 to __EMPTY_108
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
        // Fields: __EMPTY_44 to __EMPTY_49
        const cols = ['__EMPTY_44', '__EMPTY_45', '__EMPTY_46', '__EMPTY_47', '__EMPTY_48', '__EMPTY_49'];
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
        // Fields: __EMPTY_68 to __EMPTY_73
        const cols = ['__EMPTY_68', '__EMPTY_69', '__EMPTY_70', '__EMPTY_71', '__EMPTY_72', '__EMPTY_73'];
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
      if (form.chargerWiringType === 'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา') {
        // Field: __EMPTY_92
        const col = '__EMPTY_92';
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
              const value = row[col];
              return `Charger${idx + 1}: ${value || '-'} ซม.`;
            });
        } else {
          const cell = chargerToExcelCell[form.charger];
          let rowNum: number | undefined;
          if (cell?.mea) rowNum = parseInt(cell.mea.replace('C', ''));
          if (!rowNum) return [];
          const row = excelData.find(r => r.__rowNum__ === rowNum);
          if (!row) return [];
          const value = row[col];
          const numChargers = parseInt(form.numberOfChargers) || 1;
          return Array(numChargers).fill(`Charger1: ${value || '-'} ซม.`).map((v, i) =>
            `Charger${i + 1}: ${value || '-'} ซม.`
          );
        }
      }
      if (form.chargerWiringType === 'ขนาดสายไฟ 3P 4W ราง LADDER ไม่มีฝา') {
        // Field: __EMPTY_116
        const col = '__EMPTY_116';
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
              const value = row[col];
              return `Charger${idx + 1}: ${value || '-'} ซม.`;
            });
        } else {
          const cell = chargerToExcelCell[form.charger];
          let rowNum: number | undefined;
          if (cell?.mea) rowNum = parseInt(cell.mea.replace('C', ''));
          if (!rowNum) return [];
          const row = excelData.find(r => r.__rowNum__ === rowNum);
          if (!row) return [];
          const value = row[col];
          const numChargers = parseInt(form.numberOfChargers) || 1;
          return Array(numChargers).fill(`Charger1: ${value || '-'} ซม.`).map((v, i) =>
            `Charger${i + 1}: ${value || '-'} ซม.`
          );
        }
      }
    }
    // เงื่อนไข PEA
    if (form.powerAuthority === 'PEA') {
      if (form.chargerWiringType === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ') {
        // Fields: __EMPTY_42 to __EMPTY_47
        const cols = ['__EMPTY_42', '__EMPTY_43', '__EMPTY_44', '__EMPTY_45', '__EMPTY_46', '__EMPTY_47'];
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
        // Fields: __EMPTY_66 to __EMPTY_71
        const cols = ['__EMPTY_66', '__EMPTY_67', '__EMPTY_68', '__EMPTY_69', '__EMPTY_70', '__EMPTY_71'];
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
      if (form.chargerWiringType === 'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา') {
        // Field: __EMPTY_90
        const col = '__EMPTY_90';
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
              const value = row[col];
              return `Charger${idx + 1}: ${value || '-'} ซม.`;
            });
        } else {
          const cell = chargerToExcelCell[form.charger];
          let rowNum: number | undefined;
          if (cell?.pea) rowNum = parseInt(cell.pea.replace('C', ''));
          if (!rowNum) return [];
          const row = excelData.find(r => r.__rowNum__ === rowNum);
          if (!row) return [];
          const value = row[col];
          const numChargers = parseInt(form.numberOfChargers) || 1;
          return Array(numChargers).fill(`Charger1: ${value || '-'} ซม.`).map((v, i) =>
            `Charger${i + 1}: ${value || '-'} ซม.`
          );
        }
      }
      if (form.chargerWiringType === 'ขนาดสายไฟ 3P 4W ราง LADDER ไม่มีฝา') {
        // Field: __EMPTY_114
        const col = '__EMPTY_114';
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
              const value = row[col];
              return `Charger${idx + 1}: ${value || '-'} ซม.`;
            });
        } else {
          const cell = chargerToExcelCell[form.charger];
          let rowNum: number | undefined;
          if (cell?.pea) rowNum = parseInt(cell.pea.replace('C', ''));
          if (!rowNum) return [];
          const row = excelData.find(r => r.__rowNum__ === rowNum);
          if (!row) return [];
          const value = row[col];
          const numChargers = parseInt(form.numberOfChargers) || 1;
          return Array(numChargers).fill(`Charger1: ${value || '-'} ซม.`).map((v, i) =>
            `Charger${i + 1}: ${value || '-'} ซม.`
          );
        }
      }
    }
    return null;
  };

  // เพิ่มฟังก์ชันสำหรับเปลี่ยน label
  function getTrWireLabel(trWiringType: string) {
    if (trWiringType === 'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา') return 'TR Wire tray :';
    if (trWiringType === 'ขนาดสายไฟ 3P 4W ราง LADDER ไม่มีฝา') return 'TR Wire ladder :';
    return 'TR Wire conduit :';
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 relative">
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
                  {/* Customer Code */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">
                      รหัสลูกค้า <span className="text-xs text-gray-400">(Customer Code)</span>
                    </Label>
                    <Input
                      value={customerCode}
                      onChange={(e) => setCustomerCode(e.target.value)}
                      placeholder="กรอกรหัสลูกค้า"
                      className="h-12"
                    />
                  </div>

                  <Separator />

                  {/* Power Authority */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">
                      Power Authority <span className="text-xs text-gray-400">(หน่วยงานไฟฟ้า)</span>
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        className={`flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-violet-50 cursor-pointer ${form.powerAuthority === 'PEA' ? 'bg-violet-100 border-violet-300' : ''
                          }`}
                        onClick={() => setForm(f => ({ ...f, powerAuthority: 'PEA' }))}
                      >
                        <Checkbox
                          id="PEA"
                          checked={form.powerAuthority === 'PEA'}
                          onCheckedChange={(checked) => {
                            if (checked) setForm(f => ({ ...f, powerAuthority: 'PEA' }));
                          }}
                          className="text-violet-500 border-violet-400 data-[state=checked]:bg-violet-500"
                        />
                        <Label htmlFor="PEA" className="font-medium cursor-pointer text-violet-700">PEA</Label>
                      </div>
                      <div
                        className={`flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-orange-50 cursor-pointer ${form.powerAuthority === 'MEA' ? 'bg-orange-100 border-orange-300' : ''
                          }`}
                        onClick={() => setForm(f => ({ ...f, powerAuthority: 'MEA' }))}
                      >
                        <Checkbox
                          id="MEA"
                          checked={form.powerAuthority === 'MEA'}
                          onCheckedChange={(checked) => {
                            if (checked) setForm(f => ({ ...f, powerAuthority: 'MEA' }));
                          }}
                          className="text-orange-500 border-orange-400 data-[state=checked]:bg-orange-500"
                        />
                        <Label htmlFor="MEA" className="font-medium cursor-pointer text-orange-700">MEA</Label>
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

            {/* Button ถอดต้นทุน - อยู่ด้านล่าง Station Configuration */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                try {
                  // ตรวจสอบสิทธิ์การเข้าถึง
                  const user = getCurrentUser();
                  console.log('🔍 Current User:', user);
                  console.log('🔍 Can Access:', canAccessStationAccessory(user));
                  if (!canAccessStationAccessory(user)) {
                    alert('⚠️ No Permission\nคุณไม่มีสิทธิ์เข้าถึงหน้านี้');
                    return;
                  }

                  console.log('=== Navigate to StationAccessory ===');
                  console.log('Form:', form);
                  console.log('Charger Type Mode:', chargerTypeMode);
                  console.log('Multi Chargers:', multiChargers);

                  // Save current form data before navigation
                  const currentData = {
                    customerCode: customerCode,
                    form,
                    chargerTypeMode,
                    multiChargers
                  };
                  localStorage.setItem('ev_calculator_form_data', JSON.stringify(currentData));

                  // ส่งข้อมูลที่ต้องการไปหน้า StationAccessory
                  const navigationState = {
                    customerCode: customerCode,
                    powerAuthority: form.powerAuthority,
                    numberOfChargers: form.numberOfChargers,
                    chargerTypeMode: chargerTypeMode,
                    multiChargers: multiChargers,
                    charger: chargerTypeMode === 'any' ? '' : form.charger,
                    transformer: (() => {
                      const kWAllChargerValue = chargerTypeMode === 'any'
                        ? multiChargers.filter(name => name !== '').reduce((sum, chargerName) => {
                          return sum + extractPowerValue(chargerName);
                        }, 0)
                        : results?.kWAllCharger || 0;
                      // ถ้าเป็น Row 32 (≤ 280 kW) ให้ส่ง "มิเตอร์แรงต่ำ 400 A"
                      if (isRow32(kWAllChargerValue)) {
                        return 'มิเตอร์แรงต่ำ 400 A';
                      }
                      // ถ้าไม่ใช่ ให้ส่งค่าจาก getTRSizeFromExcel
                      return getTRSizeFromExcel(kWAllChargerValue);
                    })(),
                    trWiringType: form.trWiringType,
                    trWiringSize: getTRWiringSizeCVs()[0] || '',
                    trWireConduit: getTRWireConduit() || '',
                    // Legacy MDB summary for backward compatibility
                    mdb: (() => {
                      // ใช้ row number จาก TR Wiring Size CVs แทน Transformer Size
                      const trWiringRowNum = getTRWiringSizeCVsRowNumber();
                      const trRow = excelData.find(r => r.__rowNum__ === trWiringRowNum);
                      const mccbMain = trRow ? trRow.__EMPTY_7 : '-';
                      console.log(`MDB (MCCB Main) Debug - Using TR Wiring Row ${trWiringRowNum}:`, trRow);
                      console.log(`MCCB Main value (__EMPTY_7): ${mccbMain}`);
                      return mccbMain ? `${mccbMain} A` : '-';
                    })(),
                    // New detailed MDB fields
                    mdbMainAt: (() => {
                      // ใช้ row number จาก TR Wiring Size CVs แทน Transformer Size
                      const trWiringRowNum = getTRWiringSizeCVsRowNumber();
                      const trRow = excelData.find(r => r.__rowNum__ === trWiringRowNum);
                      const mccbMain = trRow ? trRow.__EMPTY_7 : '';
                      console.log(`MDB Main AT Debug - Using TR Wiring Row ${trWiringRowNum}:`, trRow);
                      console.log(`MCCB Main AT value (__EMPTY_7): ${mccbMain}`);
                      return mccbMain ? `${mccbMain} A` : '';
                    })(),
                    mdbMainAf: (() => {
                      let trRowNum: number | undefined = undefined;
                      if (form.powerAuthority === 'MEA') {
                        const steps = [
                          { max: 280, row: 32 },
                          { max: 320, row: 33 },
                          { max: 400, row: 34 },
                          { max: 504, row: 35 },
                          { max: 640, row: 36 },
                          { max: 800, row: 37 },
                          { max: 1000, row: 38 },
                          { max: 1200, row: 39 },
                          { max: 1600, row: 40 },
                          { max: 2000, row: 41 },
                        ];
                        const inAll = chargerTypeMode === 'any'
                          ? multiChargers.filter(name => name !== '').reduce((sum, chargerName) => {
                            return sum + extractPowerValue(chargerName);
                          }, 0)
                          : results?.kWAllCharger || 0;
                        const found = steps.find(s => inAll <= s.max);
                        trRowNum = found?.row;
                      } else if (form.powerAuthority === 'PEA') {
                        const steps = [
                          { max: 80, row: 76 },
                          { max: 128, row: 77 },
                          { max: 200, row: 78 },
                          { max: 252, row: 79 },
                          { max: 320, row: 80 },
                          { max: 400, row: 81 },
                          { max: 504, row: 82 },
                          { max: 640, row: 83 },
                          { max: 800, row: 84 },
                          { max: 1000, row: 85 },
                          { max: 1200, row: 86 },
                          { max: 1600, row: 87 },
                          { max: 2000, row: 88 },
                        ];
                        const inAll = chargerTypeMode === 'any'
                          ? multiChargers.filter(name => name !== '').reduce((sum, chargerName) => {
                            return sum + extractPowerValue(chargerName);
                          }, 0)
                          : results?.kWAllCharger || 0;
                        const found = steps.find(s => inAll <= s.max);
                        trRowNum = found?.row;
                      }
                      const trRow = excelData.find(r => r.__rowNum__ === trRowNum);
                      const main2 = trRow ? trRow.__EMPTY_10 : '';
                      return main2 ? `${main2} A` : '';
                    })(),
                    mdbSubs: (() => {
                      // MEA: ใช้ __EMPTY_23, __EMPTY_24, __EMPTY_24 มาโชว์ใน MCCB Sub
                      // PEA: ใช้ MEA. กฟน. 416 V:, __EMPTY_22, __EMPTY_23 มาโชว์ใน MCCB Sub
                      const meaColumns = ['__EMPTY_23', '__EMPTY_24', '__EMPTY_24'];
                      const peaColumns = ['MEA. กฟน. 416 V:', '__EMPTY_22', '__EMPTY_23'];
                      const columns = form.powerAuthority === 'MEA' ? meaColumns : peaColumns;

                      console.log('=== MCCB Sub Debug ===');
                      console.log('Power Authority:', form.powerAuthority);
                      console.log('Columns to read:', columns);
                      console.log('Charger Type Mode:', chargerTypeMode);

                      if (chargerTypeMode === 'any') {
                        console.log('Multi Chargers:', multiChargers);
                        return multiChargers.map((chargerName, index) => {
                          const cell = chargerToExcelCell[chargerName];
                          let rowNum: number | undefined;
                          if (form.powerAuthority === 'MEA' && cell?.mea) {
                            rowNum = parseInt(cell.mea.replace('C', ''));
                          }
                          if (form.powerAuthority === 'PEA' && cell?.pea) {
                            rowNum = parseInt(cell.pea.replace('C', ''));
                          }

                          console.log(`[MCCB Sub ${index + 1}] Charger: ${chargerName}, Row: ${rowNum}`);

                          const row = excelData.find(r => r.__rowNum__ === rowNum);
                          if (!row) {
                            console.log(`[MCCB Sub ${index + 1}] Row not found!`);
                            return '-';
                          }

                          console.log(`[MCCB Sub ${index + 1}] Row data:`, row);

                          // อ่านค่าจากทั้ง 3 คอลัมน์และแสดงพร้อมกัน
                          const values = columns.map(col => {
                            let val = (row as any)[col];
                            // สำหรับ PEA ถ้าต้องการหา 'MEA. กฟน. 416 V:'
                            if (form.powerAuthority === 'PEA' && col === 'MEA. กฟน. 416 V:') {
                              // ลองใช้ชื่อคอลัมน์ตรงๆ ก่อน
                              if (!val || val === '-') {
                                // ถ้าไม่เจอ ให้หาที่มี "กฟน" แต่ไม่มี "24kV" (เพื่อหลีกเลี่ยง MEA. 24kV/416/240V)
                                const keys = Object.keys(row);
                                const foundKey = keys.find(k =>
                                  k.includes('กฟน') &&
                                  k.includes('416') &&
                                  k.includes('V') &&
                                  !k.includes('24kV') &&
                                  !k.includes('240V')
                                );
                                if (foundKey) {
                                  val = (row as any)[foundKey];
                                  console.log(`[MCCB Sub ${index + 1}] Found key: ${foundKey} = ${val}`);
                                }
                              } else {
                                // ถ้าเจอแล้ว ตรวจสอบว่าไม่ใช่ MEA. 24kV/416/240V
                                if (typeof val === 'number' && val > 1000) {
                                  // ถ้าเป็นตัวเลขมากๆ อาจจะเป็นค่าผิด (เช่น 174.95975925537127)
                                  const keys = Object.keys(row);
                                  const foundKey = keys.find(k =>
                                    k.includes('กฟน') &&
                                    k.includes('416') &&
                                    k.includes('V') &&
                                    !k.includes('24kV') &&
                                    !k.includes('240V')
                                  );
                                  if (foundKey) {
                                    val = (row as any)[foundKey];
                                    console.log(`[MCCB Sub ${index + 1}] Fixed: using ${foundKey} = ${val} instead`);
                                  }
                                }
                              }
                            }
                            if (!val || val === '-') val = '-';
                            console.log(`[MCCB Sub ${index + 1}] Column ${col}:`, val);
                            return val;
                          });
                          const result = `${values.join(' ')} A`;
                          console.log(`[MCCB Sub ${index + 1}] Final result:`, result);
                          return result;
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

                        console.log('Charger:', form.charger, 'Row:', rowNum);

                        const row = excelData.find(r => r.__rowNum__ === rowNum);
                        if (!row) {
                          console.log('Row not found!');
                          return Array(parseInt(form.numberOfChargers) || 1).fill('-');
                        }

                        console.log('Row data:', row);

                        // อ่านค่าจากทั้ง 3 คอลัมน์และแสดงพร้อมกัน (ทุก MCCB Sub แสดงเหมือนกัน)
                        const values = columns.map(col => {
                          let val = (row as any)[col];
                          // สำหรับ PEA ถ้าต้องการหา 'MEA. กฟน. 416 V:'
                          if (form.powerAuthority === 'PEA' && col === 'MEA. กฟน. 416 V:') {
                            // ลองใช้ชื่อคอลัมน์ตรงๆ ก่อน
                            if (!val || val === '-') {
                              // ถ้าไม่เจอ ให้หาที่มี "กฟน" แต่ไม่มี "24kV" (เพื่อหลีกเลี่ยง MEA. 24kV/416/240V)
                              const keys = Object.keys(row);
                              const foundKey = keys.find(k =>
                                k.includes('กฟน') &&
                                k.includes('416') &&
                                k.includes('V') &&
                                !k.includes('24kV') &&
                                !k.includes('240V')
                              );
                              if (foundKey) {
                                val = (row as any)[foundKey];
                                console.log(`Found key: ${foundKey} = ${val}`);
                              }
                            } else {
                              // ถ้าเจอแล้ว ตรวจสอบว่าไม่ใช่ MEA. 24kV/416/240V
                              if (typeof val === 'number' && val > 1000) {
                                // ถ้าเป็นตัวเลขมากๆ อาจจะเป็นค่าผิด (เช่น 174.95975925537127)
                                const keys = Object.keys(row);
                                const foundKey = keys.find(k =>
                                  k.includes('กฟน') &&
                                  k.includes('416') &&
                                  k.includes('V') &&
                                  !k.includes('24kV') &&
                                  !k.includes('240V')
                                );
                                if (foundKey) {
                                  val = (row as any)[foundKey];
                                  console.log(`Fixed: using ${foundKey} = ${val} instead`);
                                }
                              }
                            }
                          }
                          if (!val || val === '-') val = '-';
                          console.log(`Column ${col}:`, val);
                          return val;
                        });
                        const result = `${values.join(' ')} A`;
                        console.log('Final result:', result);
                        const numChargers = parseInt(form.numberOfChargers) || 1;
                        const finalArray = Array(numChargers).fill(result);
                        console.log('Final array:', finalArray);
                        return finalArray;
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
                    // ข้อมูลจาก Summary for Charger
                    chargerSummary: (() => {
                      if (chargerTypeMode === 'any') {
                        return multiChargers.filter(name => name !== '').map((chargerName, idx) => {
                          const cableArr = getChargerWiringCable();
                          const cable = Array.isArray(cableArr) ? cableArr[idx] || '-' : (typeof cableArr === 'string' ? cableArr : '-');
                          const conduitArr = getChargerWireConduit();
                          const conduit = Array.isArray(conduitArr) ? conduitArr[idx] || '-' : (typeof conduitArr === 'string' ? conduitArr : '-');
                          return {
                            name: chargerName,
                            kw: extractPowerValue(chargerName),
                            cable: cable.replace(/^Charger\d+:\s*/, ''),
                            conduit: conduit.replace(/^Charger\d+:\s*/, '')
                          };
                        });
                      } else {
                        const num = parseInt(form.numberOfChargers) || 1;
                        const cableArr = getChargerWiringCable();
                        const conduitArr = getChargerWireConduit();
                        return Array.from({ length: num }).map((_, idx) => ({
                          name: form.charger,
                          kw: extractPowerValue(form.charger),
                          cable: Array.isArray(cableArr) ? (cableArr[idx] ? cableArr[idx].replace(/^Charger\d+:\s*/, '') : '-') : (typeof cableArr === 'string' ? cableArr : '-'),
                          conduit: Array.isArray(conduitArr) ? (conduitArr[idx] ? conduitArr[idx].replace(/^Charger\d+:\s*/, '') : '-') : (typeof conduitArr === 'string' ? conduitArr : '-')
                        }));
                      }
                    })()
                  };

                  console.log('✅ Navigation state prepared:', navigationState);

                  // Navigate with state
                  navigate('/station-accessory', {
                    state: navigationState,
                    replace: false
                  });

                  console.log('✅ Navigation called');
                } catch (error) {
                  console.error('❌ Error navigating to StationAccessory:', error);
                  alert('เกิดข้อผิดพลาดในการเปลี่ยนหน้า: ' + (error instanceof Error ? error.message : String(error)));
                }
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded shadow-lg mt-6"
            >
              ถอดต้นทุน
            </button>

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
                      {chargerTypeMode === 'any'
                        ? Math.round(multiChargers.filter(name => name !== '').reduce((sum, chargerName) => {
                          return sum + extractPowerValue(chargerName);
                        }, 0))
                        : Math.round(results?.kWAllCharger || 0)
                      } kW
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      (kW of all Charger)
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
                      {(() => {
                        const kWAllChargerValue = chargerTypeMode === 'any'
                          ? multiChargers.filter(name => name !== '').reduce((sum, chargerName) => {
                            return sum + extractPowerValue(chargerName);
                          }, 0)
                          : results?.kWAllCharger || 0;
                        if (isRow32(kWAllChargerValue)) {
                          return 'มิเตอร์แรงต่ำ 400 A';
                        }
                        return (
                          <>
                            {getTRSizeFromExcel(kWAllChargerValue)}
                            <span className="text-2xl font-bold text-green-900 ml-1">kVA</span>
                          </>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
                {/* Power Authority Card */}
                <Card className={
                  form.powerAuthority === 'PEA'
                    ? "bg-violet-50 border border-violet-100 shadow-none"
                    : "bg-orange-50 border border-orange-100 shadow-none"
                }>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={
                        form.powerAuthority === 'PEA'
                          ? "h-5 w-5 rounded-full bg-violet-400 inline-block"
                          : "h-5 w-5 rounded-full bg-orange-400 inline-block"
                      } />
                      <span className={
                        form.powerAuthority === 'PEA'
                          ? "text-sm font-medium text-violet-800"
                          : "text-sm font-medium text-orange-800"
                      }>
                        Power Authority
                      </span>
                    </div>
                    <div className={
                      form.powerAuthority === 'PEA'
                        ? "text-2xl font-bold text-violet-700"
                        : "text-2xl font-bold text-orange-800"
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
                        // ใช้ row number จาก TR Wiring Size CVs แทน Transformer Size
                        const trWiringRowNum = getTRWiringSizeCVsRowNumber();
                        const trRow = excelData.find(r => r.__rowNum__ === trWiringRowNum);
                        const mccbMain = trRow ? trRow.__EMPTY_7 : '-';
                        console.log(`MDB (MCCB Main) UI Debug - Using TR Wiring Row ${trWiringRowNum}:`, trRow);
                        console.log(`MCCB Main UI value (__EMPTY_7): ${mccbMain}`);
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
                    multiChargers.filter(name => name !== '').length > 0 ? (
                      multiChargers.filter(name => name !== '').map((chargerName, idx) => {
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
                              kW: {extractPowerValue(chargerName)} kW
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
                            ln(100%): {results?.inOfCharger !== undefined ? results.inOfCharger.toFixed(2) : '-'} A
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
                  {/* kW of all Charger summary */}
                  <div className="mt-4 font-semibold text-blue-900 text-base">
                    kW of all Charger:{" "}
                    {chargerTypeMode === 'any'
                      ? multiChargers.filter(name => name !== '').reduce((sum, chargerName) => {
                        return sum + extractPowerValue(chargerName);
                      }, 0).toFixed(2)
                      : results?.kWAllCharger !== undefined
                        ? results.kWAllCharger.toFixed(2)
                        : '-'
                    }
                    <span className="ml-1">kW</span>
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
                          {(() => {
                            const kWAllChargerValue = chargerTypeMode === 'any'
                              ? multiChargers.filter(name => name !== '').reduce((sum, chargerName) => {
                                return sum + extractPowerValue(chargerName);
                              }, 0)
                              : results?.kWAllCharger || 0;
                            if (isRow32(kWAllChargerValue)) {
                              return 'มิเตอร์แรงต่ำ 400 A';
                            }
                            return (
                              <>
                                {getTRSizeFromExcel(kWAllChargerValue)}
                                <span className="text-base text-gray-900 ml-1">kVA</span>
                              </>
                            );
                          })()}
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
                            // ใช้ row number จาก TR Wiring Size CVs แทน Transformer Size
                            const trWiringRowNum = getTRWiringSizeCVsRowNumber();
                            const trRow = excelData.find(r => r.__rowNum__ === trWiringRowNum);
                            const mccbMain = trRow ? trRow.__EMPTY_7 : '-';
                            console.log(`MDB to Charger MDB Debug - Using TR Wiring Row ${trWiringRowNum}:`, trRow);
                            console.log(`MCCB Main in MDB to Charger (__EMPTY_7): ${mccbMain}`);
                            const main2 = trRow ? trRow.__EMPTY_10 : '-';
                            // MCCB Sub
                            // MEA: ใช้ __EMPTY_23, __EMPTY_24, __EMPTY_24 มาโชว์ใน MCCB Sub
                            // PEA: ใช้ MEA. กฟน. 416 V:, __EMPTY_22, __EMPTY_23 มาโชว์ใน MCCB Sub
                            const meaColumns = ['__EMPTY_23', '__EMPTY_24', '__EMPTY_24'];
                            const peaColumns = ['MEA. กฟน. 416 V:', '__EMPTY_22', '__EMPTY_23'];
                            const columns = form.powerAuthority === 'MEA' ? meaColumns : peaColumns;
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
                                if (!row) return '-';
                                // อ่านค่าจากทั้ง 3 คอลัมน์และแสดงพร้อมกัน
                                const values = columns.map(col => {
                                  let val = (row as any)[col];
                                  // สำหรับ PEA ถ้าต้องการหา 'MEA. กฟน. 416 V:'
                                  if (form.powerAuthority === 'PEA' && col === 'MEA. กฟน. 416 V:') {
                                    // ลองใช้ชื่อคอลัมน์ตรงๆ ก่อน
                                    if (!val || val === '-') {
                                      // ถ้าไม่เจอ ให้หาที่มี "กฟน" แต่ไม่มี "24kV" (เพื่อหลีกเลี่ยง MEA. 24kV/416/240V)
                                      const keys = Object.keys(row);
                                      const foundKey = keys.find(k =>
                                        k.includes('กฟน') &&
                                        k.includes('416') &&
                                        k.includes('V') &&
                                        !k.includes('24kV') &&
                                        !k.includes('240V')
                                      );
                                      if (foundKey) {
                                        val = (row as any)[foundKey];
                                        console.log(`[MCCB Sub] Found key: ${foundKey} = ${val}`);
                                      }
                                    } else {
                                      // ถ้าเจอแล้ว ตรวจสอบว่าไม่ใช่ MEA. 24kV/416/240V
                                      if (typeof val === 'number' && val > 1000) {
                                        // ถ้าเป็นตัวเลขมากๆ อาจจะเป็นค่าผิด (เช่น 174.95975925537127)
                                        const keys = Object.keys(row);
                                        const foundKey = keys.find(k =>
                                          k.includes('กฟน') &&
                                          k.includes('416') &&
                                          k.includes('V') &&
                                          !k.includes('24kV') &&
                                          !k.includes('240V')
                                        );
                                        if (foundKey) {
                                          val = (row as any)[foundKey];
                                          console.log(`[MCCB Sub] Fixed: using ${foundKey} = ${val} instead`);
                                        }
                                      }
                                    }
                                  }
                                  if (!val || val === '-') val = '-';
                                  console.log(`[MCCB Sub] Column ${col}:`, val);
                                  return val;
                                }).filter(val => val !== '-');
                                return values.length > 0 ? `${values.join(' ')} A` : '-';
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
                              if (!row) {
                                const numChargers = parseInt(form.numberOfChargers) || 1;
                                mccbSubs = Array(numChargers).fill('-');
                              } else {
                                // อ่านค่าจากทั้ง 3 คอลัมน์และแสดงพร้อมกัน (ทุก MCCB Sub แสดงเหมือนกัน)
                                const values = columns.map(col => {
                                  let val = (row as any)[col];
                                  // สำหรับ PEA ถ้าต้องการหา 'MEA. กฟน. 416 V:'
                                  if (form.powerAuthority === 'PEA' && col === 'MEA. กฟน. 416 V:') {
                                    // ลองใช้ชื่อคอลัมน์ตรงๆ ก่อน
                                    if (!val || val === '-') {
                                      // ถ้าไม่เจอ ให้หาที่มี "กฟน" แต่ไม่มี "24kV" (เพื่อหลีกเลี่ยง MEA. 24kV/416/240V)
                                      const keys = Object.keys(row);
                                      const foundKey = keys.find(k =>
                                        k.includes('กฟน') &&
                                        k.includes('416') &&
                                        k.includes('V') &&
                                        !k.includes('24kV') &&
                                        !k.includes('240V')
                                      );
                                      if (foundKey) {
                                        val = (row as any)[foundKey];
                                        console.log(`[MCCB Sub] Found key: ${foundKey} = ${val}`);
                                      }
                                    } else {
                                      // ถ้าเจอแล้ว ตรวจสอบว่าไม่ใช่ MEA. 24kV/416/240V
                                      if (typeof val === 'number' && val > 1000) {
                                        // ถ้าเป็นตัวเลขมากๆ อาจจะเป็นค่าผิด (เช่น 174.95975925537127)
                                        const keys = Object.keys(row);
                                        const foundKey = keys.find(k =>
                                          k.includes('กฟน') &&
                                          k.includes('416') &&
                                          k.includes('V') &&
                                          !k.includes('24kV') &&
                                          !k.includes('240V')
                                        );
                                        if (foundKey) {
                                          val = (row as any)[foundKey];
                                          console.log(`[MCCB Sub] Fixed: using ${foundKey} = ${val} instead`);
                                        }
                                      }
                                    }
                                  }
                                  if (!val || val === '-') val = '-';
                                  console.log(`[MCCB Sub] Column ${col}:`, val);
                                  return val;
                                }).filter(val => val !== '-');
                                const result = values.length > 0 ? `${values.join(' ')} A` : '-';
                                const numChargers = parseInt(form.numberOfChargers) || 1;
                                mccbSubs = Array(numChargers).fill(result);
                              }
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
                                    <span className="font-semibold text-gray-900">{val}</span>
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
                      {/* In100% of charger */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-700">In100% of charger:</span>
                        <span className="font-semibold text-gray-900 text-base">
                          {chargerTypeMode === 'any'
                            ? (
                              multiChargers.filter(name => name !== '').length > 0
                                ? (
                                  <span>
                                    {multiChargers.filter(name => name !== '').map((chargerName, idx) => (
                                      <span key={idx}>
                                        {idx > 0 && ', '}
                                        Charger{idx + 1}: {extractPowerValue(chargerName)} kW
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
                        <span className="font-medium text-gray-700">kW of all Charger:</span>
                        <span className="font-semibold text-gray-900 text-base">
                          {chargerTypeMode === 'any'
                            ? multiChargers.filter(name => name !== '').reduce((sum, chargerName) => {
                              return sum + extractPowerValue(chargerName);
                            }, 0).toFixed(2)
                            : results?.kWAllCharger !== undefined
                              ? results.kWAllCharger.toFixed(2)
                              : '-'
                          }
                          <span className="text-base text-gray-900 ml-1">kW</span>
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

      {/* Floating Save Button */}
      <Button
        onClick={saveFormData}
        className="fixed bottom-6 right-6 bg-green-600 hover:bg-green-700 text-white shadow-lg rounded-full h-14 w-14 flex items-center justify-center z-50 transition-all hover:scale-110"
        title="บันทึกข้อมูล"
      >
        <Save className="h-6 w-6" />
      </Button>
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