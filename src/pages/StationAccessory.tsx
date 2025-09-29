import React from 'react'
import { Zap } from 'lucide-react'

function StationAccessory(): JSX.Element {
  return (
    <div>
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
    </div>
  )
}

export default StationAccessory

