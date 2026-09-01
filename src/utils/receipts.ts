import { supabase } from '../lib/supabase'
import { receiptFileName } from './image'

const BUCKET = 'receipts'

// Uploads an already-compressed image (see ReceiptPicker / utils/image.ts)
// to the public "receipts" storage bucket, returning its public URL. Used
// for the optional bill/receipt photo on an expense — callers should treat
// this as best-effort: on failure they should still let the record save
// without a receipt rather than blocking the whole submission.
export async function uploadReceipt(blob: Blob): Promise<string> {
  const path = receiptFileName()

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false
  })
  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
