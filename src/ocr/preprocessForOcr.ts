/**
 * Prepara a foto para o Tesseract: orientação EXIF, tamanho e contraste.
 * Fotos de geladeira costumam ser pequenas no sensor, escuras ou com reflexo —
 * isso ajuda mais que trocar só o idioma.
 */
const TARGET_LONG_EDGE_MIN = 1100;
const TARGET_LONG_EDGE_MAX = 2000;
const MAX_PIXELS = 3_500_000;

function clampByte(n: number): number {
  if (n < 0) return 0;
  if (n > 255) return 255;
  return Math.round(n);
}

export async function preprocessForOcr(file: File): Promise<HTMLCanvasElement> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    bitmap = await createImageBitmap(file);
  }

  try {
    const w = bitmap.width;
    const h = bitmap.height;
    const longEdge = Math.max(w, h);
    let scale = 1;
    if (longEdge < TARGET_LONG_EDGE_MIN) {
      scale = TARGET_LONG_EDGE_MIN / longEdge;
    } else if (longEdge > TARGET_LONG_EDGE_MAX) {
      scale = TARGET_LONG_EDGE_MAX / longEdge;
    }

    let nw = Math.max(1, Math.round(w * scale));
    let nh = Math.max(1, Math.round(h * scale));
    if (nw * nh > MAX_PIXELS) {
      const f = Math.sqrt(MAX_PIXELS / (nw * nh));
      nw = Math.max(1, Math.floor(nw * f));
      nh = Math.max(1, Math.floor(nh * f));
    }

    const canvas = document.createElement('canvas');
    canvas.width = nw;
    canvas.height = nh;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Canvas 2D não disponível');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, nw, nh);

    const imageData = ctx.getImageData(0, 0, nw, nh);
    const d = imageData.data;
    const pixels = nw * nh;
    let minL = 255;
    let maxL = 0;
    const lum = new Float32Array(pixels);

    for (let i = 0; i < pixels; i++) {
      const o = i * 4;
      const L = 0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2];
      lum[i] = L;
      if (L < minL) minL = L;
      if (L > maxL) maxL = L;
    }

    const range = Math.max(maxL - minL, 24);
    for (let i = 0; i < pixels; i++) {
      const o = i * 4;
      const v = clampByte(((lum[i] - minL) / range) * 255);
      d[o] = v;
      d[o + 1] = v;
      d[o + 2] = v;
      d[o + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  } finally {
    bitmap.close();
  }
}
