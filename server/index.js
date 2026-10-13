// Servidor puente entre el navegador y la Agent API de Agentforce.
// Las credenciales (client id / secret) viven SOLO aquí, nunca en el navegador.
import 'dotenv/config';
import express from 'express';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { SF_MY_DOMAIN, SF_CLIENT_ID, SF_CLIENT_SECRET, SF_AGENT_ID, PORT = 3001 } = process.env;
for (const [k, v] of Object.entries({ SF_MY_DOMAIN, SF_CLIENT_ID, SF_CLIENT_SECRET, SF_AGENT_ID })) {
  if (!v) {
    console.error(`Falta la variable de entorno ${k}. Revisa el archivo .env`);
    process.exit(1);
  }
}

const MY_DOMAIN = SF_MY_DOMAIN.replace(/\/+$/, '');
const AGENT_API = 'https://api.salesforce.com/einstein/ai-agent/v1';

// ---------- Token OAuth (client credentials) con caché ----------
let cached = { token: null, apiUrl: AGENT_API, expiresAt: 0 };

async function getToken(force = false) {
  if (!force && cached.token && Date.now() < cached.expiresAt) return cached;
  const res = await fetch(`${MY_DOMAIN}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: SF_CLIENT_ID,
      client_secret: SF_CLIENT_SECRET,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(`No se pudo obtener el token: ${data.error_description || data.error || res.status}`);
  }
  const base = data.api_instance_url ? `${data.api_instance_url.replace(/\/+$/, '')}/einstein/ai-agent/v1` : AGENT_API;
  cached = { token: data.access_token, apiUrl: base, expiresAt: Date.now() + 25 * 60 * 1000 };
  return cached;
}

// Llamada a la Agent API con reintento automático si el token caducó.
async function agentFetch(pathname, init = {}, retry = true) {
  const { token, apiUrl } = await getToken();
  const res = await fetch(`${apiUrl}${pathname}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  if (res.status === 401 && retry) {
    await getToken(true);
    return agentFetch(pathname, init, false);
  }
  return res;
}

const app = express();
app.use(express.json({ limit: '100kb' }));

// ---------- Crear sesión ----------
app.post('/api/session', async (_req, res) => {
  try {
    const r = await agentFetch(`/agents/${SF_AGENT_ID}/sessions`, {
      method: 'POST',
      body: JSON.stringify({
        externalSessionKey: randomUUID(),
        instanceConfig: { endpoint: MY_DOMAIN },
        streamingCapabilities: { chunkTypes: ['Text'] },
        bypassUser: true,
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json({ error: data.message || 'No se pudo iniciar la sesión', details: data });
    const welcome = (data.messages || []).map((m) => m.message).filter(Boolean).join('\n');
    res.json({ sessionId: data.sessionId, welcome });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ---------- Enviar mensaje (streaming SSE normalizado) ----------
app.post('/api/session/:id/message', async (req, res) => {
  const { text, sequenceId } = req.body || {};
  if (!text || typeof text !== 'string') return res.status(400).json({ error: 'Falta el texto del mensaje' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  try {
    const upstream = await agentFetch(`/sessions/${encodeURIComponent(req.params.id)}/messages/stream`, {
      method: 'POST',
      headers: { Accept: 'text/event-stream' },
      body: JSON.stringify({ message: { sequenceId: Number(sequenceId) || Date.now(), type: 'Text', text: text.slice(0, 4000) } }),
    });
    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text().catch(() => '');
      send({ type: 'error', status: upstream.status, error: upstream.status === 404 ? 'session_expired' : errText.slice(0, 500) });
      return res.end();
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let gotFinal = false;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const raw = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const dataLine = raw.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('');
        if (!dataLine) continue;
        let evt;
        try { evt = JSON.parse(dataLine); } catch { continue; }
        const m = evt.message || {};
        switch (m.type) {
          case 'TextChunk':
            send({ type: 'chunk', text: m.message || '' });
            break;
          case 'Inform':
            gotFinal = true;
            send({ type: 'message', text: m.message || '' });
            break;
          case 'Escalate':
            // La Agent API no puede transferir a una persona (no hay Omni-Channel en este canal).
            gotFinal = true;
            send({ type: 'message', text: 'En este chat no puedo transferirte con una persona. Usa el chat de atención en vivo de la página o contáctanos por los canales oficiales. ¿Te ayudo con algo más?' });
            break;
          case 'ProgressIndicator':
            send({ type: 'progress', text: m.message || '' });
            break;
          case 'Error':
            send({ type: 'error', error: m.message || 'Error del agente' });
            break;
          case 'EndOfTurn':
            send({ type: 'end' });
            break;
          default:
            if (m.type) console.log('Evento no manejado del agente:', m.type);
            break;
        }
      }
    }
    if (!gotFinal) send({ type: 'end' });
    res.end();
  } catch (e) {
    console.error(e);
    send({ type: 'error', error: e.message });
    res.end();
  }
});

// ---------- Cerrar sesión ----------
app.delete('/api/session/:id', async (req, res) => {
  try {
    const r = await agentFetch(`/sessions/${encodeURIComponent(req.params.id)}`, {
      method: 'DELETE',
      headers: { 'x-session-end-reason': 'UserRequest' },
    });
    res.status(r.ok ? 204 : r.status).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ---------- Front compilado (producción) ----------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, '../dist');
app.use(express.static(dist));
app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html'), (err) => err && res.status(404).end()));

app.listen(PORT, () => console.log(`Servidor listo en http://localhost:${PORT}`));
