// ─────────────────────────────────────────────────────────────────────────────
// Utilidad de compresión de imágenes
// Garantiza fotos ≤ maxKB (300 KB por defecto) redimensionando y bajando
// calidad JPEG de forma iterativa. Compatible con iOS/Android/desktop.
// ─────────────────────────────────────────────────────────────────────────────

function cargarImagen(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')) }
    img.src = url
  })
}

function canvasABlob(canvas, calidad) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Error al procesar la imagen')),
      'image/jpeg',
      calidad,
    )
  })
}

/**
 * Comprime una imagen a JPEG garantizando un peso máximo.
 * @param {File}   file    - Archivo de imagen original (cámara o galería)
 * @param {object} opts
 * @param {number} opts.maxDim - Lado máximo en px (default 1280)
 * @param {number} opts.maxKB  - Peso máximo en KB (default 300)
 * @returns {Promise<{ blob: Blob, sizeKB: number, width: number, height: number }>}
 */
export async function comprimirImagen(file, { maxDim = 1280, maxKB = 300 } = {}) {
  if (!file?.type?.startsWith('image/')) {
    throw new Error('El archivo seleccionado no es una imagen')
  }

  const img = await cargarImagen(file)

  let escala = Math.min(1, maxDim / Math.max(img.width, img.height))
  const CALIDADES = [0.85, 0.7, 0.6, 0.5, 0.4]
  const MAX_REDUCCIONES = 4

  for (let intento = 0; intento <= MAX_REDUCCIONES; intento++) {
    const w = Math.max(1, Math.round(img.width  * escala))
    const h = Math.max(1, Math.round(img.height * escala))

    const canvas = document.createElement('canvas')
    canvas.width  = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#FFFFFF'          // fondo blanco por si hay transparencia
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)

    for (const calidad of CALIDADES) {
      const blob = await canvasABlob(canvas, calidad)
      const sizeKB = Math.round(blob.size / 1024)
      if (sizeKB <= maxKB) {
        return { blob, sizeKB, width: w, height: h }
      }
    }

    // Si ninguna calidad alcanzó el peso, reducir dimensiones y reintentar
    escala *= 0.8
  }

  throw new Error('No se pudo comprimir la imagen por debajo del límite')
}
