"use client"

import { useState, useRef, useCallback } from "react"
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react"
import { Button } from "./button"
import { cn } from "@/lib/utils"

interface ImageUploadProps {
  value?: string
  onChange: (value: string | null) => void
  maxSizeKB?: number
  maxWidth?: number
  maxHeight?: number
  quality?: number
  accept?: string
  className?: string
  disabled?: boolean
  placeholder?: string
  cacheKey?: string // Optional key to cache in localStorage
}

/**
 * Compresses an image file to the specified dimensions and quality
 * Returns a base64 data URL
 */
async function compressImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    img.onload = () => {
      // Calculate new dimensions
      let width = img.width
      let height = img.height

      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height
        height = maxHeight
      }

      canvas.width = width
      canvas.height = height

      if (!ctx) {
        reject(new Error("Could not get canvas context"))
        return
      }

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height)
      const dataUrl = canvas.toDataURL("image/jpeg", quality)
      resolve(dataUrl)
    }

    img.onerror = () => reject(new Error("Failed to load image"))

    // Read file as data URL
    const reader = new FileReader()
    reader.onload = (e) => {
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsDataURL(file)
  })
}

/**
 * Calculates the size of a base64 string in KB
 */
function getBase64SizeKB(base64: string): number {
  // Remove data URL prefix if present
  const base64Data = base64.split(",")[1] || base64
  const padding = (base64Data.match(/=/g) || []).length
  return (base64Data.length * 0.75 - padding) / 1024
}

export function ImageUpload({
  value,
  onChange,
  maxSizeKB = 100,
  maxWidth = 200,
  maxHeight = 200,
  quality = 0.8,
  accept = "image/png,image/jpeg,image/jpg,image/webp",
  className,
  disabled,
  placeholder = "Upload image",
}: ImageUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(
    async (file: File) => {
      setError(null)
      setIsProcessing(true)

      try {
        // Validate file type
        if (!file.type.startsWith("image/")) {
          throw new Error("Please select an image file")
        }

        // Compress the image
        const compressed = await compressImage(file, maxWidth, maxHeight, quality)

        // Check final size
        const sizeKB = getBase64SizeKB(compressed)
        if (sizeKB > maxSizeKB) {
          // Try with lower quality
          const lowerQualityCompressed = await compressImage(
            file,
            maxWidth,
            maxHeight,
            quality * 0.6
          )
          const newSizeKB = getBase64SizeKB(lowerQualityCompressed)
          if (newSizeKB > maxSizeKB) {
            throw new Error(
              `Image too large (${Math.round(newSizeKB)}KB). Max size is ${maxSizeKB}KB.`
            )
          }
          onChange(lowerQualityCompressed)
        } else {
          onChange(compressed)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to process image")
      } finally {
        setIsProcessing(false)
      }
    },
    [maxWidth, maxHeight, quality, maxSizeKB, onChange]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        processFile(file)
      }
      // Reset input so same file can be selected again
      e.target.value = ""
    },
    [processFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) {
        processFile(file)
      }
    },
    [processFile]
  )

  const handleRemove = useCallback(() => {
    onChange(null)
    setError(null)
  }, [onChange])

  const handleClick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  return (
    <div className={cn("space-y-2", className)}>
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isProcessing}
      />

      {/* Preview or Upload area */}
      {value ? (
        <div className="relative inline-block">
          <img
            src={value}
            alt="Uploaded"
            className="h-20 w-20 rounded-lg object-cover border"
          />
          {!disabled && (
            <Button
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              onClick={handleRemove}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ) : (
        <div
          onClick={!disabled && !isProcessing ? handleClick : undefined}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={!disabled && !isProcessing ? handleDrop : undefined}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors",
            isDragOver && "border-primary bg-primary/5",
            !disabled && !isProcessing && "cursor-pointer hover:border-primary/50 hover:bg-muted/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Processing...</p>
            </>
          ) : (
            <>
              <div className="rounded-full bg-muted p-3">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">{placeholder}</p>
                <p className="text-xs text-muted-foreground">
                  Drag & drop or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Max {maxWidth}x{maxHeight}px, {maxSizeKB}KB
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Error message */}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Change button when image exists */}
      {value && !disabled && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={isProcessing}
        >
          <Upload className="mr-2 h-4 w-4" />
          Change Image
        </Button>
      )}
    </div>
  )
}
