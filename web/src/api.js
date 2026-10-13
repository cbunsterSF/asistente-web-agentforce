// Cliente del servidor puente.

export async function createSession() {
  const r = await fetch('/api/session', { method: 'POST' });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'No se pudo conectar con el agente');
  return data; // { sessionId, welcome }
}

export function endSession(sessionId) {
  if (!sessionId) return;
  // keepalive permite cerrar la sesión incluso al cerrar la pestaña
  fetch(`/api/session/${sessionId}`, { method: 'DELETE', keepalive: true }).catch(() => {});
}

/**
 * Envía un mensaje y va entregando eventos: {type:'chunk'|'message'|'progress'|'error'|'end', ...}
 */
export async function sendMessage(sessionId, text, sequenceId, onEvent, signal) {
  const r = await fetch(`/api/session/${sessionId}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, sequenceId }),
    signal,
  });
  if (!r.ok || !r.body) throw new Error('No se pudo enviar el mensaje');

  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 2);
      if (!line.startsWith('data:')) continue;
      try {
        onEvent(JSON.parse(line.slice(5).trim()));
      } catch {
        /* evento incompleto */
      }
    }
  }
}
