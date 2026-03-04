const express = require('express');
const multer = require('multer');
const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const {
  readTemplates,
  addTemplateItem,
  updateTemplateItemById,
  removeTemplateItemById,
  clearTemplates,
  importTemplateItems,
} = require('../services/templateService');
const { analyzeTemplate } = require('../services/analyzeTemplateService');
const { upload } = require('../utils/upload');
const { TEMPLATE_CATALOG_FILE, TEMPLATE_CATEGORIES } = require('../utils/constants');

const router = express.Router();

const createItemSchema = z.object({
  nomeTemplate: z.string().min(1).max(120),
  categoria: z.enum(TEMPLATE_CATEGORIES),
  observacoes: z.string().max(220).optional().default(''),
  imagePath: z.string().min(1),
  fonte: z
    .object({
      originalFilename: z.string().max(260).optional().default(''),
      ia: z
        .object({
          confianca: z.number().min(0).max(1).nullable().optional().default(null),
          observacoes: z.string().max(220).optional().default(''),
        })
        .optional()
        .default({ confianca: null, observacoes: '' }),
    })
    .optional()
    .default({ originalFilename: '', ia: { confianca: null, observacoes: '' } }),
});

function emptyAnalysis() {
  return { nomeTemplate: '', categoria: '', confianca: 0, observacoes: '' };
}

router.get('/', (_req, res) => {
  res.json(readTemplates());
});

router.post('/', (req, res) => {
  const parsed = createItemSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Payload invalido.', errors: parsed.error.issues });
  }

  const payload = parsed.data;
  const item = {
    id: uuidv4(),
    nomeTemplate: payload.nomeTemplate,
    categoria: payload.categoria,
    observacoes: payload.observacoes || '',
    imagePath: payload.imagePath,
    fonte: payload.fonte,
  };

  const result = addTemplateItem(item);
  if (!result.ok) {
    return res.status(400).json({ message: 'Nao foi possivel salvar template.', errors: result.errors });
  }

  res.status(201).json(result.item);
});

router.get('/export', (_req, res) => {
  res.download(TEMPLATE_CATALOG_FILE, 'templates.json');
});

router.post('/import', upload.single('file'), (req, res) => {
  try {
    let input = req.body;

    if (req.file) {
      const raw = req.file.buffer.toString('utf-8');
      input = JSON.parse(raw);
    } else if (typeof req.body.items === 'string') {
      input = JSON.parse(req.body.items);
    }

    const result = importTemplateItems(input);
    if (!result.ok) {
      return res.status(400).json({ message: result.message || 'Importacao invalida.' });
    }

    return res.json(result);
  } catch (error) {
    console.error('[templates] erro ao importar:', error.message);
    return res.status(400).json({ message: 'Falha ao importar JSON.', error: error.message });
  }
});

router.post('/analyze', async (req, res) => {
  const parsed = z.object({ filename: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'filename obrigatorio.', data: emptyAnalysis() });
  }

  try {
    const data = await analyzeTemplate({ filename: parsed.data.filename });
    return res.json({ message: 'Analise concluida.', data });
  } catch (error) {
    console.error('[analyze-template] erro:', error.message);
    return res.status(500).json({ message: 'Falha ao analisar template.', error: error.message, data: emptyAnalysis() });
  }
});

router.delete('/', (_req, res) => {
  clearTemplates();
  res.json({ message: 'Templates limpos com sucesso.' });
});

router.delete('/:id', (req, res) => {
  const parsed = z.string().uuid().safeParse(req.params.id);
  if (!parsed.success) {
    return res.status(400).json({ message: 'ID invalido.' });
  }

  const result = removeTemplateItemById(parsed.data);
  if (!result.ok) {
    return res.status(404).json({ message: result.message || 'Item nao encontrado.' });
  }

  return res.json({ message: 'Template removido com sucesso.' });
});

router.put('/:id', (req, res) => {
  const parsedId = z.string().uuid().safeParse(req.params.id);
  if (!parsedId.success) {
    return res.status(400).json({ message: 'ID invalido.' });
  }

  const parsedBody = createItemSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ message: 'Payload invalido.', errors: parsedBody.error.issues });
  }

  const payload = parsedBody.data;
  const item = {
    id: parsedId.data,
    nomeTemplate: payload.nomeTemplate,
    categoria: payload.categoria,
    observacoes: payload.observacoes || '',
    imagePath: payload.imagePath,
    fonte: payload.fonte,
  };

  const result = updateTemplateItemById(item);
  if (!result.ok) {
    if (result.message === 'Item nao encontrado.') {
      return res.status(404).json({ message: result.message });
    }
    return res.status(400).json({ message: result.message || 'Nao foi possivel atualizar.', errors: result.errors });
  }

  return res.json(result.item);
});

router.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ message: error.message });
  }
  if (error) {
    return res.status(400).json({ message: error.message || 'Erro no upload.' });
  }
});

module.exports = router;
