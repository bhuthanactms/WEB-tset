/**
 * Home page - EV Station Calculator
 * Provides a comprehensive calculator for electric vehicle station requirements
 * including power authority selection, transformer sizing, and cost analysis.
 */

import React, { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Calculator, Zap, Battery, Settings, Cable, Save, FolderOpen, Trash2 } from 'lucide-react'
import axios from 'axios'
import * as XLSX from 'xlsx'
import { useNavigate, useLocation } from 'react-router-dom'
import { getCurrentUserSync as getCurrentUser, canAccessStationAccessory, canSaveHistory } from '@/utils/auth'
import { saveHistory } from '@/utils/historyService'

/** Form state interface */
interface CalculatorForm {
  powerAuthority: 'PEA' | 'MEA'
  charger: string
  numberOfChargers: string
  trWiringType: string
  chargerWiringType: string[] // เปลี่ยนเป็น array เพื่อรองรับการเลือกหลายตัวเลือก
  trToLand: string
  landToMdb: string
  numberOfTerminals?: string // สำหรับ Group Charger
  terminalSize?: string // ขนาดTerminal
  terminalSizes?: string[] // ขนาดTerminal แยกแต่ละชิ้น
  terminalWiringType?: string // การเดินสายไปTerminal
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
  const createEmptyForm = (): CalculatorForm => ({
    powerAuthority: '' as any,
    charger: '',
    numberOfChargers: '',
    trWiringType: '',
    chargerWiringType: [],
    trToLand: '',
    landToMdb: '',
    numberOfTerminals: '',
    terminalSize: '',
    terminalSizes: [],
    terminalWiringType: ''
  })

  const sanitizeNonNegativeString = (value: unknown): string => {
    if (value === null || value === undefined || value === '') return ''
    const raw = String(value)
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return raw
    return parsed < 0 ? '0' : raw
  }

  const normalizeLoadedForm = (rawForm: any): CalculatorForm => ({
    ...createEmptyForm(),
    ...(rawForm || {}),
    chargerWiringType: Array.isArray(rawForm?.chargerWiringType)
      ? rawForm.chargerWiringType
      : (rawForm?.chargerWiringType ? [rawForm.chargerWiringType] : []),
    terminalSizes: (Array.isArray(rawForm?.terminalSizes)
      ? rawForm.terminalSizes
      : (rawForm?.terminalSize ? [rawForm.terminalSize] : [])
    ).map((s: string) => (s === '300A' ? '' : s)),
    terminalSize: rawForm?.terminalSize === '300A' ? '' : (rawForm?.terminalSize || ''),
    numberOfChargers: sanitizeNonNegativeString(rawForm?.numberOfChargers),
    numberOfTerminals: sanitizeNonNegativeString(rawForm?.numberOfTerminals)
  })

  // เพิ่ม state สำหรับประเภทการเลือก Charger Type
  const [chargerInstallationType, setChargerInstallationType] = useState<'stand-alone' | 'group'>('stand-alone');
  const [chargerTypeMode, setChargerTypeMode] = useState<'same' | 'any'>('same');
  const [multiChargers, setMultiChargers] = useState<string[]>([]);

  const [form, setForm] = useState<CalculatorForm>(createEmptyForm());
  const terminalCount = parseInt(form.numberOfTerminals || '0', 10) || 0;
  const selectedTerminalSizes = (() => {
    const sizes = Array.isArray(form.terminalSizes) ? form.terminalSizes : [];
    if (terminalCount > 0) {
      return Array.from({ length: terminalCount }, (_, idx) => {
        if (sizes[idx]) return sizes[idx];
        if (idx === 0 && form.terminalSize) return form.terminalSize;
        return '';
      });
    }
    if (sizes.some(Boolean)) return sizes;
    return form.terminalSize ? [form.terminalSize] : [];
  })();

  const [results, setResults] = useState<CalculatorResults | null>(null)
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelSheets, setExcelSheets] = useState<Record<string, any[]>>({});
  const [customerCode, setCustomerCode] = useState<string>('');
  const [noCustomerCodeStationDialogOpen, setNoCustomerCodeStationDialogOpen] = useState(false);
  const [isEditingTransformerSize, setIsEditingTransformerSize] = useState(false);
  const [manualTransformerSize, setManualTransformerSize] = useState<string>('');
  const navigateToStationAccessoryRef = useRef<() => void>(() => {});
  const navigate = useNavigate()
  const location = useLocation()

  // Save/Load functionality
  const STORAGE_KEY = 'ev_calculator_form_data';
  const DRAFT_KEY = 'ev_calculator_form_draft';
  /** เก็บ state ล่าสุดตอนไป StationAccessory — ใช้เมื่อย้อนกลับ/forward แล้ว location.state หาย (HashRouter) */
  const LAST_STATION_NAV_SESSION_KEY = 'ev_last_station_accessory_nav_state';

  // Auto-save draft on every form change (for back/forward navigation restore)
  useEffect(() => {
    const draft = { form, chargerInstallationType, chargerTypeMode, multiChargers, customerCode }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }, [form, chargerInstallationType, chargerTypeMode, multiChargers, customerCode])

  useEffect(() => {
    setManualTransformerSize('');
    setIsEditingTransformerSize(false);
  }, [form.powerAuthority]);

  useEffect(() => {
    if (!manualTransformerSize) return;
    const allowedOptions = getTransformerSizeOptions();
    if (!allowedOptions.includes(manualTransformerSize)) {
      setManualTransformerSize('');
    }
  }, [manualTransformerSize, form.powerAuthority, chargerTypeMode, multiChargers, results?.kWAllCharger, excelData.length]);

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
      localStorage.removeItem('ev_station_accessory_form_data');
      localStorage.removeItem(DRAFT_KEY);
      sessionStorage.removeItem(LAST_STATION_NAV_SESSION_KEY);
      // ลบ flag ที่บอกว่าโหลดจากประวัติ
      sessionStorage.removeItem('loaded_from_history');
      // Reset form state
      setForm(createEmptyForm());
      setResults(null);
      setCustomerCode('');
      setChargerInstallationType('stand-alone');
      setChargerTypeMode('same');
      setMultiChargers([]);
      // ล้าง flag
      sessionStorage.removeItem('reset_form_on_load');
      console.log('✅ Form reset - เคลียร์ข้อมูลทั้งหมดแล้ว (ประวัติการบันทึกยังคงอยู่)');
      return;
    }

    sessionStorage.removeItem('back_navigation')

    // ตรวจสอบว่ามี navigation state จาก history load หรือไม่
    const locationState = location.state || (window.history.state && window.history.state.usr) || {};
    const hasHistoryLoad = !!(locationState as any).loadData

    if (!hasHistoryLoad) {
      // Restore draft ทุกครั้งที่ mount โดยไม่มี history load (back/forward/direct)
      const draftData = localStorage.getItem(DRAFT_KEY)
      if (draftData) {
        try {
          const draft = JSON.parse(draftData)
          if (draft.form) setForm(normalizeLoadedForm(draft.form))
          if (draft.chargerInstallationType) setChargerInstallationType(draft.chargerInstallationType)
          if (draft.chargerTypeMode) setChargerTypeMode(draft.chargerTypeMode)
          if (draft.multiChargers) setMultiChargers(draft.multiChargers)
          if (draft.customerCode) setCustomerCode(draft.customerCode)
          console.log('✅ Restored draft on mount')
        } catch (e) {
          console.error('❌ Error restoring draft:', e)
        }
        return
      }
    }

    // ตรวจสอบว่ามี flag ที่บอกว่าโหลดจากประวัติหรือไม่
    const loadedFromHistory = sessionStorage.getItem('loaded_from_history');

    console.log('🔍 locationState:', locationState);
    console.log('🔍 location.state:', location.state);
    console.log('🔍 loadedFromHistory flag:', loadedFromHistory);

    if ((locationState as any).loadData) {
      const loadData = (locationState as any).loadData;
      console.log('📦 Loading data from navigation state:', loadData);
      // ตั้ง flag ว่าโหลดจากประวัติ
      sessionStorage.setItem('loaded_from_history', 'true');

      // โหลดข้อมูลทั้งหมด
      if (loadData.form) {
        const normalizedForm = normalizeLoadedForm(loadData.form);
        setForm(normalizedForm);
        console.log('✅ Set form:', normalizedForm);
      }
      if (loadData.chargerInstallationType) {
        setChargerInstallationType(loadData.chargerInstallationType);
        console.log('✅ Set chargerInstallationType:', loadData.chargerInstallationType);
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
            const normalizedForm = normalizeLoadedForm(parsed.form);
            setForm(normalizedForm);
            console.log('✅ Set form from localStorage:', normalizedForm);
          }
          if (parsed.chargerInstallationType) {
            setChargerInstallationType(parsed.chargerInstallationType);
            console.log('✅ Set chargerInstallationType from localStorage:', parsed.chargerInstallationType);
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
  const saveFormData = async () => {
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

    const selectedTransformer = form.powerAuthority && kWAllChargerValue > 0
      ? getSelectedTransformerLabel(kWAllChargerValue)
      : '';

    const transformerSize = selectedTransformer === 'มิเตอร์แรงต่ำ 400 A'
      ? '400'
      : selectedTransformer;

    // ค่าที่แสดงใน UI / ส่งต่อไปหน้า StationAccessory
    const transformer = selectedTransformer;

    // คำนวณข้อมูลเพิ่มเติม (ต้องมี form.trWiringType และ form.powerAuthority)
    const trWiringSize = form.trWiringType && form.powerAuthority
      ? (getTRWiringSizeCVs()[0] || '')
      : '';

    const trWireConduit = form.trWiringType && form.powerAuthority
      ? (getTRWireConduit() || '')
      : '';

    const trWiringRowNum = form.trWiringType && form.powerAuthority
      ? getSelectedTransformerRowNumber()
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
      const trRowNum = getTRWiringSizeCVsRowNumber();
      const trRow = excelData.find(r => r.__rowNum__ === trRowNum);
      const main2 = trRow ? trRow.__EMPTY_10 : '';
      return main2 ? `${main2} A` : '';
    })() : '';

    const chargerWiringCable = form.chargerWiringType && form.chargerWiringType.length > 0 && form.powerAuthority
      ? getChargerWiringCable()
      : '';

    const chargerWireConduit = form.chargerWiringType && form.chargerWiringType.length > 0 && form.powerAuthority
      ? getChargerWireConduit()
      : '';

    const chargerWiringCableAll = (() => {
      const v = chargerWiringCable;
      if (Array.isArray(v)) return v;
      const n = parseInt(form.numberOfChargers) || 1;
      return Array(n).fill(v).map((val, i) => `Charger${i + 1}: ${val || ''}`);
    })();

    const chargerWireConduitAll = (() => {
      const v = chargerWireConduit;
      const norm = (s: string) => (s || '').replace(/^Charger\d+:\s*/i, '').trim();
      if (Array.isArray(v)) return v.map(norm);
      const n = parseInt(form.numberOfChargers) || 1;
      return Array(n).fill(norm((v as unknown as string) || ''));
    })();
    const terminalWiringDetails = selectedTerminalSizes
      .map((size, idx) => {
        const detail = getTerminalWiringData(size);
        return {
          terminalIndex: idx,
          terminalSize: size,
          cable: detail?.cable || '',
          conduitTray: detail?.conduitTray || '',
        };
      })
      .filter((item) => item.terminalSize);

    const dataToSave = {
      customerCode: customerCode.trim(),
      form,
      chargerInstallationType,
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
      chargerWiringCableAll: chargerWiringCableAll,
      chargerWireConduitAll: chargerWireConduitAll,
      terminalWiringDetails: terminalWiringDetails,
      chargerSummary: (() => {
        if (chargerTypeMode === 'any') {
          return multiChargers.filter(name => name !== '').map((chargerName, idx) => {
            const cableArr = getChargerWiringCable();
            const cable = Array.isArray(cableArr) ? cableArr[idx] || '-' : (typeof cableArr === 'string' ? cableArr : '-');
            const conduitArr = getChargerWireConduit();
            const conduit = Array.isArray(conduitArr) ? conduitArr[idx] || '-' : (typeof conduitArr === 'string' ? conduitArr : '-');
            return { name: chargerName, kw: extractPowerValue(chargerName), cable: cable.replace(/^Charger\d+:\s*/, ''), conduit: conduit.replace(/^Charger\d+:\s*/, '') };
          });
        }
        const num = parseInt(form.numberOfChargers) || 1;
        const cableArr = getChargerWiringCable();
        const conduitArr = getChargerWireConduit();
        return Array.from({ length: num }).map((_, idx) => ({
          name: form.charger,
          kw: extractPowerValue(form.charger),
          cable: (Array.isArray(cableArr) ? cableArr[idx] || '-' : (typeof cableArr === 'string' ? cableArr : '-')).replace(/^Charger\d+:\s*/, ''),
          conduit: (Array.isArray(conduitArr) ? conduitArr[idx] || '-' : (typeof conduitArr === 'string' ? conduitArr : '-')).replace(/^Charger\d+:\s*/, ''),
        }));
      })(),
      savedAt: new Date().toISOString()
    };
    try {
      // Save draft ใน localStorage สำหรับ session ปัจจุบัน
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));

      // ดึง station data ของ customer เดียวกัน (ถ้ามี)
      const stationKey = 'ev_station_accessory_form_data';
      const stationData = localStorage.getItem(stationKey);
      let stationDataParsed = null;
      if (stationData) {
        try {
          stationDataParsed = JSON.parse(stationData);
          if (stationDataParsed.customerCode !== customerCode.trim()) {
            stationDataParsed = null;
          }
        } catch (e) {}
      }

      // Save ลง Supabase
      const dataType = stationDataParsed ? 'combined' : 'home'
      const result = await saveHistory(customerCode.trim(), dataType, dataToSave, stationDataParsed)

      if (!result.ok) {
        alert('❌ ' + (result.message || 'บันทึกไม่สำเร็จ'))
        return
      }

      alert('✅ บันทึกข้อมูลสำเร็จ!' + (stationDataParsed ? ' (รวมข้อมูลทั้ง 2 หน้า)' : ''))
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
        if (parsed.form) {
          const normalizedForm = normalizeLoadedForm(parsed.form);
          setForm(normalizedForm);
        }
        if (parsed.chargerInstallationType) setChargerInstallationType(parsed.chargerInstallationType);
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
      setForm(createEmptyForm());
      setResults(null);
      setCustomerCode('');
      setChargerInstallationType('stand-alone');
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

  // Mapping Charger Type กับเซลล์ใน Excel สำหรับ Stand-alone
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

  // Mapping Charger Type กับเซลล์ใน Excel สำหรับ Group Charger
  // ใช้ row 151-170, mea: __EMPTY_21, pea: __EMPTY_96
  const groupChargerToExcelCell: Record<string, { mea?: string; pea?: string; rowNum: number }> = {
    '240 kW': { mea: '__EMPTY_21', pea: '__EMPTY_96', rowNum: 151 },
    '280 kW': { mea: '__EMPTY_21', pea: '__EMPTY_96', rowNum: 152 },
    '320 kW': { mea: '__EMPTY_21', pea: '__EMPTY_96', rowNum: 153 },
    '360 kW': { mea: '__EMPTY_21', pea: '__EMPTY_96', rowNum: 154 },
    '400 kW': { mea: '__EMPTY_21', pea: '__EMPTY_96', rowNum: 155 },
    '440 kW': { mea: '__EMPTY_21', pea: '__EMPTY_96', rowNum: 156 },
    '480 kW': { mea: '__EMPTY_21', pea: '__EMPTY_96', rowNum: 157 },
    '520 kW': { mea: '__EMPTY_21', pea: '__EMPTY_96', rowNum: 158 },
    '560 kW': { mea: '__EMPTY_21', pea: '__EMPTY_96', rowNum: 159 },
    '600 kW': { mea: '__EMPTY_21', pea: '__EMPTY_96', rowNum: 160 },
    '640 kW': { mea: '__EMPTY_21', pea: '__EMPTY_96', rowNum: 161 },
    '680 kW': { mea: '__EMPTY_21', pea: '__EMPTY_96', rowNum: 162 },
    '720 kW': { mea: '__EMPTY_21', pea: '__EMPTY_96', rowNum: 163 },
    '760 kW': { mea: '__EMPTY_21', pea: '__EMPTY_96', rowNum: 164 },
    '800 kW': { mea: '__EMPTY_21', pea: '__EMPTY_96', rowNum: 165 },
    '840 kW': { mea: '__EMPTY_21', pea: '__EMPTY_96', rowNum: 166 },
    '880 kW': { mea: '__EMPTY_21', pea: '__EMPTY_96', rowNum: 167 },
    '920 kW': { mea: '__EMPTY_21', pea: '__EMPTY_96', rowNum: 168 },
    '960 kW': { mea: '__EMPTY_21', pea: '__EMPTY_96', rowNum: 169 },
    '1000 kW': { mea: '__EMPTY_21', pea: '__EMPTY_96', rowNum: 170 },
  };

  // ดึงค่าจาก Excel ตาม Power Authority และ Charger Type
  const getInFromExcel = (type: 'inOfCharger' | 'inAllCharger') => {
    const charger = form.charger;
    const numberOfChargers = parseInt(form.numberOfChargers) || 1;

    let rowNum: number | undefined;

    // ตรวจสอบว่าเป็น Group Charger หรือ Stand-alone
    if (chargerInstallationType === 'group') {
      const groupCell = groupChargerToExcelCell[charger];
      if (!groupCell) return undefined;
      rowNum = groupCell.rowNum;
    } else {
    const cell = chargerToExcelCell[charger];
    if (!cell) return undefined;

    // ดึงเลข row จาก cell เช่น 'C7' => 7
    if (form.powerAuthority === 'MEA' && cell.mea) {
      rowNum = parseInt(cell.mea.replace('C', ''));
    }
    if (form.powerAuthority === 'PEA' && cell.pea) {
      rowNum = parseInt(cell.pea.replace('C', ''));
    }
    }

    if (rowNum === undefined) return undefined;

    // หา row ที่ __rowNum__ === rowNum
    const row = excelData.find((r) => r.__rowNum__ === rowNum);
    if (!row) return undefined;

    let value: any;

    // สำหรับ Group Charger: ใช้ __EMPTY_21 (MEA) หรือ __EMPTY_96 (PEA)
    if (chargerInstallationType === 'group') {
      const groupCell = groupChargerToExcelCell[charger];
      if (!groupCell) return undefined;

      const colKey = form.powerAuthority === 'MEA' ? groupCell.mea : groupCell.pea;
      if (!colKey) return undefined;

      value = (row as any)[colKey];
      console.log(`[getInFromExcel] Group Charger - Row ${rowNum}, Column ${colKey}, Value: ${value}`);
    } else {
      // สำหรับ Stand-alone: เลือกคอลัมน์ตาม Land to MDB wiring type
      let colKey: string | undefined;
      
      // ตรวจสอบ Land to MDB wiring type
      if (form.landToMdb === 'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา' && form.powerAuthority === 'MEA') {
        // สำหรับ TRAY ไม่มีฝา + MEA: ใช้คอลัมน์ MEA. กฟน. 416 V:
        const keys = Object.keys(row);
        // ลองหาคอลัมน์ที่มี "กฟน" และ "416" หรือ "MEA" และ "416"
        colKey = keys.find(k => 
          (k.includes('กฟน') || k.includes('MEA')) && 
          k.includes('416') &&
          !k.includes('24kV')
        ) || 'MEA. กฟน. 416 V:';
        
      value = (row as any)[colKey];
        console.log(`[getInFromExcel] Stand-alone Charger - Row ${rowNum}, Land to MDB: ${form.landToMdb}, MEA, Column ${colKey}, Value: ${value}`);
        
        // ถ้าไม่เจอ ลองหา key ที่มี "416" และ "V" (ไม่ใช่ 24kV)
        if (value === undefined || value === null || value === '') {
          const foundKey = keys.find(k =>
            k.includes('416') &&
            k.includes('V') &&
            !k.includes('24kV')
          );
          if (foundKey) {
            colKey = foundKey;
            value = (row as any)[foundKey];
            console.log(`[getInFromExcel] Found alternative key for TRAY MEA: ${foundKey} = ${value}`);
          }
        }
      } else {
        // สำหรับ wiring type อื่นๆ หรือ PEA: ใช้คอลัมน์เดิม
        colKey = 'MEA. 24kV/416/240V:';
        value = (row as any)[colKey];
        console.log(`[getInFromExcel] Stand-alone Charger - Row ${rowNum}, Land to MDB: ${form.landToMdb}, Column ${colKey}, Value: ${value}`);

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

  const getCurrentKWAllCharger = (): number => {
    return chargerTypeMode === 'any'
      ? multiChargers.filter(name => name !== '').reduce((sum, chargerName) => {
        return sum + extractPowerValue(chargerName);
      }, 0)
      : results?.kWAllCharger || 0;
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

  const getAutoTransformerLabel = (kWAllCharger: number): string => {
    if (isRow32(kWAllCharger)) {
      return 'มิเตอร์แรงต่ำ 400 A';
    }
    return String(getTRSizeFromExcel(kWAllCharger) || '-');
  };

  const getSelectedTransformerLabel = (kWAllCharger: number): string => {
    return manualTransformerSize || getAutoTransformerLabel(kWAllCharger);
  };

  const getTransformerSizeOptions = (): string[] => {
    const orderedOptions = form.powerAuthority === 'MEA'
      ? ['มิเตอร์แรงต่ำ 400 A', '400', '500', '630', '800', '1000', '1250', '1500']
      : form.powerAuthority === 'PEA'
        ? ['100', '160', '250', '315', '400', '500', '630', '800', '1000', '1250', '1500']
        : [];

    if (orderedOptions.length === 0) return [];

    const autoTransformer = getAutoTransformerLabel(getCurrentKWAllCharger());
    const autoIndex = orderedOptions.indexOf(autoTransformer);

    // อนุญาตให้ลดขนาดได้เพียง 1 step จากค่าที่คำนวณอัตโนมัติ และเลือกขนาดที่ใหญ่กว่าได้ทั้งหมด
    if (autoIndex === -1) return orderedOptions;
    const minAllowedIndex = Math.max(0, autoIndex - 1);
    return orderedOptions.slice(minAllowedIndex);
  };

  const getTransformerRowByLabel = (transformerLabel: string): number | undefined => {
    if (form.powerAuthority === 'MEA') {
      if (transformerLabel === 'มิเตอร์แรงต่ำ 400 A') return 32;
      // ต้องตรงกับคอลัมน์ Charger ใน Sheet1 (เดิมเลื่อนแถว +1 ทำให้ MCCB Main ผิด)
      const meaRowMapping: Record<string, number> = {
        '400': 33,
        '500': 34,
        '630': 35,
        '800': 36,
        '1000': 37,
        '1250': 38,
        '1500': 39,
      };
      return meaRowMapping[transformerLabel];
    }
    if (form.powerAuthority === 'PEA') {
      const peaRowMapping: Record<string, number> = {
        '100': 76,
        '160': 77,
        '250': 78,
        '315': 79,
        '400': 80,
        '500': 81,
        '630': 82,
        '800': 83,
        '1000': 84,
        '1250': 85,
        '1500': 86,
      };
      return peaRowMapping[transformerLabel];
    }
    return undefined;
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
      chargerWiringType: [], // เปลี่ยนเป็น array
      trToLand: '',
      landToMdb: '',
      numberOfTerminals: '',
      terminalSize: '',
      terminalSizes: [],
      terminalWiringType: ''
    });
    setResults(null);
    setIsEditingTransformerSize(false);
    setManualTransformerSize('');
    setCustomerCode('');
    setChargerInstallationType('stand-alone');
    setChargerTypeMode('same');
    setMultiChargers([]);
    // ล้างแค่ sessionStorage (ไม่ลบข้อมูลที่บันทึกไว้ใน localStorage)
    sessionStorage.removeItem('loaded_from_history');
    // ไม่ลบข้อมูลที่บันทึกไว้ใน localStorage (เก็บไว้ถาวร)
    console.log('✅ Form reset (ข้อมูลที่บันทึกไว้ยังคงอยู่)');
  }

  // Charger options สำหรับ Stand-alone
  const standAloneChargerOptions = [
    '30 kW', '40 kW', '60 kW', '80 kW', '120 kW', '160 kW', '180 kW', '200 kW',
    '240 kW', '320 kW', '480 kW', '600 kW', '600 kW Prime+',
    '640 kW Prime+', '720 kW Prime+', '800 kW Prime+'
  ]

  // Charger options สำหรับ Group Charger
  const groupChargerOptions = [
    '240 kW', '280 kW', '320 kW', '360 kW', '400 kW', '440 kW', '480 kW', '520 kW', '560 kW',
    '600 kW', '640 kW', '680 kW', '720 kW', '760 kW', '800 kW', '840 kW', '880 kW',
    '920 kW', '960 kW', '1000 kW'
  ]

  // Charger options ที่ใช้ (เปลี่ยนตาม installation type)
  const chargerOptions = chargerInstallationType === 'group' ? groupChargerOptions : standAloneChargerOptions;

  // Number of chargers options
  const numberOfChargersOptions = Array.from({ length: 12 }, (_, i) => (i + 1).toString())

  // TR wiring type options (เดิม - ใช้สำหรับ backward compatibility)
  const trWiringTypeOptions = [
    'ขนาดสายไฟ 3P 4W ร้อยท่อเดินในอากาศ กลุ่ม 2',
    'ขนาดสายไฟ 3P 4W ร้อยท่อฝังใต้ดิน กลุ่ม 5',
    'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา',
    'ขนาดสายไฟ 3P 4W ราง LADDER ไม่มีฝา'
  ]

  // TR to Land options
  const trToLandOptions = [
    'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ',
    'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน',
    'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา'
  ]

  // Land to MDB options
  const landToMdbOptions = [
    'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ',
    'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน',
    'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา'
  ]

  // กรณี มิเตอร์แรงต่ำ 400 A: ทั้ง TR to Land และ Land to MDB เลือกได้แค่ 2 แบบนี้
  const lowVoltageMeterWiringOptions = [
    'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ',
    'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน'
  ]

  // Charger wiring type options สำหรับ Stand-alone
  const standAloneChargerWiringTypeOptions = [
    'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ',
    'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน',
    'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา',
    'ขนาดสายไฟ 3P 4W ราง LADDER ไม่มีฝา'
  ]

  // การเดินสายไป Terminal (Group Charger) — TRAY ซ่อนไว้ก่อนเผื่ออนาคต
  const TERMINAL_WIRING_UNDERGROUND = 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน';
  // const TERMINAL_WIRING_TRAY = 'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา';
  const terminalWiringTypeOptions = [
    TERMINAL_WIRING_UNDERGROUND,
    // TERMINAL_WIRING_TRAY,
  ];

  // Charger wiring type options สำหรับ Group Charger (ไม่มี LADDER)
  const groupChargerWiringTypeOptions = [
    'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ',
    'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน',
    'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา'
  ]

  // Charger wiring type options ที่ใช้ (เปลี่ยนตาม installation type)
  const chargerWiringTypeOptions = chargerInstallationType === 'group'
    ? groupChargerWiringTypeOptions
    : standAloneChargerWiringTypeOptions;

  // คำนวณ kW สำหรับแสดง/จำกัดตัวเลือก TR to MDB (รวมก่อนกด Calculate)
  const formKwForTrMdb = chargerTypeMode === 'any'
    ? multiChargers.filter(name => name !== '').reduce((sum, chargerName) => sum + extractPowerValue(chargerName), 0)
    : (results?.kWAllCharger ?? (form.charger && form.numberOfChargers ? extractPowerValue(form.charger) * parseInt(String(form.numberOfChargers), 10) : 0));
  const isLowVoltageMeter400 = form.powerAuthority === 'MEA' && formKwForTrMdb > 0 && formKwForTrMdb <= 280;

  // ตัวเลือก TR to Land / Land to MDB: กรณี มิเตอร์แรงต่ำ 400 A จำกัดแค่ 2 แบบ
  const trToLandOptionsEffective = isLowVoltageMeter400 ? lowVoltageMeterWiringOptions : trToLandOptions;
  const landToMdbOptionsEffective = isLowVoltageMeter400 ? lowVoltageMeterWiringOptions : landToMdbOptions;

  // กรณีเปลี่ยนเป็น มิเตอร์แรงต่ำ 400 A ถ้าเลือกค่าที่ไม่อยู่ใน 2 ตัวเลือก ให้รีเซ็ตเป็นตัวเลือกแรก
  useEffect(() => {
    if (!isLowVoltageMeter400) return;
    const allowed = lowVoltageMeterWiringOptions;
    setForm(f => {
      const needTr = f.trToLand && !allowed.includes(f.trToLand);
      const needLand = f.landToMdb && !allowed.includes(f.landToMdb);
      if (!needTr && !needLand) return f;
      return {
        ...f,
        ...(needTr && { trToLand: allowed[0] ?? '' }),
        ...(needLand && { landToMdb: allowed[0] ?? '' }),
      };
    });
  }, [isLowVoltageMeter400]);

  // Terminal: บังคับใช้กลุ่ม 5 ฝังใต้ดิน (TRAY ปิดชั่วคราว)
  useEffect(() => {
    if (chargerInstallationType !== 'group' || !selectedTerminalSizes.some(Boolean)) return;
    if (form.terminalWiringType !== TERMINAL_WIRING_UNDERGROUND) {
      setForm((f) => ({ ...f, terminalWiringType: TERMINAL_WIRING_UNDERGROUND }));
    }
  }, [chargerInstallationType, selectedTerminalSizes, form.terminalWiringType]);

  const fetchExcelData = async () => {
    // Convert Google Sheets sharing URL to direct download URL
    const googleSheetsUrl = 'https://docs.google.com/spreadsheets/d/1yxZvBr0O9ZzFpQCgBeZIcQrKGq_x2wQz/edit?usp=sharing&ouid=111737986991833013743&rtpof=true&sd=true';
    const fileId = googleSheetsUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
    const excelFileUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx&usp=sharing&t=${Date.now()}`;

    console.log('🔄 กำลังโหลดข้อมูลจาก Google Sheets...');
    console.log('📄 Google Sheets URL:', googleSheetsUrl);
    console.log('📥 Excel File URL:', excelFileUrl);
    console.log('🆔 File ID:', fileId);

    try {
      const response = await axios.get(excelFileUrl, {
        responseType: 'arraybuffer',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache'
        }
      });
      console.log('✅ ดาวน์โหลดข้อมูลสำเร็จ, ขนาด:', response.data.byteLength, 'bytes');

      const workbook = XLSX.read(response.data, { type: 'array' });
      console.log('📊 จำนวน Sheets ทั้งหมด:', workbook.SheetNames.length);
      console.log('📋 รายชื่อ Sheets:', workbook.SheetNames);

      // อ่านทุก Sheet และเก็บไว้
      const allSheetsData: Record<string, any[]> = {};
      const sheetLoadSummary: {
        sheetName: string;
        rowCount: number;
        rowNumsSample: string;
      }[] = [];

      console.group('📚 สรุปการอ่าน Excel Sheets');
      workbook.SheetNames.forEach(sheetName => {
        const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as any[];
        allSheetsData[sheetName] = sheetData;

        const rowNums = sheetData
          .map((r) => r.__rowNum__)
          .filter((n): n is number => typeof n === 'number')
          .sort((a, b) => a - b);
        const rowNumsSample =
          rowNums.length === 0
            ? '-'
            : rowNums.length <= 8
              ? rowNums.join(', ')
              : `${rowNums.slice(0, 4).join(', ')} … ${rowNums.slice(-4).join(', ')} (${rowNums.length} แถวมี __rowNum__)`;

        sheetLoadSummary.push({
          sheetName,
          rowCount: sheetData.length,
          rowNumsSample,
        });
        console.log(`✅ "${sheetName}" → ${sheetData.length} แถว`);
      });

      console.table(sheetLoadSummary);
      console.log(
        '📋 รายชื่อ Sheet ทั้งหมด:',
        workbook.SheetNames.map((name, i) => `${i + 1}. ${name}`).join(' | ')
      );

      const terminalSheets = ['แบบ 9.5', 'แบบ 9.12', 'แบบ 9.15'];
      const terminalCheck = terminalSheets.map((name) => {
        const rows = allSheetsData[name] || [];
        const has = rows.length > 0;
        return {
          sheet: name,
          loaded: has ? '✓' : '✗',
          rows: rows.length,
          row27: rows.find((r: any) => r.__rowNum__ === 27) ? '✓' : '-',
          row25: rows.find((r: any) => r.__rowNum__ === 25) ? '✓' : '-',
        };
      });
      console.log('🔌 Terminal wiring sheets (เช็คแถวสำคัญ):');
      console.table(terminalCheck);

      console.groupEnd();

      // ข้อมูลทั้งหมดทุก Sheet (ขยายดูใน Console ได้)
      console.log('📄 ข้อมูลทั้งหมดทุก Sheet (object):', allSheetsData);
      console.group('📄 ข้อมูลทั้งหมดทุก Sheet (แยกตามชื่อ)');
      workbook.SheetNames.forEach((sheetName) => {
        const rows = allSheetsData[sheetName] || [];
        console.groupCollapsed(`"${sheetName}" — ${rows.length} แถว`);
        console.log(rows);
        console.groupEnd();
      });
      console.groupEnd();

      // เก็บไว้เช็คใน DevTools: window.__excelSheets / window.__excelSheetNames
      if (typeof window !== 'undefined') {
        (window as any).__excelSheets = allSheetsData;
        (window as any).__excelSheetNames = workbook.SheetNames;
        (window as any).__excelSheetSummary = sheetLoadSummary;
      }

      // ระบุชื่อ Sheet โดยตรงเพื่อป้องกันการอ่านผิดเมื่อมี Sheet2
      // ลองหา Sheet1 ก่อน ถ้าไม่มีก็ใช้ Sheet แรก
      const targetSheetName = workbook.SheetNames.find(name =>
        name.toLowerCase() === 'sheet1' || name === 'Sheet1'
      ) || workbook.SheetNames[0];

      console.log('📝 Sheet ที่ใช้สำหรับการคำนวณ (Sheet1):', targetSheetName);

      // เก็บข้อมูลทุก Sheet
      setExcelSheets(allSheetsData);
      // เก็บข้อมูล Sheet1 สำหรับการคำนวณ (backward compatibility)
      const sheet1Data = allSheetsData[targetSheetName] || [];
      setExcelData(sheet1Data);

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
        let rowNum: number | undefined;

        // ตรวจสอบว่าเป็น Group Charger หรือ Stand-alone
        if (chargerInstallationType === 'group') {
          const groupCell = groupChargerToExcelCell[chargerName];
          if (!groupCell) return { name: chargerName, in: 0 };
          rowNum = groupCell.rowNum;
        } else {
        const cell = chargerToExcelCell[chargerName];
        if (!cell) return { name: chargerName, in: 0 };
        if (form.powerAuthority === 'MEA' && cell.mea) {
          rowNum = parseInt(cell.mea.replace('C', ''));
        }
        if (form.powerAuthority === 'PEA' && cell.pea) {
          rowNum = parseInt(cell.pea.replace('C', ''));
        }
        }

        if (rowNum === undefined) return { name: chargerName, in: 0 };
        const row = excelData.find((r) => r.__rowNum__ === rowNum);
        if (!row) return { name: chargerName, in: 0 };

        let value: any;

        // สำหรับ Group Charger: ใช้ __EMPTY_21 (MEA) หรือ __EMPTY_96 (PEA)
        if (chargerInstallationType === 'group') {
          const groupCell = groupChargerToExcelCell[chargerName];
          if (!groupCell) return { name: chargerName, in: 0 };

          const colKey = form.powerAuthority === 'MEA' ? groupCell.mea : groupCell.pea;
          if (!colKey) return { name: chargerName, in: 0 };

          value = (row as any)[colKey];
          console.log(`[getMultiChargersIn] Group Charger - Charger: ${chargerName}, Row ${rowNum}, Column ${colKey}, Value: ${value}`);
        } else {
          // สำหรับ Stand-alone: ใช้คอลัมน์ MEA. 24kV/416/240V: สำหรับทั้ง MEA และ PEA
        const colKey = 'MEA. 24kV/416/240V:';
          value = (row as any)[colKey];

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

  // ฟังก์ชันดึง TR to Land Wire Conduit
  const getTRToLandWireConduit = () => {
    const trWiringRowNum = getTRWiringSizeCVsRowNumber();
    if (!trWiringRowNum) return '';

    const trRow = excelData.find(r => r.__rowNum__ === trWiringRowNum);
    if (!trRow) return '';

    // Mapping TR to Land Wiring Type to columns and units
    const wiringTypeToColsAndUnit: Record<string, { cols: string[]; unit: string }> = {
      'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ': {
        cols: ['__EMPTY_26', '__EMPTY_27', '__EMPTY_28'],
        unit: 'นิ้ว'
      },
      'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน': {
        cols: ['__EMPTY_47', '__EMPTY_48', '__EMPTY_49'],
        unit: 'มม.'
      },
      'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา': {
        cols: ['__EMPTY_68'],
        unit: 'ซม.'
      },
    };

    const config = wiringTypeToColsAndUnit[form.trToLand];
    if (!config) return '';

    const values = config.cols.map(col => trRow[col]).filter(Boolean).join(' ');
    if (!values) return '';
    return `${values} ${config.unit}`;
  };

  // ฟังก์ชันดึง Land to MDB Wire Conduit
  const getLandToMdbWireConduit = () => {
    const trWiringRowNum = getTRWiringSizeCVsRowNumber();
    if (!trWiringRowNum) return '';

    const trRow = excelData.find(r => r.__rowNum__ === trWiringRowNum);
    if (!trRow) return '';

    // Mapping Land to MDB Wiring Type to columns and units
    const wiringTypeToColsAndUnit: Record<string, { cols: string[]; unit: string }> = {
      'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ': {
        cols: ['__EMPTY_26', '__EMPTY_27', '__EMPTY_28'],
        unit: 'นิ้ว'
      },
      'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน': {
        cols: ['__EMPTY_47', '__EMPTY_48', '__EMPTY_49'],
        unit: 'มม.'
      },
      'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา': {
        cols: ['__EMPTY_68'],
        unit: 'ซม.'
      },
    };

    const config = wiringTypeToColsAndUnit[form.landToMdb];
    if (!config) return '';

    const values = config.cols.map(col => trRow[col]).filter(Boolean).join(' ');
    if (!values) return '';
    return `${values} ${config.unit}`;
  };

  // เพิ่มฟังก์ชันดึง TR Wire conduit ตาม Power Authority และ TR Wiring Type (backward compatibility)
  const getTRWireConduit = () => {
    // ถ้ามี trToLand หรือ landToMdb ให้ใช้ค่าใหม่
    if (form.trToLand) {
      return getTRToLandWireConduit();
    }
    if (form.landToMdb) {
      return getLandToMdbWireConduit();
    }

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

  // ฟังก์ชันดึง TR to Land Wiring Size CVs
  const getTRToLandWiringSizeCVs = () => {
    // Mapping TR to Land Wiring Type to columns
    const wiringTypeToCols: Record<string, string[]> = {
      'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ': [
        '__EMPTY_11', '__EMPTY_12', '__EMPTY_13', '__EMPTY_14', '__EMPTY_15', '__EMPTY_16', '__EMPTY_17', '__EMPTY_18', '__EMPTY_19'
      ], // __EMPTY_11 to __EMPTY_19
      'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน': [
        '__EMPTY_30', '__EMPTY_31', '__EMPTY_32', '__EMPTY_33', '__EMPTY_34', '__EMPTY_35', '__EMPTY_36', '__EMPTY_37', '__EMPTY_38', '__EMPTY_39'
      ], // __EMPTY_30 to __EMPTY_39
      'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา': [
        '__EMPTY_51', '__EMPTY_52', '__EMPTY_53', '__EMPTY_54', '__EMPTY_55', '__EMPTY_56', '__EMPTY_57', '__EMPTY_58', '__EMPTY_59', '__EMPTY_60'
      ], // __EMPTY_51 to __EMPTY_60
    };

    const cols = wiringTypeToCols[form.trToLand];
    if (!cols) return '';

    const trRowNum = getTRWiringSizeCVsRowNumber();
    if (!trRowNum) return '';

    const trRow = excelData.find(r => r.__rowNum__ === trRowNum);
    if (!trRow) return '';

    // ดึงค่าทุกคอลัมน์มาต่อกัน (เว้นวรรค)
    let value = cols.map(col => {
      const val = trRow[col];
      return val;
    }).filter(Boolean).join(' ');

    // เพิ่ม " )" ต่อท้ายสำหรับ "ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ"
    if (form.trToLand === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ' && value) {
      value = value + ' )';
    }

    return value;
  };

  // ฟังก์ชันดึง Land to MDB Wiring Size CVs
  const getLandToMdbWiringSizeCVs = () => {
    // Mapping Land to MDB Wiring Type to columns
    const wiringTypeToCols: Record<string, string[]> = {
      'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ': [
        '__EMPTY_11', '__EMPTY_12', '__EMPTY_13', '__EMPTY_14', '__EMPTY_15', '__EMPTY_16', '__EMPTY_17', '__EMPTY_18', '__EMPTY_19'
      ], // __EMPTY_11 to __EMPTY_19
      'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน': [
        '__EMPTY_30', '__EMPTY_31', '__EMPTY_32', '__EMPTY_33', '__EMPTY_34', '__EMPTY_35', '__EMPTY_36', '__EMPTY_37', '__EMPTY_38', '__EMPTY_39'
      ], // __EMPTY_30 to __EMPTY_39
      'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา': [
        '__EMPTY_51', '__EMPTY_52', '__EMPTY_53', '__EMPTY_54', '__EMPTY_55', '__EMPTY_56', '__EMPTY_57', '__EMPTY_58', '__EMPTY_59', '__EMPTY_60'
      ], // __EMPTY_51 to __EMPTY_60
    };

    const cols = wiringTypeToCols[form.landToMdb];
    if (!cols) return '';

    const trRowNum = getTRWiringSizeCVsRowNumber();
    if (!trRowNum) return '';

    const trRow = excelData.find(r => r.__rowNum__ === trRowNum);
    if (!trRow) return '';

    // ดึงค่าทุกคอลัมน์มาต่อกัน (เว้นวรรค)
    let value = cols.map(col => {
      const val = trRow[col];
      return val;
    }).filter(Boolean).join(' ');

    // เพิ่ม " )" ต่อท้ายสำหรับ "ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ"
    if (form.landToMdb === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ' && value) {
      value = value + ' )';
    }

    return value;
  };

  // เพิ่มฟังก์ชันดึง TR Wiring Size (CV) แยกแต่ละ Charger (backward compatibility - ใช้ trWiringType เดิม)
  const getTRWiringSizeCVs = () => {
    // ถ้ามี trToLand หรือ landToMdb ให้ใช้ค่าใหม่
    if (form.trToLand || form.landToMdb) {
      // ถ้ามีทั้งสองค่า ให้คืนค่า Land to MDB (เพราะใช้ row เดียวกัน)
      if (form.landToMdb) {
        return [getLandToMdbWiringSizeCVs()];
      }
      if (form.trToLand) {
        return [getTRToLandWiringSizeCVs()];
      }
    }

    // Mapping TR Wiring Type to columns (backward compatibility)
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
    const selectedTransformerLabel = getSelectedTransformerLabel(getCurrentKWAllCharger());
    const selectedRow = getTransformerRowByLabel(selectedTransformerLabel);
    if (selectedRow) {
      console.log(`TR Wiring Size CVs Row Number Debug (selected transformer): ${selectedRow}`);
      return selectedRow;
    }

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

  // ฟังก์ชันดึง row number ของ "ขนาดหม้อแปลงที่เลือก" (ใช้เป็นฐานสำหรับ MCCB Main AT/AF)
  const getSelectedTransformerRowNumber = (): number | undefined => {
    const label = getSelectedTransformerLabel(getCurrentKWAllCharger());
    return getTransformerRowByLabel(label);
  };

  // เพิ่มฟังก์ชันดึง Charger Wiring cable ตาม Power Authority และ Charger Wiring Type
  // รองรับการเลือกหลายประเภท (array)
  const getChargerWiringCable = () => {
    // ถ้าไม่มีประเภทที่เลือก ให้ return empty
    if (!form.chargerWiringType || form.chargerWiringType.length === 0) return '';

    // Mapping Charger Wiring Type to columns
    // สำหรับ Group Charger ใช้คอลัมน์ที่แตกต่างกัน
    const wiringTypeToCols: Record<string, string[]> = chargerInstallationType === 'group'
      ? {
        'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ': [
          '__EMPTY_26', '__EMPTY_27', '__EMPTY_28', '__EMPTY_29', '__EMPTY_30', '__EMPTY_31', '__EMPTY_32', '__EMPTY_33', '__EMPTY_34', '__EMPTY_35', '__EMPTY_36', '__EMPTY_37'
        ], // __EMPTY_26 to __EMPTY_37
        'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน': [
          '__EMPTY_49', '__EMPTY_50', '__EMPTY_51', '__EMPTY_52', '__EMPTY_53', '__EMPTY_54', '__EMPTY_55', '__EMPTY_56', '__EMPTY_57', '__EMPTY_58', '__EMPTY_59', '__EMPTY_60'
        ], // __EMPTY_49 to __EMPTY_60
        'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา': [
          '__EMPTY_74', '__EMPTY_75', '__EMPTY_76', '__EMPTY_77', '__EMPTY_78', '__EMPTY_79', '__EMPTY_80', '__EMPTY_81', '__EMPTY_82', '__EMPTY_83', '__EMPTY_84', '__EMPTY_85'
        ], // __EMPTY_74 to __EMPTY_85
      }
      : form.powerAuthority === 'MEA'
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

    // วน loop ผ่านทุกประเภทที่เลือก
    const selectedTypes = Array.isArray(form.chargerWiringType) ? form.chargerWiringType : [form.chargerWiringType];

    // ถ้าไม่มีประเภทที่เลือก ให้ return empty
    if (selectedTypes.length === 0) return '';

    // ฟังก์ชันช่วยในการดึงค่าจากแต่ละประเภท
    const getCableForType = (wiringType: string, chargerName: string, chargerIdx: number): string => {
      const cols = wiringTypeToCols[wiringType];
    if (!cols) return '';

          let rowNum: number | undefined;

      if (chargerInstallationType === 'group') {
        const groupCell = groupChargerToExcelCell[chargerName];
        if (!groupCell) return '';
        rowNum = groupCell.rowNum;
      } else {
        const cell = chargerToExcelCell[chargerName];
          if (form.powerAuthority === 'MEA' && cell?.mea) {
            rowNum = parseInt(cell.mea.replace('C', ''));
          }
          if (form.powerAuthority === 'PEA' && cell?.pea) {
            rowNum = parseInt(cell.pea.replace('C', ''));
          }
      }

      if (!rowNum) return '';
          const row = excelData.find(r => r.__rowNum__ === rowNum);
      if (!row) return '';
          const value = cols.map(col => row[col]).filter(Boolean).join(' ');
      return value;
    };

    // หา row ของแต่ละ In of charger (แต่ละเครื่อง)
    if (chargerTypeMode === 'any') {
      return multiChargers
        .filter(name => name !== '')
        .map((chargerName, idx) => {
          // วน loop ผ่านทุกประเภทที่เลือกและรวมผลลัพธ์
          const values = selectedTypes
            .map(wiringType => getCableForType(wiringType, chargerName, idx))
            .filter(Boolean);

          if (values.length === 0) return `Charger${idx + 1}: -`;

          // ถ้ามีหลายประเภท ให้แสดงแยกกัน
          if (values.length > 1) {
            return `Charger${idx + 1}: ${values.map((v, i) => `${selectedTypes[i]}: ${v}`).join(' | ')}`;
          }

          return `Charger${idx + 1}: ${values[0]}`;
        });
    } else {
      // Same kW: ทุกเครื่องใช้ row เดียวกัน
      let rowNum: number | undefined;

      if (chargerInstallationType === 'group') {
        const groupCell = groupChargerToExcelCell[form.charger];
        if (!groupCell) return [];
        rowNum = groupCell.rowNum;
      } else {
        const cell = chargerToExcelCell[form.charger];
      if (form.powerAuthority === 'MEA' && cell?.mea) {
        rowNum = parseInt(cell.mea.replace('C', ''));
      }
      if (form.powerAuthority === 'PEA' && cell?.pea) {
        rowNum = parseInt(cell.pea.replace('C', ''));
      }
      }

      if (!rowNum) return [];
      const row = excelData.find(r => r.__rowNum__ === rowNum);
      if (!row) return [];

      // วน loop ผ่านทุกประเภทที่เลือกและรวมผลลัพธ์
      const allValues = selectedTypes
        .map(wiringType => {
          const cols = wiringTypeToCols[wiringType];
          if (!cols) return '';
      const value = cols.map(col => row[col]).filter(Boolean).join(' ');
          return value;
        })
        .filter(Boolean);

      if (allValues.length === 0) return [];

      const numChargers = parseInt(form.numberOfChargers) || 1;

      // ถ้ามีหลายประเภท ให้แสดงแยกกัน
      if (allValues.length > 1) {
        const combinedValue = allValues.map((v, i) => `${selectedTypes[i]}: ${v}`).join(' | ');
        return Array(numChargers).fill(`Charger1: ${combinedValue}`).map((v, i) =>
          `Charger${i + 1}: ${combinedValue}`
        );
      }

      return Array(numChargers).fill(`Charger1: ${allValues[0]}`).map((v, i) =>
        `Charger${i + 1}: ${allValues[0]}`
      );
    }
  };

  // ฟังก์ชันดึง Charger Wire conduit ตาม Power Authority และ Charger Wiring Type
  // รองรับการเลือกหลายประเภท (array)
  const getChargerWireConduit = () => {
    // ถ้าไม่มีประเภทที่เลือก ให้ return null
    if (!form.chargerWiringType || form.chargerWiringType.length === 0) return null;

    // วน loop ผ่านทุกประเภทที่เลือก
    const selectedTypes = Array.isArray(form.chargerWiringType) ? form.chargerWiringType : [form.chargerWiringType];

    // Helper function สำหรับดึงค่า conduit สำหรับแต่ละประเภท
    // return string เดียว (ไม่ใช่ array) เพราะจะรวมผลลัพธ์ภายนอก
    const getConduitForType = (wiringType: string, chargerName: string, chargerIdx: number): string => {
              let rowNum: number | undefined;

      // หา row number
      if (chargerInstallationType === 'group') {
        const groupCell = groupChargerToExcelCell[chargerName];
        if (!groupCell) return '';
        rowNum = groupCell.rowNum;
        } else {
        const cell = chargerToExcelCell[chargerName];
        if (form.powerAuthority === 'MEA' && cell?.mea) {
          rowNum = parseInt(cell.mea.replace('C', ''));
        }
        if (form.powerAuthority === 'PEA' && cell?.pea) {
          rowNum = parseInt(cell.pea.replace('C', ''));
        }
      }

      if (!rowNum) return '';
          const row = excelData.find(r => r.__rowNum__ === rowNum);
      if (!row) return '';

      // เงื่อนไข MEA
      if (form.powerAuthority === 'MEA') {
        if (wiringType === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ') {
          // Fields: __EMPTY_43 to __EMPTY_47 (สำหรับ Group Charger)
          // Fields: __EMPTY_44 to __EMPTY_49 (สำหรับ Stand-alone)
          const cols = chargerInstallationType === 'group'
            ? ['__EMPTY_43', '__EMPTY_44', '__EMPTY_45', '__EMPTY_46', '__EMPTY_47']
            : ['__EMPTY_44', '__EMPTY_45', '__EMPTY_46', '__EMPTY_47', '__EMPTY_48', '__EMPTY_49'];
          const value = cols.map(col => row[col]).filter(Boolean).join(' ');
          return value ? `${value} นิ้ว` : '';
        }
        if (wiringType === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน') {
        // Fields: __EMPTY_68 to __EMPTY_73
        const cols = ['__EMPTY_68', '__EMPTY_69', '__EMPTY_70', '__EMPTY_71', '__EMPTY_72', '__EMPTY_73'];
              const value = cols.map(col => row[col]).filter(Boolean).join(' ');
          return value ? `${value} มม.` : '';
        }
        if (wiringType === 'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา') {
        // Field: __EMPTY_92
        const col = '__EMPTY_92';
              const value = row[col];
          return value ? `${value} ซม.` : '';
        }
        if (wiringType === 'ขนาดสายไฟ 3P 4W ราง LADDER ไม่มีฝา') {
        // Field: __EMPTY_116
        const col = '__EMPTY_116';
              const value = row[col];
          return value ? `${value} ซม.` : '';
      }
    }
    // เงื่อนไข PEA
    if (form.powerAuthority === 'PEA') {
        if (wiringType === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ') {
          // Fields: __EMPTY_43 to __EMPTY_47 (สำหรับ Group Charger)
          // Fields: __EMPTY_42 to __EMPTY_47 (สำหรับ Stand-alone)
          const cols = chargerInstallationType === 'group'
            ? ['__EMPTY_43', '__EMPTY_44', '__EMPTY_45', '__EMPTY_46', '__EMPTY_47']
            : ['__EMPTY_42', '__EMPTY_43', '__EMPTY_44', '__EMPTY_45', '__EMPTY_46', '__EMPTY_47'];
              const value = cols.map(col => row[col]).filter(Boolean).join(' ');
          return value ? `${value} นิ้ว` : '';
        }
        if (wiringType === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน') {
        // Fields: __EMPTY_66 to __EMPTY_71
        const cols = ['__EMPTY_66', '__EMPTY_67', '__EMPTY_68', '__EMPTY_69', '__EMPTY_70', '__EMPTY_71'];
              const value = cols.map(col => row[col]).filter(Boolean).join(' ');
          return value ? `${value} มม.` : '';
        }
        if (wiringType === 'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา') {
        // Field: __EMPTY_90
        const col = '__EMPTY_90';
              const value = row[col];
          return value ? `${value} ซม.` : '';
        }
        if (wiringType === 'ขนาดสายไฟ 3P 4W ราง LADDER ไม่มีฝา') {
        // Field: __EMPTY_114
        const col = '__EMPTY_114';
          const value = row[col];
          return value ? `${value} ซม.` : '';
        }
      }

      return '';
    };

    // วน loop ผ่านทุกประเภทที่เลือกและรวมผลลัพธ์
        if (chargerTypeMode === 'any') {
          return multiChargers
            .filter(name => name !== '')
            .map((chargerName, idx) => {
          const values = selectedTypes
            .map(wiringType => getConduitForType(wiringType, chargerName, idx))
            .filter(Boolean);

          if (values.length === 0) return `Charger${idx + 1}: -`;

          // ถ้ามีหลายประเภท ให้แสดงแยกกัน
          if (values.length > 1) {
            return `Charger${idx + 1}: ${values.map((v, i) => `${selectedTypes[i]}: ${v}`).join(' | ')}`;
          }

          return `Charger${idx + 1}: ${values[0]}`;
            });
        } else {
      // Same kW: ทุกเครื่องใช้ row เดียวกัน
          let rowNum: number | undefined;

      if (chargerInstallationType === 'group') {
        const groupCell = groupChargerToExcelCell[form.charger];
        if (!groupCell) return [];
        rowNum = groupCell.rowNum;
      } else {
        const cell = chargerToExcelCell[form.charger];
        if (form.powerAuthority === 'MEA' && cell?.mea) {
          rowNum = parseInt(cell.mea.replace('C', ''));
        }
        if (form.powerAuthority === 'PEA' && cell?.pea) {
          rowNum = parseInt(cell.pea.replace('C', ''));
        }
      }

          if (!rowNum) return [];
          const row = excelData.find(r => r.__rowNum__ === rowNum);
          if (!row) return [];

      // วน loop ผ่านทุกประเภทที่เลือกและรวมผลลัพธ์
      const allValues = selectedTypes
        .map(wiringType => getConduitForType(wiringType, form.charger, 0))
        .filter(Boolean);

      if (allValues.length === 0) return [];

          const numChargers = parseInt(form.numberOfChargers) || 1;

      // ถ้ามีหลายประเภท ให้แสดงแยกกัน
      if (allValues.length > 1) {
        const combinedValue = allValues.map((v, i) => `${selectedTypes[i]}: ${v}`).join(' | ');
        return Array(numChargers).fill(`Charger1: ${combinedValue}`).map((v, i) =>
          `Charger${i + 1}: ${combinedValue}`
        );
      }

      return Array(numChargers).fill(`Charger1: ${allValues[0]}`).map((v, i) =>
        `Charger${i + 1}: ${allValues[0]}`
      );
    }
  };

  // เพิ่มฟังก์ชันสำหรับเปลี่ยน label
  function getTrWireLabel(trWiringType: string) {
    if (trWiringType === 'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา') return 'TR Wire tray :';
    if (trWiringType === 'ขนาดสายไฟ 3P 4W ราง LADDER ไม่มีฝา') return 'TR Wire ladder :';
    return 'TR Wire conduit :';
  }

  // Sheet + แถวสำหรับ Terminal wiring ตามประเภทสายและขนาด Terminal
  const resolveTerminalSheetRow = (
    wiringType: string,
    terminalSize: string
  ): { sheetName: string; rowNum: number } | null => {
    if (wiringType === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน') {
      if (terminalSize === '350A' || terminalSize === '380A') {
        return { sheetName: 'แบบ 9.5', rowNum: 27 };
      }
      if (terminalSize === '500A' || terminalSize === '600A') {
        return { sheetName: 'แบบ 9.12', rowNum: 25 };
      }
      return null;
    }
    if (wiringType === 'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา') {
      const trayRowBySize: Record<string, number> = {
        '350A': 12,
        '380A': 12,
        '500A': 17,
        '600A': 18,
      };
      const rowNum = trayRowBySize[terminalSize];
      if (!rowNum) return null;
      return { sheetName: 'แบบ 9.15', rowNum };
    }
    return null;
  };

  // ฟังก์ชันดึงข้อมูล Terminal wiring จาก Excel
  const getTerminalWiringData = (terminalSizeValue?: string) => {
    const resolvedTerminalSize = terminalSizeValue || selectedTerminalSizes[0] || '';
    if (!resolvedTerminalSize || !form.terminalWiringType) return null;

    const sheetRow = resolveTerminalSheetRow(form.terminalWiringType, resolvedTerminalSize);
    if (!sheetRow) return null;

    const { sheetName, rowNum } = sheetRow;
    const sheet = excelSheets[sheetName];
    if (!sheet || sheet.length === 0) return null;

    const row = sheet.find((r: any) => r.__rowNum__ === rowNum);
    if (!row) {
      console.log(`[getTerminalWiringData] Row ${rowNum} not found in sheet ${sheetName}`);
      return null;
    }

    console.log(`[getTerminalWiringData] Found row ${rowNum} in sheet ${sheetName}:`, row);

    // ดึงข้อมูล Cable จาก __EMPTY_1 ถึง __EMPTY_12
    const cableCols = ['__EMPTY_1', '__EMPTY_2', '__EMPTY_3', '__EMPTY_4', '__EMPTY_5', '__EMPTY_6', '__EMPTY_7', '__EMPTY_8', '__EMPTY_9', '__EMPTY_10', '__EMPTY_11', '__EMPTY_12'];
    const cableValues = cableCols.map(col => row[col]).filter(Boolean);
    const cableString = cableValues.join(' ');
    console.log(`[getTerminalWiringData] Cable values:`, cableValues, '→', cableString);

    // ดึงข้อมูล Conduit/Tray
    let conduitTrayValue = '';
    if (form.terminalWiringType === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน') {
      const conduitCols = ['__EMPTY_13', '__EMPTY_14', '__EMPTY_15', '__EMPTY_16'];
      const conduitValues = conduitCols.map(col => row[col]).filter(Boolean);
      conduitTrayValue = conduitValues.length > 0 ? `${conduitValues.join(' ')} มม.` : '';
      console.log(`[getTerminalWiringData] Conduit values:`, conduitValues, '→', conduitTrayValue);
    } else if (form.terminalWiringType === 'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา') {
      // ดึงจาก __EMPTY_14 (1 คอลัมน์)
      const trayValue = row['__EMPTY_14'];
      conduitTrayValue = trayValue ? `${trayValue} ซม.` : '';
      console.log(`[getTerminalWiringData] Tray value (__EMPTY_14):`, trayValue, '→', conduitTrayValue);
    }

    const result = {
      sheetName,
      rowNum,
      cable: cableString,
      conduitTray: conduitTrayValue
    };
    console.log(`[getTerminalWiringData] Final result:`, result);
    return result;
  };

  navigateToStationAccessoryRef.current = () => {
    try {
      console.log('=== Navigate to StationAccessory ===');
      console.log('Form:', form);
      console.log('Charger Type Mode:', chargerTypeMode);
      console.log('Multi Chargers:', multiChargers);

      // Save current form data before navigation
      const currentData = {
        customerCode: customerCode,
        form,
        chargerInstallationType,
        chargerTypeMode,
        multiChargers
      };
      localStorage.setItem('ev_calculator_form_data', JSON.stringify(currentData));

      // ส่งข้อมูลที่ต้องการไปหน้า StationAccessory
      const terminalWiringDetails = selectedTerminalSizes
        .map((size, idx) => {
          const detail = getTerminalWiringData(size);
          return {
            terminalIndex: idx,
            terminalSize: size,
            cable: detail?.cable || '',
            conduitTray: detail?.conduitTray || '',
          };
        })
        .filter((item) => item.terminalSize);

      const navigationState = {
        customerCode: customerCode,
        powerAuthority: form.powerAuthority,
        numberOfChargers: form.numberOfChargers,
        chargerInstallationType: chargerInstallationType,
        chargerTypeMode: chargerTypeMode,
        multiChargers: multiChargers,
        charger: chargerTypeMode === 'any' ? '' : form.charger,
        transformer: (() => {
          return getSelectedTransformerLabel(getCurrentKWAllCharger());
        })(),
        trWiringType: form.trWiringType,
        trToLand: form.trToLand,
        landToMdb: form.landToMdb,
        numberOfTerminals: form.numberOfTerminals || '',
        terminalSize: selectedTerminalSizes.filter(Boolean).join(', ') || form.terminalSize || '',
        terminalSizes: selectedTerminalSizes.filter(Boolean),
        terminalWiringType: form.terminalWiringType || '',
        terminalWiringDetails: terminalWiringDetails,
        terminalWireConduit: (() => {
          const terminalData = getTerminalWiringData();
          return terminalData?.conduitTray || '';
        })(),
        trWiringSize: form.landToMdb ? getLandToMdbWiringSizeCVs() : (form.trToLand ? getTRToLandWiringSizeCVs() : (getTRWiringSizeCVs()[0] || '')),
        trWireConduit: form.landToMdb ? getLandToMdbWireConduit() : (form.trToLand ? getTRToLandWireConduit() : (getTRWireConduit() || '')),
        // Legacy MDB summary for backward compatibility
        mdb: (() => {
          // ใช้ row number เดียวกับขนาดหม้อแปลงที่เลือก
          const trRowNum = getSelectedTransformerRowNumber();
          const trRow = excelData.find(r => r.__rowNum__ === trRowNum);
          const mccbMain = trRow ? trRow.__EMPTY_7 : '-';
          console.log(`MDB (MCCB Main) Debug - Using TR Row ${trRowNum}:`, trRow);
          console.log(`MCCB Main value (__EMPTY_7): ${mccbMain}`);
          return mccbMain ? `${mccbMain} A` : '-';
        })(),
        // New detailed MDB fields
        mdbMainAt: (() => {
          // AT: __EMPTY_7, row เดียวกับขนาดหม้อแปลงที่เลือก
          const trRowNum = getSelectedTransformerRowNumber();
          const trRow = excelData.find(r => r.__rowNum__ === trRowNum);
          const mccbMain = trRow ? trRow.__EMPTY_7 : '';
          console.log(`MDB Main AT Debug - Using TR Row ${trRowNum}:`, trRow);
          console.log(`MCCB Main AT value (__EMPTY_7): ${mccbMain}`);
          return mccbMain ? `${mccbMain} A` : '';
        })(),
        mdbMainAf: (() => {
          // AF: __EMPTY_10, row เดียวกับขนาดหม้อแปลงที่เลือก
          const trRowNum = getSelectedTransformerRowNumber();
          const trRow = excelData.find(r => r.__rowNum__ === trRowNum);
          const main2 = trRow ? trRow.__EMPTY_10 : '';
          return main2 ? `${main2} A` : '';
        })(),
        mdbSubs: (() => {
          // สำหรับ Group Charger: อ่านจาก __EMPTY_22 ถึง __EMPTY_24
          // สำหรับ Stand-alone: MEA: ใช้ __EMPTY_23, __EMPTY_24, __EMPTY_24 | PEA: ใช้ MEA. กฟน. 416 V:, __EMPTY_22, __EMPTY_23
          const groupChargerColumns = ['__EMPTY_22', '__EMPTY_23', '__EMPTY_24'];
          const meaColumns = ['__EMPTY_23', '__EMPTY_24', '__EMPTY_24'];
          const peaColumns = ['MEA. กฟน. 416 V:', '__EMPTY_22', '__EMPTY_23'];
          const columns = chargerInstallationType === 'group'
            ? groupChargerColumns
            : (form.powerAuthority === 'MEA' ? meaColumns : peaColumns);

          console.log('=== MCCB Sub Debug ===');
          console.log('Charger Installation Type:', chargerInstallationType);
          console.log('Power Authority:', form.powerAuthority);
          console.log('Columns to read:', columns);
          console.log('Charger Type Mode:', chargerTypeMode);

          if (chargerTypeMode === 'any') {
            console.log('Multi Chargers:', multiChargers);
            return multiChargers.map((chargerName, index) => {
              let rowNum: number | undefined;

              if (chargerInstallationType === 'group') {
                const groupCell = groupChargerToExcelCell[chargerName];
                if (!groupCell) {
                  console.log(`[MCCB Sub ${index + 1}] Group charger cell not found!`);
                  return '-';
                }
                rowNum = groupCell.rowNum;
              } else {
                const cell = chargerToExcelCell[chargerName];
              if (form.powerAuthority === 'MEA' && cell?.mea) {
                rowNum = parseInt(cell.mea.replace('C', ''));
              }
              if (form.powerAuthority === 'PEA' && cell?.pea) {
                rowNum = parseInt(cell.pea.replace('C', ''));
                }
              }

              console.log(`[MCCB Sub ${index + 1}] Charger: ${chargerName}, Row: ${rowNum}`);

              const row = excelData.find(r => r.__rowNum__ === rowNum);
              if (!row) {
                console.log(`[MCCB Sub ${index + 1}] Row not found!`);
                return '-';
              }

              console.log(`[MCCB Sub ${index + 1}] Row data:`, row);

              // สำหรับ Group Charger: อ่าน __EMPTY_22 (จำนวนชุด) และ __EMPTY_24 (ค่า MCCB Sub)
              if (chargerInstallationType === 'group') {
                const numSets = (row as any)['__EMPTY_22'];
                const mccbValue = (row as any)['__EMPTY_24'];
                const mccbValueStr = mccbValue && mccbValue !== '-' ? `${mccbValue}A` : '-';
                const numSetsStr = numSets && numSets !== '-' ? `${numSets}ชุด` : '';
                const result = mccbValueStr !== '-' && numSetsStr
                  ? `${mccbValueStr} (${numSetsStr})`
                  : mccbValueStr;
                console.log(`[MCCB Sub ${index + 1}] Group Charger - Sets: ${numSets}, Value: ${mccbValue}, Result: ${result}`);
                return result;
              }

              // สำหรับ Stand-alone: อ่านค่าจากทั้ง 3 คอลัมน์และแสดงพร้อมกัน
              const values = columns.map(col => {
                let val = (row as any)[col];
                // สำหรับ Stand-alone PEA: ถ้าต้องการหา 'MEA. กฟน. 416 V:'
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
            let rowNum: number | undefined;

            if (chargerInstallationType === 'group') {
              const groupCell = groupChargerToExcelCell[form.charger];
              if (!groupCell) {
                console.log('Group charger cell not found!');
                return Array(parseInt(form.numberOfChargers) || 1).fill('-');
              }
              rowNum = groupCell.rowNum;
            } else {
              const cell = chargerToExcelCell[form.charger];
            if (form.powerAuthority === 'MEA' && cell?.mea) {
              rowNum = parseInt(cell.mea.replace('C', ''));
            }
            if (form.powerAuthority === 'PEA' && cell?.pea) {
              rowNum = parseInt(cell.pea.replace('C', ''));
              }
            }

            console.log('Charger:', form.charger, 'Row:', rowNum);

            const row = excelData.find(r => r.__rowNum__ === rowNum);
            if (!row) {
              console.log('Row not found!');
              return Array(parseInt(form.numberOfChargers) || 1).fill('-');
            }

            console.log('Row data:', row);

            // สำหรับ Group Charger: อ่าน __EMPTY_22 (จำนวนชุด) และ __EMPTY_24 (ค่า MCCB Sub)
            if (chargerInstallationType === 'group') {
              const numSets = (row as any)['__EMPTY_22'];
              const mccbValue = (row as any)['__EMPTY_24'];
              const mccbValueStr = mccbValue && mccbValue !== '-' ? `${mccbValue}A` : '-';
              const numSetsStr = numSets && numSets !== '-' ? `${numSets}ชุด` : '';
              const result = mccbValueStr !== '-' && numSetsStr
                ? `${mccbValueStr} (${numSetsStr})`
                : mccbValueStr;
              console.log(`Group Charger - Sets: ${numSets}, Value: ${mccbValue}, Result: ${result}`);
              const numChargers = parseInt(form.numberOfChargers) || 1;
              const finalArray = Array(numChargers).fill(result);
              console.log('Final array:', finalArray);
              return finalArray;
            }

            // สำหรับ Stand-alone: อ่านค่าจากทั้ง 3 คอลัมน์และแสดงพร้อมกัน (ทุก MCCB Sub แสดงเหมือนกัน)
            const values = columns.map(col => {
              let val = (row as any)[col];
              // สำหรับ Stand-alone PEA: ถ้าต้องการหา 'MEA. กฟน. 416 V:'
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
        chargerWiringType: form.chargerWiringType, // ส่งเป็น array
        chargerWiringCable: getChargerWiringCable(), // ฟังก์ชันจะ return array หรือ string ตามเงื่อนไข
        chargerWireConduit: getChargerWireConduit(), // ฟังก์ชันจะ return array หรือ string ตามเงื่อนไข
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

      try {
        sessionStorage.setItem(LAST_STATION_NAV_SESSION_KEY, JSON.stringify(navigationState));
      } catch {
        /* ignore quota */
      }

      // Navigate with state
      navigate('/station-accessory', {
        state: navigationState,
        replace: false
      });

      console.log('✅ Navigation called');
    } catch (error) {
      console.error('Error navigating to StationAccessory:', error);
      alert('เกิดข้อผิดพลาดในการเปลี่ยนหน้าฺ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 relative">
      <AlertDialog open={noCustomerCodeStationDialogOpen} onOpenChange={setNoCustomerCodeStationDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยังไม่ได้กรอกรหัสลูกค้า</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-left text-sm text-muted-foreground space-y-2">
                <p>กรุณาใส่รหัสลูกค้า (Customer Code)</p>
                <p>หากไม่ใส่รหัสลูกค้า คุณจะไม่สามารถบันทึกข้อมูลในหน้าถอดต้นทุนได้</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">กลับ</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={() => navigateToStationAccessoryRef.current()}
            >
              ไปหน้าถอดต้นทุน
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

                  {/* Charger Installation Type */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">
                      Charger Installation Type
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        className={`flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-blue-50 cursor-pointer ${chargerInstallationType === 'stand-alone' ? 'bg-blue-100 border-blue-300' : ''
                          }`}
                        onClick={() => {
                          setChargerInstallationType('stand-alone');
                          setForm(f => ({ ...f, charger: '', chargerWiringType: [] }));
                          setMultiChargers([]);
                        }}
                      >
                        <Checkbox
                          id="stand-alone"
                          checked={chargerInstallationType === 'stand-alone'}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setChargerInstallationType('stand-alone');
                              setForm(f => ({ ...f, charger: '', chargerWiringType: [] }));
                              setMultiChargers([]);
                            }
                          }}
                          className="text-blue-500 border-blue-400 data-[state=checked]:bg-blue-500"
                        />
                        <Label htmlFor="stand-alone" className="font-medium cursor-pointer text-blue-700">Stand-alone</Label>
                      </div>
                      <div
                        className={`flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-green-50 cursor-pointer ${chargerInstallationType === 'group' ? 'bg-green-100 border-green-300' : ''
                          }`}
                        onClick={() => {
                          setChargerInstallationType('group');
                          setForm(f => ({ ...f, charger: '', chargerWiringType: [] }));
                          setMultiChargers([]);
                        }}
                      >
                        <Checkbox
                          id="group"
                          checked={chargerInstallationType === 'group'}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setChargerInstallationType('group');
                              setForm(f => ({ ...f, charger: '', chargerWiringType: [] }));
                              setMultiChargers([]);
                            }
                          }}
                          className="text-green-500 border-green-400 data-[state=checked]:bg-green-500"
                        />
                        <Label htmlFor="group" className="font-medium cursor-pointer text-green-700">Group Charger</Label>
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

                  {/* จำนวนTerminal - แสดงเฉพาะกรณี Group Charger */}
                  {chargerInstallationType === 'group' && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700">
                        จำนวนTerminal
                      </Label>
                      <Select
                        value={form.numberOfTerminals || ''}
                        onValueChange={(value) => setForm(f => {
                          const nextCount = parseInt(value || '0', 10) || 0;
                          const currentSizes = Array.isArray(f.terminalSizes) ? f.terminalSizes : [];
                          const resizedSizes = Array.from({ length: nextCount }, (_, idx) => currentSizes[idx] || '');
                          return {
                            ...f,
                            numberOfTerminals: value,
                            terminalSizes: resizedSizes,
                            terminalSize: resizedSizes[0] || '',
                          };
                        })}
                      >
                        <SelectTrigger className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                          <SelectValue placeholder={
                            (() => {
                              // คำนวณ suggest จาก Charger Type Selection
                              const chargerValue = chargerTypeMode === 'same'
                                ? form.charger
                                : (multiChargers.length > 0 ? multiChargers[0] : '');

                              if (chargerValue) {
                                // ดึงตัวเลขจาก charger เช่น "280 kW" => 280
                                const match = chargerValue.match(/(\d+)\s*kW/i);
                                if (match) {
                                  const kw = parseInt(match[1]);
                                  const suggested = Math.round(kw / 80);
                                  // จำกัดให้อยู่ในช่วง 1-20
                                  const clamped = Math.max(1, Math.min(20, suggested));
                                  return `Select (แนะนำ: ${clamped})`;
                                }
                              }
                              return 'Select number of terminals';
                            })()
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 20 }, (_, i) => {
                            const value = (i + 1).toString();
                            // คำนวณ suggest
                            const chargerValue = chargerTypeMode === 'same'
                              ? form.charger
                              : (multiChargers.length > 0 ? multiChargers[0] : '');

                            let isSuggested = false;
                            if (chargerValue) {
                              const match = chargerValue.match(/(\d+)\s*kW/i);
                              if (match) {
                                const kw = parseInt(match[1]);
                                const suggested = Math.round(kw / 80);
                                const clamped = Math.max(1, Math.min(20, suggested));
                                isSuggested = parseInt(value) === clamped;
                              }
                            }

                            return (
                              <SelectItem
                                key={value}
                                value={value}
                                className={isSuggested ? 'opacity-60 text-gray-500' : ''}
                              >
                                {value} {isSuggested && <span className="text-gray-400">(แนะนำ)</span>}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* ขนาดTerminal - แสดงเฉพาะกรณี Group Charger และมี numberOfTerminals */}
                  {chargerInstallationType === 'group' && form.numberOfTerminals && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700">
                        ขนาดTerminal
                      </Label>
                      {Array.from({ length: terminalCount }, (_, idx) => (
                        <Select
                          key={`terminal-size-${idx}`}
                          value={Array.isArray(form.terminalSizes) ? (form.terminalSizes[idx] || '') : ''}
                          onValueChange={(value) => setForm(f => {
                            const count = parseInt(f.numberOfTerminals || '0', 10) || 0;
                            const nextSizes = Array.from(
                              { length: count },
                              (_, i) => (Array.isArray(f.terminalSizes) ? f.terminalSizes[i] : '') || ''
                            );
                            nextSizes[idx] = value;
                            return {
                              ...f,
                              terminalSizes: nextSizes,
                              terminalSize: nextSizes[0] || '',
                            };
                          })}
                        >
                          <SelectTrigger className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder={`Select terminal ${idx + 1} size`} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="350A">350A</SelectItem>
                            <SelectItem value="380A">380A</SelectItem>
                            <SelectItem value="500A">500A</SelectItem>
                            <SelectItem value="600A">600A</SelectItem>
                          </SelectContent>
                        </Select>
                      ))}
                    </div>
                  )}

                  {/* การเดินสายไปTerminal - แสดงเฉพาะกรณี Group Charger และมี terminalSize */}
                  {chargerInstallationType === 'group' && selectedTerminalSizes.some(Boolean) && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700">
                        การเดินสายไปTerminal
                      </Label>
                      <Select
                        value={form.terminalWiringType || ''}
                        onValueChange={(value) => setForm(f => ({ ...f, terminalWiringType: value }))}
                      >
                        <SelectTrigger className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                          <SelectValue placeholder="Select terminal wiring type" />
                        </SelectTrigger>
                        <SelectContent>
                          {terminalWiringTypeOptions.map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Separator />

                  {/* TR to MDB Section - กรณี มิเตอร์แรงต่ำ 400 A ใช้ชื่อ "มิเตอร์แรงต่ำ ถึง MDB" และ Wh-Meter to MDB (บนดิน/ใต้ดิน) */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label className="text-sm font-semibold text-gray-800">
                        {isLowVoltageMeter400 ? 'มิเตอร์แรงต่ำ ถึง MDB' : 'TR to MDB'} <span className="text-xs text-gray-500 font-normal">{isLowVoltageMeter400 ? '' : '(การเดินสาย หม้อแปลง ถึง MDB)'}</span>
                      </Label>
                      <p className="text-xs text-gray-500 ml-1">
                        {isLowVoltageMeter400 ? 'เลือกการเดินสายแยกเป็น 2 ส่วน: Wh-Meter to MDB ( บนดิน ) และ Wh-Meter to MDB ( ใต้ดิน )' : 'เลือกการเดินสายแยกเป็น 2 ส่วน: TR to Land และ Land to MDB'}
                      </p>
                    </div>

                    {/* TR to Land / Wh-Meter to MDB ( บนดิน ) */}
                    <div className="space-y-3 pl-4 border-l-2 border-blue-200">
                      <Label className="text-sm font-medium text-gray-700">
                        {isLowVoltageMeter400 ? 'Wh-Meter to MDB ( บนดิน )' : 'TR to Land'} <span className="text-xs text-gray-400">{isLowVoltageMeter400 ? '' : '(การเดินสาย หม้อแปลง ถึง พื้น)'}</span>
                      </Label>
                      <Select value={form.trToLand} onValueChange={(value) => setForm(f => ({ ...f, trToLand: value }))}>
                        <SelectTrigger className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                          <SelectValue placeholder={isLowVoltageMeter400 ? 'Select wiring type' : 'Select TR to Land wiring type'} />
                        </SelectTrigger>
                        <SelectContent>
                          {trToLandOptionsEffective.map((option) => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                    {/* Land to MDB / Wh-Meter to MDB ( ใต้ดิน ) */}
                    <div className="space-y-3 pl-4 border-l-2 border-blue-200">
                    <Label className="text-sm font-medium text-gray-700">
                        {isLowVoltageMeter400 ? 'Wh-Meter to MDB ( ใต้ดิน )' : 'Land to MDB'} <span className="text-xs text-gray-400">{isLowVoltageMeter400 ? '' : '(การเดินสาย พื้น ถึง MDB)'}</span>
                    </Label>
                      <Select value={form.landToMdb} onValueChange={(value) => setForm(f => ({ ...f, landToMdb: value }))}>
                      <SelectTrigger className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                          <SelectValue placeholder={isLowVoltageMeter400 ? 'Select wiring type' : 'Select Land to MDB wiring type'} />
                      </SelectTrigger>
                      <SelectContent>
                          {landToMdbOptionsEffective.map((option) => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    </div>
                  </div>

                  {/* Charger Wiring Type - เปลี่ยนเป็น checkbox group */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">
                      MDB to Charger <span className="text-xs text-gray-400">(การเดินสาย MDB ถึง เครื่องชาร์จ)</span>
                    </Label>
                    <div className="space-y-2">
                      {chargerWiringTypeOptions.map((option) => (
                        <div
                          key={option}
                          className={`flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-blue-50 cursor-pointer ${form.chargerWiringType.includes(option) ? 'bg-blue-100 border-blue-300' : ''
                            }`}
                          onClick={() => {
                            setForm(f => {
                              const currentTypes = f.chargerWiringType || [];
                              if (currentTypes.includes(option)) {
                                // ถ้าเลือกอยู่แล้ว ให้ยกเลิกการเลือก
                                return { ...f, chargerWiringType: currentTypes.filter(t => t !== option) };
                              } else {
                                // ถ้ายังไม่เลือก ให้เพิ่มเข้าไป
                                return { ...f, chargerWiringType: [...currentTypes, option] };
                              }
                            });
                          }}
                        >
                          <Checkbox
                            id={`charger-wiring-${option}`}
                            checked={form.chargerWiringType.includes(option)}
                            onCheckedChange={(checked) => {
                              setForm(f => {
                                const currentTypes = f.chargerWiringType || [];
                                if (checked) {
                                  return { ...f, chargerWiringType: [...currentTypes, option] };
                                } else {
                                  return { ...f, chargerWiringType: currentTypes.filter(t => t !== option) };
                                }
                              });
                            }}
                            className="text-blue-500 border-blue-400 data-[state=checked]:bg-blue-500"
                          />
                          <Label htmlFor={`charger-wiring-${option}`} className="font-medium cursor-pointer text-sm text-gray-700">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </div>
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

                  if (!customerCode || !String(customerCode).trim()) {
                    setNoCustomerCodeStationDialogOpen(true);
                    return;
                  }

                  navigateToStationAccessoryRef.current();
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
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Battery className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium text-green-800">Transformer Size</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 border-green-300 text-green-700 hover:bg-green-100"
                        onClick={() => {
                          alert('โหมดแก้ไข Transformer Size เปิดแล้ว\nสามารถลดขนาดได้เล็กลงสูงสุด 1 step จากค่าที่คำนวณอัตโนมัติ และเลือกขนาดที่ใหญ่กว่าได้ทั้งหมด');
                          setIsEditingTransformerSize(true);
                        }}
                      >
                        แก้ไข
                      </Button>
                    </div>
                    <div className="text-2xl font-bold text-green-900 flex items-center">
                      {(() => {
                        const selectedTransformer = getSelectedTransformerLabel(getCurrentKWAllCharger());
                        if (selectedTransformer === 'มิเตอร์แรงต่ำ 400 A') return selectedTransformer;
                        return (
                          <>
                            {selectedTransformer}
                            <span className="text-2xl font-bold text-green-900 ml-1">kVA</span>
                          </>
                        );
                      })()}
                    </div>
                    {isEditingTransformerSize && (
                      <div className="mt-3">
                        <Select
                          value={manualTransformerSize || '__auto__'}
                          onValueChange={(value) => {
                            setManualTransformerSize(value === '__auto__' ? '' : value);
                          }}
                        >
                          <SelectTrigger className="h-10 border-green-300 focus:border-green-500 focus:ring-green-500">
                            <SelectValue placeholder="เลือกขนาด Transformer" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__auto__">อัตโนมัติ (ตามผลคำนวณ)</SelectItem>
                            {getTransformerSizeOptions().map((option) => (
                              <SelectItem key={option} value={option}>
                                {option === 'มิเตอร์แรงต่ำ 400 A' ? option : `${option} kVA`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
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
                        // ใช้ row number เดียวกับขนาดหม้อแปลงที่เลือก
                        const trRowNum = getSelectedTransformerRowNumber();
                        const trRow = excelData.find(r => r.__rowNum__ === trRowNum);
                        const mccbMain = trRow ? trRow.__EMPTY_7 : '-';
                        console.log(`MDB (MCCB Main) UI Debug - Using TR Row ${trRowNum}:`, trRow);
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
                  Summary for {chargerInstallationType === 'group' ? 'Group Charger' : 'Stand-alone Charger'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-2">
                  {/* Horizontal summary for each charger */}
                  {chargerTypeMode === 'any' ? (
                    multiChargers.filter(name => name !== '').length > 0 ? (
                      multiChargers.filter(name => name !== '').map((chargerName, idx) => {
                        // ดึงค่าสำหรับแต่ละประเภทแยกกัน
                        const selectedTypes = form.chargerWiringType && form.chargerWiringType.length > 0 ? form.chargerWiringType : [];

                        // หา row number
                        let rowNum: number | undefined;
                        if (chargerInstallationType === 'group') {
                          const groupCell = groupChargerToExcelCell[chargerName];
                          if (!groupCell) return null;
                          rowNum = groupCell.rowNum;
                        } else {
                          const cell = chargerToExcelCell[chargerName];
                          if (form.powerAuthority === 'MEA' && cell?.mea) {
                            rowNum = parseInt(cell.mea.replace('C', ''));
                          }
                          if (form.powerAuthority === 'PEA' && cell?.pea) {
                            rowNum = parseInt(cell.pea.replace('C', ''));
                          }
                        }

                        if (!rowNum) return null;
                        const row = excelData.find(r => r.__rowNum__ === rowNum);
                        if (!row) return null;

                        return (
                          <div key={idx} className="space-y-2 text-base border-b border-gray-200 pb-3 mb-3 last:border-b-0 last:pb-0 last:mb-0">
                            <div className="font-semibold text-gray-900 flex items-center gap-4">
                              <span>{chargerInstallationType === 'group' ? 'Group Charger' : 'Stand-alone Charger'}{idx + 1}: {multiChargers[idx] || '-'}</span>
                              <span className="text-gray-700 font-normal">
                              kW: {extractPowerValue(chargerName)} kW
                            </span>
                            </div>
                            {selectedTypes.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <div className="text-xs font-semibold text-gray-600 mb-2">MDB to Charger (แยกตามประเภทสาย):</div>
                                {selectedTypes.map((wiringType, typeIdx) => {
                                  // ดึงค่า cable และ conduit สำหรับแต่ละประเภท
                                  const wiringTypeToCols: Record<string, string[]> = chargerInstallationType === 'group'
                                    ? {
                                      'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ': ['__EMPTY_26', '__EMPTY_27', '__EMPTY_28', '__EMPTY_29', '__EMPTY_30', '__EMPTY_31', '__EMPTY_32', '__EMPTY_33', '__EMPTY_34', '__EMPTY_35', '__EMPTY_36', '__EMPTY_37'],
                                      'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน': ['__EMPTY_49', '__EMPTY_50', '__EMPTY_51', '__EMPTY_52', '__EMPTY_53', '__EMPTY_54', '__EMPTY_55', '__EMPTY_56', '__EMPTY_57', '__EMPTY_58', '__EMPTY_59', '__EMPTY_60'],
                                      'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา': ['__EMPTY_74', '__EMPTY_75', '__EMPTY_76', '__EMPTY_77', '__EMPTY_78', '__EMPTY_79', '__EMPTY_80', '__EMPTY_81', '__EMPTY_82', '__EMPTY_83', '__EMPTY_84', '__EMPTY_85'],
                                    }
                                    : form.powerAuthority === 'MEA'
                                      ? {
                                        'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ': ['__EMPTY_27', '__EMPTY_28', '__EMPTY_29', '__EMPTY_30', '__EMPTY_31', '__EMPTY_32', '__EMPTY_33', '__EMPTY_34', '__EMPTY_35', '__EMPTY_36', '__EMPTY_37', '__EMPTY_38', '__EMPTY_39'],
                                        'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน': ['__EMPTY_51', '__EMPTY_52', '__EMPTY_53', '__EMPTY_54', '__EMPTY_55', '__EMPTY_56', '__EMPTY_57', '__EMPTY_58', '__EMPTY_59', '__EMPTY_60', '__EMPTY_61', '__EMPTY_62', '__EMPTY_63'],
                                        'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา': ['__EMPTY_77', '__EMPTY_78', '__EMPTY_79', '__EMPTY_80', '__EMPTY_81', '__EMPTY_82', '__EMPTY_83', '__EMPTY_84', '__EMPTY_85', '__EMPTY_86'],
                                        'ขนาดสายไฟ 3P 4W ราง LADDER ไม่มีฝา': ['__EMPTY_101', '__EMPTY_102', '__EMPTY_103', '__EMPTY_104', '__EMPTY_105', '__EMPTY_106', '__EMPTY_107', '__EMPTY_108', '__EMPTY_109', '__EMPTY_110'],
                                      }
                                      : {
                                        'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ': ['__EMPTY_25', '__EMPTY_26', '__EMPTY_27', '__EMPTY_28', '__EMPTY_29', '__EMPTY_30', '__EMPTY_31', '__EMPTY_32', '__EMPTY_33', '__EMPTY_34', '__EMPTY_35', '__EMPTY_36', '__EMPTY_37'],
                                        'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน': ['__EMPTY_49', '__EMPTY_50', '__EMPTY_51', '__EMPTY_52', '__EMPTY_53', '__EMPTY_54', '__EMPTY_55', '__EMPTY_56', '__EMPTY_57', '__EMPTY_58', '__EMPTY_59', '__EMPTY_60', '__EMPTY_61'],
                                        'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา': ['__EMPTY_75', '__EMPTY_76', '__EMPTY_77', '__EMPTY_78', '__EMPTY_79', '__EMPTY_80', '__EMPTY_81', '__EMPTY_82', '__EMPTY_83', '__EMPTY_84'],
                                        'ขนาดสายไฟ 3P 4W ราง LADDER ไม่มีฝา': ['__EMPTY_99', '__EMPTY_100', '__EMPTY_101', '__EMPTY_102', '__EMPTY_103', '__EMPTY_104', '__EMPTY_105', '__EMPTY_106', '__EMPTY_107', '__EMPTY_108'],
                                      };

                                  const cols = wiringTypeToCols[wiringType];
                                  const cableValue = cols ? cols.map(col => row[col]).filter(Boolean).join(' ') : '';

                                  // ดึงค่า conduit
                                  let conduitValue = '';
                                  if (form.powerAuthority === 'MEA') {
                                    if (wiringType === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ') {
                                      const conduitCols = chargerInstallationType === 'group'
                                        ? ['__EMPTY_43', '__EMPTY_44', '__EMPTY_45', '__EMPTY_46', '__EMPTY_47']
                                        : ['__EMPTY_44', '__EMPTY_45', '__EMPTY_46', '__EMPTY_47', '__EMPTY_48', '__EMPTY_49'];
                                      const val = conduitCols.map(col => row[col]).filter(Boolean).join(' ');
                                      if (val) conduitValue = `${val} นิ้ว`;
                                    } else if (wiringType === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน') {
                                      const conduitCols = ['__EMPTY_68', '__EMPTY_69', '__EMPTY_70', '__EMPTY_71', '__EMPTY_72', '__EMPTY_73'];
                                      const val = conduitCols.map(col => row[col]).filter(Boolean).join(' ');
                                      if (val) conduitValue = `${val} มม.`;
                                    } else if (wiringType === 'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา') {
                                      const val = row['__EMPTY_92'];
                                      if (val) conduitValue = `${val} ซม.`;
                                    } else if (wiringType === 'ขนาดสายไฟ 3P 4W ราง LADDER ไม่มีฝา') {
                                      const val = row['__EMPTY_116'];
                                      if (val) conduitValue = `${val} ซม.`;
                                    }
                                  } else if (form.powerAuthority === 'PEA') {
                                    if (wiringType === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ') {
                                      const conduitCols = chargerInstallationType === 'group'
                                        ? ['__EMPTY_43', '__EMPTY_44', '__EMPTY_45', '__EMPTY_46', '__EMPTY_47']
                                        : ['__EMPTY_42', '__EMPTY_43', '__EMPTY_44', '__EMPTY_45', '__EMPTY_46', '__EMPTY_47'];
                                      const val = conduitCols.map(col => row[col]).filter(Boolean).join(' ');
                                      if (val) conduitValue = `${val} นิ้ว`;
                                    } else if (wiringType === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน') {
                                      const conduitCols = ['__EMPTY_66', '__EMPTY_67', '__EMPTY_68', '__EMPTY_69', '__EMPTY_70', '__EMPTY_71'];
                                      const val = conduitCols.map(col => row[col]).filter(Boolean).join(' ');
                                      if (val) conduitValue = `${val} มม.`;
                                    } else if (wiringType === 'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา') {
                                      const val = row['__EMPTY_90'];
                                      if (val) conduitValue = `${val} ซม.`;
                                    } else if (wiringType === 'ขนาดสายไฟ 3P 4W ราง LADDER ไม่มีฝา') {
                                      const val = row['__EMPTY_114'];
                                      if (val) conduitValue = `${val} ซม.`;
                                    }
                                  }

                                  // เลือกสี background ตาม index
                                  const bgColor = typeIdx % 2 === 0 ? 'bg-blue-50' : 'bg-green-50';

                                  return (
                                    <div key={typeIdx} className={`${bgColor} rounded-lg mb-2 p-3`}>
                                      {/* Wiring Type */}
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-gray-700 text-sm">Charger Wiring Type:</span>
                                        <span className="font-semibold text-gray-900 text-sm">{wiringType}</span>
                                      </div>
                                      {/* Wiring Cable */}
                                      {cableValue && (
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="font-medium text-gray-700 text-sm">Charger Wiring Cable (CV/THW):</span>
                                          <span className="font-semibold text-gray-900 text-sm">{cableValue}</span>
                                        </div>
                                      )}
                                      {/* Wire conduit */}
                                      {conduitValue && (
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium text-gray-700 text-sm">
                                            {wiringType === 'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา' || wiringType === 'ขนาดสายไฟ 3P 4W ราง LADDER ไม่มีฝา'
                                              ? 'Charger Wire tray:'
                                              : 'Charger Wire conduit:'}
                            </span>
                                          <span className="font-semibold text-gray-900 text-sm">{conduitValue}</span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-gray-400">-</div>
                    )
                  ) : (
                    (() => {
                      const num = parseInt(form.numberOfChargers) || 1;
                      const selectedTypes = form.chargerWiringType && form.chargerWiringType.length > 0 ? form.chargerWiringType : [];

                      // หา row number
                      let rowNum: number | undefined;
                      if (chargerInstallationType === 'group') {
                        const groupCell = groupChargerToExcelCell[form.charger];
                        if (!groupCell) return [];
                        rowNum = groupCell.rowNum;
                      } else {
                        const cell = chargerToExcelCell[form.charger];
                        if (form.powerAuthority === 'MEA' && cell?.mea) {
                          rowNum = parseInt(cell.mea.replace('C', ''));
                        }
                        if (form.powerAuthority === 'PEA' && cell?.pea) {
                          rowNum = parseInt(cell.pea.replace('C', ''));
                        }
                      }

                      if (!rowNum) return [];
                      const row = excelData.find(r => r.__rowNum__ === rowNum);
                      if (!row) return [];

                      return Array.from({ length: num }).map((_, idx) => (
                        <div key={idx} className="space-y-2 text-base border-b border-gray-200 pb-3 mb-3 last:border-b-0 last:pb-0 last:mb-0">
                          <div className="font-semibold text-gray-900 flex items-center gap-4">
                            <span>{chargerInstallationType === 'group' ? 'Group Charger' : 'Stand-alone Charger'}{idx + 1}: {form.charger}</span>
                            <span className="text-gray-700 font-normal">
                            ln(100%): {results?.inOfCharger !== undefined ? results.inOfCharger.toFixed(2) : '-'} A
                          </span>
                          </div>
                          {selectedTypes.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <div className="text-xs font-semibold text-gray-600 mb-2">MDB to Charger (แยกตามประเภทสาย):</div>
                              {selectedTypes.map((wiringType, typeIdx) => {
                                // ดึงค่า cable และ conduit สำหรับแต่ละประเภท
                                const wiringTypeToCols: Record<string, string[]> = chargerInstallationType === 'group'
                                  ? {
                                    'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ': ['__EMPTY_26', '__EMPTY_27', '__EMPTY_28', '__EMPTY_29', '__EMPTY_30', '__EMPTY_31', '__EMPTY_32', '__EMPTY_33', '__EMPTY_34', '__EMPTY_35', '__EMPTY_36', '__EMPTY_37'],
                                    'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน': ['__EMPTY_49', '__EMPTY_50', '__EMPTY_51', '__EMPTY_52', '__EMPTY_53', '__EMPTY_54', '__EMPTY_55', '__EMPTY_56', '__EMPTY_57', '__EMPTY_58', '__EMPTY_59', '__EMPTY_60'],
                                    'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา': ['__EMPTY_74', '__EMPTY_75', '__EMPTY_76', '__EMPTY_77', '__EMPTY_78', '__EMPTY_79', '__EMPTY_80', '__EMPTY_81', '__EMPTY_82', '__EMPTY_83', '__EMPTY_84', '__EMPTY_85'],
                                  }
                                  : form.powerAuthority === 'MEA'
                                    ? {
                                      'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ': ['__EMPTY_27', '__EMPTY_28', '__EMPTY_29', '__EMPTY_30', '__EMPTY_31', '__EMPTY_32', '__EMPTY_33', '__EMPTY_34', '__EMPTY_35', '__EMPTY_36', '__EMPTY_37', '__EMPTY_38', '__EMPTY_39'],
                                      'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน': ['__EMPTY_51', '__EMPTY_52', '__EMPTY_53', '__EMPTY_54', '__EMPTY_55', '__EMPTY_56', '__EMPTY_57', '__EMPTY_58', '__EMPTY_59', '__EMPTY_60', '__EMPTY_61', '__EMPTY_62', '__EMPTY_63'],
                                      'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา': ['__EMPTY_77', '__EMPTY_78', '__EMPTY_79', '__EMPTY_80', '__EMPTY_81', '__EMPTY_82', '__EMPTY_83', '__EMPTY_84', '__EMPTY_85', '__EMPTY_86'],
                                      'ขนาดสายไฟ 3P 4W ราง LADDER ไม่มีฝา': ['__EMPTY_101', '__EMPTY_102', '__EMPTY_103', '__EMPTY_104', '__EMPTY_105', '__EMPTY_106', '__EMPTY_107', '__EMPTY_108', '__EMPTY_109', '__EMPTY_110'],
                                    }
                                    : {
                                      'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ': ['__EMPTY_25', '__EMPTY_26', '__EMPTY_27', '__EMPTY_28', '__EMPTY_29', '__EMPTY_30', '__EMPTY_31', '__EMPTY_32', '__EMPTY_33', '__EMPTY_34', '__EMPTY_35', '__EMPTY_36', '__EMPTY_37'],
                                      'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน': ['__EMPTY_49', '__EMPTY_50', '__EMPTY_51', '__EMPTY_52', '__EMPTY_53', '__EMPTY_54', '__EMPTY_55', '__EMPTY_56', '__EMPTY_57', '__EMPTY_58', '__EMPTY_59', '__EMPTY_60', '__EMPTY_61'],
                                      'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา': ['__EMPTY_75', '__EMPTY_76', '__EMPTY_77', '__EMPTY_78', '__EMPTY_79', '__EMPTY_80', '__EMPTY_81', '__EMPTY_82', '__EMPTY_83', '__EMPTY_84'],
                                      'ขนาดสายไฟ 3P 4W ราง LADDER ไม่มีฝา': ['__EMPTY_99', '__EMPTY_100', '__EMPTY_101', '__EMPTY_102', '__EMPTY_103', '__EMPTY_104', '__EMPTY_105', '__EMPTY_106', '__EMPTY_107', '__EMPTY_108'],
                                    };

                                const cols = wiringTypeToCols[wiringType];
                                const cableValue = cols ? cols.map(col => row[col]).filter(Boolean).join(' ') : '';

                                // ดึงค่า conduit
                                let conduitValue = '';
                                if (form.powerAuthority === 'MEA') {
                                  if (wiringType === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ') {
                                    const conduitCols = chargerInstallationType === 'group'
                                      ? ['__EMPTY_43', '__EMPTY_44', '__EMPTY_45', '__EMPTY_46', '__EMPTY_47']
                                      : ['__EMPTY_44', '__EMPTY_45', '__EMPTY_46', '__EMPTY_47', '__EMPTY_48', '__EMPTY_49'];
                                    const val = conduitCols.map(col => row[col]).filter(Boolean).join(' ');
                                    if (val) conduitValue = `${val} นิ้ว`;
                                  } else if (wiringType === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน') {
                                    const conduitCols = ['__EMPTY_68', '__EMPTY_69', '__EMPTY_70', '__EMPTY_71', '__EMPTY_72', '__EMPTY_73'];
                                    const val = conduitCols.map(col => row[col]).filter(Boolean).join(' ');
                                    if (val) conduitValue = `${val} มม.`;
                                  } else if (wiringType === 'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา') {
                                    const val = row['__EMPTY_92'];
                                    if (val) conduitValue = `${val} ซม.`;
                                  } else if (wiringType === 'ขนาดสายไฟ 3P 4W ราง LADDER ไม่มีฝา') {
                                    const val = row['__EMPTY_116'];
                                    if (val) conduitValue = `${val} ซม.`;
                                  }
                                } else if (form.powerAuthority === 'PEA') {
                                  if (wiringType === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ') {
                                    const conduitCols = chargerInstallationType === 'group'
                                      ? ['__EMPTY_43', '__EMPTY_44', '__EMPTY_45', '__EMPTY_46', '__EMPTY_47']
                                      : ['__EMPTY_42', '__EMPTY_43', '__EMPTY_44', '__EMPTY_45', '__EMPTY_46', '__EMPTY_47'];
                                    const val = conduitCols.map(col => row[col]).filter(Boolean).join(' ');
                                    if (val) conduitValue = `${val} นิ้ว`;
                                  } else if (wiringType === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน') {
                                    const conduitCols = ['__EMPTY_66', '__EMPTY_67', '__EMPTY_68', '__EMPTY_69', '__EMPTY_70', '__EMPTY_71'];
                                    const val = conduitCols.map(col => row[col]).filter(Boolean).join(' ');
                                    if (val) conduitValue = `${val} มม.`;
                                  } else if (wiringType === 'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา') {
                                    const val = row['__EMPTY_90'];
                                    if (val) conduitValue = `${val} ซม.`;
                                  } else if (wiringType === 'ขนาดสายไฟ 3P 4W ราง LADDER ไม่มีฝา') {
                                    const val = row['__EMPTY_114'];
                                    if (val) conduitValue = `${val} ซม.`;
                                  }
                                }

                                // เลือกสี background ตาม index
                                const bgColor = typeIdx % 2 === 0 ? 'bg-blue-50' : 'bg-green-50';

                                return (
                                  <div key={typeIdx} className={`${bgColor} rounded-lg mb-2 p-3`}>
                                    {/* Wiring Type */}
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-medium text-gray-700 text-sm">Charger Wiring Type:</span>
                                      <span className="font-semibold text-gray-900 text-sm">{wiringType}</span>
                                    </div>
                                    {/* Wiring Cable */}
                                    {cableValue && (
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-gray-700 text-sm">Charger Wiring Cable (CV/THW):</span>
                                        <span className="font-semibold text-gray-900 text-sm">{cableValue}</span>
                                      </div>
                                    )}
                                    {/* Wire conduit */}
                                    {conduitValue && (
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium text-gray-700 text-sm">
                                          {wiringType === 'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา' || wiringType === 'ขนาดสายไฟ 3P 4W ราง LADDER ไม่มีฝา'
                                            ? 'Charger Wire tray:'
                                            : 'Charger Wire conduit:'}
                          </span>
                                        <span className="font-semibold text-gray-900 text-sm">{conduitValue}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
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
                </div>
              </CardContent>
            </Card>
            {/* --- TR to MDB Summary Card --- */}
            {results ? (
              <div className="space-y-6">
                <Card className="shadow-lg border-0">
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b">
                    <CardTitle className="flex items-center gap-2 text-gray-800">
                      {form.powerAuthority === 'MEA' && results.kWAllCharger > 0 && results.kWAllCharger <= 280 ? 'มิเตอร์แรงต่ำ ถึง MDB' : 'TR to MDB'}
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
                            const selectedTransformer = getSelectedTransformerLabel(getCurrentKWAllCharger());
                            if (selectedTransformer === 'มิเตอร์แรงต่ำ 400 A') return selectedTransformer;
                            return (
                              <>
                                {selectedTransformer}
                                <span className="text-base text-gray-900 ml-1">kVA</span>
                              </>
                            );
                          })()}
                        </span>
                      </div>
                      {/* TR to MDB Section - TR to Land / Watt-hour Meter ( บนดิน ) */}
                      {(form.trToLand || form.landToMdb) && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <div className="text-xs font-semibold text-gray-600 mb-2">{form.powerAuthority === 'MEA' && results.kWAllCharger > 0 && results.kWAllCharger <= 280 ? 'มิเตอร์แรงต่ำ ถึง MDB (แยกเป็น 2 ส่วน):' : 'TR to MDB (แยกเป็น 2 ส่วน):'}</div>

                          {/* TR to Land / Wh-Meter to MDB ( บนดิน ) */}
                          {form.trToLand && (
                            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg mb-2">
                              <span className="font-medium text-gray-700 text-sm">{form.powerAuthority === 'MEA' && results.kWAllCharger > 0 && results.kWAllCharger <= 280 ? 'Wh-Meter to MDB ( บนดิน ):': 'TR to Land Wiring Type:'}</span>
                              <span className="font-semibold text-gray-900 text-sm">{form.trToLand}</span>
                            </div>
                          )}
                          {/* TR to Land Wiring Size (CV) */}
                          {form.trToLand && form.powerAuthority && getTRToLandWiringSizeCVs() && (
                            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg mb-2">
                              <span className="font-medium text-gray-700 text-sm">TR to Land Wiring Size (CV/THW):</span>
                              <span className="font-semibold text-gray-900 text-sm">
                                {getTRToLandWiringSizeCVs()}
                              </span>
                            </div>
                          )}
                          {/* TR to Land / Watt-hour (บนดิน) Wire conduit */}
                          {form.trToLand && form.powerAuthority && getTRToLandWireConduit() && (
                            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg mb-2">
                              <span className="font-medium text-gray-700 text-sm">
                                {form.trToLand === 'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา' ? (form.powerAuthority === 'MEA' && results.kWAllCharger > 0 && results.kWAllCharger <= 280 ? 'Wh-Meter to MDB ( บนดิน ) Wire tray :' : 'TR to Land Wire tray :') : (form.powerAuthority === 'MEA' && results.kWAllCharger > 0 && results.kWAllCharger <= 280 ? 'Wh-Meter to MDB ( บนดิน ) Wire conduit :' : 'TR to Land Wire conduit :')}
                              </span>
                              <span className="font-semibold text-gray-900 text-sm">{getTRToLandWireConduit()}</span>
                            </div>
                          )}

                          {/* Land to MDB / Wh-Meter to MDB ( ใต้ดิน ) */}
                          {form.landToMdb && (
                            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg mb-2">
                              <span className="font-medium text-gray-700 text-sm">{form.powerAuthority === 'MEA' && results.kWAllCharger > 0 && results.kWAllCharger <= 280 ? 'Wh-Meter to MDB ( ใต้ดิน ):': 'Land to MDB Wiring Type:'}</span>
                              <span className="font-semibold text-gray-900 text-sm">{form.landToMdb}</span>
                            </div>
                          )}
                          {/* Land to MDB Wiring Size (CV) */}
                          {form.landToMdb && form.powerAuthority && getLandToMdbWiringSizeCVs() && (
                            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg mb-2">
                              <span className="font-medium text-gray-700 text-sm">Land to MDB Wiring Size (CV/THW):</span>
                              <span className="font-semibold text-gray-900 text-sm">
                                {getLandToMdbWiringSizeCVs()}
                              </span>
                            </div>
                          )}
                          {/* Land to MDB / Watt-hour (ใต้ดิน) Wire conduit */}
                          {form.landToMdb && form.powerAuthority && getLandToMdbWireConduit() && (
                            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                              <span className="font-medium text-gray-700 text-sm">
                                {form.landToMdb === 'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา' ? (form.powerAuthority === 'MEA' && results.kWAllCharger > 0 && results.kWAllCharger <= 280 ? 'Wh-Meter to MDB ( ใต้ดิน ) Wire tray :' : 'Land to MDB Wire tray :') :
                                  form.landToMdb === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน' ? (form.powerAuthority === 'MEA' && results.kWAllCharger > 0 && results.kWAllCharger <= 280 ? 'Wh-Meter to MDB ( ใต้ดิน ) Wire conduit :' : 'Land to MDB Wire conduit :') :
                                    (form.powerAuthority === 'MEA' && results.kWAllCharger > 0 && results.kWAllCharger <= 280 ? 'Wh-Meter to MDB ( ใต้ดิน ) Wire conduit :' : 'Land to MDB Wire conduit :')}
                              </span>
                              <span className="font-semibold text-gray-900 text-sm">{getLandToMdbWireConduit()}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {/* TR Wiring Type (backward compatibility) */}
                      {form.trWiringType && !form.trToLand && !form.landToMdb && (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-700">TR Wiring Type:</span>
                        <span className="font-semibold text-gray-900 text-sm">{form.trWiringType}</span>
                      </div>
                      )}
                      {/* TR Wiring Size (CV) - backward compatibility */}
                      {(form.trWiringType && !form.trToLand && !form.landToMdb && form.powerAuthority && getTRWiringSizeCVs().length > 0) && (
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-700">TR Wiring Size (CV/THW):</span>
                          <span className="font-semibold text-gray-900 text-sm">
                            {getTRWiringSizeCVs()[0]}
                          </span>
                        </div>
                      )}
                      {/* TR Wire conduit - backward compatibility */}
                      {(form.trWiringType && !form.trToLand && !form.landToMdb && form.powerAuthority && getTRWireConduit()) && (
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
                            // สำหรับ Group Charger: อ่าน __EMPTY_22 (จำนวนชุด) และ __EMPTY_24 (ค่า MCCB Sub)
                            // สำหรับ Stand-alone: MEA: ใช้ __EMPTY_23, __EMPTY_24, __EMPTY_24 | PEA: ใช้ MEA. กฟน. 416 V:, __EMPTY_22, __EMPTY_23
                            const meaColumns = ['__EMPTY_23', '__EMPTY_24', '__EMPTY_24'];
                            const peaColumns = ['MEA. กฟน. 416 V:', '__EMPTY_22', '__EMPTY_23'];
                            const columns = form.powerAuthority === 'MEA' ? meaColumns : peaColumns;
                            let mccbSubs: string[] = [];
                            if (chargerTypeMode === 'any') {
                              mccbSubs = multiChargers.map((chargerName) => {
                                let rowNum: number | undefined;

                                if (chargerInstallationType === 'group') {
                                  const groupCell = groupChargerToExcelCell[chargerName];
                                  if (!groupCell) return '-';
                                  rowNum = groupCell.rowNum;
                                } else {
                                  const cell = chargerToExcelCell[chargerName];
                                if (form.powerAuthority === 'MEA' && cell?.mea) {
                                  rowNum = parseInt(cell.mea.replace('C', ''));
                                }
                                if (form.powerAuthority === 'PEA' && cell?.pea) {
                                  rowNum = parseInt(cell.pea.replace('C', ''));
                                }
                                }

                                const row = excelData.find(r => r.__rowNum__ === rowNum);
                                if (!row) return '-';

                                // สำหรับ Group Charger: อ่าน __EMPTY_22 (จำนวนชุด) และ __EMPTY_24 (ค่า MCCB Sub)
                                if (chargerInstallationType === 'group') {
                                  const numSets = (row as any)['__EMPTY_22'];
                                  const mccbValue = (row as any)['__EMPTY_24'];
                                  const mccbValueStr = mccbValue && mccbValue !== '-' ? `${mccbValue}A` : '-';
                                  const numSetsStr = numSets && numSets !== '-' ? `${numSets}ชุด` : '';
                                  return mccbValueStr !== '-' && numSetsStr
                                    ? `${mccbValueStr} (${numSetsStr})`
                                    : mccbValueStr;
                                }

                                // สำหรับ Stand-alone: อ่านค่าจากทั้ง 3 คอลัมน์และแสดงพร้อมกัน
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
                              let rowNum: number | undefined;

                              if (chargerInstallationType === 'group') {
                                const groupCell = groupChargerToExcelCell[form.charger];
                                if (!groupCell) {
                                  const numChargers = parseInt(form.numberOfChargers) || 1;
                                  mccbSubs = Array(numChargers).fill('-');
                                } else {
                                  rowNum = groupCell.rowNum;
                                }
                              } else {
                                const cell = chargerToExcelCell[form.charger];
                              if (form.powerAuthority === 'MEA' && cell?.mea) {
                                rowNum = parseInt(cell.mea.replace('C', ''));
                              }
                              if (form.powerAuthority === 'PEA' && cell?.pea) {
                                rowNum = parseInt(cell.pea.replace('C', ''));
                              }
                              }

                              const row = excelData.find(r => r.__rowNum__ === rowNum);
                              if (!row) {
                                const numChargers = parseInt(form.numberOfChargers) || 1;
                                mccbSubs = Array(numChargers).fill('-');
                              } else {
                                // สำหรับ Group Charger: อ่าน __EMPTY_22 (จำนวนชุด) และ __EMPTY_24 (ค่า MCCB Sub)
                                if (chargerInstallationType === 'group') {
                                  const numSets = (row as any)['__EMPTY_22'];
                                  const mccbValue = (row as any)['__EMPTY_24'];
                                  const mccbValueStr = mccbValue && mccbValue !== '-' ? `${mccbValue}A` : '-';
                                  const numSetsStr = numSets && numSets !== '-' ? `${numSets}ชุด` : '';
                                  const result = mccbValueStr !== '-' && numSetsStr
                                    ? `${mccbValueStr} (${numSetsStr})`
                                    : mccbValueStr;
                                  const numChargers = parseInt(form.numberOfChargers) || 1;
                                  mccbSubs = Array(numChargers).fill(result);
                                } else {
                                  // สำหรับ Stand-alone: อ่านค่าจากทั้ง 3 คอลัมน์และแสดงพร้อมกัน (ทุก MCCB Sub แสดงเหมือนกัน)
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
                      {/* Charger Wiring Type - แสดงแยกแต่ละประเภทเหมือน TR to MDB */}
                      {form.chargerWiringType && form.chargerWiringType.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <div className="text-xs font-semibold text-gray-600 mb-2">MDB to Charger (แยกตามประเภทสาย):</div>
                          {form.chargerWiringType.map((wiringType, typeIdx) => {
                            // ดึงค่า cable และ conduit สำหรับแต่ละประเภท
                            const chargerName = chargerTypeMode === 'any'
                              ? (multiChargers[0] || form.charger)
                              : form.charger;

                            // หา row number
                            let rowNum: number | undefined;
                            if (chargerInstallationType === 'group') {
                              const groupCell = groupChargerToExcelCell[chargerName];
                              if (!groupCell) return null;
                              rowNum = groupCell.rowNum;
                            } else {
                              const cell = chargerToExcelCell[chargerName];
                              if (form.powerAuthority === 'MEA' && cell?.mea) {
                                rowNum = parseInt(cell.mea.replace('C', ''));
                              }
                              if (form.powerAuthority === 'PEA' && cell?.pea) {
                                rowNum = parseInt(cell.pea.replace('C', ''));
                              }
                            }

                            if (!rowNum) return null;
                            const row = excelData.find(r => r.__rowNum__ === rowNum);
                            if (!row) return null;

                            // ดึงค่า cable
                            const wiringTypeToCols: Record<string, string[]> = chargerInstallationType === 'group'
                              ? {
                                'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ': ['__EMPTY_26', '__EMPTY_27', '__EMPTY_28', '__EMPTY_29', '__EMPTY_30', '__EMPTY_31', '__EMPTY_32', '__EMPTY_33', '__EMPTY_34', '__EMPTY_35', '__EMPTY_36', '__EMPTY_37'],
                                'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน': ['__EMPTY_49', '__EMPTY_50', '__EMPTY_51', '__EMPTY_52', '__EMPTY_53', '__EMPTY_54', '__EMPTY_55', '__EMPTY_56', '__EMPTY_57', '__EMPTY_58', '__EMPTY_59', '__EMPTY_60'],
                                'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา': ['__EMPTY_74', '__EMPTY_75', '__EMPTY_76', '__EMPTY_77', '__EMPTY_78', '__EMPTY_79', '__EMPTY_80', '__EMPTY_81', '__EMPTY_82', '__EMPTY_83', '__EMPTY_84', '__EMPTY_85'],
                              }
                              : form.powerAuthority === 'MEA'
                                ? {
                                  'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ': ['__EMPTY_27', '__EMPTY_28', '__EMPTY_29', '__EMPTY_30', '__EMPTY_31', '__EMPTY_32', '__EMPTY_33', '__EMPTY_34', '__EMPTY_35', '__EMPTY_36', '__EMPTY_37', '__EMPTY_38', '__EMPTY_39'],
                                  'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน': ['__EMPTY_51', '__EMPTY_52', '__EMPTY_53', '__EMPTY_54', '__EMPTY_55', '__EMPTY_56', '__EMPTY_57', '__EMPTY_58', '__EMPTY_59', '__EMPTY_60', '__EMPTY_61', '__EMPTY_62', '__EMPTY_63'],
                                  'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา': ['__EMPTY_77', '__EMPTY_78', '__EMPTY_79', '__EMPTY_80', '__EMPTY_81', '__EMPTY_82', '__EMPTY_83', '__EMPTY_84', '__EMPTY_85', '__EMPTY_86'],
                                  'ขนาดสายไฟ 3P 4W ราง LADDER ไม่มีฝา': ['__EMPTY_101', '__EMPTY_102', '__EMPTY_103', '__EMPTY_104', '__EMPTY_105', '__EMPTY_106', '__EMPTY_107', '__EMPTY_108', '__EMPTY_109', '__EMPTY_110'],
                                }
                                : {
                                  'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ': ['__EMPTY_25', '__EMPTY_26', '__EMPTY_27', '__EMPTY_28', '__EMPTY_29', '__EMPTY_30', '__EMPTY_31', '__EMPTY_32', '__EMPTY_33', '__EMPTY_34', '__EMPTY_35', '__EMPTY_36', '__EMPTY_37'],
                                  'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน': ['__EMPTY_49', '__EMPTY_50', '__EMPTY_51', '__EMPTY_52', '__EMPTY_53', '__EMPTY_54', '__EMPTY_55', '__EMPTY_56', '__EMPTY_57', '__EMPTY_58', '__EMPTY_59', '__EMPTY_60', '__EMPTY_61'],
                                  'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา': ['__EMPTY_75', '__EMPTY_76', '__EMPTY_77', '__EMPTY_78', '__EMPTY_79', '__EMPTY_80', '__EMPTY_81', '__EMPTY_82', '__EMPTY_83', '__EMPTY_84'],
                                  'ขนาดสายไฟ 3P 4W ราง LADDER ไม่มีฝา': ['__EMPTY_99', '__EMPTY_100', '__EMPTY_101', '__EMPTY_102', '__EMPTY_103', '__EMPTY_104', '__EMPTY_105', '__EMPTY_106', '__EMPTY_107', '__EMPTY_108'],
                                };

                            const cols = wiringTypeToCols[wiringType];
                            const cableValue = cols ? cols.map(col => row[col]).filter(Boolean).join(' ') : '';

                            // ดึงค่า conduit
                            let conduitValue = '';
                            const firstNonEmpty = (keys: string[]) => {
                              for (const k of keys) {
                                const v = (row as any)[k];
                                if (v !== undefined && v !== null && String(v).trim() !== '') return v;
                              }
                              return '';
                            };
                            if (form.powerAuthority === 'MEA') {
                              if (wiringType === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ') {
                                const conduitCols = chargerInstallationType === 'group'
                                  ? ['__EMPTY_43', '__EMPTY_44', '__EMPTY_45', '__EMPTY_46', '__EMPTY_47']
                                  : ['__EMPTY_44', '__EMPTY_45', '__EMPTY_46', '__EMPTY_47', '__EMPTY_48', '__EMPTY_49'];
                                const val = conduitCols.map(col => row[col]).filter(Boolean).join(' ');
                                if (val) conduitValue = `${val} นิ้ว`;
                              } else if (wiringType === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน') {
                                const conduitCols = ['__EMPTY_68', '__EMPTY_69', '__EMPTY_70', '__EMPTY_71', '__EMPTY_72', '__EMPTY_73'];
                                const val = conduitCols.map(col => row[col]).filter(Boolean).join(' ');
                                if (val) conduitValue = `${val} มม.`;
                              } else if (wiringType === 'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา') {
                                // Group/Stand-alone บาง sheet คอลัมน์ขยับ ทำ fallback หลาย key
                                const val = firstNonEmpty(chargerInstallationType === 'group'
                                  ? ['__EMPTY_92', '__EMPTY_91', '__EMPTY_93', '__EMPTY_90']
                                  : ['__EMPTY_92', '__EMPTY_91', '__EMPTY_93', '__EMPTY_90']);
                                if (val) conduitValue = `${val} ซม.`;
                              } else if (wiringType === 'ขนาดสายไฟ 3P 4W ราง LADDER ไม่มีฝา') {
                                const val = row['__EMPTY_116'];
                                if (val) conduitValue = `${val} ซม.`;
                              }
                            } else if (form.powerAuthority === 'PEA') {
                              if (wiringType === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ') {
                                const conduitCols = chargerInstallationType === 'group'
                                  ? ['__EMPTY_43', '__EMPTY_44', '__EMPTY_45', '__EMPTY_46', '__EMPTY_47']
                                  : ['__EMPTY_42', '__EMPTY_43', '__EMPTY_44', '__EMPTY_45', '__EMPTY_46', '__EMPTY_47'];
                                const val = conduitCols.map(col => row[col]).filter(Boolean).join(' ');
                                if (val) conduitValue = `${val} นิ้ว`;
                              } else if (wiringType === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน') {
                                const conduitCols = ['__EMPTY_66', '__EMPTY_67', '__EMPTY_68', '__EMPTY_69', '__EMPTY_70', '__EMPTY_71'];
                                const val = conduitCols.map(col => row[col]).filter(Boolean).join(' ');
                                if (val) conduitValue = `${val} มม.`;
                              } else if (wiringType === 'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา') {
                                const val = firstNonEmpty(chargerInstallationType === 'group'
                                  ? ['__EMPTY_90', '__EMPTY_89', '__EMPTY_91', '__EMPTY_88']
                                  : ['__EMPTY_90', '__EMPTY_89', '__EMPTY_91', '__EMPTY_88']);
                                if (val) conduitValue = `${val} ซม.`;
                              } else if (wiringType === 'ขนาดสายไฟ 3P 4W ราง LADDER ไม่มีฝา') {
                                const val = row['__EMPTY_114'];
                                if (val) conduitValue = `${val} ซม.`;
                              }
                            }

                            // เลือกสี background ตาม index
                            const bgColor = typeIdx % 2 === 0 ? 'bg-blue-50' : 'bg-green-50';

                            return (
                              <div key={typeIdx} className={`${bgColor} rounded-lg mb-2 p-3`}>
                                {/* Wiring Type */}
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-gray-700 text-sm">Charger Wiring Type:</span>
                                  <span className="font-semibold text-gray-900 text-sm">{wiringType}</span>
                      </div>
                                {/* Wiring Cable */}
                                {cableValue && (
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-gray-700 text-sm">Charger Wiring Cable (CV/THW):</span>
                                    <span className="font-semibold text-gray-900 text-sm">{cableValue}</span>
                          </div>
                                )}
                                {/* Wire conduit */}
                                {conduitValue && (
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-700 text-sm">
                                      {wiringType === 'ขนาดสายไฟ 3P 4W ราง TRAY ไม่มีฝา' || wiringType === 'ขนาดสายไฟ 3P 4W ราง LADDER ไม่มีฝา'
                                        ? 'Charger Wire tray:'
                                        : 'Charger Wire conduit:'}
                                    </span>
                                    <span className="font-semibold text-gray-900 text-sm">{conduitValue}</span>
                        </div>
                      )}
                          </div>
                            );
                          })}
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
                      {/* Charger Installation Type */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-700">{chargerInstallationType === 'group' ? 'Group Charger:' : 'Stand-alone:'}</span>
                        {chargerTypeMode === 'any' ? (
                          <div className="flex flex-col gap-1">
                            {multiChargers.map((name, idx) => (
                              <span key={idx} className="ml-6 font-semibold text-gray-900">
                                {chargerInstallationType === 'group' ? 'Group Charger' : 'Stand-alone Charger'}{idx + 1}: {name}
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
                                        {chargerInstallationType === 'group' ? 'Group Charger' : 'Stand-alone Charger'}{idx + 1}: {extractPowerValue(chargerName)} kW
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

                {/* --- Terminal Summary Card --- */}
                {chargerInstallationType === 'group' && (
                  <Card className="shadow-lg border-0 mt-4">
                    <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
                      <CardTitle className="flex items-center gap-2 text-purple-800">
                        Terminal
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {/* Number of Terminals */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-700">จำนวนTerminal:</span>
                          <span className="font-semibold text-gray-900">
                            {form.numberOfTerminals || '-'}
                          </span>
                        </div>
                        {/* Terminal Size */}
                        {selectedTerminalSizes.some(Boolean) && (
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="font-medium text-gray-700">ขนาดTerminal:</span>
                            <span className="font-semibold text-gray-900 text-sm text-right">
                              {selectedTerminalSizes.map((size, idx) => (
                                <span key={`terminal-size-summary-${idx}`} className="block">
                                  Terminal{idx + 1}: {size || '-'}
                                </span>
                              ))}
                            </span>
                          </div>
                        )}
                        {/* Terminal Wiring Type */}
                        {form.terminalWiringType && (
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="font-medium text-gray-700">การเดินสายไปTerminal:</span>
                            <span className="font-semibold text-gray-900 text-sm">
                              {form.terminalWiringType}
                            </span>
                          </div>
                        )}
                        {/* Terminal Wiring Cable */}
                        {selectedTerminalSizes.some(Boolean) && form.terminalWiringType && (() => {
                          const terminalDataList = selectedTerminalSizes.map((size, idx) => ({
                            idx,
                            data: getTerminalWiringData(size),
                          }));
                          console.log('[Terminal Card] Terminal Wiring Cable - terminalDataList:', terminalDataList);
                          return (
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="font-medium text-gray-700">Terminal Wiring Cable:</span>
                              <span className="font-semibold text-gray-900 text-sm text-right">
                                {terminalDataList.map(({ idx, data }) => (
                                  <span key={`terminal-cable-${idx}`} className="block">
                                    Terminal{idx + 1}: {data?.cable || '-'}
                                  </span>
                                ))}
                              </span>
                            </div>
                          );
                        })()}
                        {/* Terminal Wiring Conduit / Terminal Wire Tray */}
                        {selectedTerminalSizes.some(Boolean) && form.terminalWiringType && (() => {
                          const terminalDataList = selectedTerminalSizes.map((size, idx) => ({
                            idx,
                            data: getTerminalWiringData(size),
                          }));
                          console.log('[Terminal Card] Terminal Wiring Conduit/Tray - terminalDataList:', terminalDataList);
                          const label = form.terminalWiringType === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน'
                            ? 'Terminal Wiring conduit:'
                            : 'Terminal Wire tray:';
                          return (
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="font-medium text-gray-700">{label}</span>
                              <span className="font-semibold text-gray-900 text-sm text-right">
                                {terminalDataList.map(({ idx, data }) => (
                                  <span key={`terminal-conduit-${idx}`} className="block">
                                    Terminal{idx + 1}: {data?.conduitTray || '-'}
                                  </span>
                                ))}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                )}
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