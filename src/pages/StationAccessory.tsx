import React, { useEffect, useState } from 'react'
import { Zap } from 'lucide-react'
import { useLocation } from 'react-router-dom'
// Add xlsx import
import * as XLSX from 'xlsx'

function MoreDetailCard(props: any) {
  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="shadow-xl border-0 overflow-hidden rounded-lg bg-white">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-6 rounded-t-lg">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6" />
            More Detail
          </h2>
        </div>
        <div className="p-8 space-y-6">
          <div>
            <span className="font-medium text-gray-700">Power Authority:</span>
            <span className="font-semibold text-gray-900 ml-2">{props.powerAuthority}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Number of Chargers:</span>
            <span className="font-semibold text-gray-900 ml-2">{props.numberOfChargers}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">ขนาดหม้อแปลง:</span>
            <span className="font-semibold text-gray-900 ml-2">{props.transformer}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">เดินสาย Tr to MDB:</span>
            <span className="font-semibold text-gray-900 ml-2">{props.trWiringType} / {props.trWiringSize} / {props.trWireConduit}</span>
            <div className="mt-2 flex items-center gap-2">
              <label className="text-gray-700">ระยะ (เมตร):</label>
              <input type="number" className="border rounded px-2 py-1 w-24" value={props.trDistance} />
            </div>
            {props.trWiringType === 'ร้อยท่อเดินในอากาศ กลุ่ม 2' && (
              <div className="mt-2 flex items-center gap-2">
                <label className="text-gray-700">เลือกท่อ:</label>
                <select className="border rounded px-2 py-1 w-24" value={props.trWiringGroup2}>
                  <option value="IMC">IMC</option>
                  <option value="RSC">RSC</option>
                </select>
              </div>
            )}
          </div>
          <div>
            <span className="font-medium text-gray-700">MDB:</span>
            <span className="font-semibold text-gray-900 ml-2">{props.mdb}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">เดินสาย MDB to Charger:</span>
            <span className="font-semibold text-gray-900 ml-2">{props.chargerWiringType} / {props.chargerWiringCable} / {props.chargerWireConduit}</span>
            <div className="mt-2 flex items-center gap-2">
              <label className="text-gray-700">ระยะ (เมตร):</label>
              <input type="number" className="border rounded px-2 py-1 w-24" value={props.chargerDistance} />
            </div>
            {props.chargerWiringType === 'ร้อยท่อเดินในอากาศ กลุ่ม 2' && (
              <div className="mt-2 flex items-center gap-2">
                <label className="text-gray-700">เลือกท่อ:</label>
                <select className="border rounded px-2 py-1 w-24" value={props.chargerWiringGroup2}>
                  <option value="IMC">IMC</option>
                  <option value="RSC">RSC</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StationAccessory() {
  const { state } = useLocation()
  // state จะมีค่าที่ส่งมาจาก Home

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full">
            <Zap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">EV Station Calculator</h1>
        </div>
        <p className="text-lg text-gray-600">
          Calculate power requirements for electric vehicle charging stations
        </p>
      </div>
      <MoreDetailCard {...state} />
    </div>
  )
}

export default StationAccessory

