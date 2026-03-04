const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { z } = require('zod');
const { OpenAI } = require('openai');
const { TEMPLATE_CATEGORIES, OPENAI_LOGS_DIR, PHOTOSHOP_OUTPUT_DIR } = require('../utils/constants');

const analyzeTemplateOutputSchema = z.object({
  nomeTemplate: z.string().min(1).max(120),
  categoria: z.enum(TEMPLATE_CATEGORIES),
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
    const filePath = path.join(OPENAI_LOGS_DIR, `template-${stamp}-${uuidv4()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf-8');
    console.info('[analyze-template] log salvo:', filePath);
  } catch (error) {
    console.error('[analyze-template] falha ao salvar log:', error.message);
  }
}

function extractJsonString(text) {
  const raw = String(text || '').trim();
  if (!raw) return '{}';

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced && fenced[1]) return fenced[1].trim();

  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1);
  }

  return raw;
}

async function analyzeTemplate({ filename }) {
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const client = getOpenAIClient();

  const filePath = path.join(PHOTOSHOP_OUTPUT_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo nao encontrado: ${filename}`);
  }

  const base64 = fs.readFileSync(filePath).toString('base64');
  const ext = path.extname(filename).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  const imageDataUrl = `data:${mime};base64,${base64}`;

  const prompt = `Voce esta analisando templates visuais prontos para um acougue (loja de carnes).
Seu papel e categorizar o template pela ocasiao/tema visual que ele representa.
Categorias validas: ${TEMPLATE_CATEGORIES.join(' | ')}.
Responda SOMENTE em JSON com este formato exato:
{"nomeTemplate":"string curto descritivo","categoria":"uma categoria valida","confianca":0.0,"observacoes":"string curta com contexto visual"}
Regras:
- nomeTemplate deve ser curto e descritivo do visual do template (max 120 chars).
- categoria deve ser exatamente uma das categorias validas.
- confianca entre 0 e 1.
- observacoes descreve brevemente o visual (cores, elementos, estilo) em max 220 chars.
Arquivo: ${filename}`;

  const input = [
    {
      role: 'user',
      content: [
        { type: 'input_text', text: prompt },
        { type: 'input_image', image_url: imageDataUrl },
      ],
    },
  ];

  const response = await client.responses.create({ model, input, temperature: 0.1 });
  const text = response.output_text || '{}';
  const extractedJson = extractJsonString(text);

  writeOpenAILog({
    createdAt: new Date().toISOString(),
    model,
    filename,
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

  const valid = analyzeTemplateOutputSchema.safeParse(parsed);
  if (!valid.success) {
    throw new Error('Resposta da IA fora do schema esperado. Verifique logs em /data/logs/openai.');
  }

  return valid.data;
}

module.exports = { analyzeTemplate };
