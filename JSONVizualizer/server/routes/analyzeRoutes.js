const express = require('express');
const { z } = require('zod');
const { analyzeProduct } = require('../services/analyzeService');

const router = express.Router();

const analyzeInputSchema = z.object({
  originalFilename: z.string().min(1),
  imagePath: z.string().optional(),
  imageBase64: z.string().optional(),
});

const emptyAnalysis = {
  nomeProduto: '',
  categoria: '',
  subcategoria: '',
  confianca: 0,
  observacoes: '',
};

router.post('/', async (req, res) => {
  const parsed = analyzeInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Payload invalido para analise.',
      errors: parsed.error.issues,
      data: emptyAnalysis,
    });
  }

  try {
    const data = await analyzeProduct(parsed.data);
    return res.json({ message: 'Analise concluida.', data });
  } catch (error) {
    console.error('[analyze] erro:', error.message);
    return res.status(500).json({
      message: 'Falha ao analisar produto com IA.',
      error: error.message,
      data: emptyAnalysis,
    });
  }
});

module.exports = router;
