const fs = require('fs');
const { z } = require('zod');
const { CATALOG_FILE, CATEGORIES } = require('../utils/constants');
const { ensureFile } = require('../utils/fs');

const imageSchema = z.object({
  relativePathOriginal: z.string().min(1).startsWith('/data/images/'),
  relativePathProcessada: z.string().startsWith('/data/images_processed/').optional().or(z.literal('')),
});

const sourceSchema = z.object({
  originalFilename: z.string().max(260).optional().default(''),
  ia: z
    .object({
      confianca: z.number().min(0).max(1).nullable().optional().default(null),
      observacoes: z.string().max(220).optional().default(''),
    })
    .optional()
    .default({ confianca: null, observacoes: '' }),
});

const catalogItemSchema = z.object({
  id: z.string().uuid(),
  nomeProduto: z.string().min(1),
  categoria: z.enum(CATEGORIES),
  subcategoria: z.string().min(1),
  imagem: imageSchema,
  fonte: sourceSchema.optional().default({ originalFilename: '', ia: { confianca: null, observacoes: '' } }),
});

function readCatalog() {
  ensureFile(CATALOG_FILE, '[]');
  try {
    const raw = fs.readFileSync(CATALOG_FILE, 'utf-8');
    const sanitized = String(raw || '[]').replace(/^\uFEFF/, '').trim();
    const parsed = JSON.parse(sanitized || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[catalog] erro ao ler catalogo:', error.message);
    writeCatalog([]);
    return [];
  }
}

function writeCatalog(items) {
  fs.writeFileSync(CATALOG_FILE, JSON.stringify(items, null, 2), 'utf-8');
}

function addCatalogItem(item) {
  const parsed = catalogItemSchema.safeParse(item);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues };
  }

  const catalog = readCatalog();
  catalog.push(parsed.data);
  writeCatalog(catalog);
  return { ok: true, item: parsed.data };
}

function importCatalogItems(items) {
  if (!Array.isArray(items)) {
    return { ok: false, message: 'O JSON de importacao deve ser um array.' };
  }

  let validCount = 0;
  let skippedCount = 0;
  const invalid = [];

  const existing = readCatalog();
  const mapById = new Map(existing.map((item) => [item.id, item]));

  for (const item of items) {
    const parsed = catalogItemSchema.safeParse(item);
    if (!parsed.success) {
      skippedCount += 1;
      invalid.push({ item, errors: parsed.error.issues });
      continue;
    }

    validCount += 1;
    mapById.set(parsed.data.id, parsed.data);
  }

  const merged = Array.from(mapById.values());
  writeCatalog(merged);

  return {
    ok: true,
    report: {
      recebidos: items.length,
      validos: validCount,
      ignorados: skippedCount,
      totalFinal: merged.length,
      invalid,
    },
  };
}

function clearCatalog() {
  writeCatalog([]);
}

function removeCatalogItemById(id) {
  const catalog = readCatalog();
  const next = catalog.filter((item) => item.id !== id);

  if (next.length === catalog.length) {
    return { ok: false, message: 'Item nao encontrado.' };
  }

  writeCatalog(next);
  return { ok: true };
}

function updateCatalogItemById(item) {
  const parsed = catalogItemSchema.safeParse(item);
  if (!parsed.success) {
    return { ok: false, message: 'Payload invalido para atualizar item.', errors: parsed.error.issues };
  }

  const catalog = readCatalog();
  const index = catalog.findIndex((entry) => entry.id === parsed.data.id);

  if (index < 0) {
    return { ok: false, message: 'Item nao encontrado.' };
  }

  catalog[index] = parsed.data;
  writeCatalog(catalog);
  return { ok: true, item: parsed.data };
}

module.exports = {
  readCatalog,
  writeCatalog,
  addCatalogItem,
  importCatalogItems,
  clearCatalog,
  removeCatalogItemById,
  updateCatalogItemById,
  catalogItemSchema,
};
