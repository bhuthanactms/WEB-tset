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
  const { stationEquipmentPriceMapping, roofCostMapping, getParkingRoofData } = props;

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

  // New state variables for restructured Additional Features
  // Section 1: อุปกรณ์ประกอบสถานี
  const [bumperPoles, setBumperPoles] = useState(props.bumperPoles || 'no');
  const [wheelStops, setWheelStops] = useState(props.wheelStops || 'no');
  const [fireExtinguisherCabinet, setFireExtinguisherCabinet] = useState(props.fireExtinguisherCabinet || 'no');
  const [signage, setSignage] = useState(props.signage || 'no');

  // Section 2: ระบบสื่อสาร
  const [wifi4gHub, setWifi4gHub] = useState(props.wifi4gHub || 'no');
  const [cctv, setCctv] = useState(props.cctv || 'no');
  const [lighting, setLighting] = useState(props.lighting || 'no');
  const [accSystem, setAccSystem] = useState(props.accSystem || 'no');

  // Section 3: งานปูน
  const [mdbConcreteBase, setMdbConcreteBase] = useState(props.mdbConcreteBase || 'no');
  const [chargerConcreteBase, setChargerConcreteBase] = useState(props.chargerConcreteBase || 'no');
  const [parkingConcreteFloor, setParkingConcreteFloor] = useState(props.parkingConcreteFloor || 'no');
  const [generalConcreteFloor, setGeneralConcreteFloor] = useState(props.generalConcreteFloor || 'no');
  const [generalConcreteFloorArea, setGeneralConcreteFloorArea] = useState(props.generalConcreteFloorArea || '');

  // Section 4: งานทาสีช่องจอด
  const [parkingPaintType, setParkingPaintType] = useState(props.parkingPaintType || '');
  const [sideLineMarking, setSideLineMarking] = useState(props.sideLineMarking || 'no');
  const [centerPattern, setCenterPattern] = useState(props.centerPattern || '');



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



                {/* แสดงตัวเลือก Transformer Type */}

                <div className="space-y-3">

                  <Label className="text-sm font-medium ">

                    ประเภทหม้อแปลง <span className="text-xs ">(Transformer Type)</span>

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

                      <div className="text-sm ">

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

                          <div className="text-xs ">

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

                          <div className="text-xs ">บาท</div>

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

                    className="w-32"

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

                    <div className="text-sm ">

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

                            <span className="text-xs ">Row {product.rowNum}</span>

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

                              className="w-32"

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

                            className="w-32"

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

            </div>

          )}

        </CardContent>

      </Card>



      {/* Additional Features Card */}

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

              <div className="space-y-4">

                <h3 className="text-lg font-semibold flex items-center gap-2">

                  <Wrench className="h-5 w-5" />

                  1. อุปกรณ์ประกอบสถานี

                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* 1.1 เสากันชน */}

                  <div className="space-y-2">

                    <div className="flex items-center justify-between p-3 rounded-lg border">

                      <span className="font-medium">เสากันชน</span>

                      <span className="font-semibold">

                        {parseInt(parkingSlots) * 2} <span className="text-sm">ชิ้น</span>

                      </span>

                      {stationEquipmentPriceMapping['bumper-poles'] && (
                        <div className="text-xs mt-1 space-y-1">
                          <div><span className="font-medium">เลขสินค้า:</span> {stationEquipmentPriceMapping['bumper-poles'].productCode}</div>
                          <div><span className="font-medium">ราคาค่าของ:</span> {stationEquipmentPriceMapping['bumper-poles'].materialPrice.toLocaleString('th-TH')} บาท</div>
                          <div><span className="font-medium">ราคาค่าแรง:</span> {stationEquipmentPriceMapping['bumper-poles'].laborPrice.toLocaleString('th-TH')} บาท</div>
                          <div><span className="font-medium">ราคารวม:</span> {stationEquipmentPriceMapping['bumper-poles'].totalPrice.toLocaleString('th-TH')} บาท</div>
                        </div>
                      )}

                    </div>

                    <p className="text-xs">เงื่อนไข: ต้องใช้ 2 ชิ้นต่อ 1 ช่องจอด</p>

                  </div>

                  {/* 1.2 ยางกั้นล้อ (ปูน) */}

                  <div className="space-y-2">

                    <div className="flex items-center justify-between p-3 rounded-lg border">

                      <span className="font-medium">ยางกั้นล้อ (ปูน)</span>

                      <span className="font-semibold">

                        {parseInt(parkingSlots)} <span className="text-sm">ชิ้น</span>

                      </span>

                      {stationEquipmentPriceMapping['wheel-stops'] && (
                        <div className="text-xs mt-1 space-y-1">
                          <div><span className="font-medium">เลขสินค้า:</span> {stationEquipmentPriceMapping['wheel-stops'].productCode}</div>
                          <div><span className="font-medium">ราคาค่าของ:</span> {stationEquipmentPriceMapping['wheel-stops'].materialPrice.toLocaleString('th-TH')} บาท</div>
                          <div><span className="font-medium">ราคาค่าแรง:</span> {stationEquipmentPriceMapping['wheel-stops'].laborPrice.toLocaleString('th-TH')} บาท</div>
                          <div><span className="font-medium">ราคารวม:</span> {stationEquipmentPriceMapping['wheel-stops'].totalPrice.toLocaleString('th-TH')} บาท</div>
                        </div>
                      )}

                    </div>

                    <p className="text-xs">เงื่อนไข: ต้องใช้ 1 ชิ้นต่อ 1 ช่องจอด</p>

                  </div>

                  {/* 1.3 ถังดับเพลิง+ตู้ */}

                  <div className="space-y-2">

                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">

                      <span className="font-medium ">ถังดับเพลิง+ตู้</span>

                      <span className="font-semibold text-red-600">

                        {props.numberOfChargers} <span className="text-sm ">ชิ้น</span>

                      </span>

                      {stationEquipmentPriceMapping['fire-extinguisher'] && (
                        <div className="text-xs mt-1 space-y-1">
                          <div><span className="font-medium">เลขสินค้า:</span> {stationEquipmentPriceMapping['fire-extinguisher'].productCode}</div>
                          <div><span className="font-medium">ราคาค่าของ:</span> {stationEquipmentPriceMapping['fire-extinguisher'].materialPrice.toLocaleString('th-TH')} บาท</div>
                          <div><span className="font-medium">ราคาค่าแรง:</span> {stationEquipmentPriceMapping['fire-extinguisher'].laborPrice.toLocaleString('th-TH')} บาท</div>
                          <div><span className="font-medium">ราคารวม:</span> {stationEquipmentPriceMapping['fire-extinguisher'].totalPrice.toLocaleString('th-TH')} บาท</div>
                        </div>
                      )}

                    </div>

                    <p className="text-xs ">เงื่อนไข: ต้องใช้ 1 ชิ้นต่อ Charger 1 unit</p>

                  </div>

                  {/* 1.4 ป้ายสูง + วิธีใช้งาน */}

                  <div className="space-y-2">

                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">

                      <span className="font-medium ">ป้ายสูง + วิธีใช้งาน</span>

                      <span className="font-semibold text-purple-600">

                        {props.numberOfChargers} <span className="text-sm ">ชิ้น</span>

                      </span>

                      {stationEquipmentPriceMapping['signage'] && (
                        <div className="text-xs mt-1 space-y-1">
                          <div><span className="font-medium">เลขสินค้า:</span> {stationEquipmentPriceMapping['signage'].productCode}</div>
                          <div><span className="font-medium">ราคาค่าของ:</span> {stationEquipmentPriceMapping['signage'].materialPrice.toLocaleString('th-TH')} บาท</div>
                          <div><span className="font-medium">ราคาค่าแรง:</span> {stationEquipmentPriceMapping['signage'].laborPrice.toLocaleString('th-TH')} บาท</div>
                          <div><span className="font-medium">ราคารวม:</span> {stationEquipmentPriceMapping['signage'].totalPrice.toLocaleString('th-TH')} บาท</div>
                        </div>
                      )}

                    </div>

                    <p className="text-xs ">เงื่อนไข: ต้องใช้ 1 ชิ้นต่อ Charger 1 unit</p>

                  </div>

                </div>

              </div>

              <Separator />

              {/* 2. ระบบสื่อสาร */}

              <div className="space-y-4">

                <h3 className="text-lg font-semibold flex items-center gap-2">

                  <Zap className="h-5 w-5" />

                  2. ระบบสื่อสาร

                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* 2.1 WIFI + 4G + HUB */}

                  <div className="space-y-2">

                    <div className="flex items-center justify-between p-3 rounded-lg border">

                      <span className="font-medium ">WIFI + 4G + HUB</span>

                      <span className="font-semibold">1 <span className="text-sm ">ชิ้น</span></span>

                      {stationEquipmentPriceMapping['wifi-4g-hub'] && (
                        <div className="text-xs mt-1 space-y-1">
                          <div><span className="font-medium">เลขสินค้า:</span> {stationEquipmentPriceMapping['wifi-4g-hub'].productCode}</div>
                          <div><span className="font-medium">ราคาค่าของ:</span> {stationEquipmentPriceMapping['wifi-4g-hub'].materialPrice.toLocaleString('th-TH')} บาท</div>
                          <div><span className="font-medium">ราคาค่าแรง:</span> {stationEquipmentPriceMapping['wifi-4g-hub'].laborPrice.toLocaleString('th-TH')} บาท</div>
                          <div><span className="font-medium">ราคารวม:</span> {stationEquipmentPriceMapping['wifi-4g-hub'].totalPrice.toLocaleString('th-TH')} บาท</div>
                        </div>
                      )}

                    </div>

                    <p className="text-xs ">เงื่อนไข: 1 ชิ้น</p>

                  </div>

                  {/* 2.2 กล้อง CCTV */}

                  <div className="space-y-2">

                    <div className="flex items-center justify-between p-3 rounded-lg border">

                      <span className="font-medium ">กล้อง CCTV</span>

                      <span className="font-semibold">4 <span className="text-sm ">ชิ้น</span></span>

                      {stationEquipmentPriceMapping['cctv'] && (
                        <div className="text-xs mt-1 space-y-1">
                          <div><span className="font-medium">เลขสินค้า:</span> {stationEquipmentPriceMapping['cctv'].productCode}</div>
                          <div><span className="font-medium">ราคาค่าของ:</span> {stationEquipmentPriceMapping['cctv'].materialPrice.toLocaleString('th-TH')} บาท</div>
                          <div><span className="font-medium">ราคาค่าแรง:</span> {stationEquipmentPriceMapping['cctv'].laborPrice.toLocaleString('th-TH')} บาท</div>
                          <div><span className="font-medium">ราคารวม:</span> {stationEquipmentPriceMapping['cctv'].totalPrice.toLocaleString('th-TH')} บาท</div>
                        </div>
                      )}

                    </div>

                    <p className="text-xs ">เงื่อนไข: 4 ชิ้น</p>

                  </div>

                  {/* 2.3 หลอดไฟ */}

                  <div className="space-y-2">

                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">

                      <span className="font-medium ">หลอดไฟ</span>

                      <span className="font-semibold text-yellow-600">3 <span className="text-sm ">ชิ้น</span></span>

                      {stationEquipmentPriceMapping['lighting'] && (
                        <div className="text-xs mt-1 space-y-1">
                          <div><span className="font-medium">เลขสินค้า:</span> {stationEquipmentPriceMapping['lighting'].productCode}</div>
                          <div><span className="font-medium">ราคาค่าของ:</span> {stationEquipmentPriceMapping['lighting'].materialPrice.toLocaleString('th-TH')} บาท</div>
                          <div><span className="font-medium">ราคาค่าแรง:</span> {stationEquipmentPriceMapping['lighting'].laborPrice.toLocaleString('th-TH')} บาท</div>
                          <div><span className="font-medium">ราคารวม:</span> {stationEquipmentPriceMapping['lighting'].totalPrice.toLocaleString('th-TH')} บาท</div>
                        </div>
                      )}

                    </div>

                    <p className="text-xs ">เงื่อนไข: 3 ชิ้น</p>

                  </div>

                  {/* 2.4 ACC (สาย + รางสาย + ตู้outdoor + อื่นๆ) */}

                  <div className="space-y-2">

                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">

                      <span className="font-medium ">ACC (สาย + รางสาย + ตู้outdoor + อื่นๆ)</span>

                      <span className="font-semibold text-purple-600">1 <span className="text-sm ">ชิ้น</span></span>

                      {stationEquipmentPriceMapping['acc-system'] && (
                        <div className="text-xs mt-1 space-y-1">
                          <div><span className="font-medium">เลขสินค้า:</span> {stationEquipmentPriceMapping['acc-system'].productCode}</div>
                          <div><span className="font-medium">ราคาค่าของ:</span> {stationEquipmentPriceMapping['acc-system'].materialPrice.toLocaleString('th-TH')} บาท</div>
                          <div><span className="font-medium">ราคาค่าแรง:</span> {stationEquipmentPriceMapping['acc-system'].laborPrice.toLocaleString('th-TH')} บาท</div>
                          <div><span className="font-medium">ราคารวม:</span> {stationEquipmentPriceMapping['acc-system'].totalPrice.toLocaleString('th-TH')} บาท</div>
                        </div>
                      )}

                    </div>

                    <p className="text-xs ">เงื่อนไข: 1 ชิ้น</p>

                  </div>

                </div>

              </div>

              <Separator />

              {/* 3. งานปูน */}

              <div className="space-y-4">

                <h3 className="text-lg font-semibold flex items-center gap-2">

                  <Home className="h-5 w-5" />

                  3. งานปูน

                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* 3.1 ฐานปูน MDB */}

                  <div className="space-y-2">

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">

                      <span className="font-medium ">ฐานปูน MDB 200 x 200 x 20 ซม.</span>

                      <span className="font-semibold ">1 <span className="text-sm ">ชิ้น</span></span>

                      {stationEquipmentPriceMapping['mdb-concrete-base'] && (
                        <div className="text-xs mt-1 space-y-1">
                          <div><span className="font-medium">เลขสินค้า:</span> {stationEquipmentPriceMapping['mdb-concrete-base'].productCode}</div>
                          <div><span className="font-medium">ราคาค่าของ:</span> {stationEquipmentPriceMapping['mdb-concrete-base'].materialPrice.toLocaleString('th-TH')} บาท</div>
                          <div><span className="font-medium">ราคาค่าแรง:</span> {stationEquipmentPriceMapping['mdb-concrete-base'].laborPrice.toLocaleString('th-TH')} บาท</div>
                          <div><span className="font-medium">ราคารวม:</span> {stationEquipmentPriceMapping['mdb-concrete-base'].totalPrice.toLocaleString('th-TH')} บาท</div>
                        </div>
                      )}

                    </div>

                    <p className="text-xs ">เงื่อนไข: 1 ชิ้น</p>

                  </div>

                  {/* 3.2 ฐานปูน CHARGER */}

                  <div className="space-y-2">

                    <div className="flex items-center justify-between p-3 rounded-lg border">

                      <span className="font-medium ">ฐานปูน CHARGER 150 x 150 x 20 ซม.</span>

                      <span className="font-semibold">

                        {props.numberOfChargers} <span className="text-sm ">ชิ้น</span>

                      </span>

                      {stationEquipmentPriceMapping['charger-concrete-base'] && (
                        <div className="text-xs mt-1 space-y-1">
                          <div><span className="font-medium">เลขสินค้า:</span> {stationEquipmentPriceMapping['charger-concrete-base'].productCode}</div>
                          <div><span className="font-medium">ราคาค่าของ:</span> {stationEquipmentPriceMapping['charger-concrete-base'].materialPrice.toLocaleString('th-TH')} บาท</div>
                          <div><span className="font-medium">ราคาค่าแรง:</span> {stationEquipmentPriceMapping['charger-concrete-base'].laborPrice.toLocaleString('th-TH')} บาท</div>
                          <div><span className="font-medium">ราคารวม:</span> {stationEquipmentPriceMapping['charger-concrete-base'].totalPrice.toLocaleString('th-TH')} บาท</div>
                        </div>
                      )}

                    </div>

                    <p className="text-xs ">เงื่อนไข: ต้องใช้ 1 ชิ้นต่อ Charger 1 unit</p>

                  </div>

                  {/* 3.3 พื้นปูน ลานจอดรถ */}

                  <div className="space-y-2">

                    <div className="flex items-center justify-between p-3 rounded-lg border">

                      <span className="font-medium ">พื้นปูน ลานจอดรถ 300 x 600 x 10 ซม.</span>

                      <span className="font-semibold">

                        {parseInt(parkingSlots)} <span className="text-sm">ชิ้น</span>

                      </span>

                      {stationEquipmentPriceMapping['parking-concrete-floor'] && (
                        <div className="text-xs mt-1 space-y-1">
                          <div><span className="font-medium">เลขสินค้า:</span> {stationEquipmentPriceMapping['parking-concrete-floor'].productCode}</div>
                          <div><span className="font-medium">ราคาค่าของ:</span> {stationEquipmentPriceMapping['parking-concrete-floor'].materialPrice.toLocaleString('th-TH')} บาท</div>
                          <div><span className="font-medium">ราคาค่าแรง:</span> {stationEquipmentPriceMapping['parking-concrete-floor'].laborPrice.toLocaleString('th-TH')} บาท</div>
                          <div><span className="font-medium">ราคารวม:</span> {stationEquipmentPriceMapping['parking-concrete-floor'].totalPrice.toLocaleString('th-TH')} บาท</div>
                        </div>
                      )}

                    </div>

                    <p className="text-xs">เงื่อนไข: ต้องใช้ 1 ชิ้นต่อ 1 ช่องจอด</p>

                  </div>

                  {/* 3.4 เทพื้นปูนทั่วไป */}

                  <div className="space-y-2">

                    <div className="flex items-center justify-between p-3 rounded-lg border">

                      <span className="font-medium">เทพื้นปูนทั่วไป 100 x 100 x 10 ซม.</span>

                      <span className="font-semibold">แล้วแต่กำหนด</span>

                      {stationEquipmentPriceMapping['general-concrete-floor'] && (
                        <div className="text-xs mt-1 space-y-1">
                          <div><span className="font-medium">เลขสินค้า:</span> {stationEquipmentPriceMapping['general-concrete-floor'].productCode}</div>
                          <div><span className="font-medium">ราคาค่าของ:</span> {stationEquipmentPriceMapping['general-concrete-floor'].materialPrice.toLocaleString('th-TH')} บาท</div>
                          <div><span className="font-medium">ราคาค่าแรง:</span> {stationEquipmentPriceMapping['general-concrete-floor'].laborPrice.toLocaleString('th-TH')} บาท</div>
                          <div><span className="font-medium">ราคารวม:</span> {stationEquipmentPriceMapping['general-concrete-floor'].totalPrice.toLocaleString('th-TH')} บาท</div>
                        </div>
                      )}

                    </div>

                    <p className="text-xs">เงื่อนไข: แล้วแต่กำหนด</p>

                  </div>

                </div>

              </div>

              <Separator />

              {/* 4. งานทาสีช่องจอด */}

              <div className="space-y-4">

                <h3 className="text-lg font-semibold flex items-center gap-2">

                  <Paintbrush className="h-5 w-5" />

                  4. งานทาสีช่องจอด

                </h3>

                <div className="space-y-3">

                  <Label className="text-sm font-medium ">

                    เลือกแบบทาสี (เงื่อนไข: ต้องใช้ 1 ชิ้นต่อ 1 ช่องจอด)

                  </Label>

                  <Select value={parkingPaintType} onValueChange={setParkingPaintType}>

                    <SelectTrigger className="w-full">

                      <SelectValue placeholder="เลือกแบบทาสี" />

                    </SelectTrigger>

                    <SelectContent>

                      <SelectItem value="no-grind-no-polish">4.1 ทาสีพื้นช่องจอดรถ แบบไม่ขัด ไม่โป้ว</SelectItem>

                      <SelectItem value="grind-no-polish">4.2 ทาสีพื้นช่องจอดรถ แบบขัด แต่ไม่โป้ว</SelectItem>

                      <SelectItem value="grind-and-polish">4.3 ทาสีพื้นช่องจอดรถ แบบขัด และโป้วให้เรียบ</SelectItem>

                    </SelectContent>

                  </Select>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">

                    {/* 4.4 ตีเส้นด้านข้าง */}

                    <div className="space-y-2">

                      <div className="flex items-center justify-between p-3 rounded-lg border">

                        <span className="font-medium ">4.4 ตีเส้นด้านข้าง</span>

                        <span className="font-semibold">

                          {parseInt(parkingSlots)} <span className="text-sm ">ช่องจอด</span>

                        </span>

                      </div>

                    </div>

                    {/* 4.5 ทำลายกลางช่องจอด ใช้ลายเดิม */}

                    <div className="space-y-2">

                      <div className="flex items-center justify-between p-3 rounded-lg border">

                        <span className="font-medium ">4.5 ทำลายกลางช่องจอด ใช้ลายเดิม</span>

                        <span className="font-semibold">

                          {parseInt(parkingSlots)} <span className="text-sm ">ช่องจอด</span>

                        </span>

                      </div>

                    </div>

                    {/* 4.6 ทำลายกลางช่องจอด ออกแบบลายใหม่ */}

                    <div className="space-y-2">

                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">

                        <span className="font-medium ">4.6 ทำลายกลางช่องจอด ออกแบบลายใหม่</span>

                        <span className="font-semibold text-purple-600">

                          {parseInt(parkingSlots)} <span className="text-sm ">ช่องจอด</span>

                        </span>

                      </div>

                    </div>

                  </div>

                  {/* แสดงผลลัพธ์งานทาสีช่องจอด */}
                  {parkingPaintType && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200">
                      <h4 className="font-semibold text-pink-800 mb-3 flex items-center gap-2">
                        <Paintbrush className="h-4 w-4" />
                        ผลลัพธ์งานทาสีช่องจอด
                      </h4>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 bg-white rounded border">
                          <span className="font-medium ">แบบทาสีที่เลือก:</span>
                          <span className="font-semibold text-pink-600">
                            {parkingPaintType === 'no-grind-no-polish' && '4.1 ทาสีพื้นช่องจอดรถ แบบไม่ขัด ไม่โป้ว'}
                            {parkingPaintType === 'grind-no-polish' && '4.2 ทาสีพื้นช่องจอดรถ แบบขัด แต่ไม่โป้ว'}
                            {parkingPaintType === 'grind-and-polish' && '4.3 ทาสีพื้นช่องจอดรถ แบบขัด และโป้วให้เรียบ'}
                          </span>
                        </div>

                        {parkingPaintType && stationEquipmentPriceMapping[`paint-${parkingPaintType}`] && (
                          <div className="p-2 bg-white rounded border space-y-1">
                            <div className="font-medium">ข้อมูลราคาทาสี:</div>
                            <div className="text-xs space-y-1">
                              <div><span className="font-medium">เลขสินค้า:</span> {stationEquipmentPriceMapping[`paint-${parkingPaintType}`].productCode}</div>
                              <div><span className="font-medium">ราคาค่าของ:</span> {stationEquipmentPriceMapping[`paint-${parkingPaintType}`].materialPrice.toLocaleString('th-TH')} บาท</div>
                              <div><span className="font-medium">ราคาค่าแรง:</span> {stationEquipmentPriceMapping[`paint-${parkingPaintType}`].laborPrice.toLocaleString('th-TH')} บาท</div>
                              <div><span className="font-medium">ราคารวม:</span> {stationEquipmentPriceMapping[`paint-${parkingPaintType}`].totalPrice.toLocaleString('th-TH')} บาท</div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between p-2 bg-white rounded border">
                          <span className="font-medium ">จำนวนช่องจอด:</span>
                          <span className="font-semibold">{parseInt(parkingSlots)} ช่องจอด</span>
                        </div>

                        <div className="flex items-center justify-between p-2 bg-white rounded border">
                          <span className="font-medium ">ตีเส้นด้านข้าง:</span>
                          <span className="font-semibold">{parseInt(parkingSlots)} ช่องจอด</span>
                        </div>

                        {stationEquipmentPriceMapping['side-line-marking'] && (
                          <div className="p-2 bg-white rounded border space-y-1">
                            <div className="font-medium">ข้อมูลราคาตีเส้น:</div>
                            <div className="text-xs space-y-1">
                              <div><span className="font-medium">เลขสินค้า:</span> {stationEquipmentPriceMapping['side-line-marking'].productCode}</div>
                              <div><span className="font-medium">ราคาค่าของ:</span> {stationEquipmentPriceMapping['side-line-marking'].materialPrice.toLocaleString('th-TH')} บาท</div>
                              <div><span className="font-medium">ราคาค่าแรง:</span> {stationEquipmentPriceMapping['side-line-marking'].laborPrice.toLocaleString('th-TH')} บาท</div>
                              <div><span className="font-medium">ราคารวม:</span> {stationEquipmentPriceMapping['side-line-marking'].totalPrice.toLocaleString('th-TH')} บาท</div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between p-2 bg-white rounded border">
                          <span className="font-medium ">ทำลายกลางช่องจอด:</span>
                          <span className="font-semibold">{parseInt(parkingSlots)} ช่องจอด</span>
                        </div>

                        {stationEquipmentPriceMapping['center-pattern-original'] && (
                          <div className="p-2 bg-white rounded border space-y-1">
                            <div className="font-medium">ข้อมูลราคาทำลายลายเดิม:</div>
                            <div className="text-xs space-y-1">
                              <div><span className="font-medium">เลขสินค้า:</span> {stationEquipmentPriceMapping['center-pattern-original'].productCode}</div>
                              <div><span className="font-medium">ราคาค่าของ:</span> {stationEquipmentPriceMapping['center-pattern-original'].materialPrice.toLocaleString('th-TH')} บาท</div>
                              <div><span className="font-medium">ราคาค่าแรง:</span> {stationEquipmentPriceMapping['center-pattern-original'].laborPrice.toLocaleString('th-TH')} บาท</div>
                              <div><span className="font-medium">ราคารวม:</span> {stationEquipmentPriceMapping['center-pattern-original'].totalPrice.toLocaleString('th-TH')} บาท</div>
                            </div>
                          </div>
                        )}

                        {stationEquipmentPriceMapping['center-pattern-new'] && (
                          <div className="p-2 bg-white rounded border space-y-1">
                            <div className="font-medium">ข้อมูลราคาทำลายลายใหม่:</div>
                            <div className="text-xs space-y-1">
                              <div><span className="font-medium">เลขสินค้า:</span> {stationEquipmentPriceMapping['center-pattern-new'].productCode}</div>
                              <div><span className="font-medium">ราคาค่าของ:</span> {stationEquipmentPriceMapping['center-pattern-new'].materialPrice.toLocaleString('th-TH')} บาท</div>
                              <div><span className="font-medium">ราคาค่าแรง:</span> {stationEquipmentPriceMapping['center-pattern-new'].laborPrice.toLocaleString('th-TH')} บาท</div>
                              <div><span className="font-medium">ราคารวม:</span> {stationEquipmentPriceMapping['center-pattern-new'].totalPrice.toLocaleString('th-TH')} บาท</div>
                            </div>
                          </div>
                        )}

                        <div className="p-2 bg-pink-100 rounded border border-pink-300">
                          <p className="text-sm text-pink-700">
                            <span className="font-medium">สรุป:</span> งานทาสีช่องจอดทั้งหมด {parseInt(parkingSlots)} ช่องจอด
                            พร้อมตีเส้นและทำลายกลางช่องจอด
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                </div>

              </div>

              <Separator />

              {/* หลังคาคุมช่องจอด (ยังเหมือนเดิม) */}

              <div className="space-y-3">

                <Label className="text-sm font-medium  flex items-center gap-2">

                  <Home className="h-4 w-4" />

                  หลังคาคุมช่องจอด <span className="text-xs ">(Roof Cover for Parking)</span>

                </Label>

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

                {/* แสดงข้อมูลราคาหลังคาคุมช่องจอดเมื่อเลือก "มี" */}
                {roofCoverType === 'yes' && getParkingRoofData && getParkingRoofData(parseInt(parkingSlots)) && (
                  <div className="p-3 rounded-lg border space-y-2">
                    <div className="font-medium">ข้อมูลราคาหลังคาคุมช่องจอด ({getParkingRoofData(parseInt(parkingSlots)).slots} ช่องจอด):</div>
                    <div className="text-xs space-y-1">
                      <div><span className="font-medium">ราคาค่าของ:</span> {getParkingRoofData(parseInt(parkingSlots)).materialPrice.toLocaleString('th-TH')} บาท</div>
                      <div><span className="font-medium">ราคาค่าแรง:</span> {getParkingRoofData(parseInt(parkingSlots)).laborPrice.toLocaleString('th-TH')} บาท</div>
                      <div><span className="font-medium">ราคารวม:</span> {getParkingRoofData(parseInt(parkingSlots)).totalPrice.toLocaleString('th-TH')} บาท</div>
                    </div>
                  </div>
                )}


              </div>



              <Separator />

              {/* หลังคาเฉพาะ MDB (ยังเหมือนเดิม) */}

              <div className="space-y-3">

                <Label className="text-sm font-medium ">

                  หลังคาเฉพาะ MDB <span className="text-xs ">(Roof for MDB only)</span>

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

                      className="border-gray-400 data-[state=checked]:bg-gray-500"

                    />

                    <Label htmlFor="mdbRoof-no" className="font-medium cursor-pointer">ไม่มี</Label>

                  </div>

                </div>

                {/* แสดงข้อมูลราคาหลังคาเฉพาะ MDB เมื่อเลือก "มี" */}
                {mdbRoof === 'yes' && roofCostMapping && roofCostMapping['mdb-roof'] && (
                  <div className="p-4 bg-blue-50 rounded-lg border space-y-2">
                    <div className="font-medium">{roofCostMapping['mdb-roof'].name}:</div>
                    <div className="text-xs space-y-1">
                      <div><span className="font-medium">ราคาค่าของ:</span> {roofCostMapping['mdb-roof'].materialPrice.toLocaleString('th-TH')} บาท</div>
                      <div><span className="font-medium">ราคาค่าแรง:</span> {roofCostMapping['mdb-roof'].laborPrice.toLocaleString('th-TH')} บาท</div>
                      <div><span className="font-medium">ราคารวม:</span> {roofCostMapping['mdb-roof'].totalPrice.toLocaleString('th-TH')} บาท</div>
                    </div>
                  </div>
                )}

              </div>



              <Separator />



              {/* หลังคาเครื่องชาร์จ (ยังเหมือนเดิม) */}

              <div className="space-y-3">

                <Label className="text-sm font-medium ">

                  หลังคาเครื่องชาร์จ <span className="text-xs ">(Charger Roof Type)</span>

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

                      className=" border-gray-400 data-[state=checked]:bg-gray-500"

                    />

                    <Label htmlFor="normal" className="font-medium cursor-pointer ">ธรรมดา</Label>

                  </div>

                </div>

                {/* แสดงข้อมูลราคาหลังคาเครื่องชาร์จ */}
                {chargerRoofType && roofCostMapping && (
                  <div className="p-3 rounded-lg border space-y-2">
                    {chargerRoofType === 'normal' && roofCostMapping['charger-roof-normal'] && (
                      <>
                        <div className="font-medium">{roofCostMapping['charger-roof-normal'].name}:</div>
                        <div className="text-xs space-y-1">
                          <div><span className="font-medium">ราคาค่าของ:</span> {roofCostMapping['charger-roof-normal'].materialPrice.toLocaleString('th-TH')} บาท</div>
                          <div><span className="font-medium">ราคาค่าแรง:</span> {roofCostMapping['charger-roof-normal'].laborPrice.toLocaleString('th-TH')} บาท</div>
                          <div><span className="font-medium">ราคารวม:</span> {roofCostMapping['charger-roof-normal'].totalPrice.toLocaleString('th-TH')} บาท</div>
                        </div>
                      </>
                    )}
                    {chargerRoofType === 'composite' && roofCostMapping['charger-roof-composite'] && (
                      <>
                        <div className="font-medium">{roofCostMapping['charger-roof-composite'].name}:</div>
                        <div className="text-xs space-y-1">
                          <div><span className="font-medium">ราคาค่าของ:</span> {roofCostMapping['charger-roof-composite'].materialPrice.toLocaleString('th-TH')} บาท</div>
                          <div><span className="font-medium">ราคาค่าแรง:</span> {roofCostMapping['charger-roof-composite'].laborPrice.toLocaleString('th-TH')} บาท</div>
                          <div><span className="font-medium">ราคารวม:</span> {roofCostMapping['charger-roof-composite'].totalPrice.toLocaleString('th-TH')} บาท</div>
                        </div>
                      </>
                    )}
                  </div>
                )}

              </div>

            </div>

          )}

        </CardContent>

      </Card>



      {/* Travel Cost Card - แยกออกมาเป็นหัวข้อแยก */}

      <Card className="shadow-xl border-0 overflow-hidden">

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

                placeholder="กรอกระยะทาง"

                value={travelDistance}

                onChange={(e) => setTravelDistance(e.target.value)}

                className="w-32"

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

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">

                <div className="flex items-center justify-between">

                  <span className="font-medium ">ค่าเดินทาง:</span>

                  <span className="font-bold text-blue-600 text-lg">

                    {travelCostResult.toLocaleString('th-TH')} บาท

                  </span>

                </div>

                <div className="text-xs  mt-1">

                  ระยะทาง: {travelDistance} กม. | จำนวน Charger: {props.numberOfChargers} Unit

                  {trainingWork === 'yes' && (

                    <span className="text-green-600 font-medium"> | + งานฝึกอบรม (1วัน)</span>

                  )}

                </div>

              </div>

            )}

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

        allSheetsData[sheetName] = jsonData;



        // Log ข้อมูลแต่ละ sheet

        console.log(`Sheet: ${sheetName}`, jsonData.slice(0, 3)); // แสดงแค่ 3 แถวแรก

      });



      setExcelData(allSheetsData);

      console.log('ข้อมูล Excel ทั้งหมด:', allSheetsData);



      // สร้าง mapping สำหรับ Transformer Price, MDB Configuration, Station Equipment Price และ Roof Cost
      createTransformerPriceMapping(allSheetsData);
      createMdbConfigurationMapping(allSheetsData);
      createStationEquipmentPriceMapping(allSheetsData);
      createRoofCostMapping(allSheetsData);

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
        const sizeValue = row['ตาราง_____ราคาหม้อแปลง'];
        if (sizeValue) {
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
            mapping[key22kv] = {
              size: transformerSize,
              type: '22kv-416v',
              price: sizeValue,
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
        const sizeValue = row['__EMPTY_5'];
        if (sizeValue) {
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
            mapping[key33kv] = {
              size: transformerSize,
              type: '33kv-316v',
              price: sizeValue,
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
        mapping[item.key] = {
          name: item.name,
          rowNum: item.rowNum,
          productCode: rowData.__EMPTY_1 || '',
          materialPrice: rowData.__EMPTY_2 || 0,
          laborPrice: rowData.__EMPTY_3 || 0,
          totalPrice: rowData.__EMPTY_4 || 0,
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
      { key: 'parking-roof-3-4', rowNum: 6, slots: '3-4' },
      { key: 'parking-roof-5-6', rowNum: 9, slots: '5-6' },
      { key: 'parking-roof-7-8', rowNum: 12, slots: '7-8' },
      { key: 'parking-roof-9-10', rowNum: 15, slots: '9-10' },
      { key: 'parking-roof-11-12', rowNum: 17, slots: '11-12' }
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

    // สร้าง mapping สำหรับหลังคาเฉพาะ MDB
    const mdbRoofRow = roofSheet.find(row => row.__rowNum__ === 20);
    if (mdbRoofRow) {
      mapping['mdb-roof'] = {
        name: 'หลังคาคลุม MDB 3ม. X 3ม.',
        rowNum: 20,
        materialPrice: mdbRoofRow.__EMPTY_4 || 0,
        laborPrice: mdbRoofRow.__EMPTY_5 || 0,
        totalPrice: mdbRoofRow.__EMPTY_6 || 0,
        rowData: mdbRoofRow
      };
    }

    // สร้าง mapping สำหรับหลังคาเครื่องชาร์จ ธรรมดา
    const chargerNormalRow = roofSheet.find(row => row.__rowNum__ === 22);
    if (chargerNormalRow) {
      mapping['charger-roof-normal'] = {
        name: 'หลังคาคลุม Charger 3ม. X 3ม.',
        rowNum: 22,
        materialPrice: chargerNormalRow.__EMPTY_4 || 0,
        laborPrice: chargerNormalRow.__EMPTY_5 || 0,
        totalPrice: chargerNormalRow.__EMPTY_6 || 0,
        rowData: chargerNormalRow
      };
    }

    // สร้าง mapping สำหรับหลังคาเครื่องชาร์จ Composite
    const chargerCompositeRow = roofSheet.find(row => row.__rowNum__ === 24);
    if (chargerCompositeRow) {
      mapping['charger-roof-composite'] = {
        name: 'หลังคาcompositeคลุม Charger 3ม. X 3ม.',
        rowNum: 24,
        materialPrice: chargerCompositeRow.__EMPTY_4 || 0,
        laborPrice: chargerCompositeRow.__EMPTY_5 || 0,
        totalPrice: chargerCompositeRow.__EMPTY_6 || 0,
        rowData: chargerCompositeRow
      };
    }

    setRoofCostMapping(mapping);
    console.log('Roof Cost Mapping สร้างเสร็จ:', mapping);
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
      let startRow = 3; // ABB default
      if (brand === 'EATON') {
        startRow = 10;
      } else if (brand === 'LS') {
        startRow = 17;
      }

      transformerSizes.forEach(size => {
        const key = `${brand}-${size}`;


        // กำหนด column mapping ตาม transformer size

        let headerColumns: { name: string; spec1: string; spec2: string } = { name: '', spec1: '', spec2: '' };

        let productCodeColumn = '';



        switch (size) {
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

        }

        // หา header row
        const headerRow = mdbSheet.find(row => row.__rowNum__ === startRow);

        // หา product rows
        const productRows = mdbSheet.filter(row =>
          row.__rowNum__ >= startRow + 1 && row.__rowNum__ <= startRow + 5

        );



        if (headerRow && productRows.length > 0) {
          mapping[key] = {
            transformerSize: size,
            mccbBrand: brand,
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

            <div className="text-sm text-green-600 mb-2">
              พบ {Object.keys(excelData).length} sheets: {Object.keys(excelData).join(', ')}

            </div>

            <div className="text-sm text-green-600 mb-2">
              📊 Mapping สร้างเสร็จ: Transformer Price ({Object.keys(transformerPriceMapping).length} รายการ),
              MDB Configuration ({Object.keys(mdbConfigurationMapping).length} รายการ)
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  console.log('=== Transformer Price Mapping ===');
                  console.log(transformerPriceMapping);
                  console.log('Keys:', Object.keys(transformerPriceMapping));
                  console.log('Values:', Object.values(transformerPriceMapping));
                }}
                className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
              >
                ดู Transformer Mapping ใน Console
              </button>
              <button
                onClick={() => {
                  console.log('=== MDB Configuration Mapping ===');
                  console.log(mdbConfigurationMapping);
                  console.log('Keys:', Object.keys(mdbConfigurationMapping));
                  console.log('Values:', Object.values(mdbConfigurationMapping));
                }}
                className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
              >
                ดู MDB Mapping ใน Console
              </button>
              <button
                onClick={() => {
                  const dataStr = JSON.stringify(transformerPriceMapping, null, 2);
                  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
                  const exportFileDefaultName = 'transformer-price-mapping.json';
                  const linkElement = document.createElement('a');
                  linkElement.setAttribute('href', dataUri);
                  linkElement.setAttribute('download', exportFileDefaultName);
                  linkElement.click();
                }}
                className="px-3 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600"
              >
                Export Transformer JSON
              </button>
              <button
                onClick={() => {
                  const dataStr = JSON.stringify(mdbConfigurationMapping, null, 2);
                  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
                  const exportFileDefaultName = 'mdb-configuration-mapping.json';
                  const linkElement = document.createElement('a');
                  linkElement.setAttribute('href', dataUri);
                  linkElement.setAttribute('download', exportFileDefaultName);
                  linkElement.click();
                }}
                className="px-3 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600"
              >
                Export MDB JSON
              </button>
            </div>
          </div>

        )}


        {/* Mapping Data Preview */}
        {(Object.keys(transformerPriceMapping).length > 0 || Object.keys(mdbConfigurationMapping).length > 0) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                ข้อมูล Mapping ที่สร้างขึ้น
              </CardTitle>
              <CardDescription>
                ข้อมูลที่ประมวลผลจาก Excel และจัดเก็บในรูปแบบ mapping สำหรับการใช้งาน
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Transformer Price Mapping */}
                {Object.keys(transformerPriceMapping).length > 0 && (
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg text-blue-600">
                        Transformer Price Mapping ({Object.keys(transformerPriceMapping).length} รายการ)
                      </h3>
                      <button
                        onClick={() => setShowTransformerMapping(!showTransformerMapping)}
                        className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                      >
                        {showTransformerMapping ? 'ซ่อนรายละเอียด' : 'แสดงรายละเอียด'}
                      </button>
                    </div>

                    {showTransformerMapping && (
                      <div className="mt-4">
                        <div className="mb-4 p-3 bg-blue-50 rounded border">
                          <h4 className="font-medium text-blue-800 mb-2">โครงสร้างข้อมูล:</h4>
                          <div className="text-sm text-blue-700 space-y-1">
                            <p>• Key format: "22kv-416v-[size]" หรือ "33kv-316v-[size]"</p>
                            <p>• Data: size, type, price, column, rowNum, rowData</p>
                            <p>• ขนาด: 100, 160, 250, 315, 400, 500, 630, 800, 1000, 1250, 1500, 2000 kVA</p>
                          </div>
                        </div>

                        {/* Search Box */}
                        <div className="mb-4">
                          <Input
                            type="text"
                            placeholder="ค้นหา Transformer (ขนาด, ประเภท, ราคา)..."
                            value={transformerSearchTerm}
                            onChange={(e) => setTransformerSearchTerm(e.target.value)}
                            className="w-full"
                          />
                          {transformerSearchTerm && (
                            <div className="text-sm text-blue-600 mt-1">
                              พบ {Object.keys(getFilteredTransformerMapping()).length} รายการ
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm max-h-96 overflow-y-auto">
                          {Object.entries(getFilteredTransformerMapping()).map(([key, data]) => (
                            <div key={key} className="p-3 bg-blue-50 rounded border">
                              <div className="font-medium text-blue-800 mb-1">{key}</div>
                              <div className="text-blue-600 space-y-1">
                                <div>Size: {data.size} kVA</div>
                                <div>Type: {data.type}</div>
                                <div>Price: {data.price}</div>
                                <div>Column: {data.column}</div>
                                <div>Row: {data.rowNum}</div>
                              </div>
                            </div>
                          ))}
                          {Object.keys(getFilteredTransformerMapping()).length === 0 && (
                            <div className="col-span-full text-center  py-4">
                              ไม่พบข้อมูลที่ตรงกับคำค้นหา
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {!showTransformerMapping && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        {Object.entries(transformerPriceMapping).slice(0, 6).map(([key, data]) => (
                          <div key={key} className="p-2 bg-blue-50 rounded border">
                            <div className="font-medium text-blue-800">{key}</div>
                            <div className="text-blue-600">
                              {data.size} kVA - {data.type} - ราคา: {data.price}
                            </div>
                          </div>
                        ))}
                        {Object.keys(transformerPriceMapping).length > 6 && (
                          <div className=" text-sm p-2">
                            และอีก {Object.keys(transformerPriceMapping).length - 6} รายการ...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* MDB Configuration Mapping */}
                {Object.keys(mdbConfigurationMapping).length > 0 && (
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg text-green-600">
                        MDB Configuration Mapping ({Object.keys(mdbConfigurationMapping).length} รายการ)
                      </h3>
                      <button
                        onClick={() => setShowMdbMapping(!showMdbMapping)}
                        className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                      >
                        {showMdbMapping ? 'ซ่อนรายละเอียด' : 'แสดงรายละเอียด'}
                      </button>
                    </div>

                    {showMdbMapping && (
                      <div className="mt-4">
                        <div className="mb-4 p-3 bg-green-50 rounded border">
                          <h4 className="font-medium text-green-800 mb-2">โครงสร้างข้อมูล:</h4>
                          <div className="text-sm text-green-700 space-y-1">
                            <p>• Key format: "[brand]-[size]" (เช่น "ABB-100", "EATON-250")</p>
                            <p>• Data: transformerSize, mccbBrand, startRow, header, products</p>
                            <p>• ยี่ห้อ: ABB, EATON, LS</p>
                            <p>• ขนาด: 100, 160, 250, 315, 400, 500, 630, 800, 1000, 1200 kVA</p>
                          </div>
                        </div>

                        {/* Search Box */}
                        <div className="mb-4">
                          <Input
                            type="text"
                            placeholder="ค้นหา MDB (ยี่ห้อ, ขนาด, start row)..."
                            value={mdbSearchTerm}
                            onChange={(e) => setMdbSearchTerm(e.target.value)}
                            className="w-full"
                          />
                          {mdbSearchTerm && (
                            <div className="text-sm text-green-600 mt-1">
                              พบ {Object.keys(getFilteredMdbMapping()).length} รายการ
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm max-h-96 overflow-y-auto">
                          {Object.entries(getFilteredMdbMapping()).map(([key, data]) => (
                            <div key={key} className="p-3 bg-green-50 rounded border">
                              <div className="font-medium text-green-800 mb-1">{key}</div>
                              <div className="text-green-600 space-y-1">
                                <div>Brand: {data.mccbBrand}</div>
                                <div>Size: {data.transformerSize} kVA</div>
                                <div>Start Row: {data.startRow}</div>
                                <div>Products: {data.products.length} รายการ</div>
                                <div className="text-xs text-green-500">
                                  Header: {data.header.name}
                                </div>
                              </div>
                            </div>
                          ))}
                          {Object.keys(getFilteredMdbMapping()).length === 0 && (
                            <div className="col-span-full text-center  py-4">
                              ไม่พบข้อมูลที่ตรงกับคำค้นหา
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {!showMdbMapping && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        {Object.entries(mdbConfigurationMapping).slice(0, 6).map(([key, data]) => (
                          <div key={key} className="p-2 bg-green-50 rounded border">
                            <div className="font-medium text-green-800">{key}</div>
                            <div className="text-green-600">
                              {data.mccbBrand} - {data.transformerSize} kVA - {data.products.length} products
                            </div>
                          </div>
                        ))}
                        {Object.keys(mdbConfigurationMapping).length > 6 && (
                          <div className=" text-sm p-2">
                            และอีก {Object.keys(mdbConfigurationMapping).length - 6} รายการ...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
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

                          <div className="text-sm  mt-2">

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

                    <p>• <span className="font-medium">LS:</span> Header Row __rowNum__ 17, Product Rows 18-22</p>

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

                      <p>Header: __rowNum__ 17</p>

                      <p>Products: __rowNum__ 18-22</p>

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
          stationEquipmentPriceMapping={stationEquipmentPriceMapping}
          roofCostMapping={roofCostMapping}
          getParkingRoofData={getParkingRoofData}

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



