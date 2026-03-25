type SpeechRecCtor = new () => SpeechRecognitionLike;

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((ev: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((ev: SpeechRecognitionErrEvent) => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionResultEvent {
  results: {
    length: number;
    item(index: number): { readonly 0: { transcript: string } };
    [index: number]: { readonly 0: { transcript: string } };
  };
}

interface SpeechRecognitionErrEvent {
  error?: string;
}

function getRecognitionCtor(): SpeechRecCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecCtor;
    webkitSpeechRecognition?: SpeechRecCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechSupported(): boolean {
  return getRecognitionCtor() !== null;
}

/** Retorna função para parar escuta */
export function startDictation(
  onResult: (text: string) => void,
  onError: (message: string) => void
): () => void {
  const Ctor = getRecognitionCtor();
  if (!Ctor) {
    onError('Voz não suportada neste navegador (experimente Chrome no Android ou desktop).');
    return () => {};
  }
  const rec = new Ctor() as SpeechRecognitionLike;
  rec.lang = 'pt-BR';
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.onresult = (ev: SpeechRecognitionResultEvent) => {
    let t = '';
    for (let i = 0; i < ev.results.length; i++) {
      t += ev.results[i]![0]!.transcript;
    }
    onResult(t.trim());
  };
  rec.onerror = (ev: SpeechRecognitionErrEvent) => {
    onError(ev.error || 'erro de voz');
  };
  try {
    rec.start();
  } catch (e) {
    onError(e instanceof Error ? e.message : 'não foi possível iniciar o microfone');
  }
  return () => {
    try {
      rec.stop();
    } catch {
      /* noop */
    }
  };
}
