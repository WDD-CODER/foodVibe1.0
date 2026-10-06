import { downscaleImage, SMALL_IMAGE_BYTES } from './downscale-image.util'

/** Random-noise PNG — noise doesn't compress, so the file is large enough to trigger downscaling. */
async function noisePng(width: number, height: number, name = 'photo.png'): Promise<File> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(width, height)
  for (let i = 0; i < img.data.length; i++) img.data[i] = (i + 1) % 4 === 0 ? 255 : Math.floor(Math.random() * 256)
  ctx.putImageData(img, 0, 0)
  const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'))
  return new File([blob], name, { type: 'image/png' })
}

async function dimensionsOf(file: File): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(file)
  const dims = { width: bitmap.width, height: bitmap.height }
  bitmap.close()
  return dims
}

describe('downscaleImage', () => {
  it('passes a small file through untouched', async () => {
    const small = new File([new Uint8Array(1024)], 'tiny.jpg', { type: 'image/jpeg' })
    expect(await downscaleImage(small)).toBe(small)
  })

  it('caps the longest edge and outputs JPEG', async () => {
    const big = await noisePng(2000, 1000)
    expect(big.size).toBeGreaterThan(SMALL_IMAGE_BYTES)

    const out = await downscaleImage(big)
    expect(out.type).toBe('image/jpeg')
    expect(out.name).toBe('photo.jpg')
    expect(out.size).toBeLessThan(big.size)
    expect(await dimensionsOf(out)).toEqual({ width: 1280, height: 640 })
  })

  it('respects a custom maxEdge on a portrait image', async () => {
    const big = await noisePng(900, 1800)
    const out = await downscaleImage(big, 600)
    expect(await dimensionsOf(out)).toEqual({ width: 300, height: 600 })
  })

  it('returns the original when the browser cannot decode it', async () => {
    const junk = new File([new Uint8Array(SMALL_IMAGE_BYTES + 1)], 'x.heic', { type: 'image/heic' })
    expect(await downscaleImage(junk)).toBe(junk)
  })
})
