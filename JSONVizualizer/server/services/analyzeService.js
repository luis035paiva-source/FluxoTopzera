const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { z } = require('zod');
const { OpenAI } = require('openai');
const { CATEGORIES, OPENAI_LOGS_DIR } = require('../utils/constants');
const { isSafeRelativeDataPath } = require('../utils/fs');
const { absoluteFromRelativeProjectPath } = require('../utils/helpers');

const analyzeOutputSchema = z.object({
  nomeProduto: z.string().min(1).max(120),
  categoria: z.enum(CATEGORIES),
  subcategoria: z.string().min(1).max(60),
  confianca: z.number().min(0).max(1),
  observacoes: z.string().max(220),
});

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY nao configurada.');
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function writeOpenAILog(entry) {
  try {
    if (!fs.existsSync(OPENAI_LOGS_DIR)) {
      fs.mkdirSync(OPENAI_LOGS_DIR, { recursive: true });
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(OPENAI_LOGS_DIR, `${stamp}-${uuidv4()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf-8');
    console.info('[analyze] log salvo:', filePath);
  } catch (error) {
    console.error('[analyze] falha ao salvar log:', error.message);
  }
}

function extractJsonString(text) {
  const raw = String(text || '').trim();
  if (!raw) return '{}';

  // Remove blocos markdown: ```json ... ```
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced && fenced[1]) {
    return fenced[1].trim();
  }

  // Fallback: pega apenas o primeiro objeto JSON detectado.
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1);
  }

  return raw;
}

async function analyzeProduct({ originalFilename, imagePath, imageBase64 }) {
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const client = getOpenAIClient();

  let imageDataUrl = null;
  if (imageBase64 && typeof imageBase64 === 'string' && imageBase64.trim()) {
    imageDataUrl = imageBase64.startsWith('data:image/') ? imageBase64 : `data:image/png;base64,${imageBase64}`;
  } else if (imagePath && isSafeRelativeDataPath(imagePath)) {
    const abs = absoluteFromRelativeProjectPath(imagePath);
    if (fs.existsSync(abs)) {
      const base64 = fs.readFileSync(abs).toString('base64');
      imageDataUrl = `data:image/png;base64,${base64}`;
    }
  }

  const prompt = `Classifique um produto de acougue em JSON estrito.
Categorias validas: ${CATEGORIES.join(' | ')}.
Responda SOMENTE em JSON com este formato:
{"nomeProduto":"string","categoria":"uma categoria valida","subcategoria":"nome canonico","confianca":0.0,"observacoes":"string curta"}
Regras:
- subcategoria deve ser nome canonico do corte/produto, sem qualificadores como "em pedacos", "temperado", "bandeja", "kg", "promocao".
- se o produto for "coracao", diferencie quando possivel entre "coracao bovino" e "coracao de frango".
- nomeProduto deve ser objetivo e padronizado.
- confianca deve ser numero entre 0 e 1.
Arquivo original enviado: ${originalFilename || ''}.`;

  const input = [
    {
      role: 'user',
      content: imageDataUrl
        ? [{ type: 'input_text', text: prompt }, { type: 'input_image', image_url: imageDataUrl }]
        : [{ type: 'input_text', text: `${prompt} Sem imagem disponivel.` }],
    },
  ];

  const response = await client.responses.create({
    model,
    input,
    temperature: 0.1,
  });

  const text = response.output_text || '{}';
  const extractedJson = extractJsonString(text);

  writeOpenAILog({
    createdAt: new Date().toISOString(),
    model,
    originalFilename: originalFilename || '',
    imagePath: imagePath || '',
    hasImageBase64: Boolean(imageBase64),
    responseText: text,
    extractedJson,
    response,
  });

  let parsed;
  try {
    parsed = JSON.parse(extractedJson);
  } catch (_error) {
    throw new Error('Resposta da IA nao retornou JSON valido. Verifique logs em /data/logs/openai.');
  }

  const valid = analyzeOutputSchema.safeParse(parsed);
  if (!valid.success) {
    throw new Error('Resposta da IA fora do schema esperado. Verifique logs em /data/logs/openai.');
  }

  return valid.data;
}

module.exports = {
  analyzeProduct,
  analyzeOutputSchema,
};
