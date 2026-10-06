/**
 * Shrinks a photo before it is base64-encoded and sent to the AI proxy.
 * The server caps JSON bodies at 2MB; a full-resolution phone photo is 4–10MB once encoded.
 */

/** Files at or under this size are sent as-is. */
export const SMALL_IMAGE_BYTES = 300 * 1024

export async function downscaleImage(file: File, maxEdge = 1280, quality = 0.8): Promise<File> {
  if (file.size <= SMALL_IMAGE_BYTES) return file

  let bitmap: ImageBitmap
  try {
    // 'from-image' applies the EXIF rotation, so portrait phone photos stay upright.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    // Format the browser can't decode (e.g. HEIC on desktop Chrome) — let the server decide.
    return file
  }

  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return file
  }
  // JPEG has no alpha — paint white so transparent PNGs don't turn black.
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  if (!blob || blob.size >= file.size) return file

  const name = file.name.replace(/\.[^.]*$/, '') + '.jpg'
  return new File([blob], name, { type: 'image/jpeg', lastModified: file.lastModified })
}
