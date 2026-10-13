// Abre el widget Enhanced Chat v2 de Salesforce (cargado en index.html).
export function openChat() {
  const api = window.embeddedservice_bootstrap?.utilAPI;
  if (!api?.launchChat) {
    return Promise.reject(new Error('El chat aún se está cargando'));
  }
  return api.launchChat();
}
