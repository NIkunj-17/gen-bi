import { useState, useRef } from 'react'
import API_BASE from '../config'

interface Props {
  token: string
  userId: number
  onSuccess: (schemaName: string, tableName: string) => void
  onClose: () => void
}

export default function UploadModal({ token, onSuccess, onClose }: Props) {
  const [dragging,  setDragging]  = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState('')
  const [preview,   setPreview]   = useState<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(csv|xlsx|xls)$/i)) {
      setError('Only CSV and Excel files supported')
      return
    }

    setUploading(true)
    setError('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`${API_BASE}/api/upload`, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body:    formData
      })

      const data = await res.json()

      if (res.status === 401) {
        setError('Session expired — please logout and login again')
        return
      }

      if (!res.ok) {
        setError(data.detail || 'Upload failed')
        return
      }

      setPreview(data)
    } catch {
      setError('Could not connect to backend')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Upload Data</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {!preview ? (
          <>
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                dragging
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <p className="text-3xl mb-2">📂</p>
              <p className="text-sm font-medium text-gray-700">
                {uploading ? 'Uploading...' : 'Drop CSV or Excel file here'}
              </p>
              <p className="text-xs text-gray-400 mt-1">or click to browse</p>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>

            {error && (
              <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <p className="text-red-600 text-xs">{error}</p>
                {error.includes('expired') && (
                  <p className="text-red-500 text-xs mt-1">
                    Click logout in the sidebar and login again.
                  </p>
                )}
              </div>
            )}

            <p className="text-xs text-gray-400 mt-3 text-center">
              Supported: CSV, Excel (.xlsx, .xls) — max 10MB
            </p>
          </>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm font-medium text-green-800">
                ✅ {preview.rows_inserted} rows uploaded successfully
              </p>
              <p className="text-xs text-green-600 mt-0.5">
                Table: {preview.schema_name}.{preview.table_name}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">
                Columns detected:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {preview.columns.map((col: string) => (
                  <span
                    key={col}
                    className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                  >
                    {col}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">
                Preview (first 3 rows):
              </p>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="text-xs w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {preview.columns.map((col: string) => (
                        <th
                          key={col}
                          className="px-3 py-2 text-left text-gray-500 font-medium"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.preview.map((row: any, i: number) => (
                      <tr key={i} className="border-t border-gray-100">
                        {preview.columns.map((col: string) => (
                          <td key={col} className="px-3 py-2 text-gray-700">
                            {String(row[col] ?? '—')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onSuccess(preview.schema_name, preview.table_name)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium"
              >
                Start querying →
              </button>
              <button
                onClick={() => setPreview(null)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                Upload another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}