// Voz del navegador: reconocimiento (STT) y síntesis (TTS) con Web Speech API.
import { useCallback, useEffect, useRef, useState } from 'react';

const SpeechRecognitionImpl = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export const sttSupported = !!SpeechRecognitionImpl;
export const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

/** Dictado por voz. onFinal recibe el texto final reconocido. */
export function useSpeechRecognition({ lang = 'es-ES', onFinal }) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const recRef = useRef(null);
  const finalRef = useRef('');
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  const start = useCallback(() => {
    if (!SpeechRecognitionImpl || recRef.current) return;
    setError('');
    finalRef.current = '';
    const rec = new SpeechRecognitionImpl();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalRef.current += t;
        else interimText += t;
      }
      setInterim(finalRef.current + interimText);
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setError('Permiso de micrófono denegado.');
      else if (e.error === 'no-speech') setError('No se detectó voz. Inténtalo de nuevo.');
      else if (e.error !== 'aborted') setError(`Error de reconocimiento: ${e.error}`);
    };
    rec.onend = () => {
      recRef.current = null;
      setListening(false);
      setInterim('');
      const text = finalRef.current.trim();
      if (text) onFinalRef.current?.(text);
    };
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      recRef.current = null;
    }
  }, [lang]);

  const stop = useCallback(() => recRef.current?.stop(), []);
  const abort = useCallback(() => {
    finalRef.current = '';
    recRef.current?.abort();
  }, []);

  useEffect(() => () => recRef.current?.abort(), []);
  return { listening, interim, error, start, stop, abort };
}

/** Limpia el texto para que suene natural al leerlo. */
function cleanForSpeech(text) {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, 'el enlace')
    .replace(/[*_#>`~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Lectura en voz alta con la mejor voz en español disponible. */
export function useSpeechSynthesis({ lang = 'es-ES' } = {}) {
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState([]);

  useEffect(() => {
    if (!ttsSupported) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  const pickVoice = useCallback(() => {
    const es = voices.filter((v) => v.lang?.toLowerCase().startsWith('es'));
    return (
      es.find((v) => v.lang === lang && /google|natural|neural|premium|enhanced/i.test(v.name)) ||
      es.find((v) => v.lang === lang) ||
      es.find((v) => /google|natural|neural/i.test(v.name)) ||
      es[0] ||
      null
    );
  }, [voices, lang]);

  const speak = useCallback(
    (text, onDone) => {
      if (!ttsSupported || !text) return onDone?.();
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(cleanForSpeech(text));
      const v = pickVoice();
      if (v) u.voice = v;
      u.lang = v?.lang || lang;
      u.rate = 1.03;
      u.onstart = () => setSpeaking(true);
      u.onend = () => {
        setSpeaking(false);
        onDone?.();
      };
      u.onerror = () => {
        setSpeaking(false);
        onDone?.();
      };
      window.speechSynthesis.speak(u);
    },
    [pickVoice, lang]
  );

  const cancel = useCallback(() => {
    if (!ttsSupported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  return { speaking, speak, cancel, voiceName: pickVoice()?.name };
}
