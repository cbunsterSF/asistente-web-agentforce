import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createSession, endSession, sendMessage } from './api.js';
import { sttSupported, ttsSupported, useSpeechRecognition, useSpeechSynthesis } from './speech.js';

const Icon = {
  mic: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><line x1="12" y1="17" x2="12" y2="22" /></svg>
  ),
  send: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7z" /></svg>
  ),
  speaker: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M19 5a10 10 0 0 1 0 14" /></svg>
  ),
  mute: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
  ),
  refresh: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>
  ),
  stop: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
  ),
  bot: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="12" rx="3" /><path d="M12 8V4" /><circle cx="12" cy="3" r="1" /><circle cx="8.5" cy="14" r="1.2" fill="currentColor" /><circle cx="15.5" cy="14" r="1.2" fill="currentColor" /></svg>
  ),
};

let idSeq = 0;
const newId = () => `m${++idSeq}`;

export default function App() {
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState('connecting'); // connecting | ready | error
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [voiceOn, setVoiceOn] = useState(ttsSupported);
  const [handsFree, setHandsFree] = useState(false);

  const seqRef = useRef(1);
  const sessionRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const handsFreeRef = useRef(handsFree);
  handsFreeRef.current = handsFree;
  const voiceOnRef = useRef(voiceOn);
  voiceOnRef.current = voiceOn;

  const tts = useSpeechSynthesis({ lang: 'es-ES' });
  const submitRef = useRef(() => {});
  const stt = useSpeechRecognition({ lang: 'es-ES', onFinal: (text) => submitRef.current(text) });

  // ---------- Sesión ----------
  const startSession = useCallback(async () => {
    setStatus('connecting');
    setError('');
    try {
      const { sessionId: sid, welcome } = await createSession();
      sessionRef.current = sid;
      seqRef.current = 1;
      setSessionId(sid);
      setStatus('ready');
      return { sid, welcome };
    } catch (e) {
      setStatus('error');
      setError(e.message);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    startSession().then((r) => {
      if (!cancelled && r?.welcome) setMessages([{ id: newId(), role: 'agent', text: r.welcome }]);
    });
    const onUnload = () => endSession(sessionRef.current);
    window.addEventListener('pagehide', onUnload);
    return () => {
      cancelled = true;
      window.removeEventListener('pagehide', onUnload);
    };
  }, [startSession]);

  const resetConversation = async () => {
    stt.abort();
    tts.cancel();
    endSession(sessionRef.current);
    setMessages([]);
    const r = await startSession();
    if (r?.welcome) {
      setMessages([{ id: newId(), role: 'agent', text: r.welcome }]);
      if (voiceOnRef.current) tts.speak(r.welcome);
    }
  };

  // ---------- Enviar ----------
  const submit = useCallback(
    async (rawText) => {
      const text = (rawText ?? '').trim();
      if (!text || busy || !sessionRef.current) return;
      tts.cancel();
      setError('');
      setInput('');
      setBusy(true);
      const agentId = newId();
      setMessages((m) => [...m, { id: newId(), role: 'user', text }, { id: agentId, role: 'agent', text: '', pending: true }]);

      const update = (patch) => setMessages((m) => m.map((x) => (x.id === agentId ? { ...x, ...patch(x) } : x)));
      let finalText = '';
      let streamed = '';

      const run = async (sid) => {
        let expired = false;
        await sendMessage(sid, text, seqRef.current++, (evt) => {
          if (evt.type === 'chunk') {
            streamed += evt.text;
            update((x) => ({ text: x.text + evt.text }));
          }
          else if (evt.type === 'message') {
            finalText = evt.text;
            update(() => ({ text: evt.text, pending: false }));
          } else if (evt.type === 'progress') update((x) => ({ progress: evt.text }));
          else if (evt.type === 'error') {
            if (evt.error === 'session_expired' || evt.status === 404) expired = true;
            else throw new Error(evt.error || 'Error del agente');
          }
        });
        return expired;
      };

      try {
        let expired = await run(sessionRef.current);
        if (expired) {
          streamed = '';
          update(() => ({ text: '' }));
          // La sesión caducó por inactividad: creamos una nueva y reenviamos.
          const r = await startSession();
          if (!r) throw new Error('No se pudo reconectar con el agente');
          expired = await run(r.sid);
          if (expired) throw new Error('La sesión no está disponible');
        }
        finalText = (finalText || streamed).trim();
        update(() => ({ text: finalText || 'No recibí respuesta del agente.', pending: false, progress: undefined }));
        const afterSpeak = () => {
          if (handsFreeRef.current && sttSupported) setTimeout(() => stt.start(), 250);
        };
        if (voiceOnRef.current && finalText) tts.speak(finalText, afterSpeak);
        else afterSpeak();
      } catch (e) {
        setError(e.message);
        update(() => ({ text: 'Lo siento, hubo un problema al obtener la respuesta.', pending: false, failed: true }));
      } finally {
        setBusy(false);
        inputRef.current?.focus();
      }
    },
    [busy, startSession, tts, stt]
  );
  submitRef.current = submit;

  // ---------- Micrófono ----------
  const toggleMic = () => {
    if (stt.listening) return stt.stop();
    tts.cancel(); // barge-in: si el agente habla, se calla
    stt.start();
  };

  const toggleHandsFree = () => {
    const next = !handsFree;
    setHandsFree(next);
    if (next) {
      setVoiceOn(true);
      if (!stt.listening && !busy) {
        tts.cancel();
        stt.start();
      }
    } else stt.abort();
  };

  // Autoscroll
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, stt.interim]);

  const statusLabel =
    status === 'connecting' ? 'Conectando…' : status === 'error' ? 'Sin conexión' : stt.listening ? 'Escuchando…' : tts.speaking ? 'Hablando…' : busy ? 'Pensando…' : 'En línea';

  return (
    <div className="page">
      <div className="chat">
        <header className="chat-header">
          <div className="avatar">{Icon.bot}</div>
          <div className="title">
            <h1>Asistente Web</h1>
            <span className={`status status-${status}`}>
              <i /> {statusLabel}
            </span>
          </div>
          <div className="header-actions">
            {ttsSupported && (
              <button
                className={`icon-btn ${voiceOn ? 'active' : ''}`}
                onClick={() => {
                  if (voiceOn) tts.cancel();
                  setVoiceOn(!voiceOn);
                }}
                title={voiceOn ? 'Desactivar lectura en voz alta' : 'Activar lectura en voz alta'}
                aria-pressed={voiceOn}
              >
                {voiceOn ? Icon.speaker : Icon.mute}
              </button>
            )}
            <button className="icon-btn" onClick={resetConversation} title="Nueva conversación" disabled={status === 'connecting'}>
              {Icon.refresh}
            </button>
          </div>
        </header>

        <main className="messages" ref={listRef} aria-live="polite">
          {messages.map((m) => (
            <div key={m.id} className={`row ${m.role}`}>
              <div className={`bubble ${m.failed ? 'failed' : ''}`}>
                {m.pending && !m.text ? (
                  <span className="typing">
                    <span />
                    <span />
                    <span />
                    {m.progress && <em>{m.progress}</em>}
                  </span>
                ) : (
                  m.text
                )}
                {m.role === 'agent' && !m.pending && m.text && ttsSupported && (
                  <button className="replay" onClick={() => tts.speak(m.text)} title="Escuchar">
                    {Icon.speaker}
                  </button>
                )}
              </div>
            </div>
          ))}
          {stt.listening && (
            <div className="row user">
              <div className="bubble interim">{stt.interim || 'Te escucho…'}</div>
            </div>
          )}
        </main>

        {(error || stt.error) && (
          <div className="alert" role="alert">
            {error || stt.error}
            {status === 'error' && (
              <button onClick={resetConversation} className="link-btn">
                Reintentar
              </button>
            )}
          </div>
        )}

        <footer className="composer">
          {tts.speaking && (
            <button className="stop-speaking" onClick={tts.cancel}>
              {Icon.stop} Detener voz
            </button>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
          >
            {sttSupported && (
              <button
                type="button"
                className={`mic ${stt.listening ? 'listening' : ''}`}
                onClick={toggleMic}
                disabled={status !== 'ready' || busy}
                title={stt.listening ? 'Detener y enviar' : 'Hablar'}
                aria-pressed={stt.listening}
              >
                {Icon.mic}
              </button>
            )}
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={status === 'ready' ? 'Escribe tu mensaje…' : 'Conectando con el agente…'}
              disabled={status !== 'ready'}
              aria-label="Mensaje"
            />
            <button type="submit" className="send" disabled={!input.trim() || busy || status !== 'ready'} title="Enviar">
              {Icon.send}
            </button>
          </form>
          <div className="footnote">
            {sttSupported ? (
              <label className="switch">
                <input type="checkbox" checked={handsFree} onChange={toggleHandsFree} disabled={status !== 'ready'} />
                <span /> Conversación por voz continua
              </label>
            ) : (
              <span>Tu navegador no admite dictado por voz. Usa Chrome, Edge o Safari para hablar con el asistente.</span>
            )}
            {tts.voiceName && voiceOn && <span className="voice-name">Voz: {tts.voiceName}</span>}
          </div>
        </footer>
      </div>
    </div>
  );
}
