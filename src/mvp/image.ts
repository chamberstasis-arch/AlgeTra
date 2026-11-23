// Las fotos de celular suelen pesar 4–10 MB; Mathpix acepta 5 MB por petición.
// Solo se reduce lo necesario: una foto que ya cabe se envía tal cual, sin recomprimir.
const MAX_BYTES = 3.5 * 1024 * 1024
const MAX_EDGE = 3000

export async function prepareImage(file: File): Promise<File> {
  const small = file.size <= MAX_BYTES && (file.type === 'image/jpeg' || file.type === 'image/png')
  if (small) return file
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  for (const q of [0.92, 0.85, 0.75, 0.6]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', q))
    if (blob && (blob.size <= MAX_BYTES || q === 0.6))
      return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  }
  return file
}
