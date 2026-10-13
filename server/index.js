// Servidor estático de la landing. El chat (texto y voz) lo entrega el widget
// Enhanced Chat v2 de Salesforce, que se carga directamente en el navegador.
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { PORT = 3001 } = process.env;

const app = express();

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, '../dist');
app.use(express.static(dist));
app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html'), (err) => err && res.status(404).end()));

app.listen(PORT, () => console.log(`Servidor listo en http://localhost:${PORT}`));
