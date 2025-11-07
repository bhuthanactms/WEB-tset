import React, { useEffect, useState } from 'react'

import { Zap, Car, Paintbrush, Shield, Home, Wrench, MapPin, ChevronDown, ChevronUp } from 'lucide-react'

import { useLocation } from 'react-router-dom'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { Label } from '@/components/ui/label'

import { Input } from '@/components/ui/input'

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

import { Checkbox } from '@/components/ui/checkbox'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import axios from 'axios'
import * as XLSX from 'xlsx'





function MoreDetailCard(props: any) {
  const { stationEquipmentPriceMapping, roofCostMapping, getParkingRoofData, getTrToMdbPrice, trToMdbMapping } = props;

  // ฟังก์ชันช่วยเหลือสำหรับการเข้าถึงข้อมูล Excel
  const getExcelData = (sheetName: string) => {
    return props.excelData?.[sheetName] || [];
  };

  // ฟังก์ชันดึงข้อมูล MCCB Sub จาก Excel sheet "ราคา MCCB ของ CHARGER"
  const getMccbSubData = (mccbSubValue: string, brand: string) => {
    // Mapping สำหรับกรณีพิเศษ (ต้องเช็คก่อน)
    const specialCases: { [key: string]: number } = {
      '640 kW Prime+': 16,
      '4 x 300 A': 17,
      '4 x 350 A': 18,
      '4 x 400 A': 19,
    };

    // เช็คกรณีพิเศษก่อน
    const specialKey = Object.keys(specialCases).find(key =>
      mccbSubValue.includes(key)
    );

    // Mapping ระหว่างค่า A กับ row number
    const mccbValueToRow: { [key: number]: number } = {
      60: 3,
      80: 4,
      125: 5,
      150: 6,
      225: 7,
      300: 8,
      350: 9,
      450: 10,
      630: 11,
      900: 13,
      1200: 14,
    };

    // ดึงข้อมูลจาก Excel sheet "ราคา MCCB ของ CHARGER"
    const chargerMccbSheet = getExcelData('ราคา MCCB ของ CHARGER');
    if (!chargerMccbSheet || chargerMccbSheet.length === 0) {
      console.warn('ไม่พบข้อมูลใน Sheet "ราคา MCCB ของ CHARGER"');
      return null;
    }

    // ถ้าเป็นกรณีพิเศษ ให้ดึงข้อมูลจาก row นั้นโดยตรง
    if (specialKey) {
      const rowNum = specialCases[specialKey];
      const row = chargerMccbSheet.find((r: any) => r.__rowNum__ === rowNum);
      if (!row) {
        console.warn(`ไม่พบ row ${rowNum} ใน Sheet "ราคา MCCB ของ CHARGER"`);
        return null;
      }

      // ดึงข้อมูลตามแบรนด์
      let model, quantity, price;
      if (brand === 'ABB') {
        model = row.__EMPTY_3;
        quantity = row.__EMPTY_2;
        price = row.__EMPTY_4;
      } else if (brand === 'EATON') {
        model = row.__EMPTY_5;
        quantity = row.__EMPTY_2;
        price = row.__EMPTY_6;
      } else if (brand === 'LS') {
        model = row.__EMPTY_7;
        quantity = row.__EMPTY_2;
        price = row.__EMPTY_8;
      } else {
        return null;
      }

      return [{
        value: mccbSubValue,
        rowNum,
        model: model || '-',
        quantity: quantity || '-',
        price: price || '-',
      }];
    }

    // กรณีปกติ: แปลงค่า MCCB Sub (เช่น "100 125 160 A") เป็น array ของตัวเลข
    const values = mccbSubValue.replace(/ A$/, '').trim().split(/\s+/).map(v => parseInt(v)).filter(v => !isNaN(v));

    if (values.length === 0) return null;

    // ดึงข้อมูลสำหรับแต่ละค่า MCCB Sub
    const results = values.map((value) => {
      // หา row number
      const rowNum = mccbValueToRow[value];

      if (!rowNum) {
        console.warn(`ไม่พบ row mapping สำหรับ MCCB Sub ${value} A`);
        return null;
      }

      const row = chargerMccbSheet.find((r: any) => r.__rowNum__ === rowNum);
      if (!row) {
        console.warn(`ไม่พบ row ${rowNum} ใน Sheet "ราคา MCCB ของ CHARGER"`);
        return null;
      }

      // ดึงข้อมูลตามแบรนด์
      let model, quantity, price;
      if (brand === 'ABB') {
        model = row.__EMPTY_3;
        quantity = row.__EMPTY_2;
        price = row.__EMPTY_4;
      } else if (brand === 'EATON') {
        model = row.__EMPTY_5;
        quantity = row.__EMPTY_2;
        price = row.__EMPTY_6;
      } else if (brand === 'LS') {
        model = row.__EMPTY_7;
        quantity = row.__EMPTY_2;
        price = row.__EMPTY_8;
      } else {
        return null;
      }

      return {
        value: `${value} A`,
        rowNum,
        model: model || '-',
        quantity: quantity || '-',
        price: price || '-',
      };
    }).filter(item => item !== null);

    return results.length > 0 ? results : null;
  };

  const [trDistance, setTrDistance] = useState(props.trDistance || '');

  const [trWiringGroup2, setTrWiringGroup2] = useState(props.trWiringGroup2 || '');



  // Per-line states for MDB -> Charger distances and group-2 conduit selections

  const chargersCount = Math.max(1, parseInt(props.numberOfChargers || '1'));

  const initialDistances = Array(chargersCount).fill('').map((_, i) => (props.chargerDistances?.[i] ?? ''));

  const [chargerLineDistances, setChargerLineDistances] = useState<string[]>(initialDistances);
  const [chargerResults, setChargerResults] = useState<{ [key: number]: any }>({});
  const [openChargers, setOpenChargers] = useState<{ [key: number]: boolean }>({});
  const [isCalculating, setIsCalculating] = useState(false);

  // ฟังก์ชันคำนวณราคา MDB to Charger Configuration - New Section
  const calculateMdbToChargerResults = async (distance: number) => {
    try {
      setIsCalculating(true);

      // ใช้ข้อมูลจาก props.excelData ที่ถูก cache ไว้แล้ว (เหมือน TR to MDB)
      const data = props.excelData;

      if (!data) {
        console.error('ไม่มีข้อมูล Excel');
        return;
      }

      console.log('ใช้ข้อมูลจาก props.excelData (cache)');

      const results: any[] = [];

      // Process each charger
      for (let i = 0; i < props.chargerSummary.length; i++) {
        const charger = props.chargerSummary[i];
        const chargerName = charger.name;
        const wiringType = props.chargerWiringType;

        // Extract kW from charger name
        const kwMatch = chargerName.match(/(\d+)\s*kW/i);
        const kw = kwMatch ? parseInt(kwMatch[1]) : 0;

        // Determine sheet and conduit type
        let sheetName = '';
        let conduitType = '';

        if (wiringType === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ') {
          // Get conduit type from radio button
          const selectedConduit = document.querySelector('input[name="conduitType"]:checked') as HTMLInputElement;
          conduitType = selectedConduit?.value || '';

          if (conduitType === 'IMC') {
            sheetName = 'แบบ 9.10';
          } else if (conduitType === 'RSC') {
            sheetName = 'แบบ 9.11';
          }
        } else if (wiringType === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน') {
          sheetName = 'แบบ 9.12';
          conduitType = ''; // No conduit selection needed for underground
        }

        if (!sheetName) {
          console.error('No matching sheet found for wiring type and conduit type');
          continue;
        }

        const sheet = data[sheetName];
        if (!sheet) {
          console.error(`Sheet ${sheetName} not found`);
          continue;
        }

        // Map kW to row number according to specifications
        const rowMapping: { [key: number]: number } = {
          30: 11, 40: 12, 60: 14, 80: 15, 120: 17, 160: 19, 200: 20,
          240: 24, 320: 27, 360: 30, 480: 31, 600: 36, 640: 37, 720: 40, 800: 24
        };

        const rowNum = rowMapping[kw];
        if (!rowNum) {
          console.error(`No row mapping found for ${kw} kW`);
          continue;
        }

        const row = sheet[rowNum];
        if (!row) {
          console.error(`Row ${rowNum} not found in sheet ${sheetName}`);
          continue;
        }

        // Get the correct columns based on sheet
        let code, materialCost, laborCost, totalCost;

        if (sheetName === 'แบบ 9.10') {
          code = row['__EMPTY'];
          materialCost = parseFloat(row['__EMPTY_14']) * distance;
          laborCost = parseFloat(row['__EMPTY_15']) * distance;
          totalCost = parseFloat(row['__EMPTY_16']) * distance;
        } else if (sheetName === 'แบบ 9.11') {
          code = row['f'];
          materialCost = parseFloat(row['__EMPTY_13']) * distance;
          laborCost = parseFloat(row['__EMPTY_14']) * distance;
          totalCost = parseFloat(row['__EMPTY_15']) * distance;
        } else if (sheetName === 'แบบ 9.12') {
          code = row['__EMPTY'];
          materialCost = parseFloat(row['__EMPTY_14']) * distance;
          laborCost = parseFloat(row['__EMPTY_15']) * distance;
          totalCost = parseFloat(row['__EMPTY_16']) * distance;
        }

        results.push({
          chargerName,
          kw,
          code: code || '',
          materialCost: materialCost || 0,
          laborCost: laborCost || 0,
          totalCost: totalCost || 0
        });
      }

      // Display results
      displayMdbChargerResults(results);

    } catch (error) {
      console.error('Error calculating MDB to Charger Configuration:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  // ฟังก์ชันแสดงผลลัพธ์
  const displayMdbChargerResults = (results: any[]) => {
    const resultsContainer = document.getElementById('mdbChargerResults');
    if (!resultsContainer) return;

    if (results.length === 0) {
      resultsContainer.innerHTML = '<div class="text-sm text-gray-500">ไม่พบข้อมูลที่ตรงกับเงื่อนไข</div>';
      return;
    }

    const resultsHTML = results.map((result, index) => `
      <div class="p-3 bg-white rounded border">
        <div class="text-sm font-medium text-gray-700 mb-2">
          Charger ${index + 1}: ${result.chargerName} (${result.kw} kW)
        </div>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div class="p-2 bg-gray-50 rounded">
            <div class="text-xs font-medium text-gray-600">รหัส:</div>
            <div class="text-sm font-semibold text-gray-800">${result.code}</div>
          </div>
          <div class="p-2 bg-gray-50 rounded">
            <div class="text-xs font-medium text-gray-600">ค่าของ:</div>
            <div class="text-sm font-semibold text-gray-800">
              ${result.materialCost.toLocaleString('th-TH')} บาท
            </div>
          </div>
          <div class="p-2 bg-gray-50 rounded">
            <div class="text-xs font-medium text-gray-600">ค่าแรง:</div>
            <div class="text-sm font-semibold text-gray-800">
              ${result.laborCost.toLocaleString('th-TH')} บาท
            </div>
          </div>
          <div class="p-2 bg-yellow-50 rounded border border-yellow-200">
            <div class="text-xs font-medium text-yellow-700">รวมค่าใช้จ่าย:</div>
            <div class="text-sm font-semibold text-yellow-800">
              ${result.totalCost.toLocaleString('th-TH')} บาท
            </div>
          </div>
        </div>
      </div>
    `).join('');

    resultsContainer.innerHTML = resultsHTML;
  };

  // ฟังก์ชันคำนวณราคา MDB to Charger Configuration
  const getMdbToChargerConfig = async (chargerName: string, wiringType: string, conduitType: string, distance: number) => {
    try {
      // ใช้ข้อมูลจาก props.excelData ที่ถูก cache ไว้แล้ว (เหมือน TR to MDB)
      const data = props.excelData;

      if (!data) {
        console.error('ไม่มีข้อมูล Excel');
        return null;
      }

      console.log('ใช้ข้อมูลจาก props.excelData (cache) สำหรับ MDB to Charger');

      // Find the correct sheet based on wiring type and conduit type
      let sheetName = '';
      if (wiringType === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ' && conduitType === 'IMC') {
        sheetName = 'แบบ 9.10';
      } else if (wiringType === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ' && conduitType === 'RSC') {
        sheetName = 'แบบ 9.11';
      } else if (wiringType === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน') {
        sheetName = 'แบบ 9.12';
      }

      if (!sheetName) {
        console.error('No matching sheet found for wiring type and conduit type');
        return null;
      }


      // Extract kW from charger name
      const kwMatch = chargerName.match(/(\d+)\s*kW/i);
      const kw = kwMatch ? parseInt(kwMatch[1]) : 0;

      // Map kW to row number according to specifications
      const rowMapping: { [key: number]: number } = {
        30: 11, 40: 12, 60: 14, 80: 15, 120: 17, 160: 19, 200: 20,
        240: 24, 320: 27, 360: 30, 480: 31, 600: 36, 640: 37, 720: 40, 800: 24
      };

      const rowNum = rowMapping[kw];
      if (!rowNum) {
        console.error(`No row mapping found for ${kw} kW`);
        return null;
      }

      // ใช้ข้อมูลจาก props.excelData ที่ถูก cache ไว้แล้ว
      const sheetData = data[sheetName];
      if (!sheetData) {
        console.error(`Sheet ${sheetName} not found in cached data`);
        return null;
      }

      const row = sheetData.find((r: any) => r.__rowNum__ === rowNum);
      if (!row) {
        console.error(`Row ${rowNum} not found in sheet ${sheetName} in cached data`);
        return null;
      }

      // Get the correct columns based on sheet
      let code, materialCost, laborCost, totalCost;

      if (sheetName === 'แบบ 9.10') {
        code = row['__EMPTY'];
        materialCost = parseFloat(row['__EMPTY_14']) * distance;
        laborCost = parseFloat(row['__EMPTY_15']) * distance;
        totalCost = parseFloat(row['__EMPTY_16']) * distance;
      } else if (sheetName === 'แบบ 9.11') {
        code = row['f'];
        materialCost = parseFloat(row['__EMPTY_13']) * distance;
        laborCost = parseFloat(row['__EMPTY_14']) * distance;
        totalCost = parseFloat(row['__EMPTY_15']) * distance;
      } else if (sheetName === 'แบบ 9.12') {
        code = row['__EMPTY'];
        materialCost = parseFloat(row['__EMPTY_14']) * distance;
        laborCost = parseFloat(row['__EMPTY_15']) * distance;
        totalCost = parseFloat(row['__EMPTY_16']) * distance;
      }

      return {
        code: code || '',
        materialCost: materialCost || 0,
        laborCost: laborCost || 0,
        totalCost: totalCost || 0
      };

    } catch (error) {
      console.error('Error getting MDB to Charger Configuration:', error);
      return null;
    }
  };

  const initialConduitChoices = Array(chargersCount).fill('').map((_, i) => (props.chargerWiringGroup2All?.[i] ?? ''));

  const [chargerConduitChoices, setChargerConduitChoices] = useState<string[]>(initialConduitChoices);




  // New states for additional features

  const [parkingSlots, setParkingSlots] = useState(props.parkingSlots || '1');

  const [floorPainting, setFloorPainting] = useState(props.floorPainting || '');

  const [roofCoverType, setRoofCoverType] = useState(props.roofCoverType || '');

  const [roofCoverWidth, setRoofCoverWidth] = useState(props.roofCoverWidth || '');

  const [roofCoverLength, setRoofCoverLength] = useState(props.roofCoverLength || '');

  const [roofCoverM2, setRoofCoverM2] = useState(props.roofCoverM2 || '');

  const [mdbRoof, setMdbRoof] = useState(props.mdbRoof || 'no');

  const [mdbRoofType, setMdbRoofType] = useState(props.mdbRoofType || '');

  const [mdbRoofWidth, setMdbRoofWidth] = useState(props.mdbRoofWidth || '');

  const [mdbRoofLength, setMdbRoofLength] = useState(props.mdbRoofLength || '');

  const [mdbRoofM2, setMdbRoofM2] = useState(props.mdbRoofM2 || '');

  const [chargerRoofType, setChargerRoofType] = useState(props.chargerRoofType || 'no');

  const [travelDistance, setTravelDistance] = useState(props.travelDistance || '');

  const [trainingWork, setTrainingWork] = useState(props.trainingWork || 'no');

  const [travelCostResult, setTravelCostResult] = useState(props.travelCostResult || 0);

  const [transformerSelection, setTransformerSelection] = useState(props.transformerSelection || 'no');

  const [transformerType, setTransformerType] = useState(props.transformerType || '');
  const [lowVoltageRequest, setLowVoltageRequest] = useState<'low-voltage' | 'use-transformer' | ''>('');
  const [lowVoltageDistance2, setLowVoltageDistance2] = useState<string>('');
  const [lowVoltageDistance3, setLowVoltageDistance3] = useState<string>('');

  // State สำหรับระบบแรงสูง
  const [highVoltageSystem, setHighVoltageSystem] = useState<'yes' | 'no'>('no');
  const [highVoltageDistance, setHighVoltageDistance] = useState<string>('');

  const [transformerPrice, setTransformerPrice] = useState<any>(null);

  const [mccbMainBrand, setMccbMainBrand] = useState(props.mccbMainBrand || '');

  const [mccbSubBrand, setMccbSubBrand] = useState('ABB');

  const [mdbConfiguration, setMdbConfiguration] = useState<any>(null);

  // State สำหรับสถานที่การติดตั้ง
  const [installationLocation, setInstallationLocation] = useState<'inside-station' | 'outside-station' | ''>('');
  const [installationLocationBrand, setInstallationLocationBrand] = useState<'ABB' | 'EATON' | 'LS'>('ABB');

  const [trMdbSelection, setTrMdbSelection] = useState(props.trMdbSelection || 'no');

  const [mdbSelection, setMdbSelection] = useState(props.mdbSelection || 'no');

  const [chargerSelection, setChargerSelection] = useState(props.chargerSelection || 'no');

  // Auto calculate when values change
  useEffect(() => {
    const calculateAll = async () => {
      for (let i = 0; i < chargersCount; i++) {
        const distance = parseFloat(chargerLineDistances[i] || '0');
        const conduitType = chargerConduitChoices[i] || '';
        const chargerName = props.chargerSummary?.[i]?.name || '';

        // For underground (กลุ่ม 5 ฝังใต้ดิน), conduitType is not required
        const isUnderground = props.chargerWiringType === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 5 ฝังใต้ดิน';
        const hasRequiredData = distance > 0 && chargerName && props.chargerWiringType;
        const hasConduitType = isUnderground || (conduitType && conduitType !== '');

        if (hasRequiredData && hasConduitType) {
          try {
            const result = await getMdbToChargerConfig(chargerName, props.chargerWiringType, conduitType, distance);
            if (result) {
              setChargerResults(prev => ({
                ...prev,
                [i]: result
              }));
            }
          } catch (error) {
            console.error('Error calculating:', error);
          }
        }
      }
    };

    if (chargerSelection === 'yes') {
      calculateAll();
    }
  }, [chargerLineDistances, chargerConduitChoices, props.chargerWiringType, props.chargerSummary, chargersCount, chargerSelection]);

  const [additionalSelection, setAdditionalSelection] = useState(props.additionalSelection || 'no');

  // State สำหรับเลือก "มี" / "ไม่มี" ของแต่ละหัวข้อหลัก
  const [equipmentSelection, setEquipmentSelection] = useState(props.equipmentSelection || 'no');
  const [communicationSelection, setCommunicationSelection] = useState(props.communicationSelection || 'no');
  const [concreteSelection, setConcreteSelection] = useState(props.concreteSelection || 'no');
  const [paintingSelection, setPaintingSelection] = useState(props.paintingSelection || 'no');

  // New state variables for restructured Additional Features
  // Section 1: อุปกรณ์ประกอบสถานี (yes=มี, no=ไม่มี)
  const [bumperPoles, setBumperPoles] = useState(props.bumperPoles || 'no');
  const [wheelStops, setWheelStops] = useState(props.wheelStops || 'no');
  const [fireExtinguisherCabinet, setFireExtinguisherCabinet] = useState(props.fireExtinguisherCabinet || 'no');
  const [signage, setSignage] = useState(props.signage || 'no');

  // Section 2: ระบบสื่อสาร (yes=มี, no=ไม่มี)
  const [wifi4gHub, setWifi4gHub] = useState(props.wifi4gHub || 'no');
  const [cctv, setCctv] = useState(props.cctv || 'no');
  const [lighting, setLighting] = useState(props.lighting || 'no');
  const [accSystem, setAccSystem] = useState(props.accSystem || 'no');

  // Section 3: งานปูน (yes=มี, no=ไม่มี)
  const [mdbConcreteBase, setMdbConcreteBase] = useState(props.mdbConcreteBase || 'no');
  const [chargerConcreteBase, setChargerConcreteBase] = useState(props.chargerConcreteBase || 'no');
  const [parkingConcreteFloor, setParkingConcreteFloor] = useState(props.parkingConcreteFloor || 'no');
  const [generalConcreteFloor, setGeneralConcreteFloor] = useState(props.generalConcreteFloor || 'no');
  const [generalConcreteFloorArea, setGeneralConcreteFloorArea] = useState(props.generalConcreteFloorArea || '');

  // Section 4: งานทาสีช่องจอด (yes=มี, no=ไม่มี)
  const [parkingPaintType, setParkingPaintType] = useState(props.parkingPaintType || '');
  const [hasSelectedParkingPaintType, setHasSelectedParkingPaintType] = useState(props.parkingPaintType !== undefined);
  const [sideLineMarking, setSideLineMarking] = useState(props.sideLineMarking || 'no');
  const [centerPattern, setCenterPattern] = useState(props.centerPattern || '');
  const [centerPatternOriginal, setCenterPatternOriginal] = useState(props.centerPatternOriginal || 'no');
  const [centerPatternNew, setCenterPatternNew] = useState(props.centerPatternNew || 'no');

  const handleParkingPaintTypeChange = (value: string) => {
    setParkingPaintType(value);
    setHasSelectedParkingPaintType(true);
  };

  const selectedPaintItem = stationEquipmentPriceMapping
    ? stationEquipmentPriceMapping[`paint-${parkingPaintType}`]
    : undefined;

  const parseCount = (value: string | number | undefined, fallback: number) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const parsed = parseInt((value ?? '').toString(), 10);
    return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
  };

  const toNumber = (value: any) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const parsed = parseFloat((value ?? '').toString());
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const parsePrice = (value: any) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const normalized = (value ?? '').toString().replace(/[^0-9.\-]/g, '');
    const parsed = parseFloat(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const formatCurrency = (value: number) => {
    const numericValue = typeof value === 'number' ? value : parsePrice(value);
    return numericValue.toLocaleString('th-TH');
  };

  const parkingSlotsCount = parseCount(parkingSlots, 1);
  const featureChargersCount = parseCount(props.numberOfChargers, 1);

  const equipmentTotals = (() => {
    const totals = { material: 0, labor: 0, total: 0 };
    if (equipmentSelection !== 'yes' || !stationEquipmentPriceMapping) {
      return totals;
    }

    if (bumperPoles === 'yes') {
      const item = stationEquipmentPriceMapping['bumper-poles'];
      if (item) {
        const quantity = featureChargersCount;
        totals.material += item.materialPrice * quantity;
        totals.labor += item.laborPrice * quantity;
        totals.total += item.totalPrice * quantity;
      }
    }

    if (wheelStops === 'yes') {
      const item = stationEquipmentPriceMapping['wheel-stops'];
      if (item) {
        totals.material += item.materialPrice * parkingSlotsCount;
        totals.labor += item.laborPrice * parkingSlotsCount;
        totals.total += item.totalPrice * parkingSlotsCount;
      }
    }

    if (fireExtinguisherCabinet === 'yes') {
      const item = stationEquipmentPriceMapping['fire-extinguisher'];
      if (item) {
        totals.material += item.materialPrice * featureChargersCount;
        totals.labor += item.laborPrice * featureChargersCount;
        totals.total += item.totalPrice * featureChargersCount;
      }
    }

    if (signage === 'yes') {
      const item = stationEquipmentPriceMapping['signage'];
      if (item) {
        totals.material += item.materialPrice * featureChargersCount;
        totals.labor += item.laborPrice * featureChargersCount;
        totals.total += item.totalPrice * featureChargersCount;
      }
    }

    return totals;
  })();

  const communicationTotals = (() => {
    const totals = { material: 0, labor: 0, total: 0 };
    if (communicationSelection !== 'yes' || !stationEquipmentPriceMapping) {
      return totals;
    }

    if (wifi4gHub === 'yes') {
      const item = stationEquipmentPriceMapping['wifi-4g-hub'];
      if (item) {
        totals.material += item.materialPrice;
        totals.labor += item.laborPrice;
        totals.total += item.totalPrice;
      }
    }

    if (cctv === 'yes') {
      const item = stationEquipmentPriceMapping['cctv'];
      if (item) {
        const quantity = 4;
        totals.material += item.materialPrice * quantity;
        totals.labor += item.laborPrice * quantity;
        totals.total += item.totalPrice * quantity;
      }
    }

    if (lighting === 'yes') {
      const item = stationEquipmentPriceMapping['lighting'];
      if (item) {
        const quantity = 3;
        totals.material += item.materialPrice * quantity;
        totals.labor += item.laborPrice * quantity;
        totals.total += item.totalPrice * quantity;
      }
    }

    if (accSystem === 'yes') {
      const item = stationEquipmentPriceMapping['acc-system'];
      if (item) {
        totals.material += item.materialPrice;
        totals.labor += item.laborPrice;
        totals.total += item.totalPrice;
      }
    }

    return totals;
  })();

  const concreteTotals = (() => {
    const totals = { material: 0, labor: 0, total: 0 };
    if (concreteSelection !== 'yes' || !stationEquipmentPriceMapping) {
      return totals;
    }

    if (mdbConcreteBase === 'yes') {
      const item = stationEquipmentPriceMapping['mdb-concrete-base'];
      if (item) {
        totals.material += item.materialPrice;
        totals.labor += item.laborPrice;
        totals.total += item.totalPrice;
      }
    }

    if (chargerConcreteBase === 'yes') {
      const item = stationEquipmentPriceMapping['charger-concrete-base'];
      if (item) {
        totals.material += item.materialPrice * featureChargersCount;
        totals.labor += item.laborPrice * featureChargersCount;
        totals.total += item.totalPrice * featureChargersCount;
      }
    }

    if (parkingConcreteFloor === 'yes') {
      const item = stationEquipmentPriceMapping['parking-concrete-floor'];
      if (item) {
        totals.material += item.materialPrice * parkingSlotsCount;
        totals.labor += item.laborPrice * parkingSlotsCount;
        totals.total += item.totalPrice * parkingSlotsCount;
      }
    }

    if (generalConcreteFloor === 'yes') {
      const item = stationEquipmentPriceMapping['general-concrete-floor'];
      if (item) {
        totals.material += item.materialPrice;
        totals.labor += item.laborPrice;
        totals.total += item.totalPrice;
      }
    }

    return totals;
  })();

  const paintingTotals = (() => {
    const totals = { material: 0, labor: 0, total: 0 };
    if (paintingSelection !== 'yes') {
      return totals;
    }

    if (selectedPaintItem) {
      totals.material += selectedPaintItem.materialPrice * parkingSlotsCount;
      totals.labor += selectedPaintItem.laborPrice * parkingSlotsCount;
      totals.total += selectedPaintItem.totalPrice * parkingSlotsCount;
    }

    if (sideLineMarking === 'yes' && stationEquipmentPriceMapping) {
      const item = stationEquipmentPriceMapping['side-line-marking'];
      if (item) {
        totals.material += item.materialPrice * parkingSlotsCount;
        totals.labor += item.laborPrice * parkingSlotsCount;
        totals.total += item.totalPrice * parkingSlotsCount;
      }
    }

    if (centerPatternOriginal === 'yes' && stationEquipmentPriceMapping) {
      const item = stationEquipmentPriceMapping['center-pattern-original'];
      if (item) {
        totals.material += item.materialPrice * parkingSlotsCount;
        totals.labor += item.laborPrice * parkingSlotsCount;
        totals.total += item.totalPrice * parkingSlotsCount;
      }
    }

    if (centerPatternNew === 'yes' && stationEquipmentPriceMapping) {
      const item = stationEquipmentPriceMapping['center-pattern-new'];
      if (item) {
        totals.material += item.materialPrice * parkingSlotsCount;
        totals.labor += item.laborPrice * parkingSlotsCount;
        totals.total += item.totalPrice * parkingSlotsCount;
      }
    }

    return totals;
  })();

  const parkingRoofData = roofCoverType === 'yes' && getParkingRoofData
    ? getParkingRoofData(parkingSlotsCount)
    : null;

  const parkingRoofTotals = parkingRoofData
    ? {
      material: toNumber(parkingRoofData.materialPrice),
      labor: toNumber(parkingRoofData.laborPrice),
      total: toNumber(parkingRoofData.totalPrice)
    }
    : { material: 0, labor: 0, total: 0 };

  const mdbRoofData = (() => {
    if (mdbRoof !== 'yes') return null;
    const roofSheet = getExcelData('ตารางต้นทุนหลังคาสถานี');
    if (!roofSheet || roofSheet.length === 0) return null;
    const row = roofSheet.find((entry: any) => entry.__rowNum__ === 14);
    if (!row) return null;
    return {
      materialPrice: toNumber(row.__EMPTY_4),
      laborPrice: toNumber(row.__EMPTY_5),
      totalPrice: toNumber(row.__EMPTY_6)
    };
  })();
  const mdbRoofTotals = mdbRoofData
    ? {
      material: mdbRoofData.materialPrice,
      labor: mdbRoofData.laborPrice,
      total: mdbRoofData.totalPrice
    }
    : { material: 0, labor: 0, total: 0 };

  const chargerRoofData = (() => {
    if (!chargerRoofType || chargerRoofType === 'no') return null;
    const roofSheet = getExcelData('ตารางต้นทุนหลังคาสถานี');
    if (!roofSheet || roofSheet.length === 0) return null;

    let rowNum: number | undefined;
    if (chargerRoofType === 'normal') rowNum = 15;
    if (chargerRoofType === 'composite') rowNum = 16;
    if (!rowNum) return null;

    const row = roofSheet.find((entry: any) => entry.__rowNum__ === rowNum);
    if (!row) return null;

    const materialUnit = toNumber(row.__EMPTY_4);
    const laborUnit = toNumber(row.__EMPTY_5);
    const totalUnit = toNumber(row.__EMPTY_6);

    return {
      materialPrice: materialUnit * featureChargersCount,
      laborPrice: laborUnit * featureChargersCount,
      totalPrice: totalUnit * featureChargersCount
    };
  })();

  const chargerRoofTotals = chargerRoofData
    ? {
      material: chargerRoofData.materialPrice,
      labor: chargerRoofData.laborPrice,
      total: chargerRoofData.totalPrice
    }
    : { material: 0, labor: 0, total: 0 };

  const additionalFeaturesTotals = {
    material: equipmentTotals.material + communicationTotals.material + concreteTotals.material + paintingTotals.material + parkingRoofTotals.material + mdbRoofTotals.material + chargerRoofTotals.material,
    labor: equipmentTotals.labor + communicationTotals.labor + concreteTotals.labor + paintingTotals.labor + parkingRoofTotals.labor + mdbRoofTotals.labor + chargerRoofTotals.labor,
    total: equipmentTotals.total + communicationTotals.total + concreteTotals.total + paintingTotals.total + parkingRoofTotals.total + mdbRoofTotals.total + chargerRoofTotals.total
  };

  const transformerTotals = React.useMemo(() => {
    const emptyTotals = { material: 0, labor: 0, total: 0 };
    const transformerSize = parseInt(props.transformer || '0', 10) || 0;

    if (!transformerSize) {
      return emptyTotals;
    }

    if (props.powerAuthority === 'MEA' && transformerSize <= 400 && lowVoltageRequest === 'low-voltage') {
      const lowVoltageSheet = getExcelData('ตารางระบบงานแรงสูง');
      if (!lowVoltageSheet || lowVoltageSheet.length === 0) {
        return emptyTotals;
      }

      const row2 = lowVoltageSheet.find((row: any) => row.__rowNum__ === 2);
      const row3 = lowVoltageSheet.find((row: any) => row.__rowNum__ === 3);

      if (!row2 || !row3) {
        return emptyTotals;
      }

      const calculateRowTotals = (row: any, distanceValue: string) => {
        const quantity = row.__EMPTY_3 || '';
        const isDistance = typeof quantity === 'string' && (quantity.includes('ม.') || quantity.includes('เมตร'));
        const distance = parseFloat(distanceValue) || 0;
        const materialUnit = parseFloat(row.__EMPTY_4 || 0) || 0;
        const laborUnit = parseFloat(row.__EMPTY_5 || 0) || 0;

        const material = isDistance ? materialUnit * distance : materialUnit;
        const labor = isDistance ? laborUnit * distance : laborUnit;

        return {
          material,
          labor,
          total: material + labor,
        };
      };

      const row2Totals = calculateRowTotals(row2, lowVoltageDistance2);
      const row3Totals = calculateRowTotals(row3, lowVoltageDistance3);

      return {
        material: row2Totals.material + row3Totals.material,
        labor: row2Totals.labor + row3Totals.labor,
        total: row2Totals.total + row3Totals.total,
      };
    }

    if (transformerSelection === 'yes' && transformerPrice) {
      const material = toNumber(transformerPrice.laborCost); // ค่าของ = ราคาค่าแรง
      const labor = toNumber(transformerPrice.installationCost); // ค่าแรง = ราคาค่าติดตั้ง
      const totalInstallation = toNumber(transformerPrice.totalInstallationCost);

      const total = totalInstallation > 0 ? totalInstallation : material + labor;

      return { material, labor, total };
    }

    return emptyTotals;
  }, [props.powerAuthority, props.transformer, lowVoltageRequest, lowVoltageDistance2, lowVoltageDistance3, transformerSelection, transformerPrice]);

  const highVoltageTotals = React.useMemo(() => {
    const emptyTotals = { material: 0, labor: 0, total: 0 };
    const transformerSize = parseInt(props.transformer || '0', 10) || 0;
    const shouldShowCard = !(props.powerAuthority === 'MEA' && transformerSize <= 400 && lowVoltageRequest === 'low-voltage');

    if (!shouldShowCard || highVoltageSystem !== 'yes' || !transformerType) {
      return emptyTotals;
    }

    const determineRows = () => {
      const powerAuthority = props.powerAuthority;
      const currentTransformerType = transformerType;

      if (powerAuthority === 'PEA' && transformerSize <= 250 && currentTransformerType === '22kv-416v') {
        return { mainRow: 5, detailRows: [7, 8], distanceRow: 13 };
      }

      if (powerAuthority === 'PEA' && transformerSize >= 315 && transformerSize <= 1000 && currentTransformerType === '22kv-416v') {
        return { mainRow: 9, detailRows: [11, 12], distanceRow: 13 };
      }

      if (powerAuthority === 'MEA' && transformerSize >= 315 && transformerSize <= 1000 && currentTransformerType === '22kv-416v') {
        if (transformerSize <= 400 && lowVoltageRequest !== 'use-transformer') {
          return null;
        }
        return { mainRow: 9, detailRows: [11, 12], distanceRow: 13 };
      }

      if (powerAuthority === 'PEA' && transformerSize <= 250 && currentTransformerType === '33kv-316v') {
        return { mainRow: 14, detailRows: [16, 17], distanceRow: 22 };
      }

      if (powerAuthority === 'PEA' && transformerSize >= 315 && transformerSize <= 1000 && currentTransformerType === '33kv-316v') {
        return { mainRow: 18, detailRows: [20, 21], distanceRow: 22 };
      }

      return null;
    };

    const rows = determineRows();

    if (!rows) {
      return emptyTotals;
    }

    const highVoltageSheet = getExcelData('ตารางระบบงานแรงสูง');

    if (!highVoltageSheet || highVoltageSheet.length === 0) {
      return emptyTotals;
    }

    const mainRow = highVoltageSheet.find((r: any) => r.__rowNum__ === rows.mainRow);
    const distanceRow = highVoltageSheet.find((r: any) => r.__rowNum__ === rows.distanceRow);
    const detailRow1 = highVoltageSheet.find((r: any) => r.__rowNum__ === rows.detailRows[0]);
    const detailRow2 = highVoltageSheet.find((r: any) => r.__rowNum__ === rows.detailRows[1]);
    const poleRow = highVoltageSheet.find((r: any) => r.__rowNum__ === 23);

    if (!mainRow || !distanceRow || !detailRow1 || !detailRow2) {
      return emptyTotals;
    }

    const mainMaterialPrice = parseFloat(mainRow.__EMPTY_4 || 0) || 0;
    const mainLaborPrice = parseFloat(mainRow.__EMPTY_5 || 0) || 0;
    const mainTotalPrice = parseFloat(mainRow.__EMPTY_6 || 0) || 0;

    const distance = parseFloat(highVoltageDistance) || 0;
    const distanceMaterialPerUnit = parseFloat(distanceRow.__EMPTY_4 || 0) || 0;
    const distanceLaborPerUnit = parseFloat(distanceRow.__EMPTY_5 || 0) || 0;
    const distanceTotalPerUnit = parseFloat(distanceRow.__EMPTY_6 || 0) || 0;

    const distanceMaterialPrice = distanceMaterialPerUnit * distance;
    const distanceLaborPrice = distanceLaborPerUnit * distance;
    const distanceTotalPrice = distanceTotalPerUnit * distance;

    const poleCount = distance > 30 ? Math.floor((distance - 30) / 30) + 1 : 0;
    let poleMaterialPrice = 0;
    let poleLaborPrice = 0;
    let poleTotalPrice = 0;

    if (poleCount > 0 && poleRow) {
      const poleMaterialPerUnit = parseFloat(poleRow.__EMPTY_4 || 0) || 0;
      const poleLaborPerUnit = parseFloat(poleRow.__EMPTY_5 || 0) || 0;
      const poleTotalPerUnit = parseFloat(poleRow.__EMPTY_6 || 0) || 0;

      poleMaterialPrice = poleMaterialPerUnit * poleCount;
      poleLaborPrice = poleLaborPerUnit * poleCount;
      poleTotalPrice = poleTotalPerUnit * poleCount;
    }

    return {
      material: mainMaterialPrice + distanceMaterialPrice + poleMaterialPrice,
      labor: mainLaborPrice + distanceLaborPrice + poleLaborPrice,
      total: mainTotalPrice + distanceTotalPrice + poleTotalPrice,
    };
  }, [props.powerAuthority, props.transformer, lowVoltageRequest, highVoltageSystem, transformerType, highVoltageDistance]);

  const installationTotals = React.useMemo(() => {
    const emptyTotals = { material: 0, labor: 0, total: 0 };

    if (installationLocation !== 'inside-station') {
      return emptyTotals;
    }

    const transformerSizeStr = props.transformer || '';
    const transformerSize = parseInt(transformerSizeStr, 10) || 0;
    const powerAuthority = props.powerAuthority;

    const getInstallationRowNumber = (): number | null => {
      if (powerAuthority === 'MEA') {
        if (lowVoltageRequest === 'low-voltage') {
          return 6;
        }
        if (transformerSize === 400) return 7;
        if (transformerSize === 500) return 8;
        if (transformerSize === 630) return 9;
        if (transformerSize === 800) return 10;
        if (transformerSize === 1000) return 11;
        if (transformerSize === 1250) return 12;
        if (transformerSize === 1500) return 13;
      }

      if (powerAuthority === 'PEA') {
        if (transformerSize === 100) return 3;
        if (transformerSize === 160) return 4;
        if (transformerSize === 250) return 5;
        if (transformerSize === 315) return 6;
        if (transformerSize === 400) return 7;
        if (transformerSize === 500) return 8;
        if (transformerSize === 630) return 9;
        if (transformerSize === 800) return 10;
        if (transformerSize === 1000) return 11;
        if (transformerSize === 1250) return 12;
        if (transformerSize === 1500) return 13;
      }

      return null;
    };

    const rowNum = getInstallationRowNumber();

    if (!rowNum) {
      return emptyTotals;
    }

    const availableSheetNames = props.excelData ? Object.keys(props.excelData) : [];
    const possibleSheetNames = availableSheetNames.filter(name =>
      (name.includes('DISCONNECTO') || name.includes('DISCONNECTOR')) &&
      !name.includes('MDB')
    );
    const sheetName = possibleSheetNames.length > 0
      ? possibleSheetNames[0]
      : 'ตารางขนาดและราคาตู้ DISCONNECTO';

    const disconnectorSheet = getExcelData(sheetName);

    if (!disconnectorSheet || disconnectorSheet.length === 0) {
      return emptyTotals;
    }

    const row = disconnectorSheet.find((r: any) => r.__rowNum__ === rowNum);

    if (!row) {
      return emptyTotals;
    }

    const cabinetEmptyPrice = parsePrice(row.__EMPTY_20);
    let brandPrice = 0;
    if (installationLocationBrand === 'ABB') {
      brandPrice = parsePrice(row.__EMPTY_22);
    } else if (installationLocationBrand === 'EATON') {
      brandPrice = parsePrice(row.__EMPTY_24);
    } else if (installationLocationBrand === 'LS') {
      brandPrice = parsePrice(row.__EMPTY_23);
    }

    const busbarAcc = parsePrice(row.__EMPTY_30);
    const siteInstallationCost = parsePrice(row.__EMPTY_32);

    const material = cabinetEmptyPrice + brandPrice + busbarAcc;
    const labor = siteInstallationCost;
    const total = material + labor;

    return {
      material,
      labor,
      total,
    };
  }, [installationLocation, props.transformer, props.powerAuthority, lowVoltageRequest, installationLocationBrand, props.excelData]);

  const trToMdbTotals = React.useMemo(() => {
    const emptyTotals = { material: 0, labor: 0, total: 0 };

    if (trMdbSelection !== 'yes') {
      return emptyTotals;
    }

    const distance = parseFloat(trDistance || '0');

    if (!distance || distance <= 0) {
      return emptyTotals;
    }

    const conduit = props.trWiringType === 'ร้อยท่อเดินในอากาศ กลุ่ม 2' ? trWiringGroup2 : '';
    const priceData = getTrToMdbPrice(
      props.trWiringType,
      conduit,
      props.powerAuthority,
      props.transformer,
      distance
    );

    if (!priceData) {
      return emptyTotals;
    }

    return {
      material: parsePrice(priceData.materialPrice),
      labor: parsePrice(priceData.laborPrice),
      total: parsePrice(priceData.totalPrice),
    };
  }, [trMdbSelection, trDistance, props.trWiringType, trWiringGroup2, props.powerAuthority, props.transformer, getTrToMdbPrice]);

  const mdbTotals = React.useMemo(() => {
    const emptyTotals = { material: 0, labor: 0, total: 0 };

    if (mdbSelection !== 'yes' || !mdbConfiguration) {
      return emptyTotals;
    }

    let mainPrice = 0;
    if (mdbConfiguration.product?.MDBMPric && mdbConfiguration.product.MDBMPric !== '-') {
      mainPrice = parsePrice(mdbConfiguration.product.MDBMPric);
    }

    let totalSubPrice = 0;
    if (mccbSubBrand && Array.isArray(props.mdbSubs)) {
      props.mdbSubs.forEach((val: string) => {
        const mccbSubData = getMccbSubData(val, mccbSubBrand);
        if (mccbSubData && Array.isArray(mccbSubData)) {
          mccbSubData.forEach((item: any) => {
            if (item.price && item.price !== '-') {
              totalSubPrice += parsePrice(item.price);
            }
          });
        }
      });
    }

    const material = mainPrice + totalSubPrice;
    const total = material;

    if (total <= 0) {
      return emptyTotals;
    }

    return {
      material,
      labor: 0,
      total,
    };
  }, [mdbSelection, mdbConfiguration, mccbSubBrand, props.mdbSubs]);

  const mdbToChargerTotals = React.useMemo(() => {
    const emptyTotals = { material: 0, labor: 0, total: 0 };

    if (chargerSelection !== 'yes') {
      return emptyTotals;
    }

    const results = Object.values(chargerResults || {});

    if (!results.length) {
      return emptyTotals;
    }

    const material = results.reduce((acc, result: any) => acc + parsePrice(result.materialCost), 0);
    const labor = results.reduce((acc, result: any) => acc + parsePrice(result.laborCost), 0);

    return {
      material,
      labor,
      total: material + labor,
    };
  }, [chargerSelection, chargerResults]);

  const travelTotals = React.useMemo(() => {
    const total = parsePrice(travelCostResult);
    return {
      material: 0,
      labor: total,
      total,
    };
  }, [travelCostResult]);

  const stationTotals = React.useMemo(() => {
    const totals = [
      transformerTotals,
      highVoltageTotals,
      installationTotals,
      trToMdbTotals,
      mdbTotals,
      mdbToChargerTotals,
      additionalFeaturesTotals,
      travelTotals,
    ];

    return totals.reduce((acc, current) => {
      return {
        material: acc.material + (current?.material || 0),
        labor: acc.labor + (current?.labor || 0),
        total: acc.total + (current?.total || 0),
      };
    }, { material: 0, labor: 0, total: 0 });
  }, [transformerTotals, highVoltageTotals, installationTotals, trToMdbTotals, mdbTotals, mdbToChargerTotals, additionalFeaturesTotals, travelTotals]);

  const stationCostSections = React.useMemo(() => ([
    {
      key: 'transformer',
      label: '1. รวมค่าใช้จ่าย ของ Transformer Size (ขนาดหม้อแปลง)',
      totals: transformerTotals,
    },
    {
      key: 'high-voltage',
      label: '2. รวมค่าใช้จ่าย ของ ระบบแรงสูง',
      totals: highVoltageTotals,
    },
    {
      key: 'installation',
      label: '3. ราคาสินค้า ของ สถานที่การติดตั้ง',
      totals: installationTotals,
    },
    {
      key: 'tr-to-mdb',
      label: '4. ราคาสายไฟ จากหม้อแปลงเข้าMDB ของ TR to MDB Configuration (การตั้งค่า TR ไป MDB)',
      totals: trToMdbTotals,
    },
    {
      key: 'mdb',
      label: '5. ราคารวม MDB: ของ MDB Configuration (การตั้งค่า MDB)',
      totals: mdbTotals,
    },
    {
      key: 'mdb-to-charger',
      label: '6. รวมค่าใช้จ่ายทั้งหมด ของ MDB to Charger Configuration (การตั้งค่า MDB ไป Charger)',
      totals: mdbToChargerTotals,
    },
    {
      key: 'additional',
      label: '7. ราคารวมฟีเจอร์และตัวเลือกเพิ่มเติม ของ Additional Features & Options',
      totals: additionalFeaturesTotals,
    },
    {
      key: 'travel',
      label: '8. ค่าเดินทาง: ของ ค่าเดินทาง (Travel Cost)',
      totals: travelTotals,
    },
  ]), [
    transformerTotals,
    highVoltageTotals,
    installationTotals,
    trToMdbTotals,
    mdbTotals,
    mdbToChargerTotals,
    additionalFeaturesTotals,
    travelTotals,
  ]);

  const stationSectionsForDisplay = React.useMemo(() => {
    const enriched = stationCostSections.map((section, index) => {
      const totals = section.totals || { material: 0, labor: 0, total: 0 };
      const hasValue = (totals.material || 0) > 0 || (totals.labor || 0) > 0 || (totals.total || 0) > 0;
      return {
        ...section,
        index: index + 1,
        totals,
        hasValue,
      };
    });

    const nonZeroSections = enriched.filter(section => section.hasValue);
    return nonZeroSections.length > 0 ? nonZeroSections : enriched;
  }, [stationCostSections]);

  // State สำหรับเก็บสถานะการเปิด/ปิดของแต่ละส่วนใน Additional Features & Options
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    'equipment': false,
    'communication': false,
    'concrete': false,
    'painting': false,
    'roof-cover': false,
    'mdb-roof': false,
    'charger-roof': false
  });

  // State สำหรับเก็บสถานะการเปิด/ปิดของแต่ละรายการย่อย
  const [openItems, setOpenItems] = useState<{ [key: string]: boolean }>({});
  // ฟังก์ชันคำนวณค่าเดินทาง

  const calculateTravelCost = () => {
    const distance = parseFloat(travelDistance) || 0;
    const numberOfChargers = Math.max(1, Math.min(6, parseInt(props.numberOfChargers) || 1));

    const travelSheet = getExcelData('ตารางสรุปต้นทุนค่าเดินทาง , ค่า') || getExcelData('ตารางสรุปต้นทุนค่าเดินทาง');
    if (!travelSheet || travelSheet.length === 0) {
      console.warn('ไม่พบข้อมูลใน Sheet "ตารางสรุปต้นทุนค่าเดินทาง"');
      setTravelCostResult(0);
      return 0;
    }

    const travelConfig: {
      threshold: number;
      belowOrEqualRow: number;
      aboveRow: number;
    }[] = [
        { threshold: 80, belowOrEqualRow: 2, aboveRow: 4 },
        { threshold: 88, belowOrEqualRow: 6, aboveRow: 8 },
        { threshold: 78, belowOrEqualRow: 10, aboveRow: 12 },
        { threshold: 101, belowOrEqualRow: 14, aboveRow: 16 },
        { threshold: 102, belowOrEqualRow: 18, aboveRow: 20 },
        { threshold: 102, belowOrEqualRow: 22, aboveRow: 24 },
      ];

    const config = travelConfig[numberOfChargers - 1];
    if (!config) {
      setTravelCostResult(0);
      return 0;
    }

    const isWithinThreshold = distance <= config.threshold;
    const rowNum = isWithinThreshold ? config.belowOrEqualRow : config.aboveRow;
    const row = travelSheet.find((entry: any) => entry.__rowNum__ === rowNum);

    if (!row) {
      console.warn(`ไม่พบ row ${rowNum} ใน Sheet "ตารางสรุปต้นทุนค่าเดินทาง"`);
      setTravelCostResult(0);
      return 0;
    }

    const materialRate = toNumber(row.__EMPTY_4);
    const laborRate = toNumber(row.__EMPTY_5);
    const extraCharge = toNumber(row.__EMPTY_7);

    let cost = 0;
    if (isWithinThreshold) {
      cost = (materialRate + laborRate) * distance;
    } else {
      cost = (materialRate * distance) + laborRate + extraCharge;
    }

    if (trainingWork === 'yes') {
      const trainingRow = travelSheet.find((entry: any) => entry.__rowNum__ === 2);
      if (trainingRow) {
        const trainingMaterial = toNumber(trainingRow.__EMPTY_4);
        const trainingLabor = toNumber(trainingRow.__EMPTY_5);
        const trainingExtra = toNumber(trainingRow.__EMPTY_7);
        const trainingCost = (trainingMaterial * distance) + trainingLabor + trainingExtra;
        cost += trainingCost;
      }
    }

    setTravelCostResult(cost);
    return cost;
  };



  // คำนวณเมื่อมีการเปลี่ยนแปลง

  React.useEffect(() => {

    if (travelDistance) {

      calculateTravelCost();

    }

  }, [travelDistance, trainingWork, transformerSelection, trMdbSelection, mdbSelection, chargerSelection, props.numberOfChargers]);



  // รีเซ็ต lowVoltageRequest เมื่อเงื่อนไขเปลี่ยน
  React.useEffect(() => {
    if (!(props.powerAuthority === 'MEA' && parseInt(props.transformer) <= 400)) {
      setLowVoltageRequest('');
      setLowVoltageDistance2('');
      setLowVoltageDistance3('');
    }
  }, [props.powerAuthority, props.transformer]);

  // รีเซ็ต distance เมื่อเปลี่ยนการเลือก
  React.useEffect(() => {
    if (lowVoltageRequest !== 'low-voltage') {
      setLowVoltageDistance2('');
      setLowVoltageDistance3('');
    }
  }, [lowVoltageRequest]);

  // ถ้า MEA และ transformerType เป็น 33kv ให้รีเซ็ตเป็น 22kv
  React.useEffect(() => {
    if (props.powerAuthority === 'MEA' && transformerType === '33kv-316v') {
      setTransformerType('22kv-416v');
    }
  }, [props.powerAuthority, transformerType]);

  // คำนวณ Transformer Price เมื่อมีการเปลี่ยนแปลง transformer type หรือ transformer size

  React.useEffect(() => {

    if (transformerType && props.transformer && props.getTransformerPrice) {

      const transformerSize = parseInt(props.transformer);

      if (!isNaN(transformerSize)) {

        const priceData = props.getTransformerPrice(transformerSize, transformerType);

        setTransformerPrice(priceData);

      }

    }

  }, [transformerType, props.transformer, props.getTransformerPrice]);
  // คำนวณ MDB Configuration เมื่อมีการเปลี่ยนแปลง mccb brand หรือ transformer size

  React.useEffect(() => {

    if (mccbMainBrand && props.transformer && props.getMDBConfiguration) {

      const transformerSize = parseInt(props.transformer);

      if (!isNaN(transformerSize)) {

        const configData = props.getMDBConfiguration(transformerSize, mccbMainBrand);

        setMdbConfiguration(configData);

      }

    }
  }, [mccbMainBrand, props.transformer, props.getMDBConfiguration]);
  return (

    <div className="w-full max-w-6xl mx-auto">

      {/* Basic Information Card */}

      <Card className="shadow-xl border-0 overflow-hidden mb-6">

        <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">

          <CardTitle className="flex items-center gap-2 text-xl">

            <Zap className="h-5 w-5" />

            Electrical Configuration Summary

          </CardTitle>

          <CardDescription className="text-blue-100">

            Detailed electrical specifications and requirements

          </CardDescription>

        </CardHeader>

        <CardContent className="p-6">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">

              <span className="font-medium ">Power Authority:</span>

              <span className="font-semibold ">{props.powerAuthority}</span>

            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">

              <span className="font-medium ">Number of Chargers:</span>

              <span className="font-semibold ">{props.numberOfChargers} <span className="text-sm ">Units</span></span>

            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">

              <span className="font-medium ">Transformer Size:</span>

              <span className="font-semibold ">{props.transformer} <span className="text-sm ">kVA</span></span>

            </div>

          </div>

          {/* Charger Information - แสดงเป็นแถวด้านล่าง */}
          {props.chargerSummary && Array.isArray(props.chargerSummary) && props.chargerSummary.length > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="font-medium text-gray-700 mb-3">Charger Details:</div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {props.chargerSummary.map((charger: any, idx: number) => (
                  <div key={idx} className="p-3 bg-white rounded border border-gray-200">
                    <div className="font-semibold text-gray-800 text-sm">
                      Charger{idx + 1}: {charger.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </CardContent>

      </Card>
      {/* Transformer Size Card */}
      <Card className="shadow-xl border-0 overflow-hidden mb-6">

        <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b">

          <CardTitle className="flex items-center justify-between text-orange-800">

            <div className="flex items-center gap-2">

              <Zap className="h-5 w-5" />

              Transformer Size <span className="text-xs ">(ขนาดหม้อแปลง)</span>

            </div>

            <div className="flex items-center gap-3">

              <div

                className={`flex items-center space-x-2 px-3 py-1 rounded-lg border border-gray-200 hover:bg-green-50 cursor-pointer ${transformerSelection === 'yes' ? 'bg-green-100 border-green-300' : ''}`}

                onClick={() => setTransformerSelection('yes')}

              >

                <Checkbox

                  id="transformer-yes"

                  checked={transformerSelection === 'yes'}

                  onCheckedChange={(checked) => {

                    if (checked) setTransformerSelection('yes');

                  }}

                  className="text-green-500 border-green-400 data-[state=checked]:bg-green-500"

                />

                <Label htmlFor="transformer-yes" className="font-medium cursor-pointer text-green-700 text-sm">มี</Label>

              </div>

              <div

                className={`flex items-center space-x-2 px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer ${transformerSelection === 'no' ? 'bg-gray-100 border-gray-300' : ''}`}

                onClick={() => setTransformerSelection('no')}

              >

                <Checkbox

                  id="transformer-no"

                  checked={transformerSelection === 'no'}

                  onCheckedChange={(checked) => {

                    if (checked) setTransformerSelection('no');

                  }}

                  className=" border-gray-400 data-[state=checked]:bg-gray-500"

                />

                <Label htmlFor="transformer-no" className="font-medium cursor-pointer  text-sm">ไม่มี</Label>

              </div>

            </div>

          </CardTitle>

        </CardHeader>

        <CardContent className="p-6">

          <div className="space-y-3">



            {/* แสดงสเปค Transformer Size เมื่อเลือก "มี" */}

            {transformerSelection === 'yes' && (

              <div className="mt-4 space-y-3">

                {/* แสดงสเปค Transformer Size ก่อน */}

                <div className="p-4 bg-green-50 rounded-lg">

                  <div className="flex items-center justify-between">

                    <span className="font-medium ">Transformer Size:</span>

                    <span className="font-semibold ">{props.transformer} <span className="text-sm ">kVA</span></span>

                  </div>

                </div>

                {/* ตรวจสอบเงื่อนไข MEA และ Transformer Size <= 400 */}
                {props.powerAuthority === 'MEA' && parseInt(props.transformer) <= 400 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">
                      เลือกประเภทการติดตั้ง
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer ${lowVoltageRequest === 'low-voltage' ? 'bg-blue-100 border-blue-300' : 'hover:bg-gray-50'}`}
                        onClick={() => setLowVoltageRequest('low-voltage')}
                      >
                        <Checkbox
                          id="low-voltage-request"
                          checked={lowVoltageRequest === 'low-voltage'}
                          onCheckedChange={(checked) => { if (checked) setLowVoltageRequest('low-voltage'); }}
                          className="border-blue-400 data-[state=checked]:bg-blue-500"
                        />
                        <Label htmlFor="low-voltage-request" className="font-medium cursor-pointer text-sm">ขอแรงต่ำ</Label>
                      </div>
                      <div
                        className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer ${lowVoltageRequest === 'use-transformer' ? 'bg-green-100 border-green-300' : 'hover:bg-gray-50'}`}
                        onClick={() => setLowVoltageRequest('use-transformer')}
                      >
                        <Checkbox
                          id="use-transformer"
                          checked={lowVoltageRequest === 'use-transformer'}
                          onCheckedChange={(checked) => { if (checked) setLowVoltageRequest('use-transformer'); }}
                          className="border-green-400 data-[state=checked]:bg-green-500"
                        />
                        <Label htmlFor="use-transformer" className="font-medium cursor-pointer text-sm">ใช้หม้อแปลง</Label>
                      </div>
                    </div>
                  </div>
                )}

                {/* แสดงข้อมูลขอแรงต่ำ */}
                {props.powerAuthority === 'MEA' && parseInt(props.transformer) <= 400 && lowVoltageRequest === 'low-voltage' && (() => {
                  const lowVoltageSheet = getExcelData('ตารางระบบงานแรงสูง');
                  const row2 = lowVoltageSheet.find((row: any) => row.__rowNum__ === 2);
                  const row3 = lowVoltageSheet.find((row: any) => row.__rowNum__ === 3);
                  const row4 = lowVoltageSheet.find((row: any) => row.__rowNum__ === 4);

                  if (!row2 || !row3) return null;

                  // ดึงสเปคสายจาก row 4
                  const wireSpec = row4?.__EMPTY || '';

                  // ตรวจสอบว่าจำนวนเป็น "1 ม." หรือไม่
                  const quantity2 = row2.__EMPTY_3 || '';
                  const quantity3 = row3.__EMPTY_3 || '';
                  const isDistance2 = quantity2.toString().includes('ม.') || quantity2.toString().includes('เมตร');
                  const isDistance3 = quantity3.toString().includes('ม.') || quantity3.toString().includes('เมตร');

                  // คำนวณราคาตามระยะ
                  const distance2 = parseFloat(lowVoltageDistance2) || 0;
                  const distance3 = parseFloat(lowVoltageDistance3) || 0;

                  // ราคาต่อหน่วย (จาก row)
                  const materialPricePerUnit2 = parseFloat(row2.__EMPTY_4 || 0) || 0;
                  const laborPricePerUnit2 = parseFloat(row2.__EMPTY_5 || 0) || 0;
                  const materialPricePerUnit3 = parseFloat(row3.__EMPTY_4 || 0) || 0;
                  const laborPricePerUnit3 = parseFloat(row3.__EMPTY_5 || 0) || 0;

                  // คำนวณราคารวม
                  const materialPrice2 = isDistance2 ? materialPricePerUnit2 * distance2 : materialPricePerUnit2;
                  const laborPrice2 = isDistance2 ? laborPricePerUnit2 * distance2 : laborPricePerUnit2;
                  const totalPrice2 = materialPrice2 + laborPrice2;

                  const materialPrice3 = isDistance3 ? materialPricePerUnit3 * distance3 : materialPricePerUnit3;
                  const laborPrice3 = isDistance3 ? laborPricePerUnit3 * distance3 : laborPricePerUnit3;
                  const totalPrice3 = materialPrice3 + laborPrice3;

                  const totalMaterial = materialPrice2 + materialPrice3;
                  const totalLabor = laborPrice2 + laborPrice3;
                  const totalPrice = totalPrice2 + totalPrice3;

                  return (
                    <div className="space-y-4">
                      {/* Row 2 */}
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="font-medium text-blue-800 mb-2">{row2.__EMPTY || 'รายการที่ 1'}:</div>
                        <div className="space-y-2 text-sm">
                          {isDistance2 ? (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">ระยะ:</span>
                              <Input
                                type="number"
                                value={lowVoltageDistance2}
                                onChange={(e) => setLowVoltageDistance2(e.target.value)}
                                placeholder="กรอกระยะ (เมตร)"
                                className="w-32"
                                min="0"
                              />
                              <span className="text-gray-500">เมตร</span>
                            </div>
                          ) : (
                            <div><span className="font-medium">จำนวน:</span> {quantity2 || '-'}</div>
                          )}
                          <div><span className="font-medium">ค่าของ:</span> {materialPrice2.toLocaleString('th-TH')} บาท</div>
                          <div><span className="font-medium">ค่าแรง:</span> {laborPrice2.toLocaleString('th-TH')} บาท</div>
                          <div><span className="font-medium">รวม:</span> {totalPrice2.toLocaleString('th-TH')} บาท</div>
                        </div>
                      </div>

                      {/* Row 3 */}
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="font-medium text-blue-800 mb-2">{row3.__EMPTY || 'รายการที่ 2'}:</div>
                        <div className="space-y-2 text-sm">
                          {/* สเปคสาย */}
                          {wireSpec && (
                            <div>
                              <span className="font-medium">สเปคสาย:</span> {wireSpec}
                            </div>
                          )}
                          {isDistance3 ? (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">ระยะ:</span>
                              <Input
                                type="number"
                                value={lowVoltageDistance3}
                                onChange={(e) => setLowVoltageDistance3(e.target.value)}
                                placeholder="กรอกระยะ (เมตร)"
                                className="w-32"
                                min="0"
                              />
                              <span className="text-gray-500">เมตร</span>
                            </div>
                          ) : (
                            <div><span className="font-medium">จำนวน:</span> {quantity3 || '-'}</div>
                          )}
                          <div><span className="font-medium">ค่าของ:</span> {materialPrice3.toLocaleString('th-TH')} บาท</div>
                          <div><span className="font-medium">ค่าแรง:</span> {laborPrice3.toLocaleString('th-TH')} บาท</div>
                          <div><span className="font-medium">รวม:</span> {totalPrice3.toLocaleString('th-TH')} บาท</div>
                        </div>
                      </div>

                      {/* รวมค่าใช้จ่าย */}
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-4">
                        <div className="text-lg font-semibold text-blue-800">รวมค่าใช้จ่าย</div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <div className="text-sm text-gray-600 mb-1">ค่าของรวม:</div>
                            <div className="text-xl font-bold text-gray-800">
                              {totalMaterial.toLocaleString('th-TH')} บาท
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600 mb-1">ค่าแรงรวม:</div>
                            <div className="text-xl font-bold text-gray-800">
                              {totalLabor.toLocaleString('th-TH')} บาท
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-blue-700 font-semibold mb-1">ราคารวม:</div>
                            <div className="text-2xl font-bold text-blue-700">
                              {totalPrice.toLocaleString('th-TH')} บาท
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* แสดงตัวเลือก Transformer Type - แสดงเฉพาะเมื่อเลือกใช้หม้อแปลง หรือไม่ใช่เงื่อนไขพิเศษ */}
                {(!(props.powerAuthority === 'MEA' && parseInt(props.transformer) <= 400) || lowVoltageRequest === 'use-transformer') && (
                  <div className="space-y-3">

                    <Label className="text-sm font-medium ">

                      ประเภทหม้อแปลง <span className="text-xs ">(Transformer Type)</span>

                    </Label>

                    <div className={`grid gap-3 ${props.powerAuthority === 'MEA' ? 'grid-cols-1' : 'grid-cols-2'}`}>

                      <div

                        className={`flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-blue-50 cursor-pointer ${transformerType === '22kv-416v' ? 'bg-blue-100 border-blue-300' : ''}`}

                        onClick={() => setTransformerType('22kv-416v')}

                      >

                        <Checkbox

                          id="transformer-22kv"

                          checked={transformerType === '22kv-416v'}

                          onCheckedChange={(checked) => {

                            if (checked) setTransformerType('22kv-416v');

                          }}

                          className="text-blue-500 border-blue-400 data-[state=checked]:bg-blue-500"

                        />

                        <Label htmlFor="transformer-22kv" className="font-medium cursor-pointer text-blue-700">

                          หม้อแปลง 22 (24) kV / 416 V

                        </Label>

                      </div>

                      {/* แสดง 33 kV เฉพาะ PEA */}
                      {props.powerAuthority === 'PEA' && (
                        <div

                          className={`flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-purple-50 cursor-pointer ${transformerType === '33kv-316v' ? 'bg-purple-100 border-purple-300' : ''}`}

                          onClick={() => setTransformerType('33kv-316v')}

                        >

                          <Checkbox

                            id="transformer-33kv"

                            checked={transformerType === '33kv-316v'}

                            onCheckedChange={(checked) => {

                              if (checked) setTransformerType('33kv-316v');

                            }}

                            className="text-purple-500 border-purple-400 data-[state=checked]:bg-purple-500"

                          />

                          <Label htmlFor="transformer-33kv" className="font-medium cursor-pointer text-purple-700">

                            หม้อแปลง 33 kV / 316 V

                          </Label>

                        </div>
                      )}

                    </div>



                    {/* แสดงประเภทที่เลือก */}

                    {transformerType && (

                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">

                        <div className="text-sm ">

                          <span className="font-medium">ประเภทที่เลือก:</span> {transformerType === '22kv-416v' ? 'หม้อแปลง 22 (24) kV / 416 V' : 'หม้อแปลง 33 kV / 316 V'}

                        </div>

                      </div>

                    )}



                    {/* แสดงราคา Transformer */}

                    {transformerPrice && (

                      <Collapsible
                        open={openItems['transformer-info']}
                        onOpenChange={(open) => setOpenItems(prev => ({ ...prev, 'transformer-info': open }))}
                      >
                        <div className="bg-blue-50 rounded-lg border border-blue-200">
                          <CollapsibleTrigger className="w-full p-4 text-left hover:bg-blue-100 transition-colors rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="text-lg font-semibold text-blue-800">
                                ข้อมูลหม้อแปลง {transformerPrice.size} kVA
                              </div>
                              <div className="ml-4">
                                {openItems['transformer-info'] ? (
                                  <ChevronUp className="h-5 w-5 text-blue-600" />
                                ) : (
                                  <ChevronDown className="h-5 w-5 text-blue-600" />
                                )}
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="px-4 pb-4 space-y-4">
                              {/* ประเภทและรายการสินค้า */}
                              <div>
                                <div className="text-xs text-gray-500">
                                  ประเภท: {transformerPrice.type === '22kv-416v' ? '22 (24) kV / 416 V' : '33 kV / 316 V'}
                                </div>
                                {transformerPrice.productName && (
                                  <div className="mt-2 text-sm">
                                    <span className="font-medium text-gray-700">รายการสินค้า:</span>
                                    <span className="text-gray-600 ml-1">
                                      {transformerPrice.productName}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* รวมค่าใช้จ่าย */}
                              <Collapsible
                                open={openItems['transformer-total']}
                                onOpenChange={(open) => setOpenItems(prev => ({ ...prev, 'transformer-total': open }))}
                              >
                                <div className="bg-blue-50 rounded-lg border border-blue-200">
                                  <CollapsibleTrigger className="w-full p-4 text-left hover:bg-blue-100 transition-colors rounded-lg">
                                    <div className="flex items-center justify-between">
                                      <div className="text-lg font-semibold text-blue-800">รวมค่าใช้จ่าย</div>
                                      <div className="ml-4">
                                        {openItems['transformer-total'] ? (
                                          <ChevronUp className="h-4 w-4 text-blue-600" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4 text-blue-600" />
                                        )}
                                      </div>
                                    </div>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <div className="px-4 pb-4">
                                      {(() => {
                                        const laborValue = toNumber(transformerPrice.laborCost);
                                        const installationValue = toNumber(transformerPrice.installationCost);
                                        const totalOverride = toNumber(transformerPrice.totalInstallationCost);
                                        const materialDisplay = laborValue; // ค่าของควรอิงราคาค่าแรงจากไฟล์ Excel
                                        const laborDisplay = installationValue; // ค่าแรงแสดงราคาค่าติดตั้ง
                                        const totalDisplay = totalOverride > 0 ? totalOverride : materialDisplay + laborDisplay;

                                        return (
                                          <div className="grid grid-cols-3 gap-4">
                                            <div>
                                              <div className="text-sm text-gray-600 mb-1">ค่าของรวม:</div>
                                              <div className="text-xl font-bold text-gray-800">
                                                {materialDisplay.toLocaleString('th-TH')} บาท
                                              </div>
                                            </div>
                                            <div>
                                              <div className="text-sm text-gray-600 mb-1">ค่าแรงรวม:</div>
                                              <div className="text-xl font-bold text-gray-800">
                                                {laborDisplay.toLocaleString('th-TH')} บาท
                                              </div>
                                            </div>
                                            <div>
                                              <div className="text-sm text-blue-700 font-semibold mb-1">ราคารวม:</div>
                                              <div className="text-2xl font-bold text-blue-700">
                                                {totalDisplay.toLocaleString('th-TH')} บาท
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    )}



                    {/* แสดงข้อความเมื่อไม่พบข้อมูล */}

                    {transformerType && props.transformer && !transformerPrice && (

                      <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">

                        <div className="text-sm text-yellow-700">

                          ⚠️ ไม่พบข้อมูลราคาสำหรับหม้อแปลง {props.transformer} kVA ประเภท {transformerType === '22kv-416v' ? '22 (24) kV / 416 V' : '33 kV / 316 V'} ใน Sheet "ราคาหม้อแปลง"

                        </div>

                      </div>

                    )}

                  </div>
                )}

              </div>

            )}

          </div>

        </CardContent>
      </Card>
      {/* ระบบแรงสูง Card */}
      {(() => {
        // ตรวจสอบเงื่อนไขการแสดง Card ระบบแรงสูง
        // ถ้า MEA และ <= 400 kW และเลือก "ขอแรงต่ำ" จะไม่แสดง Card
        const transformerSize = parseInt(props.transformer || '0') || 0;
        const shouldShowCard = !(props.powerAuthority === 'MEA' && transformerSize <= 400 && lowVoltageRequest === 'low-voltage');

        if (!shouldShowCard) {
          return null;
        }

        return (
          <Card className="shadow-xl border-0 overflow-hidden mb-6">
            <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 border-b">
              <CardTitle className="flex items-center justify-between text-red-800">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  ระบบแรงสูง
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center space-x-2 px-3 py-1 rounded-lg border border-gray-200 hover:bg-red-50 cursor-pointer ${highVoltageSystem === 'yes' ? 'bg-red-100 border-red-300' : ''}`}
                    onClick={() => setHighVoltageSystem('yes')}
                  >
                    <Checkbox
                      id="high-voltage-yes"
                      checked={highVoltageSystem === 'yes'}
                      onCheckedChange={(checked) => {
                        if (checked) setHighVoltageSystem('yes');
                      }}
                      className="text-red-500 border-red-400 data-[state=checked]:bg-red-500"
                    />
                    <Label htmlFor="high-voltage-yes" className="font-medium cursor-pointer text-red-700 text-sm">มี</Label>
                  </div>
                  <div
                    className={`flex items-center space-x-2 px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer ${highVoltageSystem === 'no' ? 'bg-gray-100 border-gray-300' : ''}`}
                    onClick={() => setHighVoltageSystem('no')}
                  >
                    <Checkbox
                      id="high-voltage-no"
                      checked={highVoltageSystem === 'no'}
                      onCheckedChange={(checked) => {
                        if (checked) setHighVoltageSystem('no');
                      }}
                      className="border-gray-400 data-[state=checked]:bg-gray-500"
                    />
                    <Label htmlFor="high-voltage-no" className="font-medium cursor-pointer text-sm">ไม่มี</Label>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {highVoltageSystem === 'yes' && (() => {
                // ฟังก์ชันหาว่าควรใช้ row ไหน
                const getHighVoltageRows = (): { mainRow: number; detailRows: number[]; distanceRow: number } | null => {
                  const transformerSize = parseInt(props.transformer || '0') || 0;
                  const powerAuthority = props.powerAuthority;
                  const currentTransformerType = transformerType;

                  // กรณี 1: PEA, <= 250 kW, 22 (24) kV / 416 V
                  if (powerAuthority === 'PEA' && transformerSize <= 250 && currentTransformerType === '22kv-416v') {
                    return { mainRow: 5, detailRows: [7, 8], distanceRow: 13 };
                  }

                  // กรณี 2: PEA หรือ MEA, 315-1000 kW, 22 (24) kV / 416 V
                  // ถ้า MEA และ <= 400 kW ต้องเลือก "ใช้หม้อแปลง" เท่านั้น
                  if (powerAuthority === 'PEA' && transformerSize >= 315 && transformerSize <= 1000 && currentTransformerType === '22kv-416v') {
                    return { mainRow: 9, detailRows: [11, 12], distanceRow: 13 };
                  }
                  if (powerAuthority === 'MEA' && transformerSize >= 315 && transformerSize <= 1000 && currentTransformerType === '22kv-416v') {
                    // ถ้า MEA และ <= 400 kW ต้องเลือก "ใช้หม้อแปลง" เท่านั้น
                    if (transformerSize <= 400 && lowVoltageRequest !== 'use-transformer') {
                      return null; // ไม่แสดง Card ระบบแรงสูง
                    }
                    return { mainRow: 9, detailRows: [11, 12], distanceRow: 13 };
                  }

                  // กรณี 3: PEA, <= 250 kW, 33 kV / 316 V
                  if (powerAuthority === 'PEA' && transformerSize <= 250 && currentTransformerType === '33kv-316v') {
                    return { mainRow: 14, detailRows: [16, 17], distanceRow: 22 };
                  }

                  // กรณี 4: PEA, 315-1000 kW, 33 kV / 316 V
                  if (powerAuthority === 'PEA' && transformerSize >= 315 && transformerSize <= 1000 && currentTransformerType === '33kv-316v') {
                    return { mainRow: 18, detailRows: [20, 21], distanceRow: 22 };
                  }

                  return null;
                };

                // ตรวจสอบว่ามี Transformer Type หรือไม่
                if (!transformerType) {
                  return (
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="text-sm text-yellow-700">
                        ⚠️ กรุณาเลือกประเภทหม้อแปลง (Transformer Type) ก่อน
                      </div>
                    </div>
                  );
                }

                const rows = getHighVoltageRows();

                if (!rows) {
                  return (
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="text-sm text-yellow-700">
                        ⚠️ ไม่พบข้อมูลสำหรับ Power Authority {props.powerAuthority}, Transformer Size {props.transformer} kW และ Transformer Type {transformerType}
                      </div>
                    </div>
                  );
                }

                const highVoltageSheet = getExcelData('ตารางระบบงานแรงสูง');
                const mainRow = highVoltageSheet.find((r: any) => r.__rowNum__ === rows.mainRow);
                const distanceRow = highVoltageSheet.find((r: any) => r.__rowNum__ === rows.distanceRow);
                const detailRow1 = highVoltageSheet.find((r: any) => r.__rowNum__ === rows.detailRows[0]);
                const detailRow2 = highVoltageSheet.find((r: any) => r.__rowNum__ === rows.detailRows[1]);
                const poleRow = highVoltageSheet.find((r: any) => r.__rowNum__ === 23); // Row 23 สำหรับจำนวนเสา

                if (!mainRow || !distanceRow || !detailRow1 || !detailRow2) {
                  return (
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="text-sm text-yellow-700">
                        ⚠️ ไม่พบข้อมูลใน sheet "ตารางระบบงานแรงสูง"
                      </div>
                    </div>
                  );
                }

                // คำนวณราคาสำหรับ main row
                const mainQuantity = parseFloat(mainRow.__EMPTY_3 || 0) || 0;
                const mainMaterialPrice = parseFloat(mainRow.__EMPTY_4 || 0) || 0;
                const mainLaborPrice = parseFloat(mainRow.__EMPTY_5 || 0) || 0;
                const mainTotalPrice = parseFloat(mainRow.__EMPTY_6 || 0) || 0;

                // คำนวณราคาสำหรับ distance row (คูณด้วยระยะ)
                const distance = parseFloat(highVoltageDistance) || 0;
                const distanceMaterialPerUnit = parseFloat(distanceRow.__EMPTY_4 || 0) || 0;
                const distanceLaborPerUnit = parseFloat(distanceRow.__EMPTY_5 || 0) || 0;
                const distanceTotalPerUnit = parseFloat(distanceRow.__EMPTY_6 || 0) || 0;

                const distanceMaterialPrice = distanceMaterialPerUnit * distance;
                const distanceLaborPrice = distanceLaborPerUnit * distance;
                const distanceTotalPrice = distanceTotalPerUnit * distance;

                // คำนวณจำนวนเสา (เกินทุกๆ 30 เมตร)
                // ตัวอย่าง: 62 เมตร = เกิน 30 เมตร ไป 2 รอบ
                // 30 เมตร = 0 รอบ, 31 เมตร = 1 รอบ, 60 เมตร = 2 รอบ, 62 เมตร = 2 รอบ
                const poleCount = distance > 30 ? Math.floor((distance - 30) / 30) + 1 : 0;
                let poleMaterialPrice = 0;
                let poleLaborPrice = 0;
                let poleTotalPrice = 0;

                if (poleCount > 0 && poleRow) {
                  const poleMaterialPerUnit = parseFloat(poleRow.__EMPTY_4 || 0) || 0;
                  const poleLaborPerUnit = parseFloat(poleRow.__EMPTY_5 || 0) || 0;
                  const poleTotalPerUnit = parseFloat(poleRow.__EMPTY_6 || 0) || 0;

                  poleMaterialPrice = poleMaterialPerUnit * poleCount;
                  poleLaborPrice = poleLaborPerUnit * poleCount;
                  poleTotalPrice = poleTotalPerUnit * poleCount;
                }

                // รวมค่าใช้จ่ายทั้งหมด
                const totalMaterial = mainMaterialPrice + distanceMaterialPrice + poleMaterialPrice;
                const totalLabor = mainLaborPrice + distanceLaborPrice + poleLaborPrice;
                const totalPrice = mainTotalPrice + distanceTotalPrice + poleTotalPrice;

                return (
                  <div className="space-y-4">
                    {/* Main Row */}
                    <Collapsible
                      open={openItems['high-voltage-main']}
                      onOpenChange={(open) => setOpenItems(prev => ({ ...prev, 'high-voltage-main': open }))}
                    >
                      <div className="bg-blue-50 rounded-lg border border-blue-200">
                        <CollapsibleTrigger className="w-full p-4 text-left hover:bg-blue-100 transition-colors rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-blue-800">{mainRow.__EMPTY || 'รายการ'}:</div>
                            <div className="ml-4">
                              {openItems['high-voltage-main'] ? (
                                <ChevronUp className="h-4 w-4 text-blue-600" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-4 pb-4 space-y-2 text-sm">
                            <div><span className="font-medium">จำนวน:</span> {mainQuantity || '-'}</div>
                            <div className="mt-2">
                              <div className="font-medium mb-1">รายละเอียด:</div>
                              <div className="pl-4 space-y-1">
                                <div>{detailRow1.__EMPTY || '-'}</div>
                                <div>{detailRow2.__EMPTY || '-'}</div>
                              </div>
                            </div>
                            <div><span className="font-medium">ค่าของ:</span> {mainMaterialPrice.toLocaleString('th-TH')} บาท</div>
                            <div><span className="font-medium">ค่าแรง:</span> {mainLaborPrice.toLocaleString('th-TH')} บาท</div>
                            <div><span className="font-medium">รวม:</span> {mainTotalPrice.toLocaleString('th-TH')} บาท</div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>

                    {/* Distance Row */}
                    <Collapsible
                      open={openItems['high-voltage-distance']}
                      onOpenChange={(open) => setOpenItems(prev => ({ ...prev, 'high-voltage-distance': open }))}
                    >
                      <div className="bg-purple-50 rounded-lg border border-purple-200">
                        <CollapsibleTrigger className="w-full p-4 text-left hover:bg-purple-100 transition-colors rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-purple-800">{distanceRow.__EMPTY || 'รายการ'}:</span>
                              <span className="font-medium">ระยะ:</span>
                              <Input
                                type="number"
                                value={highVoltageDistance}
                                onChange={(e) => setHighVoltageDistance(e.target.value)}
                                placeholder="กรอกระยะ (เมตร)"
                                className="w-32"
                                min="0"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span className="text-gray-500">เมตร</span>
                            </div>
                            <div className="ml-4">
                              {openItems['high-voltage-distance'] ? (
                                <ChevronUp className="h-4 w-4 text-purple-600" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-purple-600" />
                              )}
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-4 pb-4 space-y-2 text-sm">
                            <div><span className="font-medium">ค่าของ:</span> {distanceMaterialPrice.toLocaleString('th-TH')} บาท</div>
                            <div><span className="font-medium">ค่าแรง:</span> {distanceLaborPrice.toLocaleString('th-TH')} บาท</div>
                            <div><span className="font-medium">รวม:</span> {distanceTotalPrice.toLocaleString('th-TH')} บาท</div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>

                    {/* Pole Row (ถ้าเกิน 30 เมตร) */}
                    {poleCount > 0 && poleRow && (
                      <Collapsible
                        open={openItems['high-voltage-pole']}
                        onOpenChange={(open) => setOpenItems(prev => ({ ...prev, 'high-voltage-pole': open }))}
                      >
                        <div className="bg-green-50 rounded-lg border border-green-200">
                          <CollapsibleTrigger className="w-full p-4 text-left hover:bg-green-100 transition-colors rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-green-800">{poleRow.__EMPTY || 'จำนวนเสา'}:</div>
                              <div className="ml-4">
                                {openItems['high-voltage-pole'] ? (
                                  <ChevronUp className="h-4 w-4 text-green-600" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-green-600" />
                                )}
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="px-4 pb-4 space-y-2 text-sm">
                              <div><span className="font-medium">จำนวนเสา:</span> {poleCount} ชุด</div>
                              <div><span className="font-medium">ค่าของ:</span> {poleMaterialPrice.toLocaleString('th-TH')} บาท</div>
                              <div><span className="font-medium">ค่าแรง:</span> {poleLaborPrice.toLocaleString('th-TH')} บาท</div>
                              <div><span className="font-medium">รวม:</span> {poleTotalPrice.toLocaleString('th-TH')} บาท</div>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    )}

                    {/* รวมค่าใช้จ่าย */}
                    <Collapsible
                      open={openItems['high-voltage-total']}
                      onOpenChange={(open) => setOpenItems(prev => ({ ...prev, 'high-voltage-total': open }))}
                    >
                      <div className="bg-blue-50 rounded-lg border border-blue-200">
                        <CollapsibleTrigger className="w-full p-4 text-left hover:bg-blue-100 transition-colors rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="text-lg font-semibold text-blue-800">รวมค่าใช้จ่าย</div>
                            <div className="ml-4">
                              {openItems['high-voltage-total'] ? (
                                <ChevronUp className="h-4 w-4 text-blue-600" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-4 pb-4">
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <div className="text-sm text-gray-600 mb-1">ค่าของรวม:</div>
                                <div className="text-xl font-bold text-gray-800">
                                  {totalMaterial.toLocaleString('th-TH')} บาท
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600 mb-1">ค่าแรงรวม:</div>
                                <div className="text-xl font-bold text-gray-800">
                                  {totalLabor.toLocaleString('th-TH')} บาท
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-blue-700 font-semibold mb-1">ราคารวม:</div>
                                <div className="text-2xl font-bold text-blue-700">
                                  {totalPrice.toLocaleString('th-TH')} บาท
                                </div>
                              </div>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  </div>
                );
              })()}

              {highVoltageSystem === 'no' && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">
                    ไม่มีการใช้ระบบแรงสูง
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}
      {/* สถานที่การติดตั้ง Card */}
      <Card className="shadow-xl border-0 overflow-hidden mb-6">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
          <CardTitle className="flex items-center justify-between text-indigo-800">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              สถานที่การติดตั้ง
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center space-x-2 px-3 py-1 rounded-lg border border-gray-200 hover:bg-indigo-50 cursor-pointer ${installationLocation === 'inside-station' ? 'bg-indigo-100 border-indigo-300' : ''}`}
                onClick={() => setInstallationLocation('inside-station')}
              >
                <Checkbox
                  id="location-inside"
                  checked={installationLocation === 'inside-station'}
                  onCheckedChange={(checked) => {
                    if (checked) setInstallationLocation('inside-station');
                  }}
                  className="text-indigo-500 border-indigo-400 data-[state=checked]:bg-indigo-500"
                />
                <Label htmlFor="location-inside" className="font-medium cursor-pointer text-indigo-700 text-sm">ภายในปั้ม</Label>
              </div>
              <div
                className={`flex items-center space-x-2 px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer ${installationLocation === 'outside-station' ? 'bg-gray-100 border-gray-300' : ''}`}
                onClick={() => setInstallationLocation('outside-station')}
              >
                <Checkbox
                  id="location-outside"
                  checked={installationLocation === 'outside-station'}
                  onCheckedChange={(checked) => {
                    if (checked) setInstallationLocation('outside-station');
                  }}
                  className="border-gray-400 data-[state=checked]:bg-gray-500"
                />
                <Label htmlFor="location-outside" className="font-medium cursor-pointer text-sm">ภายนอกปั้ม</Label>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {installationLocation === 'inside-station' && (() => {
            // ฟังก์ชันหาว่าควรใช้ row ไหน
            // อิง Power Authority และ Transformer Size จาก Electrical Configuration Summary
            const getInstallationRowNumber = (): number | null => {
              const transformerSizeStr = props.transformer || '';
              const transformerSize = parseInt(transformerSizeStr) || 0;
              const powerAuthority = props.powerAuthority;

              // MEA cases
              if (powerAuthority === 'MEA') {
                // ถ้าเลือกแรงต่ำ
                if (lowVoltageRequest === 'low-voltage') {
                  return 6;
                }
                // ถ้าใช้หม้อแปลง
                if (transformerSize === 400) return 7;
                if (transformerSize === 500) return 8;
                if (transformerSize === 630) return 9;
                if (transformerSize === 800) return 10;
                if (transformerSize === 1000) return 11;
                if (transformerSize === 1250) return 12;
                if (transformerSize === 1500) return 13;
              }

              // PEA cases
              if (powerAuthority === 'PEA') {
                if (transformerSize === 100) return 3;
                if (transformerSize === 160) return 4;
                if (transformerSize === 250) return 5;
                if (transformerSize === 315) return 6;
                if (transformerSize === 400) return 7;
                if (transformerSize === 500) return 8;
                if (transformerSize === 630) return 9;
                if (transformerSize === 800) return 10;
                if (transformerSize === 1000) return 11;
                if (transformerSize === 1250) return 12;
                if (transformerSize === 1500) return 13;
              }

              return null;
            };

            const rowNum = getInstallationRowNumber();

            if (!rowNum) {
              return (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="text-sm text-yellow-700">
                    ⚠️ ไม่พบข้อมูลสำหรับ Power Authority {props.powerAuthority} และ Transformer Size {props.transformer} kVA
                  </div>
                </div>
              );
            }

            // ดึงข้อมูลจาก Excel sheet "ตารางขนาดและราคาตู้ DISCONNECTO"
            const availableSheetNames = props.excelData ? Object.keys(props.excelData) : [];

            // ลองหาชื่อ sheet ที่มีคำว่า "DISCONNECTO" หรือ "DISCONNECTOR" เท่านั้น
            // ต้องไม่ match กับ "MDB"
            const possibleSheetNames = availableSheetNames.filter(name =>
              (name.includes('DISCONNECTO') || name.includes('DISCONNECTOR')) &&
              !name.includes('MDB')
            );

            // ใช้ชื่อ sheet ที่พบ หรือใช้ชื่อที่ระบุ
            const sheetName = possibleSheetNames.length > 0
              ? possibleSheetNames[0]
              : 'ตารางขนาดและราคาตู้ DISCONNECTO';

            const disconnectorSheet = getExcelData(sheetName);

            if (!disconnectorSheet || disconnectorSheet.length === 0) {
              return (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="text-sm text-yellow-700 mb-2">
                    ⚠️ ไม่พบ Sheet "{sheetName}" หรือ Sheet ว่างเปล่า
                  </div>
                  <div className="text-xs text-gray-600">
                    Sheet names ที่มี: {availableSheetNames.slice(0, 10).join(', ')}{availableSheetNames.length > 10 ? '...' : ''}
                  </div>
                </div>
              );
            }

            const row = disconnectorSheet.find((r: any) => r.__rowNum__ === rowNum);

            if (!row) {
              const availableRows = disconnectorSheet
                .map((r: any) => r.__rowNum__)
                .filter((num: any): num is number => typeof num === 'number')
                .sort((a: number, b: number) => a - b);

              return (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="text-sm text-yellow-700 mb-2">
                    ⚠️ ไม่พบข้อมูลใน row {rowNum}
                  </div>
                  <div className="text-xs text-gray-600">
                    Rows ที่มีใน Sheet: {availableRows.slice(0, 20).join(', ')}{availableRows.length > 20 ? '...' : ''}
                  </div>
                </div>
              );
            }

            // ดึงข้อมูลตามที่ระบุ
            const cabinetEmpty = row.__EMPTY_9 || '-';
            // สำหรับขนาดตู้ ให้รวม "x" ด้วย (ไม่ filter ออก)
            const cabinetSize = [
              row.__EMPTY_13,
              row.__EMPTY_14,
              row.__EMPTY_15,
              row.__EMPTY_16,
              row.__EMPTY_17
            ].filter(v => v !== undefined && v !== null && v !== '').join(' ') || '-';
            const cabinetEmptyPrice = parseFloat(row.__EMPTY_20 || 0) || 0;

            // ราคาตามแบรนด์
            let brandPrice = 0;
            if (installationLocationBrand === 'ABB') {
              brandPrice = parseFloat(row.__EMPTY_22 || 0) || 0;
            } else if (installationLocationBrand === 'EATON') {
              brandPrice = parseFloat(row.__EMPTY_24 || 0) || 0;
            } else if (installationLocationBrand === 'LS') {
              brandPrice = parseFloat(row.__EMPTY_23 || 0) || 0;
            }

            const busbarAcc = parseFloat(row.__EMPTY_30 || 0) || 0;
            const siteInstallationCost = parseFloat(row.__EMPTY_32 || 0) || 0;

            // คำนวณราคารวม
            const totalPrice = cabinetEmptyPrice + brandPrice + busbarAcc + siteInstallationCost;

            return (
              <div className="space-y-4">
                {/* ข้อมูลพื้นฐาน */}
                <Collapsible
                  open={openItems['installation-basic']}
                  onOpenChange={(open) => setOpenItems(prev => ({ ...prev, 'installation-basic': open }))}
                >
                  <div className="bg-gray-50 rounded-lg border border-gray-200">
                    <CollapsibleTrigger className="w-full p-4 text-left hover:bg-gray-100 transition-colors rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="grid grid-cols-2 gap-4 w-full">
                          <div>
                            <div className="font-semibold text-gray-900">
                              <span className="text-sm text-gray-600 font-medium">ตู้เปล่า:</span> {cabinetEmpty}
                            </div>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              <span className="text-sm text-gray-600 font-medium">ขนาดตู้ (กว้าง ยาว ลึก):</span> {cabinetSize}
                            </div>
                          </div>
                        </div>
                        <div className="ml-4">
                          {openItems['installation-basic'] ? (
                            <ChevronUp className="h-4 w-4 text-gray-600" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-600" />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-4">
                        {/* ราคาตู้เปล่า */}
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="text-xl font-bold text-gray-800">
                            <span className="text-sm text-gray-600 font-medium">ราคาตู้เปล่า:</span> {cabinetEmptyPrice.toLocaleString('th-TH')} บาท
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>

                {/* เลือกแบรนด์ */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">เลือกแบรนด์:</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <div
                      className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer ${installationLocationBrand === 'ABB' ? 'bg-red-100 border-red-300' : 'hover:bg-gray-50'}`}
                      onClick={() => setInstallationLocationBrand('ABB')}
                    >
                      <Checkbox
                        id="brand-abb-installation"
                        checked={installationLocationBrand === 'ABB'}
                        onCheckedChange={(checked) => { if (checked) setInstallationLocationBrand('ABB'); }}
                        className="border-red-400 data-[state=checked]:bg-red-500"
                      />
                      <Label htmlFor="brand-abb-installation" className="font-medium cursor-pointer text-sm">ABB</Label>
                    </div>
                    <div
                      className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer ${installationLocationBrand === 'EATON' ? 'bg-blue-100 border-blue-300' : 'hover:bg-gray-50'}`}
                      onClick={() => setInstallationLocationBrand('EATON')}
                    >
                      <Checkbox
                        id="brand-eaton-installation"
                        checked={installationLocationBrand === 'EATON'}
                        onCheckedChange={(checked) => { if (checked) setInstallationLocationBrand('EATON'); }}
                        className="border-blue-400 data-[state=checked]:bg-blue-500"
                      />
                      <Label htmlFor="brand-eaton-installation" className="font-medium cursor-pointer text-sm">EATON</Label>
                    </div>
                    <div
                      className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer ${installationLocationBrand === 'LS' ? 'bg-green-100 border-green-300' : 'hover:bg-gray-50'}`}
                      onClick={() => setInstallationLocationBrand('LS')}
                    >
                      <Checkbox
                        id="brand-ls-installation"
                        checked={installationLocationBrand === 'LS'}
                        onCheckedChange={(checked) => { if (checked) setInstallationLocationBrand('LS'); }}
                        className="border-green-400 data-[state=checked]:bg-green-500"
                      />
                      <Label htmlFor="brand-ls-installation" className="font-medium cursor-pointer text-sm">LS</Label>
                    </div>
                  </div>
                </div>

                {/* ราคาสินค้า */}
                <Collapsible
                  open={openItems['installation-price']}
                  onOpenChange={(open) => setOpenItems(prev => ({ ...prev, 'installation-price': open }))}
                >
                  <div className="bg-gray-50 rounded-lg border border-gray-200">
                    <CollapsibleTrigger className="w-full p-4 text-left hover:bg-gray-100 transition-colors rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-semibold text-gray-800">ราคาสินค้า</div>
                        <div className="ml-4">
                          {openItems['installation-price'] ? (
                            <ChevronUp className="h-4 w-4 text-gray-600" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-600" />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-4 space-y-4">
                        {/* ราคาแบรนด์ */}
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="text-lg font-semibold text-gray-800">
                            <span className="text-sm text-gray-600 font-medium">ราคา {installationLocationBrand}:</span> {brandPrice.toLocaleString('th-TH')} บาท
                          </div>
                        </div>

                        {/* Busbar+ACC และ ค่าติดตั้งหน้าSite */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xl font-bold text-gray-800">
                              <span className="text-sm text-gray-600 font-medium">Busbar+ACC:</span> {busbarAcc.toLocaleString('th-TH')} บาท
                            </div>
                          </div>
                          <div>
                            <div className="text-xl font-bold text-gray-800">
                              <span className="text-sm text-gray-600 font-medium">ค่าติดตั้งหน้าSite:</span> {siteInstallationCost.toLocaleString('th-TH')} บาท
                            </div>
                          </div>
                        </div>

                        {/* ราคารวม */}
                        <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-300">
                          <div className="text-3xl font-bold text-indigo-800">
                            <span className="text-sm text-indigo-700 font-semibold">ราคารวม:</span> {totalPrice.toLocaleString('th-TH')} บาท
                          </div>
                          <div className="text-xs text-gray-500 mt-2">
                            (ราคาตู้เปล่า + ราคา{installationLocationBrand} + Busbar+ACC + ค่าติดตั้งหน้าSite)
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              </div>
            );
          })()}

          {installationLocation === 'outside-station' && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                ไม่มีการเปลี่ยนแปลงใดๆ สำหรับการติดตั้งภายนอกปั้ม
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* TR to MDB Configuration Card */}
      <Card className="shadow-xl border-0 overflow-hidden mb-6">

        <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b">

          <CardTitle className="flex items-center justify-between ">

            <div className="flex items-center gap-2">

              <Wrench className="h-5 w-5" />

              TR to MDB Configuration <span className="text-xs ">(การตั้งค่า TR ไป MDB)</span>

            </div>

            <div className="flex items-center gap-3">

              <div

                className={`flex items-center space-x-2 px-3 py-1 rounded-lg border border-gray-200 hover:bg-blue-50 cursor-pointer ${trMdbSelection === 'yes' ? 'bg-blue-100 border-blue-300' : ''}`}

                onClick={() => setTrMdbSelection('yes')}

              >

                <Checkbox

                  id="trMdb-yes"

                  checked={trMdbSelection === 'yes'}

                  onCheckedChange={(checked) => {

                    if (checked) setTrMdbSelection('yes');

                  }}

                  className="text-blue-500 border-blue-400 data-[state=checked]:bg-blue-500"

                />

                <Label htmlFor="trMdb-yes" className="font-medium cursor-pointer text-blue-700 text-sm">มี</Label>

              </div>

              <div

                className={`flex items-center space-x-2 px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer ${trMdbSelection === 'no' ? 'bg-gray-100 border-gray-300' : ''}`}

                onClick={() => setTrMdbSelection('no')}

              >

                <Checkbox

                  id="trMdb-no"

                  checked={trMdbSelection === 'no'}

                  onCheckedChange={(checked) => {

                    if (checked) setTrMdbSelection('no');

                  }}

                  className=" border-gray-400 data-[state=checked]:bg-gray-500"

                />

                <Label htmlFor="trMdb-no" className="font-medium cursor-pointer  text-sm">ไม่มี</Label>

              </div>

            </div>

          </CardTitle>

        </CardHeader>

        <CardContent className="p-6">



          {/* แสดงเนื้อหาเมื่อเลือก "มี" */}

          {trMdbSelection === 'yes' && (

            <div className="space-y-4">

              <div className="flex flex-wrap items-center gap-4">

                <div className="flex items-center gap-2">

                  <span className="text-sm ">ประเภท:</span>

                  <span className="font-semibold ">{props.trWiringType}</span>

                </div>

                <div className="flex items-center gap-2">

                  <span className="text-sm ">ขนาดสาย (CV/THW):</span>

                  <span className="font-semibold ">{props.trWiringSize}</span>

                </div>

                <div className="flex items-center gap-2">

                  <span className="text-sm ">ท่อ:</span>

                  <span className="font-semibold ">{props.trWireConduit}</span>

                </div>

              </div>



              <Separator />



              <div className="space-y-3">

                <div className="flex items-center gap-3">

                  <Label htmlFor="trDistance" className=" font-medium min-w-[100px]">ระยะ (เมตร):</Label>

                  <Input

                    id="trDistance"

                    type="number"

                    className="w-32 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"

                    value={trDistance}

                    onChange={(e) => setTrDistance(e.target.value)}

                  />

                </div>

                {props.trWiringType === 'ร้อยท่อเดินในอากาศ กลุ่ม 2' && (

                  <div className="flex items-center gap-3">

                    <Label htmlFor="trWiringGroup2" className=" font-medium min-w-[100px]">เลือกท่อ:</Label>

                    <Select value={trWiringGroup2} onValueChange={setTrWiringGroup2}>

                      <SelectTrigger className="w-32">

                        <SelectValue placeholder="เลือกท่อ" />

                      </SelectTrigger>

                      <SelectContent>

                        <SelectItem value="IMC">IMC</SelectItem>

                        <SelectItem value="RSC">RSC</SelectItem>

                      </SelectContent>

                    </Select>

                  </div>

                )}

              </div>

              {/* แสดงข้อมูลราคา TR to MDB Configuration */}
              {trDistance && parseFloat(trDistance) > 0 && (
                <Collapsible
                  open={openItems['tr-to-mdb-price']}
                  onOpenChange={(open) => setOpenItems(prev => ({ ...prev, 'tr-to-mdb-price': open }))}
                >
                  <div className="bg-blue-50 rounded-lg border border-blue-200">
                    <CollapsibleTrigger className="w-full p-4 text-left hover:bg-blue-100 transition-colors rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">ข้อมูลราคา TR to MDB Configuration:</div>
                        <div className="ml-4">
                          {openItems['tr-to-mdb-price'] ? (
                            <ChevronUp className="h-4 w-4 text-blue-600" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-4">
                        {(() => {
                          const priceData = getTrToMdbPrice(
                            props.trWiringType,
                            props.trWiringType === 'ร้อยท่อเดินในอากาศ กลุ่ม 2' ? trWiringGroup2 : '',
                            props.powerAuthority,
                            props.transformer,
                            parseFloat(trDistance)
                          );

                          if (priceData) {
                            // ใช้ชื่อประเภทจาก TR to MDB Configuration เลย
                            let wiringTypeDisplay = props.trWiringType;

                            // เพิ่มท่อสำหรับร้อยท่อเดินในอากาศ กลุ่ม 2
                            if (props.trWiringType === 'ร้อยท่อเดินในอากาศ กลุ่ม 2' && trWiringGroup2) {
                              wiringTypeDisplay = `${props.trWiringType} - ${trWiringGroup2}`;
                            }

                            return (
                              <div className="p-4 bg-green-50 rounded-lg border border-green-200 space-y-4">
                                {/* Header */}
                                <div>
                                  <div className="text-lg font-semibold text-green-800">
                                    ราคาสายไฟ จากหม้อแปลงเข้าMDB
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    ประเภท: {wiringTypeDisplay}
                                  </div>
                                  <div className="mt-2 text-sm">
                                    <span className="font-medium text-gray-700">รหัส:</span>
                                    <span className="text-gray-600 ml-1">{priceData.productCode}</span>
                                  </div>
                                  <div className="mt-1 text-sm">
                                    <span className="font-medium text-gray-700">ระยะทาง:</span>
                                    <span className="text-gray-600 ml-1">{priceData.distance} เมตร</span>
                                  </div>
                                </div>

                                {/* รวมค่าใช้จ่าย */}
                                <div className="grid grid-cols-3 gap-4">
                                  <div>
                                    <div className="text-sm text-gray-600 mb-1">ค่าของรวม:</div>
                                    <div className="text-xl font-bold text-gray-800">
                                      {priceData.materialPrice.toLocaleString('th-TH')} บาท
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-sm text-gray-600 mb-1">ค่าแรงรวม:</div>
                                    <div className="text-xl font-bold text-gray-800">
                                      {priceData.laborPrice.toLocaleString('th-TH')} บาท
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-sm text-green-700 font-semibold mb-1">ราคารวม:</div>
                                    <div className="text-2xl font-bold text-green-700">
                                      {priceData.totalPrice.toLocaleString('th-TH')} บาท
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <div className="text-sm text-gray-500 bg-red-50 p-3 rounded-lg border">
                                <div className="font-semibold text-red-800 mb-2">ไม่พบข้อมูลราคา</div>
                                <div>ไม่พบข้อมูลราคาสำหรับเงื่อนไขที่เลือก</div>
                                <div className="text-xs mt-1">กรุณาตรวจสอบ Console เพื่อดูข้อมูล Debug</div>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}

            </div>

          )}

        </CardContent>
      </Card>
      {/* MDB Configuration Card */}
      <Card className="shadow-xl border-0 overflow-hidden mb-6">

        <CardHeader className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-b">

          <CardTitle className="flex items-center justify-between text-yellow-800">

            <div className="flex items-center gap-2">

              <Wrench className="h-5 w-5" />

              MDB Configuration <span className="text-xs ">(การตั้งค่า MDB)</span>

            </div>

            <div className="flex items-center gap-3">

              <div

                className={`flex items-center space-x-2 px-3 py-1 rounded-lg border border-gray-200 hover:bg-yellow-50 cursor-pointer ${mdbSelection === 'yes' ? 'bg-yellow-100 border-yellow-300' : ''}`}

                onClick={() => setMdbSelection('yes')}

              >

                <Checkbox

                  id="mdb-yes"

                  checked={mdbSelection === 'yes'}

                  onCheckedChange={(checked) => {

                    if (checked) setMdbSelection('yes');

                  }}

                  className="text-yellow-500 border-yellow-400 data-[state=checked]:bg-yellow-500"

                />

                <Label htmlFor="mdb-yes" className="font-medium cursor-pointer text-yellow-700 text-sm">มี</Label>

              </div>

              <div

                className={`flex items-center space-x-2 px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer ${mdbSelection === 'no' ? 'bg-gray-100 border-gray-300' : ''}`}

                onClick={() => setMdbSelection('no')}

              >

                <Checkbox

                  id="mdb-no"

                  checked={mdbSelection === 'no'}

                  onCheckedChange={(checked) => {

                    if (checked) setMdbSelection('no');

                  }}

                  className=" border-gray-400 data-[state=checked]:bg-gray-500"

                />

                <Label htmlFor="mdb-no" className="font-medium cursor-pointer  text-sm">ไม่มี</Label>

              </div>

            </div>

          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">



          {/* แสดงสเปค MDB Configuration เมื่อเลือก "มี" */}

          {mdbSelection === 'yes' && (

            <div className="space-y-3">

              {/* แสดงสเปค MDB Configuration ก่อน */}

              <div className="p-4 bg-yellow-50 rounded-lg">

                <div className="space-y-2">

                  <div className="flex items-center gap-2">

                    <span className="text-sm  min-w-[160px]">MCCB Main</span>

                    <span className="font-semibold ">

                      {props.mdbMainAt || '-'}

                      {props.mdbMainAf ? <span className="mx-2">/</span> : null}

                      {props.mdbMainAf || ''}

                    </span>

                  </div>

                  {Array.isArray(props.mdbSubs) && props.mdbSubs.map((val: string, idx: number) => (

                    <div key={idx} className="flex items-center gap-2">

                      <span className="text-sm  min-w-[160px]">MCCB Sub C{idx + 1}</span>

                      <span className="font-semibold ">{val}</span>

                    </div>

                  ))}

                  <div className="flex items-center gap-2">

                    <span className="text-sm  min-w-[160px]">MCCB for Lighting</span>

                    <span className="font-semibold ">{props.mdbLighting || '-'}</span>

                  </div>

                  <div className="flex items-center gap-2">

                    <span className="text-sm  min-w-[160px]">MCCB for Commu</span>

                    <span className="font-semibold ">{props.mdbCommu || '-'}</span>

                  </div>

                </div>

              </div>

              {/* แสดงตัวเลือกยี่ห้อ MCCB Main */}

              <div className="space-y-3">

                <Label className="text-sm font-medium ">

                  ยี่ห้อ MCCB Main <span className="text-xs ">(MCCB Main Brand)</span>

                </Label>

                <div className="grid grid-cols-3 gap-3">

                  <div

                    className={`flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-red-50 cursor-pointer ${mccbMainBrand === 'ABB' ? 'bg-red-100 border-red-300' : ''}`}

                    onClick={() => setMccbMainBrand('ABB')}

                  >

                    <Checkbox

                      id="mccb-abb"

                      checked={mccbMainBrand === 'ABB'}

                      onCheckedChange={(checked) => {

                        if (checked) setMccbMainBrand('ABB');

                      }}

                      className="text-red-500 border-red-400 data-[state=checked]:bg-red-500"

                    />

                    <Label htmlFor="mccb-abb" className="font-medium cursor-pointer text-red-700">

                      ABB

                    </Label>

                  </div>

                  <div

                    className={`flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-green-50 cursor-pointer ${mccbMainBrand === 'EATON' ? 'bg-green-100 border-green-300' : ''}`}

                    onClick={() => setMccbMainBrand('EATON')}

                  >

                    <Checkbox

                      id="mccb-eaton"

                      checked={mccbMainBrand === 'EATON'}

                      onCheckedChange={(checked) => {

                        if (checked) setMccbMainBrand('EATON');

                      }}

                      className="text-green-500 border-green-400 data-[state=checked]:bg-green-500"

                    />

                    <Label htmlFor="mccb-eaton" className="font-medium cursor-pointer text-green-700">

                      EATON

                    </Label>

                  </div>

                  <div

                    className={`flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-blue-50 cursor-pointer ${mccbMainBrand === 'LS' ? 'bg-blue-100 border-blue-300' : ''}`}

                    onClick={() => setMccbMainBrand('LS')}

                  >

                    <Checkbox

                      id="mccb-ls"

                      checked={mccbMainBrand === 'LS'}

                      onCheckedChange={(checked) => {

                        if (checked) setMccbMainBrand('LS');

                      }}

                      className="text-blue-500 border-blue-400 data-[state=checked]:bg-blue-500"

                    />

                    <Label htmlFor="mccb-ls" className="font-medium cursor-pointer text-blue-700">

                      LS

                    </Label>

                  </div>

                </div>

                {/* แสดงข้อมูล MDB Configuration */}
                {mdbConfiguration && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-4">
                    {/* Header */}
                    <Collapsible
                      open={openItems['mdb-mccb-info']}
                      onOpenChange={(open) => setOpenItems(prev => ({ ...prev, 'mdb-mccb-info': open }))}
                    >
                      <div className="bg-blue-50 rounded-lg border border-blue-200">
                        <CollapsibleTrigger className="w-full p-4 text-left hover:bg-blue-100 transition-colors rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="text-lg font-semibold text-blue-800">
                              ข้อมูล MCCB สำหรับ {mdbConfiguration.transformerSize} kVA
                            </div>
                            <div className="ml-4">
                              {openItems['mdb-mccb-info'] ? (
                                <ChevronUp className="h-4 w-4 text-blue-600" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-4 pb-4 space-y-4">
                            {/* ประเภทและรหัสสินค้า */}
                            <div>
                              <div className="text-xs text-gray-500">
                                ประเภท: {mdbConfiguration.mccbBrand}
                              </div>
                              {mdbConfiguration.header?.productCodeHeader && (
                                <div className="mt-2 text-sm">
                                  <span className="font-medium text-gray-700">รหัสสินค้า:</span>
                                  <span className="text-gray-600 ml-1">{mdbConfiguration.header.productCodeHeader}</span>
                                </div>
                              )}
                            </div>

                            {/* รวมค่าใช้จ่าย */}
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <div className="text-sm text-gray-600 mb-1">ค่าของรวม:</div>
                                <div className="text-xl font-bold text-gray-800">
                                  {(() => {
                                    const rawPrice = mdbConfiguration.product?.MDBMPric ?? '';
                                    const normalized = parseFloat(String(rawPrice).replace(/[\,\s]/g, ''));
                                    const mainPrice = isNaN(normalized) ? 0 : normalized;
                                    return mainPrice.toLocaleString('th-TH');
                                  })()} บาท
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600 mb-1">ค่าแรงรวม:</div>
                                <div className="text-xl font-bold text-gray-800">
                                  0 บาท
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-blue-700 font-semibold mb-1">ราคารวม:</div>
                                <div className="text-2xl font-bold text-blue-700">
                                  {(() => {
                                    const rawPrice = mdbConfiguration.product?.MDBMPric ?? '';
                                    const normalized = parseFloat(String(rawPrice).replace(/[\,\s]/g, ''));
                                    const mainPrice = isNaN(normalized) ? 0 : normalized;
                                    return mainPrice.toLocaleString('th-TH');
                                  })()} บาท
                                </div>
                              </div>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  </div>
                )}

                {/* แสดงข้อความเมื่อไม่พบข้อมูล MDB */}
                {mccbMainBrand && props.transformer && !mdbConfiguration && (
                  <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="text-sm text-yellow-700">
                      ⚠️ ไม่พบข้อมูล MCCB สำหรับ {props.transformer} kVA ยี่ห้อ {mccbMainBrand} ใน Sheet "ตารางแสดงราคา MAIN MCCB ของ MDB"
                    </div>
                  </div>
                )}

                {/* แสดงตัวเลือกยี่ห้อ MCCB Sub */}
                {Array.isArray(props.mdbSubs) && props.mdbSubs.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">
                      ยี่ห้อ MCCB Sub <span className="text-xs">(MCCB Sub Brand)</span>
                    </Label>
                    <div className="grid grid-cols-3 gap-3">
                      <div
                        className={`flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-red-50 cursor-pointer ${mccbSubBrand === 'ABB' ? 'bg-red-100 border-red-300' : ''}`}
                        onClick={() => setMccbSubBrand('ABB')}
                      >
                        <Checkbox
                          id="mccb-sub-abb"
                          checked={mccbSubBrand === 'ABB'}
                          onCheckedChange={(checked) => {
                            if (checked) setMccbSubBrand('ABB');
                          }}
                          className="text-red-500 border-red-400 data-[state=checked]:bg-red-500"
                        />
                        <Label htmlFor="mccb-sub-abb" className="font-medium cursor-pointer text-red-700">
                          ABB
                        </Label>
                      </div>
                      <div
                        className={`flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-green-50 cursor-pointer ${mccbSubBrand === 'EATON' ? 'bg-green-100 border-green-300' : ''}`}
                        onClick={() => setMccbSubBrand('EATON')}
                      >
                        <Checkbox
                          id="mccb-sub-eaton"
                          checked={mccbSubBrand === 'EATON'}
                          onCheckedChange={(checked) => {
                            if (checked) setMccbSubBrand('EATON');
                          }}
                          className="text-green-500 border-green-400 data-[state=checked]:bg-green-500"
                        />
                        <Label htmlFor="mccb-sub-eaton" className="font-medium cursor-pointer text-green-700">
                          EATON
                        </Label>
                      </div>
                      <div
                        className={`flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-blue-50 cursor-pointer ${mccbSubBrand === 'LS' ? 'bg-blue-100 border-blue-300' : ''}`}
                        onClick={() => setMccbSubBrand('LS')}
                      >
                        <Checkbox
                          id="mccb-sub-ls"
                          checked={mccbSubBrand === 'LS'}
                          onCheckedChange={(checked) => {
                            if (checked) setMccbSubBrand('LS');
                          }}
                          className="text-blue-500 border-blue-400 data-[state=checked]:bg-blue-500"
                        />
                        <Label htmlFor="mccb-sub-ls" className="font-medium cursor-pointer text-blue-700">
                          LS
                        </Label>
                      </div>
                    </div>

                    {/* แสดงข้อมูลราคา MCCB Sub */}
                    {mccbSubBrand && (
                      <Collapsible
                        open={openItems['mdb-mccb-sub-price']}
                        onOpenChange={(open) => setOpenItems(prev => ({ ...prev, 'mdb-mccb-sub-price': open }))}
                      >
                        <div className="bg-yellow-50 rounded-lg border border-yellow-200">
                          <CollapsibleTrigger className="w-full p-4 text-left hover:bg-yellow-100 transition-colors rounded-lg">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-yellow-800">
                                ข้อมูลราคา MCCB Sub ({mccbSubBrand})
                              </h4>
                              <div className="ml-4">
                                {openItems['mdb-mccb-sub-price'] ? (
                                  <ChevronUp className="h-4 w-4 text-yellow-600" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-yellow-600" />
                                )}
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="px-4 pb-4">
                              <div className="space-y-3">
                                {Array.isArray(props.mdbSubs) && props.mdbSubs.map((val: string, idx: number) => {
                                  const mccbSubData = getMccbSubData(val, mccbSubBrand);
                                  return (
                                    <div key={idx} className="p-3 bg-white rounded border border-yellow-300">
                                      <div className="font-medium text-yellow-800 mb-2">
                                        MCCB Sub C{idx + 1}: {val}
                                      </div>
                                      {mccbSubData && Array.isArray(mccbSubData) && mccbSubData.length > 0 ? (
                                        <div className="space-y-2">
                                          {mccbSubData.map((item: any, itemIdx: number) => (
                                            <div key={itemIdx} className="flex items-center gap-2 text-sm">
                                              <span className="font-medium">รุ่น: {item.model}</span>
                                              <span className="text-gray-400">|</span>
                                              <span className="font-medium">จำนวนชุด: {item.quantity}</span>
                                              <span className="text-gray-400">|</span>
                                              <span className="font-semibold text-yellow-700">ราคา: {item.price}</span>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-sm text-gray-500">
                                          ⚠️ ไม่พบข้อมูลราคาสำหรับ MCCB Sub {val} ยี่ห้อ {mccbSubBrand} ใน Sheet "ราคา MCCB ของ CHARGER"
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              {/* ราคารวม MCCB Sub */}
                              {(() => {
                                let totalSubPrice = 0;
                                Array.isArray(props.mdbSubs) && props.mdbSubs.forEach((val: string) => {
                                  const mccbSubData = getMccbSubData(val, mccbSubBrand);
                                  if (mccbSubData && Array.isArray(mccbSubData)) {
                                    mccbSubData.forEach((item: any) => {
                                      if (item.price && item.price !== '-') {
                                        // แปลงราคาเป็นตัวเลข (ลบ comma, space, หรืออักขระอื่นๆ)
                                        const priceStr = String(item.price).replace(/[,\s]/g, '');
                                        const priceNum = parseFloat(priceStr);
                                        if (!isNaN(priceNum)) {
                                          totalSubPrice += priceNum;
                                        }
                                      }
                                    });
                                  }
                                });
                                return totalSubPrice > 0 ? (
                                  <div className="mt-4 p-3 bg-yellow-100 rounded-lg border border-yellow-300">
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-yellow-800">ราคารวม MCCB Sub:</span>
                                      <span className="text-lg font-bold text-yellow-700">{totalSubPrice.toLocaleString()} บาท</span>
                                    </div>
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    )}
                  </div>
                )}

                {/* ราคารวม MDB */}
                {mdbConfiguration && mccbSubBrand && Array.isArray(props.mdbSubs) && props.mdbSubs.length > 0 && (() => {
                  // คำนวณราคา MDB Main
                  let mainPrice = 0;
                  if (mdbConfiguration.product?.MDBMPric && mdbConfiguration.product.MDBMPric !== '-') {
                    const mainPriceStr = String(mdbConfiguration.product.MDBMPric).replace(/[\,\s]/g, '');
                    const mainPriceNum = parseFloat(mainPriceStr);
                    if (!isNaN(mainPriceNum)) {
                      mainPrice = mainPriceNum;
                    }
                  }

                  // คำนวณราคารวม MCCB Sub
                  let totalSubPrice = 0;
                  props.mdbSubs.forEach((val: string) => {
                    const mccbSubData = getMccbSubData(val, mccbSubBrand);
                    if (mccbSubData && Array.isArray(mccbSubData)) {
                      mccbSubData.forEach((item: any) => {
                        if (item.price && item.price !== '-') {
                          const priceStr = String(item.price).replace(/[,\s]/g, '');
                          const priceNum = parseFloat(priceStr);
                          if (!isNaN(priceNum)) {
                            totalSubPrice += priceNum;
                          }
                        }
                      });
                    }
                  });

                  const totalMdbPrice = mainPrice + totalSubPrice;
                  return totalMdbPrice > 0 ? (
                    <div className="mt-4 p-3 bg-blue-100 rounded-lg border border-blue-300">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-blue-800">ราคารวม MDB:</span>
                        <span className="text-lg font-bold text-blue-700">{totalMdbPrice.toLocaleString()} บาท</span>
                      </div>
                    </div>
                  ) : null;
                })()}

              </div>

            </div>

          )}

        </CardContent>
      </Card>
      {/* MDB to Charger Configuration Card */}
      <Card className="shadow-xl border-0 overflow-hidden mb-6">

        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">

          <CardTitle className="flex items-center justify-between text-green-800">

            <div className="flex items-center gap-2">

              <Wrench className="h-5 w-5" />

              MDB to Charger Configuration <span className="text-xs ">(การตั้งค่า MDB ไป Charger)</span>

            </div>

            <div className="flex items-center gap-3">

              <div

                className={`flex items-center space-x-2 px-3 py-1 rounded-lg border border-gray-200 hover:bg-green-50 cursor-pointer ${chargerSelection === 'yes' ? 'bg-green-100 border-green-300' : ''}`}

                onClick={() => setChargerSelection('yes')}

              >

                <Checkbox

                  id="charger-yes"

                  checked={chargerSelection === 'yes'}

                  onCheckedChange={(checked) => {

                    if (checked) setChargerSelection('yes');

                  }}

                  className="text-green-500 border-green-400 data-[state=checked]:bg-green-500"

                />

                <Label htmlFor="charger-yes" className="font-medium cursor-pointer text-green-700 text-sm">มี</Label>

              </div>

              <div

                className={`flex items-center space-x-2 px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer ${chargerSelection === 'no' ? 'bg-gray-100 border-gray-300' : ''}`}

                onClick={() => setChargerSelection('no')}

              >

                <Checkbox

                  id="charger-no"

                  checked={chargerSelection === 'no'}

                  onCheckedChange={(checked) => {

                    if (checked) setChargerSelection('no');

                  }}

                  className=" border-gray-400 data-[state=checked]:bg-gray-500"

                />

                <Label htmlFor="charger-no" className="font-medium cursor-pointer  text-sm">ไม่มี</Label>

              </div>

            </div>

          </CardTitle>

        </CardHeader>

        <CardContent className="p-6">



          {/* แสดงเนื้อหาเมื่อเลือก "มี" */}

          {chargerSelection === 'yes' && (

            <div className="space-y-3">

              {(() => {

                const cables: string[] = Array.isArray(props.chargerWiringCableAll) ? props.chargerWiringCableAll : (props.chargerWiringCable ? [props.chargerWiringCable] : []);

                const conduits: string[] = Array.isArray(props.chargerWireConduitAll) ? props.chargerWireConduitAll : (props.chargerWireConduit ? [props.chargerWireConduit] : []);

                // Normalize helper to ensure grouping matches even if spacing/case differ

                const normalize = (s: string) => {

                  const nfkc = (s || '').normalize('NFKC');

                  return nfkc

                    .toLowerCase()

                    .replace(/×/g, 'x')

                    .replace(/\*/g, 'x')

                    .replace(/["'`]/g, '')

                    .replace(/\s+/g, '')

                    .replace(/\(\s*/g, '(')

                    .replace(/\s*\)/g, ')')

                    .replace(/\s*\/\s*/g, '/')

                    .replace(/\s*x\s*/g, 'x')

                    .replace(/,+/g, ',')

                    .trim();

                };



                // Group indices by normalized cable string

                const groups = new Map<string, { key: string; label: string; idxs: number[] }>();

                const count = Math.max(chargersCount, cables.length, conduits.length);

                for (let i = 0; i < count; i++) {

                  const rawCable = cables[i] ?? cables[cables.length - 1] ?? '';

                  const key = normalize(rawCable);

                  const existing = groups.get(key);

                  if (existing) {

                    existing.idxs.push(i);

                  } else {

                    groups.set(key, { key, label: rawCable, idxs: [i] });

                  }

                }



                // Render each group. If a group has 1, it's a normal row. If >1, render a combined row with Units.

                return Array.from(groups.values()).map(({ label: cable, idxs }) => {

                  // Conduits may vary per index; collect unique

                  const conduitSet = new Set<string>();

                  idxs.forEach(i => conduitSet.add(conduits[i] ?? conduits[conduits.length - 1] ?? ''));

                  const conduitDisplay = Array.from(conduitSet).filter(Boolean).join(', ');

                  const isGroup2Air = props.chargerWiringType === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ';



                  if (idxs.length === 1) {

                    const idx = idxs[0];

                    const distance = chargerLineDistances[idx] ?? '';

                    const group2Selected = chargerConduitChoices[idx] ?? '';

                    const setDistanceAt = (val: string) => {

                      const next = [...chargerLineDistances];

                      next[idx] = val;

                      setChargerLineDistances(next);

                    };

                    const setConduitChoiceAt = (val: string) => {

                      const next = [...chargerConduitChoices];

                      next[idx] = val;

                      setChargerConduitChoices(next);

                    };

                    return (

                      <div key={`${cable}-single-${idx}`} className="p-3 rounded-md border border-gray-200">

                        <div className="flex flex-wrap items-center gap-4">

                          <div className="flex items-center gap-2">

                            <span className="text-sm ">ประเภท:</span>

                            <span className="font-semibold ">{props.chargerWiringType}</span>

                          </div>

                          <div className="flex items-center gap-2">

                            <span className="text-sm ">ขนาดสาย (CV/THW):</span>

                            <span className="font-semibold ">{cable}</span>

                          </div>

                          <div className="flex items-center gap-2">

                            <span className="text-sm ">ท่อ:</span>

                            <span className="font-semibold ">{conduits[idx] ?? conduits[conduits.length - 1] ?? ''}</span>

                          </div>

                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-4">

                          <div className="flex items-center gap-3">

                            <Label htmlFor={`chargerDistance_${idx}`} className=" font-medium min-w-[100px]">ระยะ (เมตร):</Label>

                            <Input

                              id={`chargerDistance_${idx}`}

                              type="number"

                              className="w-32 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"

                              value={distance}

                              onChange={(e) => setDistanceAt(e.target.value)}

                            />

                          </div>

                          {isGroup2Air && (

                            <div className="flex items-center gap-3">

                              <Label className=" font-medium min-w-[100px]">เลือกท่อ:</Label>

                              <Select value={group2Selected} onValueChange={setConduitChoiceAt}>

                                <SelectTrigger className="w-32">

                                  <SelectValue placeholder="เลือกท่อ" />

                                </SelectTrigger>

                                <SelectContent>

                                  <SelectItem value="IMC">IMC</SelectItem>

                                  <SelectItem value="RSC">RSC</SelectItem>

                                </SelectContent>

                              </Select>

                            </div>

                          )}

                        </div>


                      </div>

                    );

                  }



                  // Combined row for multiple same-cable entries

                  const setGroupDistance = (val: string) => {

                    const next = [...chargerLineDistances];

                    idxs.forEach(i => { next[i] = val; });

                    setChargerLineDistances(next);

                  };

                  const setGroupConduitChoice = (val: string) => {

                    const next = [...chargerConduitChoices];

                    idxs.forEach(i => { next[i] = val; });

                    setChargerConduitChoices(next);

                  };

                  const groupDistance = idxs.map(i => chargerLineDistances[i]).find(v => v !== undefined) || '';

                  const groupConduitChoice = idxs.map(i => chargerConduitChoices[i]).find(v => v !== undefined) || '';



                  return (

                    <div key={`${cable}-group`} className="p-3 rounded-md border border-gray-200">

                      <div className="flex flex-wrap items-center gap-4">

                        <div className="flex items-center gap-2">

                          <span className="text-sm ">ประเภท:</span>

                          <span className="font-semibold ">{props.chargerWiringType}</span>

                        </div>

                        <div className="flex items-center gap-2">

                          <span className="text-sm ">ขนาดสาย (CV/THW):</span>

                          <span className="font-semibold ">{cable} <span className=" text-xs">({idxs.length} Units)</span></span>

                        </div>

                        <div className="flex items-center gap-2">

                          <span className="text-sm ">ท่อ:</span>

                          <span className="font-semibold ">{conduitDisplay || '-'}</span>

                        </div>

                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-4">

                        <div className="flex items-center gap-3">

                          <Label className=" font-medium min-w-[100px]">ระยะ (เมตร):</Label>

                          <Input

                            type="number"

                            className="w-32 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"

                            value={groupDistance}

                            onChange={(e) => setGroupDistance(e.target.value)}

                          />

                        </div>

                        {isGroup2Air && (

                          <div className="flex items-center gap-3">

                            <Label className=" font-medium min-w-[100px]">เลือกท่อ:</Label>

                            <Select value={groupConduitChoice} onValueChange={setGroupConduitChoice}>

                              <SelectTrigger className="w-32">

                                <SelectValue placeholder="เลือกท่อ" />

                              </SelectTrigger>

                              <SelectContent>

                                <SelectItem value="IMC">IMC</SelectItem>

                                <SelectItem value="RSC">RSC</SelectItem>

                              </SelectContent>

                            </Select>

                          </div>

                        )}

                      </div>

                    </div>

                  );

                });

              })()}

              {/* Results Summary */}
              <div className="mt-6 space-y-4">
                <h4 className="font-semibold text-blue-800 text-lg">ผลลัพธ์การคำนวณ MDB to Charger Configuration</h4>

                {Object.keys(chargerResults).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(chargerResults).map(([index, result]) => {
                      const chargerIndex = parseInt(index);
                      const isOpen = openChargers[chargerIndex] ?? false;

                      return (
                        <Collapsible
                          key={index}
                          open={isOpen}
                          onOpenChange={(open) => setOpenChargers(prev => ({ ...prev, [chargerIndex]: open }))}
                        >
                          <div className="bg-blue-50 rounded-lg border border-blue-200">
                            {/* Header ที่สามารถคลิกได้ */}
                            <CollapsibleTrigger className="w-full p-4 text-left hover:bg-blue-100 transition-colors rounded-lg">
                              <div className="flex items-center justify-between">
                                <div className="text-lg font-semibold text-blue-800">
                                  Charger {chargerIndex + 1}: {props.chargerSummary?.[chargerIndex]?.name || ''}
                                </div>
                                <div className="ml-4">
                                  {isOpen ? (
                                    <ChevronUp className="h-5 w-5 text-blue-600" />
                                  ) : (
                                    <ChevronDown className="h-5 w-5 text-blue-600" />
                                  )}
                                </div>
                              </div>
                            </CollapsibleTrigger>

                            {/* Content ที่สามารถพับได้ */}
                            <CollapsibleContent>
                              <div className="px-4 pb-4 space-y-4">
                                {/* ข้อมูลเพิ่มเติม */}
                                <div>
                                  <div className="text-xs text-gray-500">
                                    ประเภท: {props.chargerWiringType}
                                  </div>
                                  <div className="mt-2 text-sm">
                                    <span className="font-medium text-gray-700">รหัส:</span>
                                    <span className="text-gray-600 ml-1">{result.code}</span>
                                    <span className="text-gray-400 mx-2">|</span>
                                    <span className="font-medium text-gray-700">ระยะ:</span>
                                    <span className="text-gray-600 ml-1">{chargerLineDistances[chargerIndex] || '-'} เมตร</span>
                                    {props.chargerWiringType === 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ' && chargerConduitChoices[chargerIndex] && (
                                      <>
                                        <span className="text-gray-400 mx-2">|</span>
                                        <span className="font-medium text-gray-700">เลือกท่อ:</span>
                                        <span className="text-gray-600 ml-1">{chargerConduitChoices[chargerIndex]}</span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* รวมค่าใช้จ่าย */}
                                <div className="grid grid-cols-3 gap-4">
                                  <div>
                                    <div className="text-sm text-gray-600 mb-1">ค่าของรวม:</div>
                                    <div className="text-xl font-bold text-gray-800">
                                      {result.materialCost.toLocaleString('th-TH')} บาท
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-sm text-gray-600 mb-1">ค่าแรงรวม:</div>
                                    <div className="text-xl font-bold text-gray-800">
                                      {result.laborCost.toLocaleString('th-TH')} บาท
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-sm text-blue-700 font-semibold mb-1">ราคารวม:</div>
                                    <div className="text-2xl font-bold text-blue-700">
                                      {(result.laborCost + result.materialCost).toLocaleString('th-TH')} บาท
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      );
                    })}

                    {/* รวมค่าใช้จ่ายทั้งหมด */}
                    <Collapsible
                      open={openItems['mdb-to-charger-total']}
                      onOpenChange={(open) => setOpenItems(prev => ({ ...prev, 'mdb-to-charger-total': open }))}
                    >
                      <div className="bg-green-50 rounded-lg border border-green-200">
                        <CollapsibleTrigger className="w-full p-4 text-left hover:bg-green-100 transition-colors rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="text-lg font-semibold text-green-800">รวมค่าใช้จ่ายทั้งหมด</div>
                            <div className="ml-4">
                              {openItems['mdb-to-charger-total'] ? (
                                <ChevronUp className="h-4 w-4 text-green-600" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-4 pb-4 space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <div className="text-sm text-gray-600 mb-1">ค่าของรวม:</div>
                                <div className="text-xl font-bold text-gray-800">
                                  {Object.values(chargerResults).reduce((total, result) =>
                                    total + result.materialCost, 0
                                  ).toLocaleString('th-TH')} บาท
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600 mb-1">ค่าแรงรวม:</div>
                                <div className="text-xl font-bold text-gray-800">
                                  {Object.values(chargerResults).reduce((total, result) =>
                                    total + result.laborCost, 0
                                  ).toLocaleString('th-TH')} บาท
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-green-700 font-semibold mb-1">ราคารวม:</div>
                                <div className="text-2xl font-bold text-green-700">
                                  {Object.values(chargerResults).reduce((total, result) =>
                                    total + (result.laborCost + result.materialCost), 0
                                  ).toLocaleString('th-TH')} บาท
                                </div>
                              </div>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg border">
                    ยังไม่มีผลลัพธ์ - กรุณากรอกข้อมูลและเลือกประเภทท่อ
                  </div>
                )}
              </div>

            </div>

          )}

        </CardContent>
      </Card>
      <Card className="shadow-xl border-0 overflow-hidden">

        <CardHeader className="border-b">

          <CardTitle className="flex items-center justify-between">

            <div className="flex items-center gap-2">

              <Home className="h-5 w-5" />

              Additional Features & Options <span className="text-xs ">(ฟีเจอร์และตัวเลือกเพิ่มเติม)</span>

            </div>

            <div className="flex items-center gap-3">

              <div

                className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${additionalSelection === 'yes' ? 'bg-gray-100' : ''}`}

                onClick={() => setAdditionalSelection('yes')}

              >

                <Checkbox

                  id="additional-yes"

                  checked={additionalSelection === 'yes'}

                  onCheckedChange={(checked) => {

                    if (checked) setAdditionalSelection('yes');

                  }}

                  className=""

                />

                <Label htmlFor="additional-yes" className="font-medium cursor-pointer text-sm">มี</Label>

              </div>

              <div

                className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${additionalSelection === 'no' ? 'bg-gray-100' : ''}`}

                onClick={() => setAdditionalSelection('no')}

              >

                <Checkbox

                  id="additional-no"

                  checked={additionalSelection === 'no'}

                  onCheckedChange={(checked) => {

                    if (checked) setAdditionalSelection('no');

                  }}

                  className=""

                />

                <Label htmlFor="additional-no" className="font-medium cursor-pointer text-sm">ไม่มี</Label>

              </div>

            </div>

          </CardTitle>

          <CardDescription>

            อุปกรณ์ประกอบสถานี, ระบบสื่อสาร, งานปูน, และงานทาสี

          </CardDescription>

        </CardHeader>

        <CardContent className="p-6">

          {/* แสดงเนื้อหาเมื่อเลือก "มี" */}

          {additionalSelection === 'yes' && (

            <div className="space-y-6">

              {/* จำนวนช่องจอด - อยู่บนสุด */}

              <div className="space-y-3">

                <Label htmlFor="parkingSlots" className="font-medium flex items-center gap-2">

                  <Car className="h-4 w-4" />

                  จำนวนช่องจอด:

                </Label>

                <Select value={parkingSlots} onValueChange={setParkingSlots}>

                  <SelectTrigger className="w-32">

                    <SelectValue placeholder="เลือกจำนวน" />

                  </SelectTrigger>

                  <SelectContent>

                    {Array.from({ length: 24 }, (_, i) => i + 1).map(num => (

                      <SelectItem key={num} value={num.toString()}>{num}</SelectItem>

                    ))}

                  </SelectContent>

                </Select>

                <span className="text-sm">ช่องจอด</span>

              </div>

              <Separator />

              {/* 1. อุปกรณ์ประกอบสถานี */}

              <Collapsible
                open={openSections['equipment']}
                onOpenChange={(open) => setOpenSections(prev => ({ ...prev, 'equipment': open }))}
              >
                <div className="bg-gray-50 rounded-lg border border-gray-200">
                  <CollapsibleTrigger asChild>
                    <div className="w-full p-4 text-left hover:bg-gray-100 transition-colors rounded-lg">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Wrench className="h-5 w-5" />
                          1. อุปกรณ์ประกอบสถานี
                        </h3>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <div
                              className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${equipmentSelection === 'yes' ? 'bg-green-100 border-green-300' : 'hover:bg-gray-50'}`}
                              onClick={() => setEquipmentSelection('yes')}
                            >
                              <Checkbox
                                id="equipment-yes"
                                checked={equipmentSelection === 'yes'}
                                onCheckedChange={(checked) => { if (checked) setEquipmentSelection('yes'); }}
                                className="border-green-400 data-[state=checked]:bg-green-500"
                              />
                              <Label htmlFor="equipment-yes" className="font-medium cursor-pointer text-sm">มี</Label>
                            </div>
                            <div
                              className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${equipmentSelection === 'no' ? 'bg-gray-100 border-gray-300' : 'hover:bg-gray-50'}`}
                              onClick={() => setEquipmentSelection('no')}
                            >
                              <Checkbox
                                id="equipment-no"
                                checked={equipmentSelection === 'no'}
                                onCheckedChange={(checked) => { if (checked) setEquipmentSelection('no'); }}
                                className="border-gray-400 data-[state=checked]:bg-gray-500"
                              />
                              <Label htmlFor="equipment-no" className="font-medium cursor-pointer text-sm">ไม่มี</Label>
                            </div>
                          </div>
                          <div className="ml-4">
                            {openSections['equipment'] ? (
                              <ChevronUp className="h-5 w-5 text-gray-600" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-600" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    {equipmentSelection === 'yes' && (
                      <div className="px-4 pb-4 space-y-4">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                          {/* 1.1 เสากันชน */}

                          <div className="space-y-2">
                            {/* Item name and toggle buttons */}
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-base font-semibold text-gray-800">เสากันชน</span>
                              <div className="flex items-center gap-2">
                                <div
                                  className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${bumperPoles === 'yes' ? 'bg-green-100 border-green-300' : 'hover:bg-gray-50'}`}
                                  onClick={() => setBumperPoles('yes')}
                                >
                                  <Checkbox
                                    id="bumper-poles-yes"
                                    checked={bumperPoles === 'yes'}
                                    onCheckedChange={(checked) => { if (checked) setBumperPoles('yes'); }}
                                    className="border-green-400 data-[state=checked]:bg-green-500"
                                  />
                                  <Label htmlFor="bumper-poles-yes" className="font-medium cursor-pointer text-sm">มี</Label>
                                </div>
                                <div
                                  className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${bumperPoles === 'no' ? 'bg-gray-100 border-gray-300' : 'hover:bg-gray-50'}`}
                                  onClick={() => setBumperPoles('no')}
                                >
                                  <Checkbox
                                    id="bumper-poles-no"
                                    checked={bumperPoles === 'no'}
                                    onCheckedChange={(checked) => { if (checked) setBumperPoles('no'); }}
                                    className="border-gray-400 data-[state=checked]:bg-gray-500"
                                  />
                                  <Label htmlFor="bumper-poles-no" className="font-medium cursor-pointer text-sm">ไม่มี</Label>
                                </div>
                              </div>
                            </div>

                            {bumperPoles === 'yes' && (
                              <Collapsible
                                open={openItems['bumper-poles']}
                                onOpenChange={(open) => setOpenItems(prev => ({ ...prev, 'bumper-poles': open }))}
                              >
                                <div className="bg-green-50 rounded-lg border border-green-200">
                                  <CollapsibleTrigger className="w-full p-3 text-left hover:bg-green-100 transition-colors rounded-lg">
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold">
                                        {parkingSlotsCount * 2} <span className="text-sm">ชิ้น</span>
                                      </span>
                                      <div className="ml-4">
                                        {openItems['bumper-poles'] ? (
                                          <ChevronUp className="h-4 w-4 text-green-600" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4 text-green-600" />
                                        )}
                                      </div>
                                    </div>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <div className="px-3 pb-3">
                                      {stationEquipmentPriceMapping['bumper-poles'] && (
                                        <div className="text-xs space-y-1 mt-2">
                                          <div><span className="font-medium">เลขสินค้า:</span> {stationEquipmentPriceMapping['bumper-poles'].productCode}</div>
                                          <div><span className="font-medium">ราคาค่าของ:</span> {(stationEquipmentPriceMapping['bumper-poles'].materialPrice * (parkingSlotsCount * 2)).toLocaleString('th-TH')} บาท</div>
                                          <div><span className="font-medium">ราคาค่าแรง:</span> {(stationEquipmentPriceMapping['bumper-poles'].laborPrice * (parkingSlotsCount * 2)).toLocaleString('th-TH')} บาท</div>
                                          <div><span className="font-medium">ราคารวม:</span> {(stationEquipmentPriceMapping['bumper-poles'].totalPrice * (parkingSlotsCount * 2)).toLocaleString('th-TH')} บาท</div>
                                        </div>
                                      )}
                                    </div>
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            )}

                          </div>

                          {/* 1.2 ยางกั้นล้อ (ปูน) */}

                          <div className="space-y-2">
                            {/* Item name and toggle buttons */}
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-base font-semibold text-gray-800">ยางกั้นล้อ (ปูน)</span>
                              <div className="flex items-center gap-2">
                                <div
                                  className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${wheelStops === 'yes' ? 'bg-green-100 border-green-300' : 'hover:bg-gray-50'}`}
                                  onClick={() => setWheelStops('yes')}
                                >
                                  <Checkbox
                                    id="wheel-stops-yes"
                                    checked={wheelStops === 'yes'}
                                    onCheckedChange={(checked) => { if (checked) setWheelStops('yes'); }}
                                    className="border-green-400 data-[state=checked]:bg-green-500"
                                  />
                                  <Label htmlFor="wheel-stops-yes" className="font-medium cursor-pointer text-sm">มี</Label>
                                </div>
                                <div
                                  className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${wheelStops === 'no' ? 'bg-gray-100 border-gray-300' : 'hover:bg-gray-50'}`}
                                  onClick={() => setWheelStops('no')}
                                >
                                  <Checkbox
                                    id="wheel-stops-no"
                                    checked={wheelStops === 'no'}
                                    onCheckedChange={(checked) => { if (checked) setWheelStops('no'); }}
                                    className="border-gray-400 data-[state=checked]:bg-gray-500"
                                  />
                                  <Label htmlFor="wheel-stops-no" className="font-medium cursor-pointer text-sm">ไม่มี</Label>
                                </div>
                              </div>
                            </div>

                            {wheelStops === 'yes' && (
                              <Collapsible
                                open={openItems['wheel-stops']}
                                onOpenChange={(open) => setOpenItems(prev => ({ ...prev, 'wheel-stops': open }))}
                              >
                                <div className="bg-green-50 rounded-lg border border-green-200">
                                  <CollapsibleTrigger className="w-full p-3 text-left hover:bg-green-100 transition-colors rounded-lg">
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold">
                                        {parkingSlotsCount} <span className="text-sm">ชิ้น</span>
                                      </span>
                                      <div className="ml-4">
                                        {openItems['wheel-stops'] ? (
                                          <ChevronUp className="h-4 w-4 text-green-600" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4 text-green-600" />
                                        )}
                                      </div>
                                    </div>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <div className="px-3 pb-3">
                                      {stationEquipmentPriceMapping['wheel-stops'] && (
                                        <div className="text-xs space-y-1 mt-2">
                                          <div><span className="font-medium">เลขสินค้า:</span> {stationEquipmentPriceMapping['wheel-stops'].productCode}</div>
                                          <div><span className="font-medium">ราคาค่าของ:</span> {(stationEquipmentPriceMapping['wheel-stops'].materialPrice * parkingSlotsCount).toLocaleString('th-TH')} บาท</div>
                                          <div><span className="font-medium">ราคาค่าแรง:</span> {(stationEquipmentPriceMapping['wheel-stops'].laborPrice * parkingSlotsCount).toLocaleString('th-TH')} บาท</div>
                                          <div><span className="font-medium">ราคารวม:</span> {(stationEquipmentPriceMapping['wheel-stops'].totalPrice * parkingSlotsCount).toLocaleString('th-TH')} บาท</div>
                                        </div>
                                      )}
                                    </div>
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            )}

                          </div>

                          {/* 1.3 ถังดับเพลิง+ตู้ */}

                          <div className="space-y-2">
                            {/* Item name and toggle buttons */}
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-base font-semibold text-gray-800">ถังดับเพลิง+ตู้</span>
                              <div className="flex items-center gap-2">
                                <div
                                  className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${fireExtinguisherCabinet === 'yes' ? 'bg-green-100 border-green-300' : 'hover:bg-gray-50'}`}
                                  onClick={() => setFireExtinguisherCabinet('yes')}
                                >
                                  <Checkbox
                                    id="fire-extinguisher-yes"
                                    checked={fireExtinguisherCabinet === 'yes'}
                                    onCheckedChange={(checked) => { if (checked) setFireExtinguisherCabinet('yes'); }}
                                    className="border-green-400 data-[state=checked]:bg-green-500"
                                  />
                                  <Label htmlFor="fire-extinguisher-yes" className="font-medium cursor-pointer text-sm">มี</Label>
                                </div>
                                <div
                                  className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${fireExtinguisherCabinet === 'no' ? 'bg-gray-100 border-gray-300' : 'hover:bg-gray-50'}`}
                                  onClick={() => setFireExtinguisherCabinet('no')}
                                >
                                  <Checkbox
                                    id="fire-extinguisher-no"
                                    checked={fireExtinguisherCabinet === 'no'}
                                    onCheckedChange={(checked) => { if (checked) setFireExtinguisherCabinet('no'); }}
                                    className="border-gray-400 data-[state=checked]:bg-gray-500"
                                  />
                                  <Label htmlFor="fire-extinguisher-no" className="font-medium cursor-pointer text-sm">ไม่มี</Label>
                                </div>
                              </div>
                            </div>

                            {fireExtinguisherCabinet === 'yes' && (
                              <Collapsible
                                open={openItems['fire-extinguisher']}
                                onOpenChange={(open) => setOpenItems(prev => ({ ...prev, 'fire-extinguisher': open }))}
                              >
                                <div className="bg-red-50 rounded-lg border border-red-200">
                                  <CollapsibleTrigger className="w-full p-3 text-left hover:bg-red-100 transition-colors rounded-lg">
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-red-600">
                                        {featureChargersCount} <span className="text-sm">ชิ้น</span>
                                      </span>
                                      <div className="ml-4">
                                        {openItems['fire-extinguisher'] ? (
                                          <ChevronUp className="h-4 w-4 text-red-600" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4 text-red-600" />
                                        )}
                                      </div>
                                    </div>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <div className="px-3 pb-3">
                                      {stationEquipmentPriceMapping['fire-extinguisher'] && (
                                        <div className="text-xs space-y-1 mt-2">
                                          <div><span className="font-medium">เลขสินค้า:</span> {stationEquipmentPriceMapping['fire-extinguisher'].productCode}</div>
                                          <div><span className="font-medium">ราคาค่าของ:</span> {(stationEquipmentPriceMapping['fire-extinguisher'].materialPrice * featureChargersCount).toLocaleString('th-TH')} บาท</div>
                                          <div><span className="font-medium">ราคาค่าแรง:</span> {(stationEquipmentPriceMapping['fire-extinguisher'].laborPrice * featureChargersCount).toLocaleString('th-TH')} บาท</div>
                                          <div><span className="font-medium">ราคารวม:</span> {(stationEquipmentPriceMapping['fire-extinguisher'].totalPrice * featureChargersCount).toLocaleString('th-TH')} บาท</div>
                                        </div>
                                      )}
                                    </div>
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            )}

                          </div>

                          {/* 1.4 ป้ายสูง + วิธีใช้งาน */}

                          <div className="space-y-2">
                            {/* Item name and toggle buttons */}
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-base font-semibold text-gray-800">ป้ายสูง + วิธีใช้งาน</span>
                              <div className="flex items-center gap-2">
                                <div
                                  className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${signage === 'yes' ? 'bg-green-100 border-green-300' : 'hover:bg-gray-50'}`}
                                  onClick={() => setSignage('yes')}
                                >
                                  <Checkbox
                                    id="signage-yes"
                                    checked={signage === 'yes'}
                                    onCheckedChange={(checked) => { if (checked) setSignage('yes'); }}
                                    className="border-green-400 data-[state=checked]:bg-green-500"
                                  />
                                  <Label htmlFor="signage-yes" className="font-medium cursor-pointer text-sm">มี</Label>
                                </div>
                                <div
                                  className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${signage === 'no' ? 'bg-gray-100 border-gray-300' : 'hover:bg-gray-50'}`}
                                  onClick={() => setSignage('no')}
                                >
                                  <Checkbox
                                    id="signage-no"
                                    checked={signage === 'no'}
                                    onCheckedChange={(checked) => { if (checked) setSignage('no'); }}
                                    className="border-gray-400 data-[state=checked]:bg-gray-500"
                                  />
                                  <Label htmlFor="signage-no" className="font-medium cursor-pointer text-sm">ไม่มี</Label>
                                </div>
                              </div>
                            </div>

                            {signage === 'yes' && (
                              <Collapsible
                                open={openItems['signage']}
                                onOpenChange={(open) => setOpenItems(prev => ({ ...prev, 'signage': open }))}
                              >
                                <div className="bg-purple-50 rounded-lg border border-purple-200">
                                  <CollapsibleTrigger className="w-full p-3 text-left hover:bg-purple-100 transition-colors rounded-lg">
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-purple-600">
                                        {featureChargersCount} <span className="text-sm">ชิ้น</span>
                                      </span>
                                      <div className="ml-4">
                                        {openItems['signage'] ? (
                                          <ChevronUp className="h-4 w-4 text-purple-600" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4 text-purple-600" />
                                        )}
                                      </div>
                                    </div>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <div className="px-3 pb-3">
                                      {stationEquipmentPriceMapping['signage'] && (
                                        <div className="text-xs space-y-1 mt-2">
                                          <div><span className="font-medium">เลขสินค้า:</span> {stationEquipmentPriceMapping['signage'].productCode}</div>
                                          <div><span className="font-medium">ราคาค่าของ:</span> {(stationEquipmentPriceMapping['signage'].materialPrice * featureChargersCount).toLocaleString('th-TH')} บาท</div>
                                          <div><span className="font-medium">ราคาค่าแรง:</span> {(stationEquipmentPriceMapping['signage'].laborPrice * featureChargersCount).toLocaleString('th-TH')} บาท</div>
                                          <div><span className="font-medium">ราคารวม:</span> {(stationEquipmentPriceMapping['signage'].totalPrice * featureChargersCount).toLocaleString('th-TH')} บาท</div>
                                        </div>
                                      )}
                                    </div>
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            )}

                          </div>

                        </div>

                        {/* รวมค่าใช้จ่ายอุปกรณ์ประกอบสถานี */}
                        <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200 space-y-4">
                          <div className="text-lg font-semibold text-green-800">รวมค่าใช้จ่ายอุปกรณ์ประกอบสถานี</div>

                          {/* ราคารวม */}
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <div className="text-sm text-gray-600 mb-1">ค่าของรวม:</div>
                              <div className="text-xl font-bold text-gray-800">{equipmentTotals.material.toLocaleString('th-TH')} บาท</div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-600 mb-1">ค่าแรงรวม:</div>
                              <div className="text-xl font-bold text-gray-800">{equipmentTotals.labor.toLocaleString('th-TH')} บาท</div>
                            </div>
                            <div>
                              <div className="text-sm text-green-700 font-semibold mb-1">ราคารวม:</div>
                              <div className="text-2xl font-bold text-green-700">{equipmentTotals.total.toLocaleString('th-TH')} บาท</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CollapsibleContent>
                </div>
              </Collapsible>

              <Separator />

              {/* 2. ระบบสื่อสาร */}

              <Collapsible
                open={openSections['communication']}
                onOpenChange={(open) => setOpenSections(prev => ({ ...prev, 'communication': open }))}
              >
                <div className="bg-gray-50 rounded-lg border border-gray-200">
                  <CollapsibleTrigger asChild>
                    <div className="w-full p-4 text-left hover:bg-gray-100 transition-colors rounded-lg">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Shield className="h-5 w-5" />
                          2. ระบบสื่อสาร
                        </h3>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <div
                              className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${communicationSelection === 'yes' ? 'bg-green-100 border-green-300' : 'hover:bg-gray-50'}`}
                              onClick={() => setCommunicationSelection('yes')}
                            >
                              <Checkbox
                                id="communication-yes"
                                checked={communicationSelection === 'yes'}
                                onCheckedChange={(checked) => { if (checked) setCommunicationSelection('yes'); }}
                                className="border-green-400 data-[state=checked]:bg-green-500"
                              />
                              <Label htmlFor="communication-yes" className="font-medium cursor-pointer text-sm">มี</Label>
                            </div>
                            <div
                              className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${communicationSelection === 'no' ? 'bg-gray-100 border-gray-300' : 'hover:bg-gray-50'}`}
                              onClick={() => setCommunicationSelection('no')}
                            >
                              <Checkbox
                                id="communication-no"
                                checked={communicationSelection === 'no'}
                                onCheckedChange={(checked) => { if (checked) setCommunicationSelection('no'); }}
                                className="border-gray-400 data-[state=checked]:bg-gray-500"
                              />
                              <Label htmlFor="communication-no" className="font-medium cursor-pointer text-sm">ไม่มี</Label>
                            </div>
                          </div>
                          <div className="ml-4">
                            {openSections['communication'] ? (
                              <ChevronUp className="h-5 w-5 text-gray-600" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-600" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    {communicationSelection === 'yes' && (
                      <div className="px-4 pb-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                          {/* 2.1 WIFI + 4G + HUB */}

                          <div className="space-y-2">
                            {/* Item name and toggle buttons */}
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-base font-semibold text-gray-800">WIFI + 4G + HUB</span>
                              <div className="flex items-center gap-2">
                                <div
                                  className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${wifi4gHub === 'yes' ? 'bg-green-100 border-green-300' : 'hover:bg-gray-50'}`}
                                  onClick={() => setWifi4gHub('yes')}
                                >
                                  <Checkbox
                                    id="wifi4g-hub-yes"
                                    checked={wifi4gHub === 'yes'}
                                    onCheckedChange={(checked) => { if (checked) setWifi4gHub('yes'); }}
                                    className="border-green-400 data-[state=checked]:bg-green-500"
                                  />
                                  <Label htmlFor="wifi4g-hub-yes" className="font-medium cursor-pointer text-sm">มี</Label>
                                </div>
                                <div
                                  className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${wifi4gHub === 'no' ? 'bg-gray-100 border-gray-300' : 'hover:bg-gray-50'}`}
                                  onClick={() => setWifi4gHub('no')}
                                >
                                  <Checkbox
                                    id="wifi4g-hub-no"
                                    checked={wifi4gHub === 'no'}
                                    onCheckedChange={(checked) => { if (checked) setWifi4gHub('no'); }}
                                    className="border-gray-400 data-[state=checked]:bg-gray-500"
                                  />
                                  <Label htmlFor="wifi4g-hub-no" className="font-medium cursor-pointer text-sm">ไม่มี</Label>
                                </div>
                              </div>
                            </div>

                            {wifi4gHub === 'yes' && (
                              <Collapsible
                                open={openItems['wifi-4g-hub']}
                                onOpenChange={(open) => setOpenItems(prev => ({ ...prev, 'wifi-4g-hub': open }))}
                              >
                                <div className="bg-green-50 rounded-lg border border-green-200">
                                  <CollapsibleTrigger className="w-full p-3 text-left hover:bg-green-100 transition-colors rounded-lg">
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold">1 <span className="text-sm">ชิ้น</span></span>
                                      <div className="ml-4">
                                        {openItems['wifi-4g-hub'] ? (
                                          <ChevronUp className="h-4 w-4 text-green-600" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4 text-green-600" />
                                        )}
                                      </div>
                                    </div>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <div className="px-3 pb-3">
                                      {stationEquipmentPriceMapping['wifi-4g-hub'] && (
                                        <div className="text-xs space-y-1 mt-2">
                                          <div><span className="font-medium">เลขสินค้า:</span> {stationEquipmentPriceMapping['wifi-4g-hub'].productCode}</div>
                                          <div><span className="font-medium">ราคาค่าของ:</span> {(stationEquipmentPriceMapping['wifi-4g-hub'].materialPrice * 1).toLocaleString('th-TH')} บาท</div>
                                          <div><span className="font-medium">ราคาค่าแรง:</span> {(stationEquipmentPriceMapping['wifi-4g-hub'].laborPrice * 1).toLocaleString('th-TH')} บาท</div>
                                          <div><span className="font-medium">ราคารวม:</span> {(stationEquipmentPriceMapping['wifi-4g-hub'].totalPrice * 1).toLocaleString('th-TH')} บาท</div>
                                        </div>
                                      )}
                                    </div>
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            )}


                          </div>

                          {/* 2.2 กล้อง CCTV */}

                          <div className="space-y-2">
                            {/* Item name and toggle buttons */}
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-base font-semibold text-gray-800">กล้อง CCTV</span>
                              <div className="flex items-center gap-2">
                                <div
                                  className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${cctv === 'yes' ? 'bg-green-100 border-green-300' : 'hover:bg-gray-50'}`}
                                  onClick={() => setCctv('yes')}
                                >
                                  <Checkbox
                                    id="cctv-yes"
                                    checked={cctv === 'yes'}
                                    onCheckedChange={(checked) => { if (checked) setCctv('yes'); }}
                                    className="border-green-400 data-[state=checked]:bg-green-500"
                                  />
                                  <Label htmlFor="cctv-yes" className="font-medium cursor-pointer text-sm">มี</Label>
                                </div>
                                <div
                                  className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${cctv === 'no' ? 'bg-gray-100 border-gray-300' : 'hover:bg-gray-50'}`}
                                  onClick={() => setCctv('no')}
                                >
                                  <Checkbox
                                    id="cctv-no"
                                    checked={cctv === 'no'}
                                    onCheckedChange={(checked) => { if (checked) setCctv('no'); }}
                                    className="border-gray-400 data-[state=checked]:bg-gray-500"
                                  />
                                  <Label htmlFor="cctv-no" className="font-medium cursor-pointer text-sm">ไม่มี</Label>
                                </div>
                              </div>
                            </div>

                            {cctv === 'yes' && (
                              <Collapsible
                                open={openItems['cctv']}
                                onOpenChange={(open) => setOpenItems(prev => ({ ...prev, 'cctv': open }))}
                              >
                                <div className="bg-green-50 rounded-lg border border-green-200">
                                  <CollapsibleTrigger className="w-full p-3 text-left hover:bg-green-100 transition-colors rounded-lg">
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold">4 <span className="text-sm">ชิ้น</span></span>
                                      <div className="ml-4">
                                        {openItems['cctv'] ? (
                                          <ChevronUp className="h-4 w-4 text-green-600" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4 text-green-600" />
                                        )}
                                      </div>
                                    </div>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <div className="px-3 pb-3">
                                      {stationEquipmentPriceMapping['cctv'] && (
                                        <div className="text-xs space-y-1 mt-2">
                                          <div><span className="font-medium">เลขสินค้า:</span> {stationEquipmentPriceMapping['cctv'].productCode}</div>
                                          <div><span className="font-medium">ราคาค่าของ:</span> {(stationEquipmentPriceMapping['cctv'].materialPrice * 4).toLocaleString('th-TH')} บาท</div>
                                          <div><span className="font-medium">ราคาค่าแรง:</span> {(stationEquipmentPriceMapping['cctv'].laborPrice * 4).toLocaleString('th-TH')} บาท</div>
                                          <div><span className="font-medium">ราคารวม:</span> {(stationEquipmentPriceMapping['cctv'].totalPrice * 4).toLocaleString('th-TH')} บาท</div>
                                        </div>
                                      )}
                                    </div>
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            )}


                          </div>

                          {/* 2.3 หลอดไฟ */}

                          <div className="space-y-2">
                            {/* Item name and toggle buttons */}
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-base font-semibold text-gray-800">หลอดไฟ</span>
                              <div className="flex items-center gap-2">
                                <div
                                  className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${lighting === 'yes' ? 'bg-green-100 border-green-300' : 'hover:bg-gray-50'}`}
                                  onClick={() => setLighting('yes')}
                                >
                                  <Checkbox
                                    id="lighting-yes"
                                    checked={lighting === 'yes'}
                                    onCheckedChange={(checked) => { if (checked) setLighting('yes'); }}
                                    className="border-green-400 data-[state=checked]:bg-green-500"
                                  />
                                  <Label htmlFor="lighting-yes" className="font-medium cursor-pointer text-sm">มี</Label>
                                </div>
                                <div
                                  className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${lighting === 'no' ? 'bg-gray-100 border-gray-300' : 'hover:bg-gray-50'}`}
                                  onClick={() => setLighting('no')}
                                >
                                  <Checkbox
                                    id="lighting-no"
                                    checked={lighting === 'no'}
                                    onCheckedChange={(checked) => { if (checked) setLighting('no'); }}
                                    className="border-gray-400 data-[state=checked]:bg-gray-500"
                                  />
                                  <Label htmlFor="lighting-no" className="font-medium cursor-pointer text-sm">ไม่มี</Label>
                                </div>
                              </div>
                            </div>

                            {lighting === 'yes' && (
                              <Collapsible
                                open={openItems['lighting']}
                                onOpenChange={(open) => setOpenItems(prev => ({ ...prev, 'lighting': open }))}
                              >
                                <div className="bg-yellow-50 rounded-lg border border-yellow-200">
                                  <CollapsibleTrigger className="w-full p-3 text-left hover:bg-yellow-100 transition-colors rounded-lg">
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-yellow-600">3 <span className="text-sm">ชิ้น</span></span>
                                      <div className="ml-4">
                                        {openItems['lighting'] ? (
                                          <ChevronUp className="h-4 w-4 text-yellow-600" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4 text-yellow-600" />
                                        )}
                                      </div>
                                    </div>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <div className="px-3 pb-3">
                                      {stationEquipmentPriceMapping['lighting'] && (
                                        <div className="text-xs space-y-1 mt-2">
                                          <div><span className="font-medium">เลขสินค้า:</span> {stationEquipmentPriceMapping['lighting'].productCode}</div>
                                          <div><span className="font-medium">ราคาค่าของ:</span> {(stationEquipmentPriceMapping['lighting'].materialPrice * 3).toLocaleString('th-TH')} บาท</div>
                                          <div><span className="font-medium">ราคาค่าแรง:</span> {(stationEquipmentPriceMapping['lighting'].laborPrice * 3).toLocaleString('th-TH')} บาท</div>
                                          <div><span className="font-medium">ราคารวม:</span> {(stationEquipmentPriceMapping['lighting'].totalPrice * 3).toLocaleString('th-TH')} บาท</div>
                                        </div>
                                      )}
                                    </div>
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            )}


                          </div>

                          {/* 2.4 ACC (สาย + รางสาย + ตู้outdoor + อื่นๆ) */}

                          <div className="space-y-2">
                            {/* Item name and toggle buttons */}
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-base font-semibold text-gray-800">ACC (สาย + รางสาย + ตู้outdoor + อื่นๆ)</span>
                              <div className="flex items-center gap-2">
                                <div
                                  className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${accSystem === 'yes' ? 'bg-green-100 border-green-300' : 'hover:bg-gray-50'}`}
                                  onClick={() => setAccSystem('yes')}
                                >
                                  <Checkbox
                                    id="acc-system-yes"
                                    checked={accSystem === 'yes'}
                                    onCheckedChange={(checked) => { if (checked) setAccSystem('yes'); }}
                                    className="border-green-400 data-[state=checked]:bg-green-500"
                                  />
                                  <Label htmlFor="acc-system-yes" className="font-medium cursor-pointer text-sm">มี</Label>
                                </div>
                                <div
                                  className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${accSystem === 'no' ? 'bg-gray-100 border-gray-300' : 'hover:bg-gray-50'}`}
                                  onClick={() => setAccSystem('no')}
                                >
                                  <Checkbox
                                    id="acc-system-no"
                                    checked={accSystem === 'no'}
                                    onCheckedChange={(checked) => { if (checked) setAccSystem('no'); }}
                                    className="border-gray-400 data-[state=checked]:bg-gray-500"
                                  />
                                  <Label htmlFor="acc-system-no" className="font-medium cursor-pointer text-sm">ไม่มี</Label>
                                </div>
                              </div>
                            </div>

                            {accSystem === 'yes' && (
                              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-purple-600">1 <span className="text-sm">ชิ้น</span></span>
                                </div>

                                {stationEquipmentPriceMapping['acc-system'] && (
                                  <div className="text-xs space-y-1">
                                    <div><span className="font-medium">เลขสินค้า:</span> {stationEquipmentPriceMapping['acc-system'].productCode}</div>
                                    <div><span className="font-medium">ราคาค่าของ:</span> {(stationEquipmentPriceMapping['acc-system'].materialPrice * 1).toLocaleString('th-TH')} บาท</div>
                                    <div><span className="font-medium">ราคาค่าแรง:</span> {(stationEquipmentPriceMapping['acc-system'].laborPrice * 1).toLocaleString('th-TH')} บาท</div>
                                    <div><span className="font-medium">ราคารวม:</span> {(stationEquipmentPriceMapping['acc-system'].totalPrice * 1).toLocaleString('th-TH')} บาท</div>
                                  </div>
                                )}
                              </div>
                            )}


                          </div>

                        </div>

                        {/* รวมค่าใช้จ่ายระบบสื่อสาร */}
                        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-4">
                          <div className="text-lg font-semibold text-blue-800">รวมค่าใช้จ่ายระบบสื่อสาร</div>

                          {/* ราคารวม */}
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <div className="text-sm text-gray-600 mb-1">ค่าของรวม:</div>
                              <div className="text-xl font-bold text-gray-800">{communicationTotals.material.toLocaleString('th-TH')} บาท</div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-600 mb-1">ค่าแรงรวม:</div>
                              <div className="text-xl font-bold text-gray-800">{communicationTotals.labor.toLocaleString('th-TH')} บาท</div>
                            </div>
                            <div>
                              <div className="text-sm text-blue-700 font-semibold mb-1">ราคารวม:</div>
                              <div className="text-2xl font-bold text-blue-700">{communicationTotals.total.toLocaleString('th-TH')} บาท</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CollapsibleContent>
                </div>
              </Collapsible>

              <Separator />

              {/* 3. งานปูน */}

              <Collapsible
                open={openSections['concrete']}
                onOpenChange={(open) => setOpenSections(prev => ({ ...prev, 'concrete': open }))}
              >
                <div className="bg-gray-50 rounded-lg border border-gray-200">
                  <CollapsibleTrigger asChild>
                    <div className="w-full p-4 text-left hover:bg-gray-100 transition-colors rounded-lg">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Home className="h-5 w-5" />
                          3. งานปูน
                        </h3>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <div
                              className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${concreteSelection === 'yes' ? 'bg-green-100 border-green-300' : 'hover:bg-gray-50'}`}
                              onClick={() => setConcreteSelection('yes')}
                            >
                              <Checkbox
                                id="concrete-yes"
                                checked={concreteSelection === 'yes'}
                                onCheckedChange={(checked) => { if (checked) setConcreteSelection('yes'); }}
                                className="border-green-400 data-[state=checked]:bg-green-500"
                              />
                              <Label htmlFor="concrete-yes" className="font-medium cursor-pointer text-sm">มี</Label>
                            </div>
                            <div
                              className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${concreteSelection === 'no' ? 'bg-gray-100 border-gray-300' : 'hover:bg-gray-50'}`}
                              onClick={() => setConcreteSelection('no')}
                            >
                              <Checkbox
                                id="concrete-no"
                                checked={concreteSelection === 'no'}
                                onCheckedChange={(checked) => { if (checked) setConcreteSelection('no'); }}
                                className="border-gray-400 data-[state=checked]:bg-gray-500"
                              />
                              <Label htmlFor="concrete-no" className="font-medium cursor-pointer text-sm">ไม่มี</Label>
                            </div>
                          </div>
                          <div className="ml-4">
                            {openSections['concrete'] ? (
                              <ChevronUp className="h-5 w-5 text-gray-600" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-600" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    {concreteSelection === 'yes' && (
                      <div className="px-4 pb-4 space-y-4">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                          {/* 3.1 ฐานปูน MDB */}

                          <div className="space-y-2">
                            {/* Item name and toggle buttons */}
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-base font-semibold text-gray-800">ฐานปูน MDB 200 x 200 x 20 ซม.</span>
                              <div className="flex items-center gap-2">
                                <div
                                  className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${mdbConcreteBase === 'yes' ? 'bg-green-100 border-green-300' : 'hover:bg-gray-50'}`}
                                  onClick={() => setMdbConcreteBase('yes')}
                                >
                                  <Checkbox
                                    id="mdb-concrete-base-yes"
                                    checked={mdbConcreteBase === 'yes'}
                                    onCheckedChange={(checked) => { if (checked) setMdbConcreteBase('yes'); }}
                                    className="border-green-400 data-[state=checked]:bg-green-500"
                                  />
                                  <Label htmlFor="mdb-concrete-base-yes" className="font-medium cursor-pointer text-sm">มี</Label>
                                </div>
                                <div
                                  className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${mdbConcreteBase === 'no' ? 'bg-gray-100 border-gray-300' : 'hover:bg-gray-50'}`}
                                  onClick={() => setMdbConcreteBase('no')}
                                >
                                  <Checkbox
                                    id="mdb-concrete-base-no"
                                    checked={mdbConcreteBase === 'no'}
                                    onCheckedChange={(checked) => { if (checked) setMdbConcreteBase('no'); }}
                                    className="border-gray-400 data-[state=checked]:bg-gray-500"
                                  />
                                  <Label htmlFor="mdb-concrete-base-no" className="font-medium cursor-pointer text-sm">ไม่มี</Label>
                                </div>
                              </div>
                            </div>

                            {mdbConcreteBase === 'yes' && (
                              <Collapsible
                                open={openItems['mdb-concrete-base']}
                                onOpenChange={(open) => setOpenItems(prev => ({ ...prev, 'mdb-concrete-base': open }))}
                              >
                                <div className="bg-gray-50 rounded-lg border border-gray-200">
                                  <CollapsibleTrigger className="w-full p-3 text-left hover:bg-gray-100 transition-colors rounded-lg">
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold">1 <span className="text-sm">ชิ้น</span></span>
                                      <div className="ml-4">
                                        {openItems['mdb-concrete-base'] ? (
                                          <ChevronUp className="h-4 w-4 text-gray-600" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4 text-gray-600" />
                                        )}
                                      </div>
                                    </div>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <div className="px-3 pb-3">
                                      {stationEquipmentPriceMapping['mdb-concrete-base'] && (
                                        <div className="text-xs space-y-1 mt-2">
                                          <div><span className="font-medium">เลขสินค้า:</span> {stationEquipmentPriceMapping['mdb-concrete-base'].productCode}</div>
                                          <div><span className="font-medium">ราคาค่าของ:</span> {(stationEquipmentPriceMapping['mdb-concrete-base'].materialPrice * 1).toLocaleString('th-TH')} บาท</div>
                                          <div><span className="font-medium">ราคาค่าแรง:</span> {(stationEquipmentPriceMapping['mdb-concrete-base'].laborPrice * 1).toLocaleString('th-TH')} บาท</div>
                                          <div><span className="font-medium">ราคารวม:</span> {(stationEquipmentPriceMapping['mdb-concrete-base'].totalPrice * 1).toLocaleString('th-TH')} บาท</div>
                                        </div>
                                      )}
                                    </div>
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            )}


                          </div>

                          {/* 3.2 ฐานปูน CHARGER */}

                          <div className="space-y-2">
                            {/* Item name and toggle buttons */}
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-base font-semibold text-gray-800">ฐานปูน CHARGER 150 x 150 x 20 ซม.</span>
                              <div className="flex items-center gap-2">
                                <div
                                  className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${chargerConcreteBase === 'yes' ? 'bg-green-100 border-green-300' : 'hover:bg-gray-50'}`}
                                  onClick={() => setChargerConcreteBase('yes')}
                                >
                                  <Checkbox
                                    id="charger-concrete-base-yes"
                                    checked={chargerConcreteBase === 'yes'}
                                    onCheckedChange={(checked) => { if (checked) setChargerConcreteBase('yes'); }}
                                    className="border-green-400 data-[state=checked]:bg-green-500"
                                  />
                                  <Label htmlFor="charger-concrete-base-yes" className="font-medium cursor-pointer text-sm">มี</Label>
                                </div>
                                <div
                                  className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${chargerConcreteBase === 'no' ? 'bg-gray-100 border-gray-300' : 'hover:bg-gray-50'}`}
                                  onClick={() => setChargerConcreteBase('no')}
                                >
                                  <Checkbox
                                    id="charger-concrete-base-no"
                                    checked={chargerConcreteBase === 'no'}
                                    onCheckedChange={(checked) => { if (checked) setChargerConcreteBase('no'); }}
                                    className="border-gray-400 data-[state=checked]:bg-gray-500"
                                  />
                                  <Label htmlFor="charger-concrete-base-no" className="font-medium cursor-pointer text-sm">ไม่มี</Label>
                                </div>
                              </div>
                            </div>

                            {chargerConcreteBase === 'yes' && (
                              <Collapsible
                                open={openItems['charger-concrete-base']}
                                onOpenChange={(open) => setOpenItems(prev => ({ ...prev, 'charger-concrete-base': open }))}
                              >
                                <div className="bg-green-50 rounded-lg border border-green-200">
                                  <CollapsibleTrigger className="w-full p-3 text-left hover:bg-green-100 transition-colors rounded-lg">
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold">
                                        {featureChargersCount} <span className="text-sm">ชิ้น</span>
                                      </span>
                                      <div className="ml-4">
                                        {openItems['charger-concrete-base'] ? (
                                          <ChevronUp className="h-4 w-4 text-green-600" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4 text-green-600" />
                                        )}
                                      </div>
                                    </div>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <div className="px-3 pb-3">
                                      {stationEquipmentPriceMapping['charger-concrete-base'] && (
                                        <div className="text-xs space-y-1 mt-2">
                                          <div><span className="font-medium">เลขสินค้า:</span> {stationEquipmentPriceMapping['charger-concrete-base'].productCode}</div>
                                          <div><span className="font-medium">ราคาค่าของ:</span> {(stationEquipmentPriceMapping['charger-concrete-base'].materialPrice * featureChargersCount).toLocaleString('th-TH')} บาท</div>
                                          <div><span className="font-medium">ราคาค่าแรง:</span> {(stationEquipmentPriceMapping['charger-concrete-base'].laborPrice * featureChargersCount).toLocaleString('th-TH')} บาท</div>
                                          <div><span className="font-medium">ราคารวม:</span> {(stationEquipmentPriceMapping['charger-concrete-base'].totalPrice * featureChargersCount).toLocaleString('th-TH')} บาท</div>
                                        </div>
                                      )}
                                    </div>
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            )}


                          </div>

                          {/* 3.3 พื้นปูน ลานจอดรถ */}

                          <div className="space-y-2">
                            {/* Item name and toggle buttons */}
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-base font-semibold text-gray-800">พื้นปูน ลานจอดรถ 300 x 600 x 10 ซม.</span>
                              <div className="flex items-center gap-2">
                                <div
                                  className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${parkingConcreteFloor === 'yes' ? 'bg-green-100 border-green-300' : 'hover:bg-gray-50'}`}
                                  onClick={() => setParkingConcreteFloor('yes')}
                                >
                                  <Checkbox
                                    id="parking-concrete-floor-yes"
                                    checked={parkingConcreteFloor === 'yes'}
                                    onCheckedChange={(checked) => { if (checked) setParkingConcreteFloor('yes'); }}
                                    className="border-green-400 data-[state=checked]:bg-green-500"
                                  />
                                  <Label htmlFor="parking-concrete-floor-yes" className="font-medium cursor-pointer text-sm">มี</Label>
                                </div>
                                <div
                                  className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${parkingConcreteFloor === 'no' ? 'bg-gray-100 border-gray-300' : 'hover:bg-gray-50'}`}
                                  onClick={() => setParkingConcreteFloor('no')}
                                >
                                  <Checkbox
                                    id="parking-concrete-floor-no"
                                    checked={parkingConcreteFloor === 'no'}
                                    onCheckedChange={(checked) => { if (checked) setParkingConcreteFloor('no'); }}
                                    className="border-gray-400 data-[state=checked]:bg-gray-500"
                                  />
                                  <Label htmlFor="parking-concrete-floor-no" className="font-medium cursor-pointer text-sm">ไม่มี</Label>
                                </div>
                              </div>
                            </div>

                            {parkingConcreteFloor === 'yes' && (
                              <Collapsible
                                open={openItems['parking-concrete-floor']}
                                onOpenChange={(open) => setOpenItems(prev => ({ ...prev, 'parking-concrete-floor': open }))}
                              >
                                <div className="bg-green-50 rounded-lg border border-green-200">
                                  <CollapsibleTrigger className="w-full p-3 text-left hover:bg-green-100 transition-colors rounded-lg">
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold">
                                        {parkingSlotsCount} <span className="text-sm">ชิ้น</span>
                                      </span>
                                      <div className="ml-4">
                                        {openItems['parking-concrete-floor'] ? (
                                          <ChevronUp className="h-4 w-4 text-green-600" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4 text-green-600" />
                                        )}
                                      </div>
                                    </div>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <div className="px-3 pb-3">
                                      {stationEquipmentPriceMapping['parking-concrete-floor'] && (
                                        <div className="text-xs space-y-1 mt-2">
                                          <div><span className="font-medium">เลขสินค้า:</span> {stationEquipmentPriceMapping['parking-concrete-floor'].productCode}</div>
                                          <div><span className="font-medium">ราคาค่าของ:</span> {(stationEquipmentPriceMapping['parking-concrete-floor'].materialPrice * parkingSlotsCount).toLocaleString('th-TH')} บาท</div>
                                          <div><span className="font-medium">ราคาค่าแรง:</span> {(stationEquipmentPriceMapping['parking-concrete-floor'].laborPrice * parkingSlotsCount).toLocaleString('th-TH')} บาท</div>
                                          <div><span className="font-medium">ราคารวม:</span> {(stationEquipmentPriceMapping['parking-concrete-floor'].totalPrice * parkingSlotsCount).toLocaleString('th-TH')} บาท</div>
                                        </div>
                                      )}
                                    </div>
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            )}


                          </div>

                          {/* 3.4 เทพื้นปูนทั่วไป */}

                          <div className="space-y-2">
                            {/* Item name and toggle buttons */}
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-base font-semibold text-gray-800">เทพื้นปูนทั่วไป 100 x 100 x 10 ซม.</span>
                              <div className="flex items-center gap-2">
                                <div
                                  className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${generalConcreteFloor === 'yes' ? 'bg-green-100 border-green-300' : 'hover:bg-gray-50'}`}
                                  onClick={() => setGeneralConcreteFloor('yes')}
                                >
                                  <Checkbox
                                    id="general-concrete-floor-yes"
                                    checked={generalConcreteFloor === 'yes'}
                                    onCheckedChange={(checked) => { if (checked) setGeneralConcreteFloor('yes'); }}
                                    className="border-green-400 data-[state=checked]:bg-green-500"
                                  />
                                  <Label htmlFor="general-concrete-floor-yes" className="font-medium cursor-pointer text-sm">มี</Label>
                                </div>
                                <div
                                  className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${generalConcreteFloor === 'no' ? 'bg-gray-100 border-gray-300' : 'hover:bg-gray-50'}`}
                                  onClick={() => setGeneralConcreteFloor('no')}
                                >
                                  <Checkbox
                                    id="general-concrete-floor-no"
                                    checked={generalConcreteFloor === 'no'}
                                    onCheckedChange={(checked) => { if (checked) setGeneralConcreteFloor('no'); }}
                                    className="border-gray-400 data-[state=checked]:bg-gray-500"
                                  />
                                  <Label htmlFor="general-concrete-floor-no" className="font-medium cursor-pointer text-sm">ไม่มี</Label>
                                </div>
                              </div>
                            </div>

                            {generalConcreteFloor === 'yes' && (
                              <Collapsible
                                open={openItems['general-concrete-floor']}
                                onOpenChange={(open) => setOpenItems(prev => ({ ...prev, 'general-concrete-floor': open }))}
                              >
                                <div className="bg-green-50 rounded-lg border border-green-200">
                                  <CollapsibleTrigger className="w-full p-3 text-left hover:bg-green-100 transition-colors rounded-lg">
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold">แล้วแต่กำหนด</span>
                                      <div className="ml-4">
                                        {openItems['general-concrete-floor'] ? (
                                          <ChevronUp className="h-4 w-4 text-green-600" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4 text-green-600" />
                                        )}
                                      </div>
                                    </div>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <div className="px-3 pb-3">
                                      {stationEquipmentPriceMapping['general-concrete-floor'] && (
                                        <div className="text-xs space-y-1 mt-2">
                                          <div><span className="font-medium">เลขสินค้า:</span> {stationEquipmentPriceMapping['general-concrete-floor'].productCode}</div>
                                          <div><span className="font-medium">ราคาค่าของ:</span> {stationEquipmentPriceMapping['general-concrete-floor'].materialPrice.toLocaleString('th-TH')} บาท</div>
                                          <div><span className="font-medium">ราคาค่าแรง:</span> {stationEquipmentPriceMapping['general-concrete-floor'].laborPrice.toLocaleString('th-TH')} บาท</div>
                                          <div><span className="font-medium">ราคารวม:</span> {stationEquipmentPriceMapping['general-concrete-floor'].totalPrice.toLocaleString('th-TH')} บาท</div>
                                        </div>
                                      )}
                                    </div>
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            )}


                          </div>

                        </div>

                        {/* รวมค่าใช้จ่ายงานปูน */}
                        <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200 space-y-4">
                          <div className="text-lg font-semibold text-orange-800">รวมค่าใช้จ่ายงานปูน</div>

                          {/* ราคารวม */}
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <div className="text-sm text-gray-600 mb-1">ค่าของรวม:</div>
                              <div className="text-xl font-bold text-gray-800">{concreteTotals.material.toLocaleString('th-TH')} บาท</div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-600 mb-1">ค่าแรงรวม:</div>
                              <div className="text-xl font-bold text-gray-800">{concreteTotals.labor.toLocaleString('th-TH')} บาท</div>
                            </div>
                            <div>
                              <div className="text-sm text-orange-700 font-semibold mb-1">ราคารวม:</div>
                              <div className="text-2xl font-bold text-orange-700">{concreteTotals.total.toLocaleString('th-TH')} บาท</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CollapsibleContent>
                </div>
              </Collapsible>

              <Separator />

              {/* 4. งานทาสีช่องจอด */}

              <Collapsible
                open={openSections['painting']}
                onOpenChange={(open) => setOpenSections(prev => ({ ...prev, 'painting': open }))}
              >
                <div className="bg-gray-50 rounded-lg border border-gray-200">
                  <CollapsibleTrigger asChild>
                    <div className="w-full p-4 text-left hover:bg-gray-100 transition-colors rounded-lg">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Paintbrush className="h-5 w-5" />
                          4. งานทาสีช่องจอด
                        </h3>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <div
                              className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${paintingSelection === 'yes' ? 'bg-green-100 border-green-300' : 'hover:bg-gray-50'}`}
                              onClick={() => setPaintingSelection('yes')}
                            >
                              <Checkbox
                                id="painting-yes"
                                checked={paintingSelection === 'yes'}
                                onCheckedChange={(checked) => { if (checked) setPaintingSelection('yes'); }}
                                className="border-green-400 data-[state=checked]:bg-green-500"
                              />
                              <Label htmlFor="painting-yes" className="font-medium cursor-pointer text-sm">มี</Label>
                            </div>
                            <div
                              className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${paintingSelection === 'no' ? 'bg-gray-100 border-gray-300' : 'hover:bg-gray-50'}`}
                              onClick={() => setPaintingSelection('no')}
                            >
                              <Checkbox
                                id="painting-no"
                                checked={paintingSelection === 'no'}
                                onCheckedChange={(checked) => { if (checked) setPaintingSelection('no'); }}
                                className="border-gray-400 data-[state=checked]:bg-gray-500"
                              />
                              <Label htmlFor="painting-no" className="font-medium cursor-pointer text-sm">ไม่มี</Label>
                            </div>
                          </div>
                          <div className="ml-4">
                            {openSections['painting'] ? (
                              <ChevronUp className="h-5 w-5 text-gray-600" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-600" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    {paintingSelection === 'yes' && (
                      <div className="px-4 pb-4 space-y-4">
                        <div className="space-y-3">

                          <Label className="text-sm font-medium mb-2 block">
                            เลือกแบบทาสี
                          </Label>

                          <RadioGroup value={parkingPaintType} onValueChange={handleParkingPaintTypeChange} className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="no-grind-no-polish" id="paint-no-grind-no-polish" />
                              <Label htmlFor="paint-no-grind-no-polish" className="font-normal cursor-pointer">
                                4.1 ทาสีพื้นช่องจอดรถ แบบไม่ขัด ไม่โป้ว
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="grind-no-polish" id="paint-grind-no-polish" />
                              <Label htmlFor="paint-grind-no-polish" className="font-normal cursor-pointer">
                                4.2 ทาสีพื้นช่องจอดรถ แบบขัด แต่ไม่โป้ว
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="grind-and-polish" id="paint-grind-and-polish" />
                              <Label htmlFor="paint-grind-and-polish" className="font-normal cursor-pointer">
                                4.3 ทาสีพื้นช่องจอดรถ แบบขัด และโป้วให้เรียบ
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="" id="paint-none" />
                              <Label htmlFor="paint-none" className="font-normal cursor-pointer">
                                4.4 ไม่ทาสี
                              </Label>
                            </div>
                          </RadioGroup>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">

                            {/* 4.5 ตีเส้นด้านข้าง */}

                            <div className="space-y-2">
                              {/* Item name and toggle buttons */}
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-base font-semibold text-gray-800">4.5 ตีเส้นด้านข้าง</span>
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${sideLineMarking === 'yes' ? 'bg-green-100 border-green-300' : 'hover:bg-gray-50'}`}
                                    onClick={() => setSideLineMarking('yes')}
                                  >
                                    <Checkbox
                                      id="side-line-marking-yes"
                                      checked={sideLineMarking === 'yes'}
                                      onCheckedChange={(checked) => { if (checked) setSideLineMarking('yes'); }}
                                      className="border-green-400 data-[state=checked]:bg-green-500"
                                    />
                                    <Label htmlFor="side-line-marking-yes" className="font-medium cursor-pointer text-sm">มี</Label>
                                  </div>
                                  <div
                                    className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${sideLineMarking === 'no' ? 'bg-gray-100 border-gray-300' : 'hover:bg-gray-50'}`}
                                    onClick={() => setSideLineMarking('no')}
                                  >
                                    <Checkbox
                                      id="side-line-marking-no"
                                      checked={sideLineMarking === 'no'}
                                      onCheckedChange={(checked) => { if (checked) setSideLineMarking('no'); }}
                                      className="border-gray-400 data-[state=checked]:bg-gray-500"
                                    />
                                    <Label htmlFor="side-line-marking-no" className="font-medium cursor-pointer text-sm">ไม่มี</Label>
                                  </div>
                                </div>
                              </div>

                              {sideLineMarking === 'yes' && (
                                <Collapsible
                                  open={openItems['side-line-marking']}
                                  onOpenChange={(open) => setOpenItems(prev => ({ ...prev, 'side-line-marking': open }))}
                                >
                                  <div className="bg-green-50 rounded-lg border border-green-200">
                                    <CollapsibleTrigger className="w-full p-3 text-left hover:bg-green-100 transition-colors rounded-lg">
                                      <div className="flex items-center justify-between">
                                        <span className="font-semibold">
                                          {parkingSlotsCount} <span className="text-sm">ช่องจอด</span>
                                        </span>
                                        <div className="ml-4">
                                          {openItems['side-line-marking'] ? (
                                            <ChevronUp className="h-4 w-4 text-green-600" />
                                          ) : (
                                            <ChevronDown className="h-4 w-4 text-green-600" />
                                          )}
                                        </div>
                                      </div>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                      <div className="px-3 pb-3">
                                        {stationEquipmentPriceMapping['side-line-marking'] && (
                                          <div className="text-xs space-y-1 mt-2">
                                            <div><span className="font-medium">เลขสินค้า:</span> {stationEquipmentPriceMapping['side-line-marking'].productCode}</div>
                                            <div><span className="font-medium">ราคาค่าของ:</span> {(stationEquipmentPriceMapping['side-line-marking'].materialPrice * parkingSlotsCount).toLocaleString('th-TH')} บาท</div>
                                            <div><span className="font-medium">ราคาค่าแรง:</span> {(stationEquipmentPriceMapping['side-line-marking'].laborPrice * parkingSlotsCount).toLocaleString('th-TH')} บาท</div>
                                            <div><span className="font-medium">ราคารวม:</span> {(stationEquipmentPriceMapping['side-line-marking'].totalPrice * parkingSlotsCount).toLocaleString('th-TH')} บาท</div>
                                          </div>
                                        )}
                                      </div>
                                    </CollapsibleContent>
                                  </div>
                                </Collapsible>
                              )}
                            </div>

                            {/* 4.6 ทำลายกลางช่องจอด ใช้ลายเดิม */}

                            <div className="space-y-2">
                              {/* Item name and toggle buttons */}
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-base font-semibold text-gray-800">4.6 ทำลายกลางช่องจอด ใช้ลายเดิม</span>
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${centerPatternOriginal === 'yes' ? 'bg-green-100 border-green-300' : 'hover:bg-gray-50'}`}
                                    onClick={() => setCenterPatternOriginal('yes')}
                                  >
                                    <Checkbox
                                      id="center-pattern-original-yes"
                                      checked={centerPatternOriginal === 'yes'}
                                      onCheckedChange={(checked) => { if (checked) setCenterPatternOriginal('yes'); }}
                                      className="border-green-400 data-[state=checked]:bg-green-500"
                                    />
                                    <Label htmlFor="center-pattern-original-yes" className="font-medium cursor-pointer text-sm">มี</Label>
                                  </div>
                                  <div
                                    className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${centerPatternOriginal === 'no' ? 'bg-gray-100 border-gray-300' : 'hover:bg-gray-50'}`}
                                    onClick={() => setCenterPatternOriginal('no')}
                                  >
                                    <Checkbox
                                      id="center-pattern-original-no"
                                      checked={centerPatternOriginal === 'no'}
                                      onCheckedChange={(checked) => { if (checked) setCenterPatternOriginal('no'); }}
                                      className="border-gray-400 data-[state=checked]:bg-gray-500"
                                    />
                                    <Label htmlFor="center-pattern-original-no" className="font-medium cursor-pointer text-sm">ไม่มี</Label>
                                  </div>
                                </div>
                              </div>

                              {centerPatternOriginal === 'yes' && (
                                <Collapsible
                                  open={openItems['center-pattern-original']}
                                  onOpenChange={(open) => setOpenItems(prev => ({ ...prev, 'center-pattern-original': open }))}
                                >
                                  <div className="bg-green-50 rounded-lg border border-green-200">
                                    <CollapsibleTrigger className="w-full p-3 text-left hover:bg-green-100 transition-colors rounded-lg">
                                      <div className="flex items-center justify-between">
                                        <span className="font-semibold">
                                          {parkingSlotsCount} <span className="text-sm">ช่องจอด</span>
                                        </span>
                                        <div className="ml-4">
                                          {openItems['center-pattern-original'] ? (
                                            <ChevronUp className="h-4 w-4 text-green-600" />
                                          ) : (
                                            <ChevronDown className="h-4 w-4 text-green-600" />
                                          )}
                                        </div>
                                      </div>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                      <div className="px-3 pb-3">
                                        {stationEquipmentPriceMapping['center-pattern-original'] && (
                                          <div className="text-xs space-y-1 mt-2">
                                            <div><span className="font-medium">เลขสินค้า:</span> {stationEquipmentPriceMapping['center-pattern-original'].productCode}</div>
                                            <div><span className="font-medium">ราคาค่าของ:</span> {(stationEquipmentPriceMapping['center-pattern-original'].materialPrice * parkingSlotsCount).toLocaleString('th-TH')} บาท</div>
                                            <div><span className="font-medium">ราคาค่าแรง:</span> {(stationEquipmentPriceMapping['center-pattern-original'].laborPrice * parkingSlotsCount).toLocaleString('th-TH')} บาท</div>
                                            <div><span className="font-medium">ราคารวม:</span> {(stationEquipmentPriceMapping['center-pattern-original'].totalPrice * parkingSlotsCount).toLocaleString('th-TH')} บาท</div>
                                          </div>
                                        )}
                                      </div>
                                    </CollapsibleContent>
                                  </div>
                                </Collapsible>
                              )}
                            </div>

                            {/* 4.7 ทำลายกลางช่องจอด ออกแบบลายใหม่ */}

                            <div className="space-y-2">
                              {/* Item name and toggle buttons */}
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-base font-semibold text-gray-800">4.7 ทำลายกลางช่องจอด ออกแบบลายใหม่</span>
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${centerPatternNew === 'yes' ? 'bg-green-100 border-green-300' : 'hover:bg-gray-50'}`}
                                    onClick={() => setCenterPatternNew('yes')}
                                  >
                                    <Checkbox
                                      id="center-pattern-new-yes"
                                      checked={centerPatternNew === 'yes'}
                                      onCheckedChange={(checked) => { if (checked) setCenterPatternNew('yes'); }}
                                      className="border-green-400 data-[state=checked]:bg-green-500"
                                    />
                                    <Label htmlFor="center-pattern-new-yes" className="font-medium cursor-pointer text-sm">มี</Label>
                                  </div>
                                  <div
                                    className={`flex items-center space-x-2 px-3 py-1 rounded-lg border cursor-pointer ${centerPatternNew === 'no' ? 'bg-gray-100 border-gray-300' : 'hover:bg-gray-50'}`}
                                    onClick={() => setCenterPatternNew('no')}
                                  >
                                    <Checkbox
                                      id="center-pattern-new-no"
                                      checked={centerPatternNew === 'no'}
                                      onCheckedChange={(checked) => { if (checked) setCenterPatternNew('no'); }}
                                      className="border-gray-400 data-[state=checked]:bg-gray-500"
                                    />
                                    <Label htmlFor="center-pattern-new-no" className="font-medium cursor-pointer text-sm">ไม่มี</Label>
                                  </div>
                                </div>
                              </div>

                              {centerPatternNew === 'yes' && (
                                <Collapsible
                                  open={openItems['center-pattern-new']}
                                  onOpenChange={(open) => setOpenItems(prev => ({ ...prev, 'center-pattern-new': open }))}
                                >
                                  <div className="bg-purple-50 rounded-lg border border-purple-200">
                                    <CollapsibleTrigger className="w-full p-3 text-left hover:bg-purple-100 transition-colors rounded-lg">
                                      <div className="flex items-center justify-between">
                                        <span className="font-semibold text-purple-600">
                                          {parkingSlotsCount} <span className="text-sm">ช่องจอด</span>
                                        </span>
                                        <div className="ml-4">
                                          {openItems['center-pattern-new'] ? (
                                            <ChevronUp className="h-4 w-4 text-purple-600" />
                                          ) : (
                                            <ChevronDown className="h-4 w-4 text-purple-600" />
                                          )}
                                        </div>
                                      </div>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                      <div className="px-3 pb-3">
                                        {stationEquipmentPriceMapping['center-pattern-new'] && (
                                          <div className="text-xs space-y-1 mt-2">
                                            <div><span className="font-medium">เลขสินค้า:</span> {stationEquipmentPriceMapping['center-pattern-new'].productCode}</div>
                                            <div><span className="font-medium">ราคาค่าของ:</span> {(stationEquipmentPriceMapping['center-pattern-new'].materialPrice * parkingSlotsCount).toLocaleString('th-TH')} บาท</div>
                                            <div><span className="font-medium">ราคาค่าแรง:</span> {(stationEquipmentPriceMapping['center-pattern-new'].laborPrice * parkingSlotsCount).toLocaleString('th-TH')} บาท</div>
                                            <div><span className="font-medium">ราคารวม:</span> {(stationEquipmentPriceMapping['center-pattern-new'].totalPrice * parkingSlotsCount).toLocaleString('th-TH')} บาท</div>
                                          </div>
                                        )}
                                      </div>
                                    </CollapsibleContent>
                                  </div>
                                </Collapsible>
                              )}
                            </div>

                          </div>

                          {/* แสดงผลลัพธ์งานทาสีช่องจอด */}
                          {paintingSelection === 'yes' && hasSelectedParkingPaintType && (
                            <div className="mt-4 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200">
                              <h4 className="font-semibold text-pink-800 mb-3 flex items-center gap-2">
                                <Paintbrush className="h-4 w-4" />
                                ผลลัพธ์งานทาสีช่องจอด
                              </h4>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between p-2 bg-white rounded border">
                                  <span className="font-medium">แบบทาสีที่เลือก:</span>
                                  <span className="font-semibold text-pink-600">
                                    {parkingPaintType === 'no-grind-no-polish' && '4.1 ทาสีพื้นช่องจอดรถ แบบไม่ขัด ไม่โป้ว'}
                                    {parkingPaintType === 'grind-no-polish' && '4.2 ทาสีพื้นช่องจอดรถ แบบขัด แต่ไม่โป้ว'}
                                    {parkingPaintType === 'grind-and-polish' && '4.3 ทาสีพื้นช่องจอดรถ แบบขัด และโป้วให้เรียบ'}
                                    {parkingPaintType === '' && '4.4 ไม่ทาสี'}
                                  </span>
                                </div>
                                <div className="p-3 bg-white rounded border">
                                  <div className="font-medium mb-2">ข้อมูลราคาทาสี:</div>
                                  {selectedPaintItem ? (
                                    <div className="text-xs space-y-1">
                                      <div><span className="font-medium">เลขสินค้า:</span> {selectedPaintItem.productCode}</div>
                                      <div><span className="font-medium">ราคาค่าของ:</span> {(selectedPaintItem.materialPrice * parkingSlotsCount).toLocaleString('th-TH')} บาท</div>
                                      <div><span className="font-medium">ราคาค่าแรง:</span> {(selectedPaintItem.laborPrice * parkingSlotsCount).toLocaleString('th-TH')} บาท</div>
                                      <div><span className="font-medium">ราคารวม:</span> {(selectedPaintItem.totalPrice * parkingSlotsCount).toLocaleString('th-TH')} บาท</div>
                                    </div>
                                  ) : (
                                    <div className="text-sm text-gray-500">ไม่มีค่าใช้จ่ายสำหรับตัวเลือกนี้</div>
                                  )}
                                </div>
                                <div className="p-3 bg-pink-50 rounded border border-pink-200 space-y-2">
                                  <div className="text-lg font-semibold text-pink-800">รวมค่าใช้จ่ายงานทาสีช่องจอด</div>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                      <div className="text-sm text-gray-600 mb-1">ค่าของรวม:</div>
                                      <div className="text-xl font-bold text-gray-800">{paintingTotals.material.toLocaleString('th-TH')} บาท</div>
                                    </div>
                                    <div>
                                      <div className="text-sm text-gray-600 mb-1">ค่าแรงรวม:</div>
                                      <div className="text-xl font-bold text-gray-800">{paintingTotals.labor.toLocaleString('th-TH')} บาท</div>
                                    </div>
                                    <div>
                                      <div className="text-sm text-pink-700 font-semibold mb-1">ราคารวม:</div>
                                      <div className="text-2xl font-bold text-pink-700">{paintingTotals.total.toLocaleString('th-TH')} บาท</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                    )}
                  </CollapsibleContent>
                </div>
              </Collapsible>

              <Separator />

              {/* หลังคาคุมช่องจอด */}

              <Collapsible
                open={openSections['roof-cover']}
                onOpenChange={(open) => setOpenSections(prev => ({ ...prev, 'roof-cover': open }))}
              >
                <div className="bg-gray-50 rounded-lg border border-gray-200">
                  <CollapsibleTrigger className="w-full p-4 text-left hover:bg-gray-100 transition-colors rounded-lg">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        หลังคาคุมช่องจอด <span className="text-xs">(Roof Cover for Parking)</span>
                      </Label>
                      <div className="ml-4">
                        {openSections['roof-cover'] ? (
                          <ChevronUp className="h-5 w-5 text-gray-600" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-600" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-3">

                      <div className="grid grid-cols-2 gap-3">

                        <div

                          className={`flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-blue-50 cursor-pointer ${roofCoverType === 'yes' ? 'bg-blue-100 border-blue-300' : ''}`}

                          onClick={() => setRoofCoverType(roofCoverType === 'yes' ? 'no' : 'yes')}

                        >

                          <Checkbox

                            id="roofCover-yes"

                            checked={roofCoverType === 'yes'}

                            onCheckedChange={(checked) => {

                              if (checked) setRoofCoverType('yes');

                            }}

                            className="text-blue-500 border-blue-400 data-[state=checked]:bg-blue-500"

                          />

                          <Label htmlFor="roofCover-yes" className="font-medium cursor-pointer text-blue-700">มี</Label>

                        </div>

                        <div

                          className={`flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer ${roofCoverType === 'no' ? 'bg-gray-100 border-gray-300' : ''}`}

                          onClick={() => setRoofCoverType(roofCoverType === 'no' ? 'yes' : 'no')}

                        >

                          <Checkbox

                            id="roofCover-no"

                            checked={roofCoverType === 'no'}

                            onCheckedChange={(checked) => {

                              if (checked) setRoofCoverType('no');

                            }}

                            className="border-gray-400 data-[state=checked]:bg-gray-500"

                          />

                          <Label htmlFor="roofCover-no" className="font-medium cursor-pointer">ไม่มี</Label>

                        </div>

                      </div>

                      {/* รวมค่าใช้จ่ายหลังคาคุมช่องจอด */}
                      {parkingRoofData && (
                        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-4">
                          <div className="text-lg font-semibold text-blue-800">รวมค่าใช้จ่ายหลังคาคุมช่องจอด</div>

                          {/* ราคารวม */}
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <div className="text-sm text-gray-600 mb-1">ค่าของรวม:</div>
                              <div className="text-xl font-bold text-gray-800">{parkingRoofTotals.material.toLocaleString('th-TH')} บาท</div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-600 mb-1">ค่าแรงรวม:</div>
                              <div className="text-xl font-bold text-gray-800">{parkingRoofTotals.labor.toLocaleString('th-TH')} บาท</div>
                            </div>
                            <div>
                              <div className="text-sm text-blue-700 font-semibold mb-1">ราคารวม:</div>
                              <div className="text-2xl font-bold text-blue-700">{parkingRoofTotals.total.toLocaleString('th-TH')} บาท</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              <Separator />

              {/* หลังคาเฉพาะ MDB */}

              <Collapsible
                open={openSections['mdb-roof']}
                onOpenChange={(open) => setOpenSections(prev => ({ ...prev, 'mdb-roof': open }))}
              >
                <div className="bg-gray-50 rounded-lg border border-gray-200">
                  <CollapsibleTrigger className="w-full p-4 text-left hover:bg-gray-100 transition-colors rounded-lg">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">
                        หลังคาเฉพาะ MDB <span className="text-xs">(Roof for MDB only)</span>
                      </Label>
                      <div className="ml-4">
                        {openSections['mdb-roof'] ? (
                          <ChevronUp className="h-5 w-5 text-gray-600" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-600" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-3">

                      <div className="grid grid-cols-2 gap-3">

                        <div

                          className={`flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-blue-50 cursor-pointer ${mdbRoof === 'yes' ? 'bg-blue-100 border-blue-300' : ''}`}

                          onClick={() => setMdbRoof(mdbRoof === 'yes' ? 'no' : 'yes')}

                        >

                          <Checkbox

                            id="mdbRoof-yes"

                            checked={mdbRoof === 'yes'}

                            onCheckedChange={(checked) => {

                              if (checked) setMdbRoof('yes');

                            }}

                            className="text-blue-500 border-blue-400 data-[state=checked]:bg-blue-500"

                          />

                          <Label htmlFor="mdbRoof-yes" className="font-medium cursor-pointer text-blue-700">มี</Label>

                        </div>

                        <div

                          className={`flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer ${mdbRoof === 'no' ? 'bg-gray-100 border-gray-300' : ''}`}

                          onClick={() => setMdbRoof(mdbRoof === 'no' ? 'yes' : 'no')}

                        >

                          <Checkbox

                            id="mdbRoof-no"

                            checked={mdbRoof === 'no'}

                            onCheckedChange={(checked) => {

                              if (checked) setMdbRoof('no');

                            }}

                            className="border-gray-400 data-[state=checked]:bg-gray-500"

                          />

                          <Label htmlFor="mdbRoof-no" className="font-medium cursor-pointer">ไม่มี</Label>

                        </div>

                      </div>

                      {/* รวมค่าใช้จ่ายหลังคาเฉพาะ MDB */}
                      {mdbRoofData && (
                        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-4">
                          <div className="text-lg font-semibold text-blue-800">รวมค่าใช้จ่ายหลังคาเฉพาะ MDB</div>

                          {/* ราคารวม */}
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <div className="text-sm text-gray-600 mb-1">ค่าของรวม:</div>
                              <div className="text-xl font-bold text-gray-800">{mdbRoofTotals.material.toLocaleString('th-TH')} บาท</div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-600 mb-1">ค่าแรงรวม:</div>
                              <div className="text-xl font-bold text-gray-800">{mdbRoofTotals.labor.toLocaleString('th-TH')} บาท</div>
                            </div>
                            <div>
                              <div className="text-sm text-blue-700 font-semibold mb-1">ราคารวม:</div>
                              <div className="text-2xl font-bold text-blue-700">{mdbRoofTotals.total.toLocaleString('th-TH')} บาท</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              <Separator />

              {/* หลังคาเครื่องชาร์จ */}

              <Collapsible
                open={openSections['charger-roof']}
                onOpenChange={(open) => setOpenSections(prev => ({ ...prev, 'charger-roof': open }))}
              >
                <div className="bg-gray-50 rounded-lg border border-gray-200">
                  <CollapsibleTrigger className="w-full p-4 text-left hover:bg-gray-100 transition-colors rounded-lg">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">
                        หลังคาเครื่องชาร์จ <span className="text-xs">(Charger Roof Type)</span>
                      </Label>
                      <div className="ml-4">
                        {openSections['charger-roof'] ? (
                          <ChevronUp className="h-5 w-5 text-gray-600" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-600" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-3">

                      <div className="grid grid-cols-3 gap-3">

                        <div

                          className={`flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer ${chargerRoofType === 'normal' ? 'bg-gray-100 border-gray-300' : ''}`}

                          onClick={() => setChargerRoofType('normal')}

                        >

                          <Checkbox

                            id="charger-roof-normal"

                            checked={chargerRoofType === 'normal'}

                            onCheckedChange={(checked) => {

                              if (checked) setChargerRoofType('normal');

                            }}

                            className="border-gray-400 data-[state=checked]:bg-gray-500"

                          />

                          <Label htmlFor="charger-roof-normal" className="font-medium cursor-pointer">ธรรมดา</Label>

                        </div>

                        <div

                          className={`flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-green-50 cursor-pointer ${chargerRoofType === 'composite' ? 'bg-green-100 border-green-300' : ''}`}

                          onClick={() => setChargerRoofType('composite')}

                        >

                          <Checkbox

                            id="charger-roof-composite"

                            checked={chargerRoofType === 'composite'}

                            onCheckedChange={(checked) => {

                              if (checked) setChargerRoofType('composite');

                            }}

                            className="text-green-500 border-green-400 data-[state=checked]:bg-green-500"

                          />

                          <Label htmlFor="charger-roof-composite" className="font-medium cursor-pointer text-green-700">Composite</Label>

                        </div>

                        <div

                          className={`flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-red-50 cursor-pointer ${chargerRoofType === 'no' ? 'bg-red-100 border-red-300' : ''}`}

                          onClick={() => setChargerRoofType('no')}

                        >

                          <Checkbox

                            id="charger-roof-no"

                            checked={chargerRoofType === 'no'}

                            onCheckedChange={(checked) => {

                              if (checked) setChargerRoofType('no');

                            }}

                            className="text-red-500 border-red-400 data-[state=checked]:bg-red-500"

                          />

                          <Label htmlFor="charger-roof-no" className="font-medium cursor-pointer text-red-700">ไม่มี</Label>

                        </div>

                      </div>

                      {/* รวมค่าใช้จ่ายหลังคาเครื่องชาร์จ */}
                      {chargerRoofData && (
                        <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200 space-y-4">
                          <div className="text-lg font-semibold text-green-800">รวมค่าใช้จ่ายหลังคาเครื่องชาร์จ</div>

                          {/* ราคารวม */}
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <div className="text-sm text-gray-600 mb-1">ค่าของรวม:</div>
                              <div className="text-xl font-bold text-gray-800">{chargerRoofTotals.material.toLocaleString('th-TH')} บาท</div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-600 mb-1">ค่าแรงรวม:</div>
                              <div className="text-xl font-bold text-gray-800">{chargerRoofTotals.labor.toLocaleString('th-TH')} บาท</div>
                            </div>
                            <div>
                              <div className="text-sm text-green-700 font-semibold mb-1">ราคารวม:</div>
                              <div className="text-2xl font-bold text-green-700">{chargerRoofTotals.total.toLocaleString('th-TH')} บาท</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              <Separator />

              <div className="mt-8 p-5 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200 space-y-4">
                <div className="text-xl font-semibold text-slate-800">ราคารวมฟีเจอร์และตัวเลือกเพิ่มเติม</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">ค่าของรวม:</div>
                    <div className="text-xl font-bold text-gray-800">{additionalFeaturesTotals.material.toLocaleString('th-TH')} บาท</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">ค่าแรงรวม:</div>
                    <div className="text-xl font-bold text-gray-800">{additionalFeaturesTotals.labor.toLocaleString('th-TH')} บาท</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-700 font-semibold mb-1">ราคารวม:</div>
                    <div className="text-2xl font-bold text-slate-800">{additionalFeaturesTotals.total.toLocaleString('th-TH')} บาท</div>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  รวมค่าใช้จ่ายจากทุกหัวข้อย่อย: อุปกรณ์ประกอบสถานี, ระบบสื่อสาร, งานปูน, งานทาสีช่องจอด และหลังคาทุกประเภท
                </div>
              </div>

            </div >

          )
          }

        </CardContent >

      </Card >



      {/* Travel Cost Card - แยกออกมาเป็นหัวข้อแยก */}
      < Card className="shadow-xl border-0 overflow-hidden" >

        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">

          <CardTitle className="flex items-center text-blue-800">

            <div className="flex items-center gap-2">

              <MapPin className="h-5 w-5" />

              ค่าเดินทาง <span className="text-xs ">(Travel Cost)</span>

            </div>

          </CardTitle>

          <CardDescription className="text-blue-600">

            คำนวณค่าเดินทางตามระยะทางและจำนวนเครื่องชาร์จ

          </CardDescription>

        </CardHeader>

        <CardContent className="p-6">

          <div className="space-y-4">

            {/* ระยะทาง */}

            <div className="space-y-2">

              <Label htmlFor="travelDistance" className="text-sm font-medium ">

                ระยะทาง (กิโลเมตร)

              </Label>

              <Input

                id="travelDistance"

                type="number"

                className="w-32 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"

                placeholder="กรอกระยะทาง"

                value={travelDistance}

                onChange={(e) => setTravelDistance(e.target.value)}

              />

            </div>



            {/* งานฝึกอบรม */}

            <div className="space-y-3">

              <Label className="text-sm font-medium ">

                งานฝึกอบรม <span className="text-xs ">(Training Work)</span>

              </Label>

              <div className="grid grid-cols-2 gap-3">

                <div

                  className={`flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-green-50 cursor-pointer ${trainingWork === 'yes' ? 'bg-green-100 border-green-300' : ''}`}

                  onClick={() => setTrainingWork('yes')}

                >

                  <Checkbox

                    id="training-yes"

                    checked={trainingWork === 'yes'}

                    onCheckedChange={(checked) => {

                      if (checked) setTrainingWork('yes');

                    }}

                    className="text-green-500 border-green-400 data-[state=checked]:bg-green-500"

                  />

                  <Label htmlFor="training-yes" className="font-medium cursor-pointer text-green-700">มีงานฝึกอบรม (1วัน)</Label>

                </div>

                <div

                  className={`flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer ${trainingWork === 'no' ? 'bg-gray-100 border-gray-300' : ''}`}

                  onClick={() => setTrainingWork('no')}

                >

                  <Checkbox

                    id="training-no"

                    checked={trainingWork === 'no'}

                    onCheckedChange={(checked) => {

                      if (checked) setTrainingWork('no');

                    }}

                    className=" border-gray-400 data-[state=checked]:bg-gray-500"

                  />

                  <Label htmlFor="training-no" className="font-medium cursor-pointer ">ไม่มีงานฝึกอบรม</Label>

                </div>

              </div>

            </div>



            {/* แสดงผลการคำนวณ */}

            {travelDistance && (

              <Collapsible
                open={openItems['travel-cost']}
                onOpenChange={(open) => setOpenItems(prev => ({ ...prev, 'travel-cost': open }))}
              >
                <div className="bg-blue-50 rounded-lg border border-blue-200">
                  <CollapsibleTrigger className="w-full p-4 text-left hover:bg-blue-100 transition-colors rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">ค่าเดินทาง:</span>
                        <span className="font-bold text-blue-600 text-lg ml-2">
                          {travelCostResult.toLocaleString('th-TH')} บาท
                        </span>
                      </div>
                      <div className="ml-4">
                        {openItems['travel-cost'] ? (
                          <ChevronUp className="h-4 w-4 text-blue-600" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4">
                      <div className="text-xs mt-1">
                        ระยะทาง: {travelDistance} กม. | จำนวน Charger: {props.numberOfChargers} Unit
                        {trainingWork === 'yes' && (
                          <span className="text-green-600 font-medium"> | + งานฝึกอบรม (1วัน)</span>
                        )}
                      </div>

                      {/* แสดงรายละเอียดการคำนวณ */}
                      <div className="mt-3 p-3 bg-white rounded border text-xs space-y-1">
                        <div className="font-medium text-gray-700">รายละเอียดการคำนวณ:</div>
                        <div>• ระยะทาง: {travelDistance} กม.</div>
                        <div>• จำนวน Charger: {props.numberOfChargers} Unit</div>
                        {trainingWork === 'yes' && (
                          <div className="text-green-600">
                            • รวมงานฝึกอบรม: {(parseFloat(travelDistance) * 15 + 2600 + 1000).toLocaleString('th-TH')} บาท
                          </div>
                        )}
                        <div className="font-medium text-blue-600">
                          • ยอดรวมทั้งหมด: {travelCostResult.toLocaleString('th-TH')} บาท
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )}

          </div>

        </CardContent>

      </Card >

      <Card className="shadow-xl border-0 overflow-hidden mt-6">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
          <CardTitle className="flex items-center justify-between text-slate-800">
            <span>รวมค่าใช้จ่ายการสร้างสถานี</span>
            <span className="text-xs text-slate-500">ภาพรวมต้นทุนทั้งหมด</span>
          </CardTitle>
          <CardDescription className="text-slate-600">
            ตรวจดูยอดรวมของค่าของ ค่าแรง และราคาสุทธิจากทุกหมวดงาน
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-sm">
              <div className="text-sm text-slate-200/80 mb-2">ราคารวมสร้างสถานี</div>
              <div className="text-3xl font-bold tracking-tight">{formatCurrency(stationTotals.total)} บาท</div>
              <div className="text-xs text-slate-200/60 mt-2">รวมค่าของและค่าแรงทุกหมวด</div>
            </div>
            <div className="p-5 rounded-xl bg-gradient-to-br from-slate-100 via-white to-slate-50 border border-slate-200 text-slate-800 shadow-sm">
              <div className="text-sm text-slate-500 mb-2">ค่าของสร้างสถานี</div>
              <div className="text-2xl font-semibold">{formatCurrency(stationTotals.material)} บาท</div>
              <div className="text-xs text-slate-400 mt-2">รวมค่าวัสดุ อุปกรณ์ และสินค้า</div>
            </div>
            <div className="p-5 rounded-xl bg-gradient-to-br from-slate-100 via-white to-slate-50 border border-slate-200 text-slate-800 shadow-sm">
              <div className="text-sm text-slate-500 mb-2">ค่าแรงสร้างสถานี</div>
              <div className="text-2xl font-semibold">{formatCurrency(stationTotals.labor)} บาท</div>
              <div className="text-xs text-slate-400 mt-2">รวมค่าแรงงานติดตั้งทุกประเภท</div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            {stationSectionsForDisplay.map((section) => {
              const sectionKey = `station-summary-${section.key}`;
              const isOpen = openItems[sectionKey] ?? false;
              const sectionTotal = section.totals.total || 0;

              return (
                <Collapsible
                  key={section.key}
                  open={isOpen}
                  onOpenChange={(open) => setOpenItems(prev => ({ ...prev, [sectionKey]: open }))}
                >
                  <div className={`rounded-xl border transition-colors ${section.hasValue ? 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
                    <CollapsibleTrigger className="w-full px-5 py-4 text-left">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${section.hasValue ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-500'}`}>
                            {section.index}
                          </div>
                          <div className="text-sm font-semibold text-slate-700 md:text-base">
                            {section.label}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 md:gap-6">
                          <div className="text-xs text-slate-500 md:text-sm">ราคารวม</div>
                          <div className={`text-lg font-bold ${section.hasValue ? 'text-slate-800' : 'text-slate-400'}`}>
                            {formatCurrency(sectionTotal)} บาท
                          </div>
                          <div className="text-slate-500">
                            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-5 pb-5">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                            <div className="text-xs text-slate-500 uppercase tracking-wide">ค่าของรวม</div>
                            <div className="mt-2 text-xl font-semibold text-slate-800">{formatCurrency(section.totals.material)} บาท</div>
                          </div>
                          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                            <div className="text-xs text-slate-500 uppercase tracking-wide">ค่าแรงรวม</div>
                            <div className="mt-2 text-xl font-semibold text-slate-800">{formatCurrency(section.totals.labor)} บาท</div>
                          </div>
                          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                            <div className="text-xs text-slate-500 uppercase tracking-wide">ราคารวม</div>
                            <div className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(sectionTotal)} บาท</div>
                          </div>
                        </div>
                        {!section.hasValue && (
                          <div className="mt-3 text-xs text-slate-400">
                            ไม่มีค่าใช้จ่ายในหัวข้อนี้จากเงื่อนไขที่เลือกไว้
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        </CardContent>
      </Card>

    </div >

  )

}
function StationAccessory() {

  const { state } = useLocation()

  // state จะมีค่าที่ส่งมาจาก Home



  // State สำหรับเก็บข้อมูล Excel

  const [excelData, setExcelData] = useState<{ [sheetName: string]: any[] }>({});

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);



  // State สำหรับเก็บข้อมูล mapping จาก Excel

  const [transformerPriceMapping, setTransformerPriceMapping] = useState<{ [key: string]: any }>({});

  const [mdbConfigurationMapping, setMdbConfigurationMapping] = useState<{ [key: string]: any }>({});
  const [stationEquipmentPriceMapping, setStationEquipmentPriceMapping] = useState<{ [key: string]: any }>({});
  const [roofCostMapping, setRoofCostMapping] = useState<{ [key: string]: any }>({});
  const [trToMdbMapping, setTrToMdbMapping] = useState<{ [key: string]: any }>({});

  // State สำหรับแสดง/ซ่อน mapping details

  const [showTransformerMapping, setShowTransformerMapping] = useState(false);

  const [showMdbMapping, setShowMdbMapping] = useState(false);

  // State สำหรับค้นหาและกรองข้อมูล

  const [transformerSearchTerm, setTransformerSearchTerm] = useState('');

  const [mdbSearchTerm, setMdbSearchTerm] = useState('');

  // ฟังก์ชันสำหรับดึงข้อมูลจาก Google Sheets
  const fetchExcelData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Google Sheets URL ใหม่

      const googleSheetsUrl = 'https://docs.google.com/spreadsheets/d/1fl4SLnm7_1iIBwzoT2BXAh6RbL9Gixe7/edit?usp=sharing&ouid=111737986991833013743&rtpof=true&sd=true';



      // แปลง URL เป็น direct download URL

      const fileId = googleSheetsUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];

      if (!fileId) {

        throw new Error('ไม่สามารถแยก File ID จาก URL ได้');

      }



      const excelFileUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx&usp=sharing`;



      // ดาวน์โหลดไฟล์

      const response = await axios.get(excelFileUrl, { responseType: 'arraybuffer' });



      // อ่านไฟล์ Excel

      const workbook = XLSX.read(response.data, { type: 'array' });



      // เก็บข้อมูลจากทุก sheets

      const allSheetsData: { [sheetName: string]: any[] } = {};



      workbook.SheetNames.forEach(sheetName => {

        const worksheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // เพิ่ม __sheetName__ และ __rowNum__ ให้กับแต่ละ row
        const processedData = jsonData.map((row: any, index: number) => ({
          ...row,
          __sheetName__: sheetName,
          __rowNum__: index + 1 // Excel row numbers start from 1
        }));

        allSheetsData[sheetName] = processedData;

        // แสดงข้อมูลทุก sheet ใน Console
        console.log(`=== Sheet: ${sheetName} ===`);
        console.log(`จำนวนแถว: ${processedData.length}`);
        console.log('ข้อมูลครบทุกแถว:', processedData);
        console.log('---');

      });



      setExcelData(allSheetsData);




      // สร้าง mapping สำหรับ Transformer Price, MDB Configuration, Station Equipment Price, Roof Cost และ TR to MDB
      createTransformerPriceMapping(allSheetsData);
      createMdbConfigurationMapping(allSheetsData);
      createStationEquipmentPriceMapping(allSheetsData);
      createRoofCostMapping(allSheetsData);
      createTrToMdbMapping(allSheetsData);

    } catch (error) {

      console.error("Error fetching Excel file:", error);

      setError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดึงข้อมูล');

    } finally {

      setLoading(false);

    }

  };



  // ฟังก์ชันสร้าง mapping สำหรับ Transformer Price
  const createTransformerPriceMapping = (allSheetsData: { [sheetName: string]: any[] }) => {
    const transformerSheet = allSheetsData['ราคาหม้อแปลง'];
    if (!transformerSheet || transformerSheet.length === 0) {
      console.warn('ไม่พบข้อมูลใน Sheet "ราคาหม้อแปลง" สำหรับสร้าง mapping');
      return;
    }

    const mapping: { [key: string]: any } = {};

    // สร้าง mapping สำหรับหม้อแปลง 22 (24) kV / 416 V
    transformerSheet.forEach(row => {
      if (row.__rowNum__ >= 4 && row.__rowNum__ <= 15) {
        const productName = row['ตาราง_____ราคาหม้อแปลง']; // รายการสินค้า
        const laborCost = row['__EMPTY_2']; // ราคาค่าแรง
        const installationCost = row['__EMPTY_3']; // ราคาค่าติดตั้ง

        if (productName) {
          // กำหนดขนาดหม้อแปลงตาม row number
          let transformerSize = 0;
          switch (row.__rowNum__) {
            case 4: transformerSize = 100; break;
            case 5: transformerSize = 160; break;
            case 6: transformerSize = 250; break;
            case 7: transformerSize = 315; break;
            case 8: transformerSize = 400; break;
            case 9: transformerSize = 500; break;
            case 10: transformerSize = 630; break;
            case 11: transformerSize = 800; break;
            case 12: transformerSize = 1000; break;
            case 13: transformerSize = 1250; break;
            case 14: transformerSize = 1500; break;
            case 15: transformerSize = 2000; break;
          }

          if (transformerSize > 0) {
            const key22kv = `22kv-416v-${transformerSize}`;
            const totalInstallationCost = (parseFloat(laborCost) || 0) + (parseFloat(installationCost) || 0);

            mapping[key22kv] = {
              size: transformerSize,
              type: '22kv-416v',
              productName: productName,
              laborCost: laborCost,
              installationCost: installationCost,
              totalInstallationCost: totalInstallationCost,
              column: 'ตาราง_____ราคาหม้อแปลง',
              rowNum: row.__rowNum__,
              rowData: row
            };
          }
        }
      }
    });

    // สร้าง mapping สำหรับหม้อแปลง 33 kV / 316 V
    transformerSheet.forEach(row => {
      if (row.__rowNum__ >= 4 && row.__rowNum__ <= 15) {
        const productName = row['__EMPTY_5']; // รายการสินค้า
        const laborCost = row['__EMPTY_8']; // ราคาค่าแรง
        const installationCost = row['__EMPTY_9']; // ราคาค่าติดตั้ง

        if (productName) {
          // กำหนดขนาดหม้อแปลงตาม row number
          let transformerSize = 0;
          switch (row.__rowNum__) {
            case 4: transformerSize = 100; break;
            case 5: transformerSize = 160; break;
            case 6: transformerSize = 250; break;
            case 7: transformerSize = 315; break;
            case 8: transformerSize = 400; break;
            case 9: transformerSize = 500; break;
            case 10: transformerSize = 630; break;
            case 11: transformerSize = 800; break;
            case 12: transformerSize = 1000; break;
            case 13: transformerSize = 1250; break;
            case 14: transformerSize = 1500; break;
            case 15: transformerSize = 2000; break;
          }

          if (transformerSize > 0) {
            const key33kv = `33kv-316v-${transformerSize}`;
            const totalInstallationCost = (parseFloat(laborCost) || 0) + (parseFloat(installationCost) || 0);

            mapping[key33kv] = {
              size: transformerSize,
              type: '33kv-316v',
              productName: productName,
              laborCost: laborCost,
              installationCost: installationCost,
              totalInstallationCost: totalInstallationCost,
              column: '__EMPTY_5',
              rowNum: row.__rowNum__,
              rowData: row
            };
          }
        }
      }
    });

    setTransformerPriceMapping(mapping);
    console.log('Transformer Price Mapping สร้างเสร็จ:', mapping);
    console.log('Transformer Price Mapping Keys:', Object.keys(mapping));
    console.log('Transformer Price Mapping Values:', Object.values(mapping));
  };

  // ฟังก์ชันสร้าง mapping สำหรับราคาอุปกรณ์ประกอบสถานี
  const createStationEquipmentPriceMapping = (allSheetsData: { [sheetName: string]: any[] }) => {
    const equipmentSheet = allSheetsData['ราคาอุปกรณ์ประกอบสถานี'];
    if (!equipmentSheet || equipmentSheet.length === 0) {
      console.warn('ไม่พบข้อมูลใน Sheet "ราคาอุปกรณ์ประกอบสถานี" สำหรับสร้าง mapping');
      return;
    }

    const mapping: { [key: string]: any } = {};

    // สร้าง mapping สำหรับแต่ละรายการตาม row number
    const equipmentItems = [
      { key: 'bumper-poles', rowNum: 2, name: 'เสากันชน' },
      { key: 'wheel-stops', rowNum: 3, name: 'ยางกั้นล้อ (ปูน)' },
      { key: 'fire-extinguisher', rowNum: 4, name: 'ถังดับเพลิง+ตู้' },
      { key: 'signage', rowNum: 5, name: 'ป้ายสูง + วิธีใช้งาน' },
      { key: 'wifi-4g-hub', rowNum: 8, name: 'WIFI + 4G + HUB' },
      { key: 'cctv', rowNum: 9, name: 'กล้อง CCTV' },
      { key: 'lighting', rowNum: 10, name: 'หลอดไฟ' },
      { key: 'acc-system', rowNum: 11, name: 'ACC (สาย + รางสาย + ตู้outdoor + อื่นๆ)' },
      { key: 'mdb-concrete-base', rowNum: 14, name: 'ฐานปูน MDB 200 x 200 x 20 ซม.' },
      { key: 'charger-concrete-base', rowNum: 15, name: 'ฐานปูน CHARGER 150 x 150 x 20 ซม.' },
      { key: 'parking-concrete-floor', rowNum: 16, name: 'พื้นปูน ลานจอดรถ 300 x 600 x 10 ซม.' },
      { key: 'general-concrete-floor', rowNum: 17, name: 'เทพื้นปูนทั่วไป 100 x 100 x 10 ซม.' },
      { key: 'paint-no-grind-no-polish', rowNum: 20, name: 'ทาสีพื้นช่องจอดรถ แบบไม่ขัด ไม่โป้ว' },
      { key: 'paint-grind-no-polish', rowNum: 21, name: 'ทาสีพื้นช่องจอดรถ แบบขัด แต่ไม่โป้ว' },
      { key: 'paint-grind-and-polish', rowNum: 22, name: 'ทาสีพื้นช่องจอดรถ แบบขัด และโป้วให้เรียบ' },
      { key: 'side-line-marking', rowNum: 23, name: 'ตีเส้นด้านข้าง' },
      { key: 'center-pattern-original', rowNum: 24, name: 'ทำลายกลางช่องจอด ใช้ลายเดิม' },
      { key: 'center-pattern-new', rowNum: 25, name: 'ทำลายกลางช่องจอด ออกแบบลายใหม่' }
    ];

    equipmentItems.forEach(item => {
      const rowData = equipmentSheet.find(row => row.__rowNum__ === item.rowNum);
      if (rowData) {
        const productCodeKey = Object.keys(rowData).find(key =>
          typeof key === 'string' && key.trim().includes('อุปกรณ์ประกอบสถานี')
        );
        mapping[item.key] = {
          name: item.name,
          rowNum: item.rowNum,
          productCode: productCodeKey ? rowData[productCodeKey] : '', // เลขสินค้า
          materialPrice: parseFloat(rowData.__EMPTY_2) || 0, // ราคาค่าของ
          laborPrice: parseFloat(rowData.__EMPTY_3) || 0, // ราคาค่าแรง
          totalPrice: parseFloat(rowData.__EMPTY_4) || 0, // ราคารวม
          rowData: rowData
        };
      }
    });

    setStationEquipmentPriceMapping(mapping);
    console.log('Station Equipment Price Mapping สร้างเสร็จ:', mapping);
  };

  // ฟังก์ชันสร้าง mapping สำหรับราคาหลังคาสถานี
  const createRoofCostMapping = (allSheetsData: { [sheetName: string]: any[] }) => {
    const roofSheet = allSheetsData['ตารางต้นทุนหลังคาสถานี'];
    if (!roofSheet || roofSheet.length === 0) {
      console.warn('ไม่พบข้อมูลใน Sheet "ตารางต้นทุนหลังคาสถานี" สำหรับสร้าง mapping');
      return;
    }

    const mapping: { [key: string]: any } = {};

    // สร้าง mapping สำหรับหลังคาคุมช่องจอดตามจำนวนช่องจอด
    const parkingRoofRows = [
      { key: 'parking-roof-1-2', rowNum: 3, slots: '1-2' },
      { key: 'parking-roof-3-4', rowNum: 5, slots: '3-4' },
      { key: 'parking-roof-5-6', rowNum: 7, slots: '5-6' },
      { key: 'parking-roof-7-8', rowNum: 9, slots: '7-8' },
      { key: 'parking-roof-9-10', rowNum: 11, slots: '9-10' },
      { key: 'parking-roof-11-12', rowNum: 13, slots: '11-12' }
    ];

    parkingRoofRows.forEach(item => {
      const rowData = roofSheet.find(row => row.__rowNum__ === item.rowNum);
      if (rowData) {
        mapping[item.key] = {
          slots: item.slots,
          rowNum: item.rowNum,
          materialPrice: rowData.__EMPTY_4 || 0,
          laborPrice: rowData.__EMPTY_5 || 0,
          totalPrice: rowData.__EMPTY_6 || 0,
          rowData: rowData
        };
      }
    });

    // สร้าง mapping สำหรับหลังคาเฉพาะ MDB (row 14)
    const mdbRoofRow = roofSheet.find(row => row.__rowNum__ === 14);
    if (mdbRoofRow) {
      mapping['mdb-roof'] = {
        name: mdbRoofRow.__EMPTY || 'หลังคาเฉพาะ MDB',
        rowNum: 14,
        materialPrice: mdbRoofRow.__EMPTY_4 || 0,
        laborPrice: mdbRoofRow.__EMPTY_5 || 0,
        totalPrice: mdbRoofRow.__EMPTY_6 || 0,
        rowData: mdbRoofRow
      };
    }

    // สร้าง mapping สำหรับหลังคาเครื่องชาร์จ ธรรมดา (row 15)
    const chargerNormalRow = roofSheet.find(row => row.__rowNum__ === 15);
    if (chargerNormalRow) {
      mapping['charger-roof-normal'] = {
        name: chargerNormalRow.__EMPTY || 'หลังคาเครื่องชาร์จ ธรรมดา',
        rowNum: 15,
        materialPrice: chargerNormalRow.__EMPTY_4 || 0,
        laborPrice: chargerNormalRow.__EMPTY_5 || 0,
        totalPrice: chargerNormalRow.__EMPTY_6 || 0,
        rowData: chargerNormalRow
      };
    }

    // สร้าง mapping สำหรับหลังคาเครื่องชาร์จ Composite (row 16)
    const chargerCompositeRow = roofSheet.find(row => row.__rowNum__ === 16);
    if (chargerCompositeRow) {
      mapping['charger-roof-composite'] = {
        name: chargerCompositeRow.__EMPTY || 'หลังคาเครื่องชาร์จ Composite',
        rowNum: 16,
        materialPrice: chargerCompositeRow.__EMPTY_4 || 0,
        laborPrice: chargerCompositeRow.__EMPTY_5 || 0,
        totalPrice: chargerCompositeRow.__EMPTY_6 || 0,
        rowData: chargerCompositeRow
      };
    }

    setRoofCostMapping(mapping);
    console.log('Roof Cost Mapping สร้างเสร็จ:', mapping);
  };

  // ฟังก์ชันสร้าง mapping สำหรับ TR to MDB Configuration
  const createTrToMdbMapping = (allSheetsData: { [sheetName: string]: any[] }) => {
    const mapping: { [key: string]: any } = {};

    // 1. Sheet แบบ 9.10 (ร้อยท่อเดินในอากาศ กลุ่ม 2 - IMC)
    const sheet910 = allSheetsData['แบบ 9.10'];
    if (sheet910 && sheet910.length > 0) {
      mapping['imc'] = {};

      // MEA
      mapping['imc']['MEA'] = {
        400: sheet910.find(row => row.__rowNum__ === 25),
        500: sheet910.find(row => row.__rowNum__ === 27),
        630: sheet910.find(row => row.__rowNum__ === 30),
        800: sheet910.find(row => row.__rowNum__ === 32),
        1000: sheet910.find(row => row.__rowNum__ === 36),
        1250: sheet910.find(row => row.__rowNum__ === 40),
        1500: sheet910.find(row => row.__rowNum__ === 42)
      };

      // PEA
      mapping['imc']['PEA'] = {
        100: sheet910.find(row => row.__rowNum__ === 15),
        160: sheet910.find(row => row.__rowNum__ === 17),
        250: sheet910.find(row => row.__rowNum__ === 23),
        315: sheet910.find(row => row.__rowNum__ === 24),
        400: sheet910.find(row => row.__rowNum__ === 25),
        500: sheet910.find(row => row.__rowNum__ === 27),
        630: sheet910.find(row => row.__rowNum__ === 30),
        800: sheet910.find(row => row.__rowNum__ === 32),
        1000: sheet910.find(row => row.__rowNum__ === 36),
        1250: sheet910.find(row => row.__rowNum__ === 40),
        1500: sheet910.find(row => row.__rowNum__ === 42)
      };
    }

    // 2. Sheet แบบ 9.11 (ร้อยท่อเดินในอากาศ กลุ่ม 2 - RSC)
    const sheet911 = allSheetsData['แบบ 9.11'];
    if (sheet911 && sheet911.length > 0) {
      mapping['rsc'] = {};

      // MEA
      mapping['rsc']['MEA'] = {
        400: sheet911.find(row => row.__rowNum__ === 25),
        500: sheet911.find(row => row.__rowNum__ === 27),
        630: sheet911.find(row => row.__rowNum__ === 30),
        800: sheet911.find(row => row.__rowNum__ === 32),
        1000: sheet911.find(row => row.__rowNum__ === 36),
        1250: sheet911.find(row => row.__rowNum__ === 40),
        1500: sheet911.find(row => row.__rowNum__ === 42)
      };

      // PEA
      mapping['rsc']['PEA'] = {
        100: sheet911.find(row => row.__rowNum__ === 15),
        160: sheet911.find(row => row.__rowNum__ === 17),
        250: sheet911.find(row => row.__rowNum__ === 23),
        315: sheet911.find(row => row.__rowNum__ === 24),
        400: sheet911.find(row => row.__rowNum__ === 25),
        500: sheet911.find(row => row.__rowNum__ === 27),
        630: sheet911.find(row => row.__rowNum__ === 30),
        800: sheet911.find(row => row.__rowNum__ === 32),
        1000: sheet911.find(row => row.__rowNum__ === 36),
        1250: sheet911.find(row => row.__rowNum__ === 40),
        1500: sheet911.find(row => row.__rowNum__ === 42)
      };
    }

    // 3. Sheet แบบ 9.12 (ร้อยท่อฝังใต้ดิน กลุ่ม 5)
    const sheet912 = allSheetsData['แบบ 9.12'];
    if (sheet912 && sheet912.length > 0) {
      mapping['underground'] = {};

      // MEA
      mapping['underground']['MEA'] = {
        400: sheet912.find(row => row.__rowNum__ === 26),
        500: sheet912.find(row => row.__rowNum__ === 27),
        630: sheet912.find(row => row.__rowNum__ === 32),
        800: sheet912.find(row => row.__rowNum__ === 37),
        1000: sheet912.find(row => row.__rowNum__ === 40),
        1250: sheet912.find(row => row.__rowNum__ === 42),
        1500: sheet912.find(row => row.__rowNum__ === 43)
      };

      // PEA
      mapping['underground']['PEA'] = {
        100: sheet912.find(row => row.__rowNum__ === 15),
        160: sheet912.find(row => row.__rowNum__ === 17),
        250: sheet912.find(row => row.__rowNum__ === 24),
        315: sheet912.find(row => row.__rowNum__ === 24),
        400: sheet912.find(row => row.__rowNum__ === 26),
        500: sheet912.find(row => row.__rowNum__ === 27),
        630: sheet912.find(row => row.__rowNum__ === 32),
        800: sheet912.find(row => row.__rowNum__ === 37),
        1000: sheet912.find(row => row.__rowNum__ === 40),
        1250: sheet912.find(row => row.__rowNum__ === 42),
        1500: sheet912.find(row => row.__rowNum__ === 43)
      };
    }

    // 4. Sheet แบบ 9.15 (ราง TRAY ไม่มีฝา)
    const sheet915 = allSheetsData['แบบ 9.15'];
    if (sheet915 && sheet915.length > 0) {
      mapping['tray'] = {};

      // MEA
      mapping['tray']['MEA'] = {
        400: sheet915.find(row => row.__rowNum__ === 18),
        500: sheet915.find(row => row.__rowNum__ === 19),
        630: sheet915.find(row => row.__rowNum__ === 20),
        800: sheet915.find(row => row.__rowNum__ === 24),
        1000: sheet915.find(row => row.__rowNum__ === 26),
        1250: sheet915.find(row => row.__rowNum__ === 30),
        1500: sheet915.find(row => row.__rowNum__ === 32)
      };

      // PEA
      mapping['tray']['PEA'] = {
        250: sheet915.find(row => row.__rowNum__ === 12),
        315: sheet915.find(row => row.__rowNum__ === 13),
        400: sheet915.find(row => row.__rowNum__ === 18),
        500: sheet915.find(row => row.__rowNum__ === 19),
        630: sheet915.find(row => row.__rowNum__ === 20),
        800: sheet915.find(row => row.__rowNum__ === 24),
        1000: sheet915.find(row => row.__rowNum__ === 26),
        1250: sheet915.find(row => row.__rowNum__ === 30),
        1500: sheet915.find(row => row.__rowNum__ === 32)
      };
    }

    // 5. Sheet แบบ 9.16 (ราง LADDER ไม่มีฝา)
    const sheet916 = allSheetsData['แบบ 9.16'];
    if (sheet916 && sheet916.length > 0) {
      mapping['ladder'] = {};

      // MEA
      mapping['ladder']['MEA'] = {
        400: sheet916.find(row => row.__rowNum__ === 18),
        500: sheet916.find(row => row.__rowNum__ === 19),
        630: sheet916.find(row => row.__rowNum__ === 20),
        800: sheet916.find(row => row.__rowNum__ === 24),
        1000: sheet916.find(row => row.__rowNum__ === 25),
        1250: sheet916.find(row => row.__rowNum__ === 30),
        1500: sheet916.find(row => row.__rowNum__ === 31)
      };

      // PEA
      mapping['ladder']['PEA'] = {
        250: sheet916.find(row => row.__rowNum__ === 12),
        315: sheet916.find(row => row.__rowNum__ === 13),
        400: sheet916.find(row => row.__rowNum__ === 18),
        500: sheet916.find(row => row.__rowNum__ === 19),
        630: sheet916.find(row => row.__rowNum__ === 21),
        800: sheet916.find(row => row.__rowNum__ === 24),
        1000: sheet916.find(row => row.__rowNum__ === 25),
        1250: sheet916.find(row => row.__rowNum__ === 30),
        1500: sheet916.find(row => row.__rowNum__ === 31)
      };
    }

    setTrToMdbMapping(mapping);
    console.log('TR to MDB Mapping สร้างเสร็จ:', mapping);
  };
  // ฟังก์ชันคำนวณราคา TR to MDB Configuration
  const getTrToMdbPrice = (wiringType: string, pipeType: string, powerAuthority: string, transformerSize: number, distance: number) => {
    console.log('getTrToMdbPrice called with:', { wiringType, pipeType, powerAuthority, transformerSize, distance });

    if (!trToMdbMapping || !distance || distance <= 0) {
      console.log('Early return: no mapping or invalid distance');
      return null;
    }

    let data = null;

    // กำหนดประเภทการเดินสาย
    if (wiringType === 'ร้อยท่อเดินในอากาศ กลุ่ม 2' && pipeType === 'IMC') {
      data = trToMdbMapping['imc']?.[powerAuthority]?.[transformerSize];
      console.log('IMC data found:', data);
    } else if (wiringType === 'ร้อยท่อเดินในอากาศ กลุ่ม 2' && pipeType === 'RSC') {
      data = trToMdbMapping['rsc']?.[powerAuthority]?.[transformerSize];
      console.log('RSC data found:', data);
    } else if (wiringType === 'ร้อยท่อฝังใต้ดิน กลุ่ม 5') {
      data = trToMdbMapping['underground']?.[powerAuthority]?.[transformerSize];
      console.log('Underground data found:', data);
      console.log('Underground mapping:', trToMdbMapping['underground']);
      console.log('MEA mapping:', trToMdbMapping['underground']?.[powerAuthority]);
    } else if (wiringType === 'ราง TRAY ไม่มีฝา') {
      data = trToMdbMapping['tray']?.[powerAuthority]?.[transformerSize];
      console.log('Tray data found:', data);
    } else if (wiringType === 'ราง LADDER ไม่มีฝา') {
      data = trToMdbMapping['ladder']?.[powerAuthority]?.[transformerSize];
      console.log('Ladder data found:', data);
    }

    if (!data) {
      console.log('No data found for conditions');
      return null;
    }

    console.log('Raw data from Excel:', {
      __EMPTY: data.__EMPTY,
      f: data.f,
      __EMPTY_13: data.__EMPTY_13,
      __EMPTY_14: data.__EMPTY_14,
      __EMPTY_15: data.__EMPTY_15,
      __EMPTY_16: data.__EMPTY_16
    });

    // คำนวณราคาตามประเภทการเดินสาย
    let productCode = '';
    let materialPrice = 0;
    let laborPrice = 0;
    let totalPrice = 0;

    if (wiringType === 'ร้อยท่อเดินในอากาศ กลุ่ม 2' && pipeType === 'IMC') {
      // Sheet แบบ 9.10
      productCode = data.__EMPTY || '';
      materialPrice = (data.__EMPTY_14 || 0) * distance;
      laborPrice = (data.__EMPTY_15 || 0) * distance;
      totalPrice = (data.__EMPTY_16 || 0) * distance;
    } else if (wiringType === 'ร้อยท่อเดินในอากาศ กลุ่ม 2' && pipeType === 'RSC') {
      // Sheet แบบ 9.11
      productCode = data.f || '';
      materialPrice = (data.__EMPTY_13 || 0) * distance;
      laborPrice = (data.__EMPTY_14 || 0) * distance;
      totalPrice = (data.__EMPTY_15 || 0) * distance;
    } else if (wiringType === 'ร้อยท่อฝังใต้ดิน กลุ่ม 5') {
      // Sheet แบบ 9.12
      productCode = data.__EMPTY || '';
      materialPrice = (data.__EMPTY_14 || 0) * distance;
      laborPrice = (data.__EMPTY_15 || 0) * distance;
      totalPrice = (data.__EMPTY_16 || 0) * distance;
    } else if (wiringType === 'ราง TRAY ไม่มีฝา') {
      // Sheet แบบ 9.15
      productCode = data.__EMPTY || '';
      materialPrice = (data.__EMPTY_14 || 0) * distance;
      laborPrice = (data.__EMPTY_15 || 0) * distance;
      totalPrice = (data.__EMPTY_16 || 0) * distance;
    } else if (wiringType === 'ราง LADDER ไม่มีฝา') {
      // Sheet แบบ 9.16
      productCode = data.__EMPTY || '';
      materialPrice = (data.__EMPTY_14 || 0) * distance;
      laborPrice = (data.__EMPTY_15 || 0) * distance;
      totalPrice = (data.__EMPTY_16 || 0) * distance;
    }

    return {
      productCode,
      materialPrice,
      laborPrice,
      totalPrice,
      distance,
      transformerSize,
      powerAuthority,
      wiringType,
      pipeType,
      rawData: data // เพิ่มข้อมูลดิบจาก Excel
    };
  };
  // ฟังก์ชันสร้าง mapping สำหรับ MDB Configuration
  const createMdbConfigurationMapping = (allSheetsData: { [sheetName: string]: any[] }) => {
    const mdbSheet = allSheetsData['ตารางแสดงราคา MAIN MCCB ของ MDB'];
    if (!mdbSheet || mdbSheet.length === 0) {
      console.warn('ไม่พบข้อมูลใน Sheet "ตารางแสดงราคา MAIN MCCB ของ MDB" สำหรับสร้าง mapping');
      return;
    }

    const mapping: { [key: string]: any } = {};

    // สร้าง mapping สำหรับแต่ละยี่ห้อ MCCB และขนาดหม้อแปลง
    const mccbBrands = ['ABB', 'EATON', 'LS'];
    const transformerSizes = [100, 160, 250, 315, 400, 500, 630, 800, 1000, 1200];

    mccbBrands.forEach(brand => {
      // กำหนด header row และ product row ตาม brand
      let headerRowNum = 3; // ABB default
      let productRowNum = 9; // ABB default
      if (brand === 'EATON') {
        headerRowNum = 10;
        productRowNum = 16;
      } else if (brand === 'LS') {
        headerRowNum = 17;
        productRowNum = 23;
      }

      transformerSizes.forEach(size => {
        const key = `${brand}-${size}`;

        // กำหนด productCodeColumn ตาม transformer size
        let productCodeColumn = '';
        switch (size) {
          case 100:
            productCodeColumn = '__EMPTY_9';
            break;
          case 160:
            productCodeColumn = '__EMPTY_11';
            break;
          case 250:
            productCodeColumn = '__EMPTY_13';
            break;
          case 315:
            productCodeColumn = '__EMPTY_15';
            break;
          case 400:
            productCodeColumn = '__EMPTY_17';
            break;
          case 500:
            productCodeColumn = '__EMPTY_19';
            break;
          case 630:
            productCodeColumn = '__EMPTY_21';
            break;
          case 800:
            productCodeColumn = '__EMPTY_23';
            break;
          case 1000:
            productCodeColumn = '__EMPTY_25';
            break;
          case 1200:
            productCodeColumn = '__EMPTY_27';
            break;
        }

        // หา header row
        const headerRow = mdbSheet.find(row => row.__rowNum__ === headerRowNum);
        // หา product row
        const productRow = mdbSheet.find(row => row.__rowNum__ === productRowNum);

        if (headerRow && productRow && productCodeColumn) {
          mapping[key] = {
            transformerSize: size,
            mccbBrand: brand,
            headerRowNum,
            productRowNum,
            header: {
              rowNum: headerRowNum,
              name: headerRow['__EMPTY_1'] || '',
              spec1: headerRow['__EMPTY_6'] || '',
              productCodeHeader: headerRow[productCodeColumn] || ''
            },
            product: {
              rowNum: productRowNum,
              name: productRow['__EMPTY_1'] || '',
              MDBMPric: productRow[productCodeColumn] || ''
            }
          };
        }
      });
    });

    setMdbConfigurationMapping(mapping);
    console.log('MDB Configuration Mapping สร้างเสร็จ:', mapping);
    console.log('MDB Configuration Mapping Keys:', Object.keys(mapping));
    console.log('MDB Configuration Mapping Values:', Object.values(mapping));
  };

  // ฟังก์ชันช่วยเหลือสำหรับการเข้าถึงข้อมูล Excel
  const getExcelData = (sheetName: string) => {
    return excelData[sheetName] || [];
  };

  // ฟังก์ชันกรองข้อมูล Transformer Mapping
  const getFilteredTransformerMapping = () => {
    if (!transformerSearchTerm) return transformerPriceMapping;

    return Object.entries(transformerPriceMapping)
      .filter(([key, data]) => {
        const searchLower = transformerSearchTerm.toLowerCase();
        return (
          key.toLowerCase().includes(searchLower) ||
          data.size.toString().includes(searchLower) ||
          data.type.toLowerCase().includes(searchLower) ||
          data.price.toString().includes(searchLower)
        );
      })
      .reduce((acc, [key, data]) => {
        acc[key] = data;
        return acc;
      }, {} as { [key: string]: any });
  };

  // ฟังก์ชันกรองข้อมูล MDB Mapping
  const getFilteredMdbMapping = () => {
    if (!mdbSearchTerm) return mdbConfigurationMapping;

    return Object.entries(mdbConfigurationMapping)
      .filter(([key, data]) => {
        const searchLower = mdbSearchTerm.toLowerCase();
        return (
          key.toLowerCase().includes(searchLower) ||
          data.mccbBrand.toLowerCase().includes(searchLower) ||
          data.transformerSize.toString().includes(searchLower) ||
          data.startRow.toString().includes(searchLower)
        );
      })
      .reduce((acc, [key, data]) => {
        acc[key] = data;
        return acc;
      }, {} as { [key: string]: any });
  };

  const getExcelDataBySheet = (sheetName: string, rowIndex: number, columnName: string) => {
    const sheetData = getExcelData(sheetName);
    if (sheetData[rowIndex] && sheetData[rowIndex][columnName] !== undefined) {
      return sheetData[rowIndex][columnName];
    }
    return null;
  };

  const findExcelDataByValue = (sheetName: string, columnName: string, searchValue: any) => {
    const sheetData = getExcelData(sheetName);
    return sheetData.find(row => row[columnName] === searchValue);
  };
  // ฟังก์ชันดึงข้อมูล MDB Configuration จาก mapping (แทนการอ่าน Excel โดยตรง)
  const getMDBConfiguration = (transformerSize: number, mccbBrand: string) => {
    // ใช้ข้อมูลจาก mapping แทนการอ่าน Excel โดยตรง
    const key = `${mccbBrand}-${transformerSize}`;
    const mappingData = mdbConfigurationMapping[key];

    if (!mappingData) {
      console.warn(`ไม่พบข้อมูลใน mapping สำหรับ ${mccbBrand} ${transformerSize} kVA`);
      return null;
    }

    console.log(`MDB Configuration ${transformerSize} kVA (${mccbBrand}) จาก mapping key "${key}":`, mappingData);

    return mappingData;
  };

  // ฟังก์ชันดึงข้อมูล MCCB Sub จาก Excel sheet "ราคา MCCB ของ CHARGER"
  const getMccbSubData = (mccbSubValue: string, brand: string) => {
    // Mapping สำหรับกรณีพิเศษ (ต้องเช็คก่อน)
    const specialCases: { [key: string]: number } = {
      '640 kW Prime+': 16,
      '4 x 300 A': 17,
      '4 x 350 A': 18,
      '4 x 400 A': 19,
    };

    // เช็คกรณีพิเศษก่อน
    const specialKey = Object.keys(specialCases).find(key =>
      mccbSubValue.includes(key)
    );

    // Mapping ระหว่างค่า A กับ row number
    const mccbValueToRow: { [key: number]: number } = {
      60: 3,
      80: 4,
      125: 5,
      150: 6,
      225: 7,
      300: 8,
      350: 9,
      450: 10,
      630: 11,
      900: 13,
      1200: 14,
    };

    // ดึงข้อมูลจาก Excel sheet "ราคา MCCB ของ CHARGER"
    const chargerMccbSheet = getExcelData('ราคา MCCB ของ CHARGER');
    if (!chargerMccbSheet || chargerMccbSheet.length === 0) {
      console.warn('ไม่พบข้อมูลใน Sheet "ราคา MCCB ของ CHARGER"');
      return null;
    }

    // ถ้าเป็นกรณีพิเศษ ให้ดึงข้อมูลจาก row นั้นโดยตรง
    if (specialKey) {
      const rowNum = specialCases[specialKey];
      const row = chargerMccbSheet.find((r: any) => r.__rowNum__ === rowNum);
      if (!row) {
        console.warn(`ไม่พบ row ${rowNum} ใน Sheet "ราคา MCCB ของ CHARGER"`);
        return null;
      }

      // ดึงข้อมูลตามแบรนด์
      let model, quantity, price;
      if (brand === 'ABB') {
        model = row.__EMPTY_3;
        quantity = row.__EMPTY_2;
        price = row.__EMPTY_4;
      } else if (brand === 'EATON') {
        model = row.__EMPTY_5;
        quantity = row.__EMPTY_2;
        price = row.__EMPTY_6;
      } else if (brand === 'LS') {
        model = row.__EMPTY_7;
        quantity = row.__EMPTY_2;
        price = row.__EMPTY_8;
      } else {
        return null;
      }

      return [{
        value: mccbSubValue,
        rowNum,
        model: model || '-',
        quantity: quantity || '-',
        price: price || '-',
      }];
    }

    // กรณีปกติ: แปลงค่า MCCB Sub (เช่น "100 125 160 A") เป็น array ของตัวเลข
    const values = mccbSubValue.replace(/ A$/, '').trim().split(/\s+/).map(v => parseInt(v)).filter(v => !isNaN(v));

    if (values.length === 0) return null;

    // ดึงข้อมูลสำหรับแต่ละค่า MCCB Sub
    const results = values.map((value) => {
      // หา row number
      const rowNum = mccbValueToRow[value];

      if (!rowNum) {
        console.warn(`ไม่พบ row mapping สำหรับ MCCB Sub ${value} A`);
        return null;
      }

      const row = chargerMccbSheet.find((r: any) => r.__rowNum__ === rowNum);
      if (!row) {
        console.warn(`ไม่พบ row ${rowNum} ใน Sheet "ราคา MCCB ของ CHARGER"`);
        return null;
      }

      // ดึงข้อมูลตามแบรนด์
      let model, quantity, price;
      if (brand === 'ABB') {
        model = row.__EMPTY_3;
        quantity = row.__EMPTY_2;
        price = row.__EMPTY_4;
      } else if (brand === 'EATON') {
        model = row.__EMPTY_5;
        quantity = row.__EMPTY_2;
        price = row.__EMPTY_6;
      } else if (brand === 'LS') {
        model = row.__EMPTY_7;
        quantity = row.__EMPTY_2;
        price = row.__EMPTY_8;
      } else {
        return null;
      }

      return {
        value: `${value} A`,
        rowNum,
        model: model || '-',
        quantity: quantity || '-',
        price: price || '-',
      };
    }).filter(item => item !== null);

    return results.length > 0 ? results : null;
  };

  // ฟังก์ชันดึงข้อมูล Transformer Price จาก mapping (แทนการอ่าน Excel โดยตรง)
  // ฟังก์ชันหาข้อมูลหลังคาคุมช่องจอดตามจำนวนช่องจอด
  const getParkingRoofData = (parkingSlots: number) => {
    let key = '';
    if (parkingSlots <= 2) key = 'parking-roof-1-2';
    else if (parkingSlots <= 4) key = 'parking-roof-3-4';
    else if (parkingSlots <= 6) key = 'parking-roof-5-6';
    else if (parkingSlots <= 8) key = 'parking-roof-7-8';
    else if (parkingSlots <= 10) key = 'parking-roof-9-10';
    else if (parkingSlots <= 12) key = 'parking-roof-11-12';

    return roofCostMapping[key] || null;
  };

  const getTransformerPrice = (transformerSize: number, transformerType: string) => {
    // ใช้ข้อมูลจาก mapping แทนการอ่าน Excel โดยตรง
    const key = `${transformerType}-${transformerSize}`;
    const mappingData = transformerPriceMapping[key];

    if (!mappingData) {
      console.warn(`ไม่พบข้อมูลใน mapping สำหรับ ${transformerType} ${transformerSize} kVA`);
      return null;
    }

    console.log(`Transformer ${transformerSize} kVA (${transformerType}): ${mappingData.price} จาก mapping key "${key}"`);

    return mappingData;
  };

  // เรียกใช้ฟังก์ชันเมื่อ component mount
  useEffect(() => {
    fetchExcelData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 relative">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold ">EV Station Calculator</h1>
          </div>
          <p className="text-lg ">
            Detailed configuration and additional features for electric vehicle charging stations
          </p>
        </div>

        <MoreDetailCard
          {...state}
          stationEquipmentPriceMapping={stationEquipmentPriceMapping}
          roofCostMapping={roofCostMapping}
          getParkingRoofData={getParkingRoofData}
          getTrToMdbPrice={getTrToMdbPrice}
          trToMdbMapping={trToMdbMapping}
          excelData={excelData}
          getExcelData={getExcelData}
          getExcelDataBySheet={getExcelDataBySheet}
          findExcelDataByValue={findExcelDataByValue}
          getTransformerPrice={getTransformerPrice}
          getMDBConfiguration={getMDBConfiguration}
        />
      </div>
    </div>
  )
}

export default StationAccessory