'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Upload, FileText, AlertCircle } from 'lucide-react';
import { Transaction } from '../types';

interface FileUploadProps {
  onUpload: (file: File) => void;
  onClose: () => void;
}

export default function FileUpload({ onUpload, onClose }: FileUploadProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Transaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadedFile(file);
      previewCSV(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    multiple: false,
  });

  const previewCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      // Preview first 5 rows
      const previewRows = lines.slice(1, 6).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });
      
      setPreviewData(previewRows);
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!uploadedFile) return;
    
    setIsProcessing(true);
    try {
      await onUpload(uploadedFile);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
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
          {/* Upload Area */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-primary-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            {isDragActive ? (
              <p className="text-primary-600 font-medium">Drop the CSV file here...</p>
            ) : (
              <div>
                <p className="text-gray-600 mb-2">
                  Drag and drop your bank statement CSV file here, or click to browse
                </p>
                <p className="text-sm text-gray-500">
                  Supported formats: CSV files from Canara Bank, HDFC, ICICI, SBI, etc.
                </p>
              </div>
            )}
          </div>

          {/* File Preview */}
          {uploadedFile && (
            <div className="mt-6">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="w-5 h-5 text-primary-600" />
                <span className="font-medium text-gray-900">{uploadedFile.name}</span>
                <span className="text-sm text-gray-500">
                  ({(uploadedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>

              {/* Preview Table */}
              {previewData.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700">Preview (First 5 rows)</h3>
                  </div>
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
                                className="px-3 py-2 text-sm text-gray-900 max-w-xs truncate"
                                title={String(value)}
                              >
                                {String(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">What happens next?</h4>
                    <ul className="mt-2 text-sm text-blue-800 space-y-1">
                      <li>• Your transactions will be automatically categorized using AI</li>
                      <li>• Duplicate transactions will be detected and removed</li>
                      <li>• You can review and correct any mis-categorized transactions</li>
                      <li>• Your data is processed securely and privately</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="btn-secondary"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!uploadedFile || isProcessing}
              className="btn-primary flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload & Process
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 