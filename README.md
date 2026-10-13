# Starbucks Chile · Demo de atención con Agentforce

![Landing](docs/screenshot.png)

Landing de demostración inspirada en [starbucks.cl](https://www.starbucks.cl/) para mostrar cómo se gestionan **preguntas frecuentes y casos de clientes** con un agente de Agentforce, por **chat y por voz**.

> Sitio de demostración. No es un sitio oficial ni está afiliado a Starbucks Coffee Company.

- El chat es el widget **Enhanced Chat v2** de Salesforce, con **Agentforce Voice** (botón para cambiar entre texto y voz).
- Las tarjetas de "¿En qué te podemos ayudar?" y los botones "Pregúntale al asistente" abren el widget con `embeddedservice_bootstrap.utilAPI.launchChat()` y sugieren una pregunta.
- Si el cliente pide hablar con una persona, el agente escala por Omni-Channel a la cola **Messaging**.

## Arquitectura

```
Navegador (landing React)
   │  bootstrap.min.js  →  widget Enhanced Chat v2 (despliegue VoiceChat)
   ▼
Salesforce Messaging (canal VoiceChat)  →  agente "Asistente_Web"
   │                                         └─ Agentforce Voice (STT + TTS)
   └─ escalamiento: flujo Asistente_Web_Escalamiento → cola Messaging
```

El servidor Node/Express solo sirve los archivos compilados; no guarda credenciales.

## Componentes en Salesforce

| Elemento | Valor |
|---|---|
| Agente | `Asistente_Web` (Agentforce Service Agent, Agent Script, locale `es_MX`) |
| Conexiones | Messaging y Enhanced Chat v2 (`customer_web_client`) + `modality voice` |
| Canal / despliegue | `VoiceChat` (Enhanced Chat v2, Agentforce Voice activado) |
| Flujo de escalamiento | `Asistente_Web_Escalamiento` → cola `SDO_Service_Messaging` |

El snippet del widget está en `web/index.html`. El dominio permitido en el canal es el del Codespace (`asistente-web-gx4q97x596qghw6gx-3001.app.github.dev`); si publicas en otro dominio, agrégalo en el canal y vuelve a publicar el despliegue.

## Puesta en marcha (local)

```bash
npm install --include=dev
npm run dev               # http://localhost:5173
```

El widget de Salesforce solo carga en los dominios configurados en el canal, así que en `localhost` se ve la landing sin el chat.

Modo producción:

```bash
npm run build
npm start                 # http://localhost:3001
```

## Publicar en internet con GitHub Codespaces

1. Crea el Codespace (instala dependencias y compila automáticamente):
   ```bash
   gh codespace create -R cbunsterSF/asistente-web-agentforce -b main -m basicLinux32gb --idle-timeout 240m
   ```
2. Arranca la app (Codespaces termina los procesos que deja el `postStartCommand`, así que se lanza por SSH; usa una clave sin passphrase, p. ej. `ssh-keygen -t ed25519 -N "" -f ~/.ssh/codespaces.auto`):
   ```bash
   gh codespace ssh -c <nombre> -- -i ~/.ssh/codespaces.auto 'bash /workspaces/asistente-web-agentforce/.devcontainer/start.sh'
   ```
3. Haz público el puerto: `gh codespace ports visibility 3001:public -c <nombre>`
4. Abre `https://<nombre>-3001.app.github.dev`.

> El Codespace se detiene tras 4 h de inactividad. Para volver a usarlo, repite los pasos 2 y 3. Si creas un Codespace nuevo, cambia el dominio en el canal VoiceChat.

## Modificar el agente

El agente se define en `salesforce/force-app/main/default/aiAuthoringBundles/Asistente_Web/Asistente_Web.agent`. La conexión Enhanced Chat v2 y la voz se configuraron en Agentforce Builder: antes de editar el archivo, recupera la última versión (`sf project retrieve start -m AiAuthoringBundle:Asistente_Web`) para no perder esos cambios. Luego valida, publica y activa:

```bash
sf agent validate authoring-bundle --api-name Asistente_Web
sf agent publish authoring-bundle --api-name Asistente_Web --json
sf agent activate --api-name Asistente_Web --version <N>
```

## Solución de problemas

| Síntoma | Causa probable |
|---|---|
| No aparece el botón del chat | El dominio de la página no está en el canal VoiceChat, o el despliegue no está publicado |
| No aparece el botón de voz | Falta "Allow Agentforce Voice for Enhanced Chat" en el canal; el botón aparece después del primer mensaje |
| La voz responde en inglés | Idioma por defecto del agente o voz de Voice Settings en inglés |
| La URL pública responde `401` | La app no está corriendo en el Codespace (repite los pasos 2 y 3) |
