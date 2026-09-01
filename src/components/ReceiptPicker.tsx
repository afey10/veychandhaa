import { useRef, useState } from 'react'
import { Camera, Loader2, X } from 'lucide-react'
import { compressImage } from '../utils/image'

interface ReceiptPickerProps {
  /** Existing receipt URL (e.g. when editing a record that already has one). */
  existingUrl?: string | null
  /** Called with the compressed, ready-to-upload image once the user picks one, or null if they remove it. */
  onChange: (file: Blob | null) => void
}

// Optional "attach a photo of the bill/receipt" control. Not required to
// submit the form — the caller decides whether to upload on save.
export default function ReceiptPicker({ existingUrl, onChange }: ReceiptPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [compressing, setCompressing] = useState(false)
  const [removedExisting, setRemovedExisting] = useState(false)

  const displayUrl = preview ?? (removedExisting ? null : existingUrl ?? null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setCompressing(true)
    try {
      const compressed = await compressImage(file)
      setPreview(URL.createObjectURL(compressed))
      setRemovedExisting(true) // a newly picked photo replaces any existing one
      onChange(compressed)
    } finally {
      setCompressing(false)
    }
  }

  function handleRemove() {
    setPreview(null)
    setRemovedExisting(true)
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <label className="label">Bill / Receipt Photo</label>
      <p className="text-xs text-slate-400 mb-2">Optional — a photo is compressed automatically before upload.</p>

      {displayUrl ? (
        <div className="relative inline-block">
          <img src={displayUrl} alt="Receipt preview" className="w-32 h-32 object-cover rounded-lg border border-slate-200" />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow"
            title="Remove photo"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={compressing}
          className="w-32 h-32 rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:border-navy-300 hover:text-navy-500 transition-colors"
        >
          {compressing ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
          <span className="text-xs font-medium">{compressing ? 'Compressing…' : 'Add Photo'}</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  )
}
