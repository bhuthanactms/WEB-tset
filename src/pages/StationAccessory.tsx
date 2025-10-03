import React, { useEffect, useState } from 'react'
import { Zap } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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
            <span className="font-semibold text-gray-900 ml-2">{props.numberOfChargers} <span className="text-sm text-gray-600">Units</span></span>
          </div>
          <div>
            <span className="font-medium text-gray-700">ขนาดหม้อแปลง:</span>
            <span className="font-semibold text-gray-900 ml-2">{props.transformer} <span className="text-sm text-gray-600">kVA</span></span>
          </div>
          <div>
            <span className="font-medium text-gray-700">เดินสาย Tr to MDB:</span>
            <div className="mt-2 flex flex-wrap items-center gap-4">
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
            <div className="mt-4 space-y-3">
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
          <div>
            <span className="font-medium text-gray-700">MDB :</span>
            <div className="mt-2 ml-4 space-y-2">
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
          <div>
            <span className="font-medium text-gray-700">เดินสาย MDB to Charger:</span>
            <div className="mt-3 space-y-3">
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

