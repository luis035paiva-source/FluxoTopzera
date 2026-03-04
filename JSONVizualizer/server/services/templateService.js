const fs = require('fs');
const { z } = require('zod');
const { TEMPLATE_CATALOG_FILE, TEMPLATE_CATEGORIES } = require('../utils/constants');
const { ensureFile } = require('../utils/fs');

const templateItemSchema = z.object({
  id: z.string().uuid(),
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

function readTemplates() {
  ensureFile(TEMPLATE_CATALOG_FILE, '[]');
  try {
    const raw = fs.readFileSync(TEMPLATE_CATALOG_FILE, 'utf-8');
    const sanitized = String(raw || '[]').replace(/^\uFEFF/, '').trim();
    const parsed = JSON.parse(sanitized || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[templates] erro ao ler catalogo:', error.message);
    writeTemplates([]);
    return [];
  }
}

function writeTemplates(items) {
  fs.writeFileSync(TEMPLATE_CATALOG_FILE, JSON.stringify(items, null, 2), 'utf-8');
}

function addTemplateItem(item) {
  const parsed = templateItemSchema.safeParse(item);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues };
  }

  const templates = readTemplates();
  templates.push(parsed.data);
  writeTemplates(templates);
  return { ok: true, item: parsed.data };
}

function updateTemplateItemById(item) {
  const parsed = templateItemSchema.safeParse(item);
  if (!parsed.success) {
    return { ok: false, message: 'Payload invalido.', errors: parsed.error.issues };
  }

  const templates = readTemplates();
  const index = templates.findIndex((t) => t.id === parsed.data.id);
  if (index < 0) {
    return { ok: false, message: 'Item nao encontrado.' };
  }

  templates[index] = parsed.data;
  writeTemplates(templates);
  return { ok: true, item: parsed.data };
}

function removeTemplateItemById(id) {
  const templates = readTemplates();
  const next = templates.filter((t) => t.id !== id);

  if (next.length === templates.length) {
    return { ok: false, message: 'Item nao encontrado.' };
  }

  writeTemplates(next);
  return { ok: true };
}

function clearTemplates() {
  writeTemplates([]);
}

function importTemplateItems(items) {
  if (!Array.isArray(items)) {
    return { ok: false, message: 'O JSON de importacao deve ser um array.' };
  }

  let validCount = 0;
  let skippedCount = 0;
  const invalid = [];

  const existing = readTemplates();
  const mapById = new Map(existing.map((t) => [t.id, t]));

  for (const item of items) {
    const parsed = templateItemSchema.safeParse(item);
    if (!parsed.success) {
      skippedCount += 1;
      invalid.push({ item, errors: parsed.error.issues });
      continue;
    }

    validCount += 1;
    mapById.set(parsed.data.id, parsed.data);
  }

  const merged = Array.from(mapById.values());
  writeTemplates(merged);

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

module.exports = {
  readTemplates,
  addTemplateItem,
  updateTemplateItemById,
  removeTemplateItemById,
  clearTemplates,
  importTemplateItems,
  templateItemSchema,
};
