"use client"
import { useState, useRef, DragEvent } from "react"
import { Upload, FileUp, AlertCircle } from "lucide-react"
import type { Paper } from "@/lib/types"

interface Props {
  onUpload: (file: File) => Promise<Paper>
  disabled: boolean
}

export default function PDFUploader({ onUpload, disabled }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are supported.")
      return
    }
    setError(null)
    setIsUploading(true)
    try {
      await onUpload(file)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed. Please try again."
      setError(msg)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled || isUploading) return
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ""
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled && !isUploading) inputRef.current?.click()
        }}
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-all ${
          disabled
            ? "border-slate-700 opacity-50 cursor-not-allowed"
            : isUploading
            ? "border-indigo-600 bg-indigo-600/10 cursor-wait"
            : isDragging
            ? "border-indigo-500 bg-indigo-500/10 cursor-copy"
            : "border-slate-700 hover:border-indigo-600 hover:bg-slate-800/50 cursor-pointer"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleInputChange}
          disabled={disabled || isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500" />
            <p className="text-xs text-slate-400">Processing paper…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            {disabled ? (
              <FileUp className="w-6 h-6 text-slate-600" />
            ) : (
              <Upload className="w-6 h-6 text-indigo-400" />
            )}
            <p className="text-xs font-medium text-slate-300">
              {disabled ? "Limit reached" : "Drop PDF here"}
            </p>
            {!disabled && (
              <p className="text-xs text-slate-500">or click to browse</p>
            )}
          </div>
        )}
      </div>

      {disabled && (
        <p className="text-xs text-orange-400 text-center leading-relaxed">
          Start a new chat to analyze more papers.
        </p>
      )}

      {error && (
        <div className="flex items-start gap-1.5 text-xs text-red-400">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
