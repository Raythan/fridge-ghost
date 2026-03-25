/**
 * Leitura de texto na foto (lazy): só carrega a biblioteca quando você pede pra ler a imagem.
 */
export async function extractTextFromImage(file: File): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('por+eng', 1, {
    logger: undefined,
  });
  try {
    const {
      data: { text },
    } = await worker.recognize(file);
    return text.replace(/\s+/g, ' ').trim();
  } finally {
    await worker.terminate();
  }
}
