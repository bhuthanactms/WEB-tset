import React, { useEffect, useState } from 'react'
import { Zap, Car, Paintbrush, Shield, Home, Wrench, MapPin } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
// Add xlsx import
import * as XLSX from 'xlsx'

function MoreDetailCard(props: any) {
  const [trDistance, setTrDistance] = useState(props.trDistance || '');
  const [trWiringGroup2, setTrWiringGroup2] = useState(props.trWiringGroup2 || '');

  // Per-line states for MDB -> Charger distances and group-2 conduit selections
  const chargersCount = Math.max(1, parseInt(props.numberOfChargers || '1'));
  const initialDistances = Array(chargersCount).fill('').map((_, i) => (props.chargerDistances?.[i] ?? ''));
  const [chargerLineDistances, setChargerLineDistances] = useState<string[]>(initialDistances);
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
  const [chargerRoofType, setChargerRoofType] = useState(props.chargerRoofType || '');
  const [travelDistance, setTravelDistance] = useState(props.travelDistance || '');
  const [trainingWork, setTrainingWork] = useState(props.trainingWork || 'no');
  const [travelCostResult, setTravelCostResult] = useState(props.travelCostResult || 0);
  const [transformerSelection, setTransformerSelection] = useState(props.transformerSelection || 'no');
  const [transformerType, setTransformerType] = useState(props.transformerType || '');
  const [mccbMainBrand, setMccbMainBrand] = useState(props.mccbMainBrand || '');
  const [trMdbSelection, setTrMdbSelection] = useState(props.trMdbSelection || 'no');
  const [mdbSelection, setMdbSelection] = useState(props.mdbSelection || 'no');
  const [chargerSelection, setChargerSelection] = useState(props.chargerSelection || 'no');
  const [additionalSelection, setAdditionalSelection] = useState(props.additionalSelection || 'no');

  // ฟังก์ชันคำนวณค่าเดินทาง
  const calculateTravelCost = () => {
    const distance = parseFloat(travelDistance) || 0;
    const numberOfChargers = parseInt(props.numberOfChargers) || 1;

    // ตรวจสอบเงื่อนไข Extra
    const hasTransformer = transformerSelection === 'yes';
    const hasTrMdb = trMdbSelection === 'yes';
    const hasMdb = mdbSelection === 'yes';
    const hasCharger = chargerSelection === 'yes';

    // Extra1: 62.5 x ระยะ + ค่าแรง 5000+3000 + ค่าที่พัก
    if (!hasTransformer && !hasTrMdb && !hasMdb) {
      const extra1Cost = (62.5 * distance) + 5000 + 3000;
      setTravelCostResult(extra1Cost);
      return extra1Cost;
    }

    // Extra2: งานติดตั้งเครื่องชาร์จอย่างเดียว
    if (!hasTransformer && !hasTrMdb && !hasMdb && !hasCharger) {
      const extra2Cost = (distance * 40) + 5000 + 3000;
      setTravelCostResult(extra2Cost);
      return extra2Cost;
    }

    // คำนวณตามจำนวน Charger และระยะทาง
    let cost = 0;

    if (numberOfChargers === 1) {
      if (distance <= 80) {
        cost = distance * 425;
      } else {
        cost = (distance * 156) + 3600 + 18000;
      }
    } else if (numberOfChargers === 2) {
      if (distance <= 88) {
        cost = distance * 715;
      } else {
        cost = (distance * 176) + 7200 + 40000;
      }
    } else if (numberOfChargers === 3) {
      if (distance <= 78) {
        cost = distance * 1075;
      } else {
        cost = (distance * 191) + 9000 + 60000;
      }
    } else if (numberOfChargers === 4) {
      if (distance <= 101) {
        cost = distance * 1290;
      } else {
        cost = (distance * 191) + 12000 + 100000;
      }
    } else if (numberOfChargers === 5) {
      if (distance <= 102) {
        cost = distance * 1565;
      } else {
        cost = (distance * 191) + 15000 + 125000;
      }
    } else if (numberOfChargers === 6) {
      if (distance <= 102) {
        cost = distance * 1840;
      } else {
        cost = (distance * 191) + 18000 + 150000;
      }
    }

    // บวกเพิ่มงานฝึกอบรม (1วัน) ถ้าเลือก
    if (trainingWork === 'yes') {
      const trainingCost = (distance * 15) + 2600 + 1000;
      cost += trainingCost;
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
              <span className="font-medium text-gray-700">Power Authority:</span>
              <span className="font-semibold text-gray-900">{props.powerAuthority}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-700">Number of Chargers:</span>
              <span className="font-semibold text-gray-900">{props.numberOfChargers} <span className="text-sm text-gray-600">Units</span></span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-700">Transformer Size:</span>
              <span className="font-semibold text-gray-900">{props.transformer} <span className="text-sm text-gray-600">kVA</span></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transformer Size Card */}
      <Card className="shadow-xl border-0 overflow-hidden mb-6">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b">
          <CardTitle className="flex items-center justify-between text-orange-800">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Transformer Size <span className="text-xs text-gray-400">(ขนาดหม้อแปลง)</span>
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
                  className="text-gray-500 border-gray-400 data-[state=checked]:bg-gray-500"
                />
                <Label htmlFor="transformer-no" className="font-medium cursor-pointer text-gray-700 text-sm">ไม่มี</Label>
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
                    <span className="font-medium text-gray-700">Transformer Size:</span>
                    <span className="font-semibold text-gray-900">{props.transformer} <span className="text-sm text-gray-600">kVA</span></span>
                  </div>
                </div>

                {/* แสดงตัวเลือก Transformer Type */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">
                    ประเภทหม้อแปลง <span className="text-xs text-gray-400">(Transformer Type)</span>
                  </Label>
                  <div className="grid grid-cols-1 gap-3">
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
                  </div>

                  {/* แสดงประเภทที่เลือก */}
                  {transformerType && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">ประเภทที่เลือก:</span> {transformerType === '22kv-416v' ? 'หม้อแปลง 22 (24) kV / 416 V' : 'หม้อแปลง 33 kV / 316 V'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* TR to MDB Configuration Card */}
      <Card className="shadow-xl border-0 overflow-hidden mb-6">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b">
          <CardTitle className="flex items-center justify-between text-gray-800">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              TR to MDB Configuration <span className="text-xs text-gray-400">(การตั้งค่า TR ไป MDB)</span>
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
                  className="text-gray-500 border-gray-400 data-[state=checked]:bg-gray-500"
                />
                <Label htmlFor="trMdb-no" className="font-medium cursor-pointer text-gray-700 text-sm">ไม่มี</Label>
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
                  <span className="text-sm text-gray-600">ประเภท:</span>
                  <span className="font-semibold text-gray-900">{props.trWiringType}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">ขนาดสาย (CV/THW):</span>
                  <span className="font-semibold text-gray-900">{props.trWiringSize}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">ท่อ:</span>
                  <span className="font-semibold text-gray-900">{props.trWireConduit}</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Label htmlFor="trDistance" className="text-gray-700 font-medium min-w-[100px]">ระยะ (เมตร):</Label>
                  <Input
                    id="trDistance"
                    type="number"
                    className="w-32"
                    value={trDistance}
                    onChange={(e) => setTrDistance(e.target.value)}
                  />
                </div>
                {props.trWiringType === 'ร้อยท่อเดินในอากาศ กลุ่ม 2' && (
                  <div className="flex items-center gap-3">
                    <Label htmlFor="trWiringGroup2" className="text-gray-700 font-medium min-w-[100px]">เลือกท่อ:</Label>
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
              MDB Configuration <span className="text-xs text-gray-400">(การตั้งค่า MDB)</span>
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
                  className="text-gray-500 border-gray-400 data-[state=checked]:bg-gray-500"
                />
                <Label htmlFor="mdb-no" className="font-medium cursor-pointer text-gray-700 text-sm">ไม่มี</Label>
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
                    <span className="text-sm text-gray-600 min-w-[160px]">MCCB Main</span>
                    <span className="font-semibold text-gray-900">
                      {props.mdbMainAt || '-'}
                      {props.mdbMainAf ? <span className="mx-2">/</span> : null}
                      {props.mdbMainAf || ''}
                    </span>
                  </div>
                  {Array.isArray(props.mdbSubs) && props.mdbSubs.map((val: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 min-w-[160px]">MCCB Sub C{idx + 1}</span>
                      <span className="font-semibold text-gray-900">{val}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 min-w-[160px]">MCCB for Lighting</span>
                    <span className="font-semibold text-gray-900">{props.mdbLighting || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 min-w-[160px]">MCCB for Commu</span>
                    <span className="font-semibold text-gray-900">{props.mdbCommu || '-'}</span>
                  </div>
                </div>
              </div>

              {/* แสดงตัวเลือกยี่ห้อ MCCB Main */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">
                  ยี่ห้อ MCCB Main <span className="text-xs text-gray-400">(MCCB Main Brand)</span>
                </Label>
                <div className="grid grid-cols-1 gap-3">
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

                {/* แสดงยี่ห้อที่เลือก */}
                {mccbMainBrand && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">ยี่ห้อที่เลือก:</span> {mccbMainBrand}
                    </div>
                  </div>
                )}
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
              MDB to Charger Configuration <span className="text-xs text-gray-400">(การตั้งค่า MDB ไป Charger)</span>
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
                  className="text-gray-500 border-gray-400 data-[state=checked]:bg-gray-500"
                />
                <Label htmlFor="charger-no" className="font-medium cursor-pointer text-gray-700 text-sm">ไม่มี</Label>
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
                            <span className="text-sm text-gray-600">ประเภท:</span>
                            <span className="font-semibold text-gray-900">{props.chargerWiringType}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">ขนาดสาย (CV/THW):</span>
                            <span className="font-semibold text-gray-900">{cable}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">ท่อ:</span>
                            <span className="font-semibold text-gray-900">{conduits[idx] ?? conduits[conduits.length - 1] ?? ''}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-4">
                          <div className="flex items-center gap-3">
                            <Label htmlFor={`chargerDistance_${idx}`} className="text-gray-700 font-medium min-w-[100px]">ระยะ (เมตร):</Label>
                            <Input
                              id={`chargerDistance_${idx}`}
                              type="number"
                              className="w-32"
                              value={distance}
                              onChange={(e) => setDistanceAt(e.target.value)}
                            />
                          </div>
                          {isGroup2Air && (
                            <div className="flex items-center gap-3">
                              <Label className="text-gray-700 font-medium min-w-[100px]">เลือกท่อ:</Label>
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
                          <span className="text-sm text-gray-600">ประเภท:</span>
                          <span className="font-semibold text-gray-900">{props.chargerWiringType}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">ขนาดสาย (CV/THW):</span>
                          <span className="font-semibold text-gray-900">{cable} <span className="text-gray-500 text-xs">({idxs.length} Units)</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">ท่อ:</span>
                          <span className="font-semibold text-gray-900">{conduitDisplay || '-'}</span>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-3">
                          <Label className="text-gray-700 font-medium min-w-[100px]">ระยะ (เมตร):</Label>
                          <Input
                            type="number"
                            className="w-32"
                            value={groupDistance}
                            onChange={(e) => setGroupDistance(e.target.value)}
                          />
                        </div>
                        {isGroup2Air && (
                          <div className="flex items-center gap-3">
                            <Label className="text-gray-700 font-medium min-w-[100px]">เลือกท่อ:</Label>
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Features Card */}
      <Card className="shadow-xl border-0 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
          <CardTitle className="flex items-center justify-between text-purple-800">
            <div className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Additional Features & Options <span className="text-xs text-gray-400">(ฟีเจอร์และตัวเลือกเพิ่มเติม)</span>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center space-x-2 px-3 py-1 rounded-lg border border-gray-200 hover:bg-purple-50 cursor-pointer ${additionalSelection === 'yes' ? 'bg-purple-100 border-purple-300' : ''}`}
                onClick={() => setAdditionalSelection('yes')}
              >
                <Checkbox
                  id="additional-yes"
                  checked={additionalSelection === 'yes'}
                  onCheckedChange={(checked) => {
                    if (checked) setAdditionalSelection('yes');
                  }}
                  className="text-purple-500 border-purple-400 data-[state=checked]:bg-purple-500"
                />
                <Label htmlFor="additional-yes" className="font-medium cursor-pointer text-purple-700 text-sm">มี</Label>
              </div>
              <div
                className={`flex items-center space-x-2 px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer ${additionalSelection === 'no' ? 'bg-gray-100 border-gray-300' : ''}`}
                onClick={() => setAdditionalSelection('no')}
              >
                <Checkbox
                  id="additional-no"
                  checked={additionalSelection === 'no'}
                  onCheckedChange={(checked) => {
                    if (checked) setAdditionalSelection('no');
                  }}
                  className="text-gray-500 border-gray-400 data-[state=checked]:bg-gray-500"
                />
                <Label htmlFor="additional-no" className="font-medium cursor-pointer text-gray-700 text-sm">ไม่มี</Label>
              </div>
            </div>
          </CardTitle>
          <CardDescription className="text-purple-600">
            Parking, painting, roofing, and travel options
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">

          {/* แสดงเนื้อหาเมื่อเลือก "มี" */}
          {additionalSelection === 'yes' && (
            <div className="space-y-6">
              {/* Parking and Painting Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. จำนวนช่องจอด */}
                <div className="space-y-3">
                  <Label htmlFor="parkingSlots" className="text-gray-700 font-medium flex items-center gap-2">
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
                  <span className="text-sm text-gray-600">ช่องจอด</span>
                </div>

                {/* 2. ทาสีพื้น */}
                <div className="space-y-3">
                  <Label htmlFor="floorPainting" className="text-gray-700 font-medium flex items-center gap-2">
                    <Paintbrush className="h-4 w-4" />
                    ทาสีพื้น:
                  </Label>
                  <Select value={floorPainting} onValueChange={setFloorPainting}>
                    <SelectTrigger className="w-80">
                      <SelectValue placeholder="เลือกแบบทาสี" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-grind-no-polish">ทาสีพื้นช่องจอดรถ แบบไม่ขัด ไม่โป้ว</SelectItem>
                      <SelectItem value="grind-no-polish">ทาสีพื้นช่องจอดรถ แบบขัด แต่ไม่โป้ว</SelectItem>
                      <SelectItem value="grind-and-polish">ทาสีพื้นช่องจอดรถ แบบขัด และโป้วให้เรียบ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Fire Extinguisher */}
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="font-medium text-gray-700 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  ถังดับเพลิง:
                </span>
                <span className="font-semibold text-gray-900">{props.numberOfChargers} <span className="text-sm text-gray-600">เครื่อง</span></span>
              </div>

              <Separator />

              {/* Roof Cover Section */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  หลังคาคุมช่องจอด <span className="text-xs text-gray-400">(Roof Cover for Parking)</span>
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className={`flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-orange-50 cursor-pointer ${roofCoverType === 'width-length' ? 'bg-orange-100 border-orange-300' : ''}`}
                    onClick={() => setRoofCoverType('width-length')}
                  >
                    <Checkbox
                      id="width-length"
                      checked={roofCoverType === 'width-length'}
                      onCheckedChange={(checked) => {
                        if (checked) setRoofCoverType('width-length');
                      }}
                      className="text-orange-500 border-orange-400 data-[state=checked]:bg-orange-500"
                    />
                    <Label htmlFor="width-length" className="font-medium cursor-pointer text-orange-700">กว้าง x ยาว</Label>
                  </div>
                  <div
                    className={`flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-violet-50 cursor-pointer ${roofCoverType === 'm2' ? 'bg-violet-100 border-violet-300' : ''}`}
                    onClick={() => setRoofCoverType('m2')}
                  >
                    <Checkbox
                      id="m2"
                      checked={roofCoverType === 'm2'}
                      onCheckedChange={(checked) => {
                        if (checked) setRoofCoverType('m2');
                      }}
                      className="text-violet-500 border-violet-400 data-[state=checked]:bg-violet-500"
                    />
                    <Label htmlFor="m2" className="font-medium cursor-pointer text-violet-700">ตารางเมตร</Label>
                  </div>
                </div>

                {roofCoverType === 'width-length' && (
                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                    <Input
                      type="number"
                      placeholder="กว้าง"
                      className="w-24"
                      value={roofCoverWidth}
                      onChange={(e) => setRoofCoverWidth(e.target.value)}
                    />
                    <span>x</span>
                    <Input
                      type="number"
                      placeholder="ยาว"
                      className="w-24"
                      value={roofCoverLength}
                      onChange={(e) => setRoofCoverLength(e.target.value)}
                    />
                    <span className="text-sm text-gray-600">เมตร</span>
                    {roofCoverWidth && roofCoverLength && (
                      <span className="ml-4 font-semibold text-orange-600">
                        = {parseFloat(roofCoverWidth) * parseFloat(roofCoverLength)} ตร.ม.
                      </span>
                    )}
                  </div>
                )}

                {roofCoverType === 'm2' && (
                  <div className="flex items-center gap-3 p-3 bg-violet-50 rounded-lg">
                    <Input
                      type="number"
                      placeholder="ตารางเมตร"
                      className="w-32"
                      value={roofCoverM2}
                      onChange={(e) => setRoofCoverM2(e.target.value)}
                    />
                    <span className="text-sm text-gray-600">ตารางเมตร</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* หลังคาเฉพาะ MDB */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">
                  หลังคาเฉพาะ MDB <span className="text-xs text-gray-400">(Roof for MDB only)</span>
                </Label>
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
                      className="text-gray-500 border-gray-400 data-[state=checked]:bg-gray-500"
                    />
                    <Label htmlFor="mdbRoof-no" className="font-medium cursor-pointer text-gray-700">ไม่มี</Label>
                  </div>
                </div>

                {/* MDB Roof Details - แสดงเมื่อเลือก "มี" */}
                {mdbRoof === 'yes' && (
                  <div className="space-y-3 mt-4 p-4 bg-blue-50 rounded-lg">
                    <Label className="text-sm font-medium text-gray-700">
                      รายละเอียดหลังคาเฉพาะ MDB <span className="text-xs text-gray-400">(MDB Roof Details)</span>
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        className={`flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-orange-50 cursor-pointer ${mdbRoofType === 'width-length' ? 'bg-orange-100 border-orange-300' : ''}`}
                        onClick={() => setMdbRoofType('width-length')}
                      >
                        <Checkbox
                          id="mdbRoof-width-length"
                          checked={mdbRoofType === 'width-length'}
                          onCheckedChange={(checked) => {
                            if (checked) setMdbRoofType('width-length');
                          }}
                          className="text-orange-500 border-orange-400 data-[state=checked]:bg-orange-500"
                        />
                        <Label htmlFor="mdbRoof-width-length" className="font-medium cursor-pointer text-orange-700">กว้าง x ยาว</Label>
                      </div>
                      <div
                        className={`flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-violet-50 cursor-pointer ${mdbRoofType === 'm2' ? 'bg-violet-100 border-violet-300' : ''}`}
                        onClick={() => setMdbRoofType('m2')}
                      >
                        <Checkbox
                          id="mdbRoof-m2"
                          checked={mdbRoofType === 'm2'}
                          onCheckedChange={(checked) => {
                            if (checked) setMdbRoofType('m2');
                          }}
                          className="text-violet-500 border-violet-400 data-[state=checked]:bg-violet-500"
                        />
                        <Label htmlFor="mdbRoof-m2" className="font-medium cursor-pointer text-violet-700">ตารางเมตร</Label>
                      </div>
                    </div>

                    {/* Input fields */}
                    {mdbRoofType === 'width-length' && (
                      <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                        <Input
                          type="number"
                          placeholder="กว้าง"
                          className="w-24"
                          value={mdbRoofWidth}
                          onChange={(e) => setMdbRoofWidth(e.target.value)}
                        />
                        <span>x</span>
                        <Input
                          type="number"
                          placeholder="ยาว"
                          className="w-24"
                          value={mdbRoofLength}
                          onChange={(e) => setMdbRoofLength(e.target.value)}
                        />
                        <span className="text-sm text-gray-600">เมตร</span>
                        {mdbRoofWidth && mdbRoofLength && (
                          <span className="ml-4 font-semibold text-orange-600">
                            = {parseFloat(mdbRoofWidth) * parseFloat(mdbRoofLength)} ตร.ม.
                          </span>
                        )}
                      </div>
                    )}

                    {mdbRoofType === 'm2' && (
                      <div className="flex items-center gap-3 p-3 bg-violet-50 rounded-lg">
                        <Input
                          type="number"
                          placeholder="ตารางเมตร"
                          className="w-32"
                          value={mdbRoofM2}
                          onChange={(e) => setMdbRoofM2(e.target.value)}
                        />
                        <span className="text-sm text-gray-600">ตารางเมตร</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* หลังคาเครื่องชาร์จ */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">
                  หลังคาเครื่องชาร์จ <span className="text-xs text-gray-400">(Charger Roof Type)</span>
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className={`flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-green-50 cursor-pointer ${chargerRoofType === 'composite' ? 'bg-green-100 border-green-300' : ''}`}
                    onClick={() => setChargerRoofType('composite')}
                  >
                    <Checkbox
                      id="composite"
                      checked={chargerRoofType === 'composite'}
                      onCheckedChange={(checked) => {
                        if (checked) setChargerRoofType('composite');
                      }}
                      className="text-green-500 border-green-400 data-[state=checked]:bg-green-500"
                    />
                    <Label htmlFor="composite" className="font-medium cursor-pointer text-green-700">Composite</Label>
                  </div>
                  <div
                    className={`flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer ${chargerRoofType === 'normal' ? 'bg-gray-100 border-gray-300' : ''}`}
                    onClick={() => setChargerRoofType('normal')}
                  >
                    <Checkbox
                      id="normal"
                      checked={chargerRoofType === 'normal'}
                      onCheckedChange={(checked) => {
                        if (checked) setChargerRoofType('normal');
                      }}
                      className="text-gray-500 border-gray-400 data-[state=checked]:bg-gray-500"
                    />
                    <Label htmlFor="normal" className="font-medium cursor-pointer text-gray-700">ธรรมดา</Label>
                  </div>
                </div>
              </div>

              <Separator />

              {/* ค่าเดินทาง */}
              <div className="space-y-4">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  ค่าเดินทาง <span className="text-xs text-gray-400">(Travel Cost)</span>
                </Label>

                {/* ระยะทาง */}
                <div className="space-y-2">
                  <Label htmlFor="travelDistance" className="text-sm font-medium text-gray-700">
                    ระยะทาง (กิโลเมตร)
                  </Label>
                  <Input
                    id="travelDistance"
                    type="number"
                    placeholder="กรอกระยะทาง"
                    value={travelDistance}
                    onChange={(e) => setTravelDistance(e.target.value)}
                    className="w-32"
                  />
                </div>

                {/* งานฝึกอบรม */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">
                    งานฝึกอบรม <span className="text-xs text-gray-400">(Training Work)</span>
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
                        className="text-gray-500 border-gray-400 data-[state=checked]:bg-gray-500"
                      />
                      <Label htmlFor="training-no" className="font-medium cursor-pointer text-gray-700">ไม่มีงานฝึกอบรม</Label>
                    </div>
                  </div>
                </div>

                {/* แสดงผลการคำนวณ */}
                {travelDistance && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">ค่าเดินทาง:</span>
                      <span className="font-bold text-blue-600 text-lg">
                        {travelCostResult.toLocaleString('th-TH')} บาท
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      ระยะทาง: {travelDistance} กม. | จำนวน Charger: {props.numberOfChargers} Unit
                      {trainingWork === 'yes' && (
                        <span className="text-green-600 font-medium"> | + งานฝึกอบรม (1วัน)</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StationAccessory() {
  const { state } = useLocation()
  // state จะมีค่าที่ส่งมาจาก Home

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
          <p className="text-lg text-gray-600">
            Detailed configuration and additional features for electric vehicle charging stations
          </p>
        </div>

        <MoreDetailCard {...state} />
      </div>
    </div>
  )
}

export default StationAccessory

