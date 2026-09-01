// Client-side image compression for receipt/bill photos before upload.
// Downscales to a max dimension and re-encodes as JPEG at a modest
// quality so phone photos (often 3-6 MB) shrink to a few hundred KB
// without a visible loss in legibility for a receipt.

const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.72

export async function compressImage(file: File): Promise<Blob> {
  // Non-image files (shouldn't happen given the <input accept>, but be safe)
  if (!file.type.startsWith('image/')) return file

  const bitmap = await loadBitmap(file)
  const { width, height } = scaledSize(bitmap.width, bitmap.height)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return file

  ctx.drawImage(bitmap, 0, 0, width, height)

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', JPEG_QUALITY)
  )

  // Fall back to the original file if canvas encoding failed, or if it
  // somehow produced something larger than the source.
  if (!blob || blob.size >= file.size) return file
  return blob
}

function scaledSize(width: number, height: number) {
  const largest = Math.max(width, height)
  if (largest <= MAX_DIMENSION) return { width, height }
  const scale = MAX_DIMENSION / largest
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file)
    } catch {
      // fall through to <img> based decoding below
    }
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (err) => {
      URL.revokeObjectURL(url)
      reject(err)
    }
    img.src = url
  })
}

// Always re-encoded as jpg, so the generated name never needs to carry
// (or leak) the original device/OS filename.
export function receiptFileName(): string {
  const random = Math.random().toString(36).slice(2, 10)
  return `${Date.now()}-${random}.jpg`
}
