const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

type Limits = { minWidth: number; minHeight: number; maxWidth: number; maxHeight: number }

export type PreparedImage = { file: File; previewUrl: string; width: number; height: number }

const encode = (canvas: HTMLCanvasElement, type: string) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.86))

/**
 * Shrinks a phone photo or poster before upload so large camera files still fit the server limit.
 * Drawing to a canvas also applies the photo's rotation and drops its location metadata; the server re-encodes again.
 */
export async function prepareImage(file: File, limits: Limits): Promise<PreparedImage> {
  if (!ACCEPTED_TYPES.includes(file.type)) throw new Error('Choose a JPEG, PNG, or WebP image.')

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('This image could not be opened. Try another file.')
  }
  const { width, height } = bitmap
  if (width < limits.minWidth || height < limits.minHeight) {
    bitmap.close()
    throw new Error(`This image is ${width} × ${height} pixels. Use one at least ${limits.minWidth} × ${limits.minHeight} so it stays sharp.`)
  }

  const scale = Math.min(1, limits.maxWidth / bitmap.width, limits.maxHeight / bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  if (canvas.width < limits.minWidth || canvas.height < limits.minHeight) {
    bitmap.close()
    throw new Error('This image is very long and narrow. Crop it closer to a square or landscape shape.')
  }
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  // Safari cannot encode WebP and silently returns PNG, which would be far larger than a JPEG.
  let blob = await encode(canvas, 'image/webp')
  if (blob?.type !== 'image/webp') blob = await encode(canvas, 'image/jpeg')
  if (!blob) throw new Error('This image could not be prepared. Try another file.')
  if (blob.size > MAX_UPLOAD_BYTES) throw new Error('This image is still larger than 5 MB after resizing. Try a smaller file.')

  const extension = blob.type === 'image/webp' ? 'webp' : 'jpg'
  const prepared = new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'cover'}.${extension}`, { type: blob.type })
  return { file: prepared, previewUrl: URL.createObjectURL(prepared), width: canvas.width, height: canvas.height }
}
