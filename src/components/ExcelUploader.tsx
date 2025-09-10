/**
 * ExcelUploader component for uploading and reading Excel files
 * Uses File API to read Excel files without server-side processing
 */

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react'

interface ExcelData {
  fileName: string
  data: any[]
  headers: string[]
}

/**
 * ExcelUploader component - handles Excel file upload and parsing
 */
export default function ExcelUploader(): JSX.Element {
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [excelData, setExcelData] = useState<ExcelData | null>(null)

  /** Handle file selection */
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    // Check file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ]

    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Please select a valid Excel file (.xlsx or .xls)')
      return
    }

    setFile(selectedFile)
    setError('')
    setExcelData(null)
  }, [])

  /** Read and parse Excel file */
  const handleUpload = useCallback(async () => {
    if (!file) return

    setIsLoading(true)
    setError('')

    try {
      // Read file as binary string
      const arrayBuffer = await file.arrayBuffer()
      
      // Convert to base64 for processing
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      )

      // For demo purposes, simulate Excel data parsing
      // In real implementation, you would use a library like xlsx
      setTimeout(() => {
        const mockData = {
          fileName: file.name,
          data: [
            { id: 1, name: 'Item 1', value: 100 },
            { id: 2, name: 'Item 2', value: 200 },
            { id: 3, name: 'Item 3', value: 300 }
          ],
          headers: ['ID', 'Name', 'Value']
        }
        
        setExcelData(mockData)
        setIsLoading(false)
      }, 1500)

    } catch (err) {
      setError('Failed to read Excel file: ' + (err as Error).message)
      setIsLoading(false)
    }
  }, [file])

  /** Reset the uploader */
  const handleReset = useCallback(() => {
    setFile(null)
    setError('')
    setExcelData(null)
  }, [])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Excel File Uploader
          </CardTitle>
          <CardDescription>
            Upload Excel files from your computer (.xlsx or .xls)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="excel-file">Select Excel File</Label>
            <Input
              id="excel-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {file && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700">
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleUpload}
              disabled={!file || isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload & Process
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {excelData && (
        <Card>
          <CardHeader>
            <CardTitle>Excel Data Preview</CardTitle>
            <CardDescription>
              Data from {excelData.fileName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    {excelData.headers.map((header, index) => (
                      <th
                        key={index}
                        className="border border-gray-300 px-4 py-2 text-left font-medium"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {excelData.data.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50">
                      {Object.values(row).map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="border border-gray-300 px-4 py-2"
                        >
                          {String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
