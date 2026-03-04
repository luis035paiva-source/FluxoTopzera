const express = require('express');
const multer = require('multer');
const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const {
  readCatalog,
  addCatalogItem,
  importCatalogItems,
  clearCatalog,
  removeCatalogItemById,
  updateCatalogItemById,
} = require('../services/catalogService');
const { upload } = require('../utils/upload');
const { CATALOG_FILE, CATEGORIES } = require('../utils/constants');

const router = express.Router();

const createItemSchema = z.object({
  nomeProduto: z.string().min(1),
  categoria: z.enum(CATEGORIES),
  subcategoria: z.string().min(1),
  imagem: z.object({
    relativePathOriginal: z.string().startsWith('/data/images/'),
    relativePathProcessada: z.string().startsWith('/data/images_processed/').optional().or(z.literal('')),
  }),
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

router.get('/', (_req, res) => {
  res.json(readCatalog());
});

router.post('/', (req, res) => {
  const parsed = createItemSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Payload invalido para salvar item.', errors: parsed.error.issues });
  }

  const payload = parsed.data;
  const item = {
    id: uuidv4(),
    nomeProduto: payload.nomeProduto,
    categoria: payload.categoria,
    subcategoria: payload.subcategoria,
    imagem: {
      relativePathOriginal: payload.imagem.relativePathOriginal,
      relativePathProcessada: payload.imagem.relativePathProcessada || '',
    },
    fonte: {
      originalFilename: payload.fonte.originalFilename || '',
      ia: {
        confianca: payload.fonte.ia.confianca ?? null,
        observacoes: payload.fonte.ia.observacoes || '',
      },
    },
  };

  const result = addCatalogItem(item);
  if (!result.ok) {
    return res.status(400).json({ message: 'Nao foi possivel salvar item.', errors: result.errors });
  }

  res.status(201).json(result.item);
});

router.get('/export', (_req, res) => {
  res.download(CATALOG_FILE, 'catalog.json');
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

    const result = importCatalogItems(input);
    if (!result.ok) {
      return res.status(400).json({ message: result.message || 'Importacao invalida.' });
    }

    return res.json(result);
  } catch (error) {
    console.error('[catalog] erro ao importar:', error.message);
    return res.status(400).json({ message: 'Falha ao importar JSON.', error: error.message });
  }
});

router.delete('/', (_req, res) => {
  clearCatalog();
  res.json({ message: 'Catalogo limpo com sucesso.' });
});

router.delete('/:id', (req, res) => {
  const parsed = z.string().uuid().safeParse(req.params.id);
  if (!parsed.success) {
    return res.status(400).json({ message: 'ID invalido.' });
  }

  const result = removeCatalogItemById(parsed.data);
  if (!result.ok) {
    return res.status(404).json({ message: result.message || 'Item nao encontrado.' });
  }

  return res.json({ message: 'Item removido com sucesso.' });
});

router.put('/:id', (req, res) => {
  const parsedId = z.string().uuid().safeParse(req.params.id);
  if (!parsedId.success) {
    return res.status(400).json({ message: 'ID invalido.' });
  }

  const parsedBody = createItemSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ message: 'Payload invalido para atualizar item.', errors: parsedBody.error.issues });
  }

  const payload = parsedBody.data;
  const item = {
    id: parsedId.data,
    nomeProduto: payload.nomeProduto,
    categoria: payload.categoria,
    subcategoria: payload.subcategoria,
    imagem: {
      relativePathOriginal: payload.imagem.relativePathOriginal,
      relativePathProcessada: payload.imagem.relativePathProcessada || '',
    },
    fonte: {
      originalFilename: payload.fonte.originalFilename || '',
      ia: {
        confianca: payload.fonte.ia.confianca ?? null,
        observacoes: payload.fonte.ia.observacoes || '',
      },
    },
  };

  const result = updateCatalogItemById(item);
  if (!result.ok) {
    if (result.message === 'Item nao encontrado.') {
      return res.status(404).json({ message: result.message });
    }
    return res.status(400).json({ message: result.message || 'Nao foi possivel atualizar item.', errors: result.errors });
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
