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
  const [form, setForm] = useState<CalculatorForm>({
    powerAuthority: 'PEA',
    charger: '50 kW',
    numberOfChargers: '1',
    trWiringType: 'ร้อยท่อเดินในอากาศ กลุ่ม 2',
    chargerWiringType: 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ'
  })

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
    '640 kW': {}, // ไม่มีใน excel
    '640 kW Prime+': { mea: 'C20', pea: 'C68' },
    '720 kW': { mea: 'C22', pea: 'C70' },
    '800 kW Prime+': { mea: 'C24', pea: 'C72' },
  };

  // ดึงค่าจาก Excel ตาม Power Authority และ Charger Type
  const getInFromExcel = (type: 'inOfCharger' | 'inAllCharger') => {
    const charger = form.charger;
    const numberOfChargers = parseInt(form.numberOfChargers) || 1;
    const cell = chargerToExcelCell[charger];
    if (!cell) return undefined;
    let value: number | undefined;
    if (form.powerAuthority === 'MEA' && cell.mea) {
      value = excelData.find((row: any) => row.__rowNum__?.toString() === cell.mea?.replace('C', ''))?.__EMPTY;
    }
    if (form.powerAuthority === 'PEA' && cell.pea) {
      value = excelData.find((row: any) => row.__rowNum__?.toString() === cell.pea?.replace('C', ''))?.__EMPTY;
    }
    if (typeof value !== 'number' || isNaN(value)) return undefined;
    if (type === 'inOfCharger') return value; // ไม่คูณจำนวนเครื่อง
    if (type === 'inAllCharger') return value * numberOfChargers;
    return undefined;
  };

  /** Calculate EV station requirements */
  const calculateResults = () => {
    const powerPerStation = extractPowerValue(form.charger)
    const numberOfChargers = parseInt(form.numberOfChargers) || 1

    // ใช้ค่าจาก Excel เท่านั้น
    const inOfChargerExcel = getInFromExcel('inOfCharger');
    const inAllChargerExcel = getInFromExcel('inAllCharger');

    const inOfCharger = typeof inOfChargerExcel === 'number'
      ? inOfChargerExcel
      : 0;

    const inAllCharger = typeof inAllChargerExcel === 'number'
      ? inAllChargerExcel
      : 0;

    const totalPower = numberOfChargers * powerPerStation
    const transformerSize = Math.ceil(totalPower * 1.2) // 20% safety margin

    setResults({
      totalPower,
      transformerSize,
      inOfCharger,
      inAllCharger
    })
  }

  /** Reset form to default values */
  const resetForm = () => {
    setForm({
      powerAuthority: 'PEA',
      charger: '50 kW',
      numberOfChargers: '1',
      trWiringType: 'ร้อยท่อเดินในอากาศ กลุ่ม 2',
      chargerWiringType: 'ขนาดสายไฟ 3P 4W ร้อยท่อ กลุ่ม 2 เดินในอากาศ'
    })
    setResults(null)
  }

  // Charger options
  const chargerOptions = [
    '30 kW', '40 kW', '50 kW', '60 kW', '80 kW', '120 kW', '160 kW', '200 kW',
    '240 kW', '320 kW', '480 kW', '600 kW', '640 kW', '600 kW Prime+',
    '640 kW Prime+', '800 kW Prime+'
  ]

  // Number of chargers options
  const numberOfChargersOptions = Array.from({ length: 10 }, (_, i) => (i + 1).toString())

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

  /** Fetch data from Excel file on Google Drive */
  const fetchExcelData = async () => {
    const excelFileUrl = 'https://docs.google.com/uc?export=download&id=1U_tFRt3pdQ0IzOr88l81RmJPxDQwFmoC'; // แก้ไขที่นี่ด้วย FILE ID ของไฟล์ที่คุณแชร์
    try {
      const response = await axios.get(excelFileUrl, { responseType: 'arraybuffer' });
      // Read the Excel file
      const workbook = XLSX.read(response.data, { type: 'array' });
      const sheetName = workbook.SheetNames[0]; // Access the first sheet
      const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      setExcelData(jsonData); // Store Excel data in state
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
                        onClick={() => handleInputChange('powerAuthority', 'PEA')}
                      >
                        <Checkbox
                          id="PEA"
                          checked={form.powerAuthority === 'PEA'}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              handleInputChange('powerAuthority', 'PEA');
                            }
                          }}
                          className="text-blue-600"
                        />
                        <Label htmlFor="PEA" className="font-medium cursor-pointer">PEA</Label>
                      </div>
                      <div
                        className="flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleInputChange('powerAuthority', 'MEA')}
                      >
                        <Checkbox
                          id="MEA"
                          checked={form.powerAuthority === 'MEA'}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              handleInputChange('powerAuthority', 'MEA');
                            }
                          }}
                          className="text-blue-600"
                        />
                        <Label htmlFor="MEA" className="font-medium cursor-pointer">MEA</Label>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Charger */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">
                      Charger Type
                    </Label>
                    <Select value={form.charger} onValueChange={(value) => handleInputChange('charger', value)}>
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

                  {/* Number of chargers */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">
                      Number of Chargers
                    </Label>
                    <Select value={form.numberOfChargers} onValueChange={(value) => handleInputChange('numberOfChargers', value)}>
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

                  <Separator />

                  {/* Choose TR Wiring Type */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">
                      TR Wiring Type
                    </Label>
                    <Select value={form.trWiringType} onValueChange={(value) => handleInputChange('trWiringType', value)}>
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

                  {/* Choose Charger Wiring Type */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">
                      Charger Wiring Type
                    </Label>
                    <Select value={form.chargerWiringType} onValueChange={(value) => handleInputChange('chargerWiringType', value)}>
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
                        <span className="font-semibold text-gray-900">{results.inOfCharger.toFixed(1)} A</span>
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
                        <span className="font-semibold text-gray-900">{results.inAllCharger.toFixed(1)} A</span>
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
                        <span className="font-semibold text-gray-900">{results.transformerSize} kVA</span>
                      </div>

                      {/* TR Wiring Type */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-pink-600 rounded-full"></div>
                          <span className="font-medium text-gray-700">TR Wiring Type:</span>
                        </div>
                        <span className="font-semibold text-gray-900 text-sm">{form.trWiringType}</span>
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