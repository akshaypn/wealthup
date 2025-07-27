import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, FileText, Info, Building2 } from 'lucide-react'
import { useQuery } from 'react-query'
import axios from 'axios'

const API_BASE_URL = process.env.VITE_API_URL || 'http://100.123.199.100:9001'

const FileUpload = ({ onUpload, onClose }) => {
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewData, setPreviewData] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [detectedBank, setDetectedBank] = useState('')

  // Fetch user accounts
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/v1/accounts`)
      return response.data
    },
    refetchOnWindowFocus: false,
  })

  // Fetch supported banks
  const { data: banksData } = useQuery({
    queryKey: ['banks'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/v1/banks`)
      return response.data
    },
    refetchOnWindowFocus: false,
  })

  const accounts = accountsData?.accounts || []
  const banks = banksData?.banks || []

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0]
    if (file) {
      setSelectedFile(file)
      previewFile(file)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    multiple: false
  })

  const previewFile = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result
      const lines = text.split('\n')
      const headers = lines[0].split(',').map(h => h.trim())
      
      // Try to detect bank from headers
      const headerText = headers.join(' ').toLowerCase()
      let detected = 'unknown'
      
      if (headerText.includes('canara')) detected = 'canara_bank'
      else if (headerText.includes('hdfc')) detected = 'hdfc_bank'
      else if (headerText.includes('icici')) detected = 'icici_bank'
      else if (headerText.includes('sbi') || headerText.includes('state bank')) detected = 'sbi_bank'
      else if (headerText.includes('credit') || headerText.includes('card')) detected = 'credit_card'
      
      setDetectedBank(detected)
      
      const data = lines.slice(1, 6).map(line => {
        const values = line.split(',').map(v => v.trim())
        const row = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        return row
      })
      setPreviewData(data)
    }
    reader.readAsText(file)
  }

  const handleUpload = async () => {
    if (selectedFile) {
      setIsUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('bank', detectedBank)
        if (selectedAccountId) {
          formData.append('account_id', selectedAccountId)
        }

        await onUpload(selectedFile, detectedBank, selectedAccountId)
      } finally {
        setIsUploading(false)
      }
    }
  }

  const getBankDisplayName = (bankCode) => {
    const bankMap = {
      'canara_bank': 'Canara Bank',
      'hdfc_bank': 'HDFC Bank',
      'icici_bank': 'ICICI Bank',
      'sbi_bank': 'State Bank of India',
      'credit_card': 'Credit Card',
      'unknown': 'Unknown Bank'
    }
    return bankMap[bankCode] || bankCode
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Upload Bank Statement</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Account Selection */}
          {accounts.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Account (Optional)
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Create new account or skip</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} - {account.institution}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Drop Zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-blue-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            {isDragActive ? (
              <p className="text-blue-600 font-medium">Drop the CSV file here...</p>
            ) : (
              <div>
                <p className="text-gray-600 mb-2">
                  Drag and drop your bank statement CSV file here, or click to browse
                </p>
                <p className="text-sm text-gray-500">
                  Supported banks: Canara Bank, HDFC, ICICI, SBI, Credit Cards
                </p>
              </div>
            )}
          </div>

          {/* File Preview */}
          {selectedFile && (
            <div className="mt-6">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>

              {/* Bank Detection */}
              {detectedBank && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      Detected Bank: {getBankDisplayName(detectedBank)}
                    </span>
                  </div>
                </div>
              )}

              {/* Data Preview */}
              {previewData.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Preview (first 5 rows)</h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            {Object.keys(previewData[0] || {}).map((header) => (
                              <th
                                key={header}
                                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {previewData.map((row, index) => (
                            <tr key={index}>
                              {Object.values(row).map((value, cellIndex) => (
                                <td
                                  key={cellIndex}
                                  className="px-3 py-2 text-sm text-gray-900 truncate max-w-xs"
                                >
                                  {value}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Button */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Uploading...' : 'Upload Statement'}
                </button>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-gray-400 mt-0.5" />
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-1">Supported Formats:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Canara Bank CSV statements</li>
                  <li>HDFC Bank CSV statements</li>
                  <li>ICICI Bank CSV statements</li>
                  <li>SBI Bank CSV statements</li>
                  <li>Credit card statements</li>
                </ul>
                <p className="mt-2">
                  The system will automatically detect your bank and categorize transactions using AI.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FileUpload 