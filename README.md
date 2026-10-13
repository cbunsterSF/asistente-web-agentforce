# Asistente Web · Agentforce (texto + voz)

![Asistente Web](docs/screenshot.png)

Sitio web para conversar con el agente de Agentforce **Asistente Web** (agente de servicio en español) por **texto y voz**.

- Chat con respuestas en tiempo real (palabra a palabra).
- **Micrófono**: dicta tu pregunta (reconocimiento de voz del navegador, `es-ES`).
- **Lectura en voz alta** de las respuestas, con botón para detener y para volver a escuchar cada mensaje.
- **Conversación por voz continua**: tras cada respuesta el micrófono se vuelve a abrir solo.
- Si empiezas a hablar mientras el asistente habla, se calla (interrupción natural).
- Reconexión automática si la sesión del agente caduca por inactividad.

## Arquitectura

```
Navegador (React + Web Speech API)
   │  /api/session · /api/session/:id/message (streaming) · DELETE /api/session/:id
   ▼
Servidor Node/Express  ── guarda las credenciales, nunca llegan al navegador
   │  OAuth 2.0 client credentials
   ▼
Agentforce Agent API  →  agente "Asistente_Web"
```

## Componentes en Salesforce (ya creados)

| Elemento | Valor |
|---|---|
| Agente | `Asistente_Web` (Agentforce Service Agent, Agent Script) · Id `0Xxak000004JcdZCAS` |
| Usuario del agente | `serviceagentagentforce062026184918322438@example.com` |
| External Client App | `Asistente Web API` · client credentials · scopes `api`, `refresh_token`, `chatbot_api`, `sfap_api` |
| Usuario "Run As" | administrador de la org |

## Requisitos

- Node.js 18.17 o superior.
- Navegador con voz: **Chrome o Edge** (recomendado) o Safari. Firefox no admite dictado (el chat por texto funciona igual).
- El micrófono solo funciona en `https://` o en `http://localhost`.

## Puesta en marcha (local)

```bash
npm install --include=dev
cp .env.example .env      # rellena SF_CLIENT_ID y SF_CLIENT_SECRET
npm run dev               # servidor en :3001 + web en http://localhost:5173
```

Modo producción local:

```bash
npm run build
npm start                 # todo en http://localhost:3001
```

### Variables de entorno (`.env`)

| Variable | Descripción |
|---|---|
| `SF_MY_DOMAIN` | My Domain de la org, p. ej. `https://trailsignup-01cedcd980ec47.my.salesforce.com` |
| `SF_CLIENT_ID` | Consumer Key de la External Client App "Asistente Web API" |
| `SF_CLIENT_SECRET` | Consumer Secret de la misma app |
| `SF_AGENT_ID` | Id del agente (`0Xxak000004JcdZCAS`) |
| `PORT` | Puerto del servidor (por defecto 3001) |

> Nunca subas `.env` a un repositorio (ya está en `.gitignore`).

## Publicar en internet con GitHub Codespaces

El repositorio incluye `.devcontainer/` para ejecutar la app en un Codespace con URL pública HTTPS.

1. Guarda las variables como *Codespaces secrets* del repositorio (Settings → Secrets and variables → Codespaces) o con la CLI:
   ```bash
   gh secret set SF_MY_DOMAIN     --app codespaces -R cbunsterSF/asistente-web-agentforce
   gh secret set SF_CLIENT_ID     --app codespaces -R cbunsterSF/asistente-web-agentforce
   gh secret set SF_CLIENT_SECRET --app codespaces -R cbunsterSF/asistente-web-agentforce
   gh secret set SF_AGENT_ID      --app codespaces -R cbunsterSF/asistente-web-agentforce
   ```
2. Crea el Codespace (instala dependencias y compila automáticamente):
   ```bash
   gh codespace create -R cbunsterSF/asistente-web-agentforce -b main -m basicLinux32gb --idle-timeout 240m
   ```
3. Arranca la app (Codespaces termina los procesos que deja el `postStartCommand`, así que se lanza por SSH; usa una clave sin passphrase, p. ej. `ssh-keygen -t ed25519 -N "" -f ~/.ssh/codespaces.auto`):
   ```bash
   gh codespace ssh -c <nombre> -- -i ~/.ssh/codespaces.auto 'bash /workspaces/asistente-web-agentforce/.devcontainer/start.sh'
   ```
4. Haz público el puerto: `gh codespace ports visibility 3001:public -c <nombre>`
5. Abre `https://<nombre>-3001.app.github.dev`.

> El Codespace se detiene tras 4 h de inactividad. Para volver a usarlo, repite los pasos 3 y 4 (el `gh codespace ssh` también lo enciende).

## Publicar en internet (Heroku, Render, Railway…)

1. Sube el proyecto a un repositorio (sin `.env`).
2. Comando de build: `npm install --include=dev && npm run build`
3. Comando de inicio: `npm start`
4. Configura las variables `SF_MY_DOMAIN`, `SF_CLIENT_ID`, `SF_CLIENT_SECRET`, `SF_AGENT_ID` en el panel del proveedor (el `PORT` lo pone la plataforma).
5. Abre la URL `https://…` que te asignen: el micrófono requiere HTTPS.

## Rotar el Consumer Secret

Setup → External Client App Manager → **Asistente Web API** → Settings → OAuth Settings → Consumer Key and Secret → **Rotate/Generate new secret**. Actualiza `SF_CLIENT_SECRET` en `.env` (o en tu plataforma) y reinicia el servidor.

## Modificar el agente

El agente se define en Agent Script en `salesforce/force-app/main/default/aiAuthoringBundles/Asistente_Web/Asistente_Web.agent`. Tras cada nueva publicación del agente:

1. Vuelve a añadir la superficie **CustomerWebClient** al planner compilado (`GenAiPlannerBundle Asistente_Web_vN`), con el agente desactivado.
2. Activa la nueva versión.

Sin ese paso la Agent API responde `500 UNKNOWN_EXCEPTION`.

## Solución de problemas

| Síntoma | Causa probable |
|---|---|
| `No se pudo obtener el token: invalid client credentials` | Consumer Key/Secret incorrectos o rotados |
| `401` / `invalid_scope` | Faltan scopes `chatbot_api` / `sfap_api` en la app |
| `404` al crear sesión | `SF_AGENT_ID` incorrecto o agente inactivo |
| `500 UNKNOWN_EXCEPTION` | Falta la superficie CustomerWebClient tras republicar el agente |
| El micrófono no aparece | Navegador sin soporte (Firefox) o página sin HTTPS |
| No se oye la voz | Volumen/silencio del sistema o lectura en voz alta desactivada (icono de altavoz) |
| `EADDRINUSE` | El puerto está ocupado: cambia `PORT` |
