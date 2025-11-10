'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { uploadDocument } from '@/lib/api'

interface DocumentUploadProps {
  onUploadSuccess: () => void
}

export default function DocumentUpload({ onUploadSuccess }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ]
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF, DOCX, and Excel files are supported')
      return
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      const result = await uploadDocument(file)

      clearInterval(progressInterval)
      setUploadProgress(100)

      toast.success(`Document "${file.name}" uploaded successfully`)
      onUploadSuccess()

    } catch (error: any) {
      toast.error(error.message || 'Upload failed')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }, [onUploadSuccess])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false,
    disabled: uploading
  })

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div
        {...getRootProps()}
        className={`
          bg-white rounded-lg p-12 text-center cursor-pointer transition-all shadow-sm
          ${uploading ? 'opacity-75 cursor-not-allowed' : ''}
          border-2 border-dashed
          ${isDragActive ? 'border-sky-500 bg-sky-50' : 'border-gray-300 hover:border-sky-400'}
        `}
      >
        <input {...getInputProps()} />

        <div className="space-y-6">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 bg-gray-50 rounded-lg flex items-center justify-center">
            <svg
              className={`w-8 h-8 ${isDragActive ? 'text-sky-500' : 'text-gray-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          {uploading ? (
            <div className="space-y-4">
              <p className="text-lg font-medium text-gray-900">Uploading...</p>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full bg-sky-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">{uploadProgress}% complete</p>
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  {isDragActive ? 'Drop your file here' : 'Upload Financial Documents'}
                </h3>
                <p className="text-gray-600 text-sm">
                  Drag and drop your files here, or click to browse
                </p>
              </div>

              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-50 rounded-full text-sm text-gray-700">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>PDF, DOCX, Excel up to 50MB</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Supported Documents Grid */}
      <div className="mt-6 bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center space-x-2 text-sm">
          <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Supported Document Types</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            'Annual Reports (10-K, 10-Q)',
            'Earnings Call Transcripts',
            'Financial Statements',
            'Excel Financial Models (.xlsx, .xls)',
            'Market Research Reports',
            'Investment Analysis Documents',
          ].map((item, index) => (
            <div key={index} className="flex items-center space-x-2 text-gray-700 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-sky-500"></div>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}