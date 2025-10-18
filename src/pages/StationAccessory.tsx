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
// Add xlsx and axios imports
import * as XLSX from 'xlsx'
import axios from 'axios'

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
  const [transformerPrice, setTransformerPrice] = useState<any>(null);
  const [mccbMainBrand, setMccbMainBrand] = useState(props.mccbMainBrand || '');
  const [mdbConfiguration, setMdbConfiguration] = useState<any>(null);
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

                  {/* แสดงราคา Transformer */}
                  {transformerPrice && (
                    <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-blue-600 font-medium">
                            ราคาหม้อแปลง {transformerPrice.size} kVA
                          </div>
                          <div className="text-xs text-blue-500">
                            ประเภท: {transformerPrice.type === '22kv-416v' ? '22 (24) kV / 416 V' : '33 kV / 316 V'}
                          </div>
                          <div className="text-xs text-gray-500">
                            ข้อมูลจาก: column "{transformerPrice.column}" __rowNum__{transformerPrice.rowNum} (ราคาหม้อแปลง)
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-blue-700">
                            {transformerPrice.price ?
                              (typeof transformerPrice.price === 'number' ?
                                transformerPrice.price.toLocaleString('th-TH') :
                                transformerPrice.price
                              ) :
                              'ไม่พบข้อมูล'
                            }
                          </div>
                          <div className="text-xs text-gray-500">บาท</div>
                        </div>
                      </div>
                    </div>
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

                {/* แสดงข้อมูล MDB Configuration */}
                {mdbConfiguration && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="mb-3">
                      <h4 className="font-semibold text-blue-800 mb-2">
                        ข้อมูล MCCB สำหรับ {mdbConfiguration.transformerSize} kVA ({mdbConfiguration.mccbBrand})
                      </h4>
                      <div className="text-sm text-blue-600">
                        <p><span className="font-medium">Start Row:</span> __rowNum__ {mdbConfiguration.startRow}</p>
                        <p><span className="font-medium">Header:</span> {mdbConfiguration.header.name} | {mdbConfiguration.header.spec1} | {mdbConfiguration.header.spec2}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h5 className="font-medium text-blue-700">รายการสินค้า:</h5>
                      {mdbConfiguration.products.map((product: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500">Row {product.rowNum}</span>
                            <span className="font-medium">{product.name}</span>
                          </div>
                          <div className="text-sm text-blue-600 font-mono">
                            {product.productCode}
                          </div>
                        </div>
                      ))}
                    </div>
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

  // State สำหรับเก็บข้อมูล Excel
  const [excelData, setExcelData] = useState<{ [sheetName: string]: any[] }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        allSheetsData[sheetName] = jsonData;

        // Log ข้อมูลแต่ละ sheet
        console.log(`Sheet: ${sheetName}`, jsonData.slice(0, 3)); // แสดงแค่ 3 แถวแรก
      });

      setExcelData(allSheetsData);
      console.log('ข้อมูล Excel ทั้งหมด:', allSheetsData);

    } catch (error) {
      console.error("Error fetching Excel file:", error);
      setError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดึงข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันช่วยเหลือสำหรับการเข้าถึงข้อมูล Excel
  const getExcelData = (sheetName: string) => {
    return excelData[sheetName] || [];
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

  // ฟังก์ชันดึงข้อมูล MDB Configuration จาก Sheet "ตารางแสดงราคา MAIN MCCB ของ MDB"
  const getMDBConfiguration = (transformerSize: number, mccbBrand: string) => {
    const sheetData = getExcelData('ตารางแสดงราคา MAIN MCCB ของ MDB');
    if (!sheetData || sheetData.length === 0) {
      console.warn('ไม่พบข้อมูลใน Sheet "ตารางแสดงราคา MAIN MCCB ของ MDB"');
      return null;
    }

    // กำหนด column mapping ตาม transformer size
    let headerColumns: { name: string; spec1: string; spec2: string } = { name: '', spec1: '', spec2: '' };
    let productCodeColumn = '';

    switch (transformerSize) {
      case 100:
        headerColumns = { name: '__EMPTY_1', spec1: '__EMPTY_6', spec2: '__EMPTY_9' };
        productCodeColumn = '__EMPTY_8';
        break;
      case 160:
        headerColumns = { name: '__EMPTY_1', spec1: '__EMPTY_6', spec2: '__EMPTY_11' };
        productCodeColumn = '__EMPTY_10';
        break;
      case 250:
        headerColumns = { name: '__EMPTY_1', spec1: '__EMPTY_6', spec2: '__EMPTY_13' };
        productCodeColumn = '__EMPTY_12';
        break;
      case 315:
        headerColumns = { name: '__EMPTY_1', spec1: '__EMPTY_6', spec2: '__EMPTY_15' };
        productCodeColumn = '__EMPTY_14';
        break;
      case 400:
        headerColumns = { name: '__EMPTY_1', spec1: '__EMPTY_6', spec2: '__EMPTY_17' };
        productCodeColumn = '__EMPTY_16';
        break;
      case 500:
        headerColumns = { name: '__EMPTY_1', spec1: '__EMPTY_6', spec2: '__EMPTY_19' };
        productCodeColumn = '__EMPTY_18';
        break;
      case 630:
        headerColumns = { name: '__EMPTY_1', spec1: '__EMPTY_6', spec2: '__EMPTY_21' };
        productCodeColumn = '__EMPTY_20';
        break;
      case 800:
        headerColumns = { name: '__EMPTY_1', spec1: '__EMPTY_6', spec2: '__EMPTY_23' };
        productCodeColumn = '__EMPTY_22';
        break;
      case 1000:
        headerColumns = { name: '__EMPTY_1', spec1: '__EMPTY_6', spec2: '__EMPTY_25' };
        productCodeColumn = '__EMPTY_24';
        break;
      case 1200:
        headerColumns = { name: '__EMPTY_1', spec1: '__EMPTY_6', spec2: '__EMPTY_27' };
        productCodeColumn = '__EMPTY_26';
        break;
      default:
        console.warn(`ไม่รองรับขนาดหม้อแปลง ${transformerSize} kVA สำหรับ MDB Configuration`);
        return null;
    }

    // กำหนด start row ตามยี่ห้อ MCCB
    let startRow = 3; // ABB default
    if (mccbBrand === 'EATON') {
      startRow = 10;
    } else if (mccbBrand === 'LS') {
      startRow = 16;
    }

    // หา header row ตามยี่ห้อ
    const headerRow = sheetData.find(row => row.__rowNum__ === startRow);
    if (!headerRow) {
      console.warn(`ไม่พบ header row (__rowNum__: ${startRow}) สำหรับ ${mccbBrand}`);
      return null;
    }

    // หา product rows (startRow+1 ถึง startRow+5)
    const productRows = sheetData.filter(row =>
      row.__rowNum__ >= startRow + 1 && row.__rowNum__ <= startRow + 5
    );

    const result = {
      transformerSize,
      mccbBrand,
      startRow,
      header: {
        name: headerRow[headerColumns.name] || '',
        spec1: headerRow[headerColumns.spec1] || '',
        spec2: headerRow[headerColumns.spec2] || ''
      },
      products: productRows.map(row => ({
        rowNum: row.__rowNum__,
        name: row[headerColumns.name] || '',
        productCode: row[productCodeColumn] || ''
      }))
    };

    console.log(`MDB Configuration ${transformerSize} kVA (${mccbBrand}) - Start Row: ${startRow}:`, result);

    return result;
  };

  // ฟังก์ชันดึงข้อมูล Transformer Size จาก Sheet "ราคาหม้อแปลง"
  const getTransformerPrice = (transformerSize: number, transformerType: string) => {
    const sheetData = getExcelData('ราคาหม้อแปลง');
    if (!sheetData || sheetData.length === 0) {
      console.warn('ไม่พบข้อมูลใน Sheet "ราคาหม้อแปลง"');
      return null;
    }

    // แปลง transformer size เป็น string
    const sizeStr = `${transformerSize} kVA`;

    // หาแถวที่ตรงกับ transformer size โดยใช้ __rowNum__
    const sizeRow = sheetData.find(row => {
      // ตรวจสอบใน column ที่มีข้อมูลขนาดหม้อแปลง
      const rowValues = Object.values(row);
      return rowValues.some(value => String(value).includes(sizeStr));
    });

    if (!sizeRow) {
      console.warn(`ไม่พบข้อมูลสำหรับ ${sizeStr}`);
      return null;
    }

    // กำหนด column และ rowNum ตาม transformer type และ size
    let targetColumn = '';
    let expectedRowNum = 0;

    if (transformerType === '22kv-416v') {
      // หม้อแปลง 22 (24) kV / 416 V
      switch (transformerSize) {
        case 100: targetColumn = 'ตาราง_____ราคาหม้อแปลง'; expectedRowNum = 4; break;
        case 160: targetColumn = 'ตาราง_____ราคาหม้อแปลง'; expectedRowNum = 5; break;
        case 250: targetColumn = 'ตาราง_____ราคาหม้อแปลง'; expectedRowNum = 6; break;
        case 315: targetColumn = 'ตาราง_____ราคาหม้อแปลง'; expectedRowNum = 7; break;
        case 400: targetColumn = 'ตาราง_____ราคาหม้อแปลง'; expectedRowNum = 8; break;
        case 500: targetColumn = 'ตาราง_____ราคาหม้อแปลง'; expectedRowNum = 9; break;
        case 630: targetColumn = 'ตาราง_____ราคาหม้อแปลง'; expectedRowNum = 10; break;
        case 800: targetColumn = 'ตาราง_____ราคาหม้อแปลง'; expectedRowNum = 11; break;
        case 1000: targetColumn = 'ตาราง_____ราคาหม้อแปลง'; expectedRowNum = 12; break;
        case 1250: targetColumn = 'ตาราง_____ราคาหม้อแปลง'; expectedRowNum = 13; break;
        case 1500: targetColumn = 'ตาราง_____ราคาหม้อแปลง'; expectedRowNum = 14; break;
        case 2000: targetColumn = 'ตาราง_____ราคาหม้อแปลง'; expectedRowNum = 15; break;
        default:
          console.warn(`ไม่รองรับขนาดหม้อแปลง ${transformerSize} kVA สำหรับ 22kV/416V`);
          return null;
      }
    } else if (transformerType === '33kv-316v') {
      // หม้อแปลง 33 kV / 316 V
      switch (transformerSize) {
        case 100: targetColumn = '__EMPTY_5'; expectedRowNum = 4; break;
        case 160: targetColumn = '__EMPTY_5'; expectedRowNum = 5; break;
        case 250: targetColumn = '__EMPTY_5'; expectedRowNum = 6; break;
        case 315: targetColumn = '__EMPTY_5'; expectedRowNum = 7; break;
        case 400: targetColumn = '__EMPTY_5'; expectedRowNum = 8; break;
        case 500: targetColumn = '__EMPTY_5'; expectedRowNum = 9; break;
        case 630: targetColumn = '__EMPTY_5'; expectedRowNum = 10; break;
        case 800: targetColumn = '__EMPTY_5'; expectedRowNum = 11; break;
        case 1000: targetColumn = '__EMPTY_5'; expectedRowNum = 12; break;
        case 1250: targetColumn = '__EMPTY_5'; expectedRowNum = 13; break;
        case 1500: targetColumn = '__EMPTY_5'; expectedRowNum = 14; break;
        case 2000: targetColumn = '__EMPTY_5'; expectedRowNum = 15; break;
        default:
          console.warn(`ไม่รองรับขนาดหม้อแปลง ${transformerSize} kVA สำหรับ 33kV/316V`);
          return null;
      }
    } else {
      console.warn(`Transformer type ไม่ถูกต้อง: ${transformerType}`);
      return null;
    }

    // ตรวจสอบ __rowNum__ ว่าตรงกับที่คาดหวังหรือไม่
    if (sizeRow.__rowNum__ !== expectedRowNum) {
      console.warn(`__rowNum__ ไม่ตรงกับที่คาดหวัง: ได้ ${sizeRow.__rowNum__}, คาดหวัง ${expectedRowNum}`);
    }

    // ดึงค่าจาก column ที่กำหนด
    const cellValue = sizeRow[targetColumn];

    console.log(`Transformer ${sizeStr} (${transformerType}): ${cellValue} จาก column "${targetColumn}" __rowNum__${sizeRow.__rowNum__} ใน Sheet "ราคาหม้อแปลง"`);

    return {
      size: transformerSize,
      type: transformerType,
      price: cellValue,
      column: targetColumn,
      rowNum: sizeRow.__rowNum__,
      expectedRowNum: expectedRowNum,
      rowData: sizeRow
    };
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
            <h1 className="text-4xl font-bold text-gray-900">EV Station Calculator</h1>
          </div>
          <p className="text-lg text-gray-600">
            Detailed configuration and additional features for electric vehicle charging stations
          </p>
        </div>

        {/* Excel Data Status */}
        {loading && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-blue-700">กำลังโหลดข้อมูลจาก Google Sheets...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-red-700">❌ เกิดข้อผิดพลาด: {error}</span>
            </div>
            <button
              onClick={fetchExcelData}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              ลองใหม่
            </button>
          </div>
        )}

        {Object.keys(excelData).length > 0 && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-700">✅ โหลดข้อมูลสำเร็จ</span>
            </div>
            <div className="text-sm text-green-600">
              พบ {Object.keys(excelData).length} sheets: {Object.keys(excelData).join(', ')}
            </div>
          </div>
        )}

        {/* Excel Data Preview */}
        {Object.keys(excelData).length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                ข้อมูลจาก Google Sheets
              </CardTitle>
              <CardDescription>
                ข้อมูลที่โหลดมาจาก Google Sheets ทั้งหมด
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(excelData).map(([sheetName, data]) => (
                  <div key={sheetName} className="border rounded-lg p-4">
                    <h3 className="font-semibold text-lg mb-2 text-blue-600">
                      Sheet: {sheetName} ({data.length} แถว)
                    </h3>
                    {data.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              {Object.keys(data[0]).map((key, index) => (
                                <th key={index} className="text-left p-2 font-medium bg-gray-50">
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {data.slice(0, 5).map((row, rowIndex) => (
                              <tr key={rowIndex} className="border-b">
                                {Object.values(row).map((value, colIndex) => (
                                  <td key={colIndex} className="p-2">
                                    {String(value || '')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {data.length > 5 && (
                          <div className="text-sm text-gray-500 mt-2">
                            แสดง 5 แถวแรกจากทั้งหมด {data.length} แถว
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ข้อมูลเฉพาะ Sheet "ราคาหม้อแปลง" */}
        {excelData['ราคาหม้อแปลง'] && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                ข้อมูลราคาหม้อแปลง (ครบถ้วน)
              </CardTitle>
              <CardDescription>
                ข้อมูลทั้งหมดจาก Sheet "ราคาหม้อแปลง" สำหรับการคำนวณราคา
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">โครงสร้างข้อมูล:</h4>
                  <div className="text-sm text-blue-700">
                    <p>• หม้อแปลง 22 (24) kV / 416 V → ใช้ column "ตาราง_____ราคาหม้อแปลง"</p>
                    <p>• หม้อแปลง 33 kV / 316 V → ใช้ column "__EMPTY_5"</p>
                    <p>• ข้อมูลแถว 4-15 (__rowNum__ 4-15) ตามขนาดหม้อแปลง</p>
                    <p>• MDB Configuration → ใช้ Sheet "ตารางแสดงราคา MAIN MCCB ของ MDB"</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 p-2 text-left font-medium">__rowNum__</th>
                        {Object.keys(excelData['ราคาหม้อแปลง'][0] || {}).map((key, index) => (
                          <th key={index} className="border border-gray-300 p-2 text-left font-medium">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {excelData['ราคาหม้อแปลง'].map((row, rowIndex) => (
                        <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-300 p-2 font-medium bg-yellow-50">
                            {row.__rowNum__ || rowIndex + 1}
                          </td>
                          {Object.entries(row).map(([key, value], colIndex) => (
                            <td key={colIndex} className={`border border-gray-300 p-2 ${key === 'ตาราง_____ราคาหม้อแปลง' ? 'bg-green-50 font-medium' :
                              key === '__EMPTY_10' ? 'bg-orange-50 font-medium' : ''
                              }`}>
                              {String(value || '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <h5 className="font-semibold text-green-800 mb-2">หม้อแปลง 22 (24) kV / 416 V</h5>
                    <div className="text-sm text-green-700 space-y-1">
                      <p>Column: "ตาราง_____ราคาหม้อแปลง"</p>
                      <p>แถว: __rowNum__ 4-15</p>
                      <p>ขนาด: 100-2000 kVA</p>
                    </div>
                  </div>

                  <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <h5 className="font-semibold text-orange-800 mb-2">หม้อแปลง 33 kV / 316 V</h5>
                    <div className="text-sm text-orange-700 space-y-1">
                      <p>Column: "__EMPTY_10"</p>
                      <p>แถว: __rowNum__ 4-15</p>
                      <p>ขนาด: 100-2000 kVA</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ข้อมูลเฉพาะ Sheet "ตารางแสดงราคา MAIN MCCB ของ MDB" */}
        {excelData['ตารางแสดงราคา MAIN MCCB ของ MDB'] && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                ข้อมูล MDB Configuration (ครบถ้วน)
              </CardTitle>
              <CardDescription>
                ข้อมูลทั้งหมดจาก Sheet "ตารางแสดงราคา MAIN MCCB ของ MDB" สำหรับการเลือก MCCB
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">โครงสร้างข้อมูล MDB:</h4>
                  <div className="text-sm text-green-700">
                    <p>• <span className="font-medium">ABB:</span> Header Row __rowNum__ 3, Product Rows 4-8</p>
                    <p>• <span className="font-medium">EATON:</span> Header Row __rowNum__ 10, Product Rows 11-15</p>
                    <p>• <span className="font-medium">LS:</span> Header Row __rowNum__ 16, Product Rows 17-21</p>
                    <p>• Column mapping ตามขนาดหม้อแปลง (100-1200 kVA)</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 p-2 text-left font-medium">__rowNum__</th>
                        {Object.keys(excelData['ตารางแสดงราคา MAIN MCCB ของ MDB'][0] || {}).map((key, index) => (
                          <th key={index} className="border border-gray-300 p-2 text-left font-medium">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {excelData['ตารางแสดงราคา MAIN MCCB ของ MDB'].map((row, rowIndex) => (
                        <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-300 p-2 font-medium bg-yellow-50">
                            {row.__rowNum__ || rowIndex + 1}
                          </td>
                          {Object.entries(row).map(([key, value], colIndex) => (
                            <td key={colIndex} className={`border border-gray-300 p-2 ${key === '__EMPTY_1' ? 'bg-green-50 font-medium' :
                              key.includes('__EMPTY_') ? 'bg-blue-50' : ''
                              }`}>
                              {String(value || '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <h5 className="font-semibold text-green-800 mb-2">ABB</h5>
                    <div className="text-sm text-green-700 space-y-1">
                      <p>Header: __rowNum__ 3</p>
                      <p>Products: __rowNum__ 4-8</p>
                      <p>Columns: __EMPTY_1, __EMPTY_6, __EMPTY_X</p>
                    </div>
                  </div>

                  <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <h5 className="font-semibold text-orange-800 mb-2">EATON</h5>
                    <div className="text-sm text-orange-700 space-y-1">
                      <p>Header: __rowNum__ 10</p>
                      <p>Products: __rowNum__ 11-15</p>
                      <p>Columns: __EMPTY_1, __EMPTY_6, __EMPTY_X</p>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h5 className="font-semibold text-blue-800 mb-2">LS</h5>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p>Header: __rowNum__ 16</p>
                      <p>Products: __rowNum__ 17-21</p>
                      <p>Columns: __EMPTY_1, __EMPTY_6, __EMPTY_X</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <MoreDetailCard
          {...state}
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

