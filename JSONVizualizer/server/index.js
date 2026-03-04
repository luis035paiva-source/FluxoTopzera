require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const {
  DATA_DIR,
  CATALOG_FILE,
  IMAGES_DIR,
  PROCESSED_IMAGES_DIR,
  OPENAI_LOGS_DIR,
  PICWISH_LOGS_DIR,
  TEMPLATE_CATALOG_FILE,
  PHOTOSHOP_OUTPUT_DIR,
  DOWNLOADS_DIR,
} = require('./utils/constants');
const { ensureDir, ensureFile } = require('./utils/fs');

const catalogRoutes = require('./routes/catalogRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const processRoutes = require('./routes/processRoutes');
const analyzeRoutes = require('./routes/analyzeRoutes');
const templateRoutes = require('./routes/templateRoutes');
const outputImagesRoutes = require('./routes/outputImagesRoutes');
const downloadRoutes = require('./routes/downloadRoutes');

ensureDir(DATA_DIR);
ensureDir(IMAGES_DIR);
ensureDir(PROCESSED_IMAGES_DIR);
ensureDir(OPENAI_LOGS_DIR);
ensureDir(PICWISH_LOGS_DIR);
ensureFile(CATALOG_FILE, '[]');
ensureFile(TEMPLATE_CATALOG_FILE, '[]');
ensureDir(DOWNLOADS_DIR);

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/data', express.static(path.join(__dirname, '..', 'data')));
app.use('/output-images', express.static(PHOTOSHOP_OUTPUT_DIR));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/catalog', catalogRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/process', processRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/output-images', outputImagesRoutes);
app.use('/api/downloads', downloadRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, now: new Date().toISOString() });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.use((error, _req, res, _next) => {
  console.error('[server] erro nao tratado:', error);
  if (error instanceof SyntaxError && Object.prototype.hasOwnProperty.call(error, 'body')) {
    return res.status(400).json({ message: 'JSON invalido no corpo da requisicao.' });
  }
  res.status(500).json({ message: 'Erro interno do servidor.' });
});

const server = app.listen(PORT, () => {
  console.info(`[server] rodando em http://localhost:${PORT}`);
});

server.on('error', (error) => {
  if (error?.code === 'EADDRINUSE') {
    console.error(`[server] porta ${PORT} ja esta em uso. Encerre o processo antigo antes de iniciar outro.`);
    process.exit(1);
  }

  console.error('[server] falha ao iniciar servidor:', error);
  process.exit(1);
});
