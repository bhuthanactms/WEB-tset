/**
 * Home page - EV Station Calculator
 * Provides a comprehensive calculator for electric vehicle station requirements
 * including power authority selection, transformer sizing, and cost analysis.
 */

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
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
    '30 kW': { mea: 'C7', pea: 'C55' },
    '40 kW': { mea: 'C8', pea: 'C56' },
    '60 kW': { mea: 'C9', pea: 'C57' },
    '80 kW': { mea: 'C10', pea: 'C58' },
    '120 kW': { mea: 'C11', pea: 'C59' },
    '160 kW': { mea: 'C12', pea: 'C60' },
    '200 kW': { mea: 'C13', pea: 'C61' },
    '240 kW': { mea: 'C14', pea: 'C62' },
    '320 kW': { mea: 'C15', pea: 'C63' },
    '360 kW': { mea: 'C16', pea: 'C64' },
    '480 kW': { mea: 'C17', pea: 'C65' },
    '600 kW': { mea: 'C18', pea: 'C66' },
    '600 kW Prime+': { mea: 'C19', pea: 'C67' },
    '640 kW Prime+': { mea: 'C20', pea: 'C68' },
    '720 kW Prime+': { mea: 'C22', pea: 'C70' },
    '800 kW Prime+': { mea: 'C24', pea: 'C72' },
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
      totalPower = multiChargers.reduce((sum, chargerName) => {
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

  // ฟังก์ชันเปลี่ยนค่าแต่ละ Charger
  const handleMultiChargerChange = (idx: number, value: string) => {
    setMultiChargers(prev => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  // ฟังก์ชันดึงค่า In ของแต่ละเครื่อง (ใช้กับ Any type kW)
  const getMultiChargersIn = () => {
    return multiChargers.map((chargerName) => {
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
      return { name: chargerName, in: typeof value === 'number' ? value : 0 };
    });
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
          {/* Input Form */}
          <div>
            <Card className="shadow-xl border-0 overflow-hidden">
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
                      Power Authority
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        className="flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                        onClick={() => setForm(f => ({ ...f, powerAuthority: 'PEA' }))}
                      >
                        <Checkbox
                          id="PEA"
                          checked={form.powerAuthority === 'PEA'}
                          onCheckedChange={(checked) => {
                            if (checked) setForm(f => ({ ...f, powerAuthority: 'PEA' }));
                          }}
                          className="text-blue-600"
                        />
                        <Label htmlFor="PEA" className="font-medium cursor-pointer">PEA</Label>
                      </div>
                      <div
                        className="flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                        onClick={() => setForm(f => ({ ...f, powerAuthority: 'MEA' }))}
                      >
                        <Checkbox
                          id="MEA"
                          checked={form.powerAuthority === 'MEA'}
                          onCheckedChange={(checked) => {
                            if (checked) setForm(f => ({ ...f, powerAuthority: 'MEA' }));
                          }}
                          className="text-blue-600"
                        />
                        <Label htmlFor="MEA" className="font-medium cursor-pointer">MEA</Label>
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
                        <Label htmlFor="same" className="font-medium cursor-pointer">Same kW</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="any"
                          checked={chargerTypeMode === 'any'}
                          onCheckedChange={() => setChargerTypeMode('any')}
                        />
                        <Label htmlFor="any" className="font-medium cursor-pointer">Any type kW</Label>
                      </div>
                    </div>
                  </div>

                  {/* Number of chargers */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">
                      Number of Chargers
                    </Label>
                    <Select value={form.numberOfChargers} onValueChange={(value) => setForm(f => ({ ...f, numberOfChargers: value }))}>
                      <SelectTrigger className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Select number of chargers" />
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
                              <SelectValue placeholder={`Select Charger${idx + 1} type`} />
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
                        Charger Type Selection
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
                      TR Wiring Type
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
                      Charger Wiring Type
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

          {/* Results */}
          <div>
            {results ? (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-5 w-5 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">Total Power</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-900">
                        {results.totalPower} kW
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Battery className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium text-green-800">Transformer Size</span>
                      </div>
                      <div className="text-2xl font-bold text-green-900">
                        {results.transformerSize} kVA
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Results */}
                <Card className="shadow-lg border-0">
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b">
                    <CardTitle className="flex items-center gap-2 text-gray-800">
                      <Cable className="h-5 w-5 text-blue-600" />
                      Calculation Summary
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Detailed electrical calculations and specifications
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Power Authority */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          <span className="font-medium text-gray-700">Power Authority:</span>
                        </div>
                        <span className="font-semibold text-gray-900">{form.powerAuthority}</span>
                      </div>

                      {/* Charger */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                          <span className="font-medium text-gray-700">Charger:</span>
                        </div>
                        <span className="font-semibold text-gray-900">{form.charger}</span>
                      </div>

                      {/* In of charger */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                          <span className="font-medium text-gray-700">In of charger:</span>
                        </div>
                        {chargerTypeMode === 'any' ? (
                          <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded-lg">
                            {getMultiChargersIn().map((item, idx) => (
                              <span key={idx} className="ml-6 text-gray-900">
                                Charger{idx + 1} ({item.name}): {item.in.toFixed(1)} A
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="font-semibold text-gray-900">{results?.inOfCharger.toFixed(1)} A</span>
                        )}
                      </div>

                      {/* Number of Chargers */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                          <span className="font-medium text-gray-700">Number of Chargers:</span>
                        </div>
                        <span className="font-semibold text-gray-900">{form.numberOfChargers}</span>
                      </div>

                      {/* In all Charger */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                          <span className="font-medium text-gray-700">In all Charger:</span>
                        </div>
                        {chargerTypeMode === 'any' ? (
                          <span className="font-semibold text-gray-900">
                            {getMultiChargersIn().reduce((sum, item) => sum + item.in, 0).toFixed(1)} A
                          </span>
                        ) : (
                          <span className="font-semibold text-gray-900">{results?.inAllCharger.toFixed(1)} A</span>
                        )}
                      </div>

                      {/* Charger Wiring Type */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-cyan-600 rounded-full"></div>
                          <span className="font-medium text-gray-700">Charger Wiring Type:</span>
                        </div>
                        <span className="font-semibold text-gray-900 text-sm">{form.chargerWiringType}</span>
                      </div>

                      {/* Transformer */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                          <span className="font-medium text-gray-700">Transformer:</span>
                        </div>
                        <span className="font-semibold text-gray-900">
                          {getTRSizeFromExcel(
                            chargerTypeMode === 'any'
                              ? getMultiChargersIn().reduce((sum, item) => sum + item.in, 0)
                              : results?.inAllCharger || 0
                          )}
                        </span>
                      </div>

                      {/* TR Wiring Type */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-pink-600 rounded-full"></div>
                          <span className="font-medium text-gray-700">TR Wiring Type:</span>
                        </div>
                        <span className="font-semibold text-gray-900 text-sm">{form.trWiringType}</span>
                      </div>

                      {/* Selected Charger */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                          <span className="font-medium text-gray-700">Selected Charger:</span>
                        </div>
                        <span className="font-semibold text-gray-900">
                          {chargerTypeMode === 'any'
                            ? multiChargers.filter(Boolean).join(', ')
                            : form.charger}
                        </span>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    {/* Recommendation */}
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-blue-600 text-white">Recommendation</Badge>
                      </div>
                      <p className="text-sm text-blue-800 leading-relaxed">
                        Based on your configuration, we recommend a {results.transformerSize} kVA transformer
                        with {form.powerAuthority} connection. The total power requirement is {results.totalPower} kW
                        with a maximum current of {results.inAllCharger.toFixed(1)} A.
                      </p>
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