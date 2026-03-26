/**
 * Leitura de texto na foto (lazy): carrega Tesseract só quando pedido.
 * Pré-processa imagem (EXIF, escala, contraste) e ajusta modo de segmentação para rótulos/espalhados.
 */
import { preprocessForOcr } from './preprocessForOcr';

const LANG = 'por+eng';

/** Texto muito curto: segunda passagem com segmentação “automática” clássica. */
const RETRY_PSM_THRESHOLD = 18;

export async function extractTextFromImage(file: File): Promise<string> {
  const canvas = await preprocessForOcr(file);
  const { createWorker, PSM } = await import('tesseract.js');
  const worker = await createWorker(LANG, 1, {
    logger: undefined,
  });
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      preserve_interword_spaces: '1',
    });
    let {
      data: { text },
    } = await worker.recognize(canvas);
    let out = text.replace(/\s+/g, ' ').trim();

    if (out.length < RETRY_PSM_THRESHOLD) {
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
        preserve_interword_spaces: '1',
      });
      ({
        data: { text },
      } = await worker.recognize(canvas));
      out = text.replace(/\s+/g, ' ').trim();
    }

    return out;
  } finally {
    await worker.terminate();
  }
}
