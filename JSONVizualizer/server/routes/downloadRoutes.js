const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { DOWNLOADS_DIR } = require('../utils/constants');
const { ensureDir } = require('../utils/fs');
const { productNameToFileBase, downloadAndSave, listDownloadedFiles } = require('../services/downloadService');
const { saveOriginalImage, saveProcessedImage } = require('../services/imageService');
const { removeBackgroundWithPicWish } = require('../services/picwishService');
const { analyzeProduct } = require('../services/analyzeService');
const { addCatalogItem } = require('../services/catalogService');

const router = express.Router();

// POST /api/downloads/fetch
// Recebe URLs de imagens e nome do produto, baixa e salva em C:/PythonPhotoshop/downloads/
router.post('/fetch', async (req, res) => {
  try {
    const { urls, productName } = req.body;

    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ ok: false, message: 'urls deve ser um array nao vazio.' });
    }

    if (!productName || typeof productName !== 'string') {
      return res.status(400).json({ ok: false, message: 'productName e obrigatorio.' });
    }

    const baseName = productNameToFileBase(productName);
    if (!baseName) {
      return res.status(400).json({ ok: false, message: 'Nao foi possivel derivar nome base do produto.' });
    }

    ensureDir(DOWNLOADS_DIR);

    const results = [];
    let savedCount = 0;

    for (let i = 0; i < urls.length; i++) {
      const result = await downloadAndSave(urls[i], baseName, i + 1, DOWNLOADS_DIR);
      results.push(result);
      if (result.ok) savedCount++;
    }

    console.info(`[download] ${savedCount}/${urls.length} imagens salvas para "${baseName}"`);
    return res.json({
      ok: true,
      saved: savedCount,
      failed: urls.length - savedCount,
      baseName,
      results,
    });
  } catch (error) {
    console.error('[download] erro em /fetch:', error);
    return res.status(500).json({ ok: false, message: error.message });
  }
});

// POST /api/downloads/process
// Le imagens de C:/PythonPhotoshop/downloads/, remove fundo, analisa e adiciona ao catalogo
router.post('/process', async (req, res) => {
  try {
    const files = listDownloadedFiles();

    if (files.length === 0) {
      return res.json({ ok: true, message: 'Nenhuma imagem na pasta de downloads.', results: [] });
    }

    const results = [];

    for (const filename of files) {
      try {
        const filePath = path.join(DOWNLOADS_DIR, filename);
        const buffer = fs.readFileSync(filePath);
        const ext = path.extname(filename).toLowerCase();
        const mimetype = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

        // 1. Salvar como imagem original
        const relativePathOriginal = saveOriginalImage({ buffer, mimetype, originalname: filename });

        // 2. Remover fundo
        let relativePathProcessada = '';
        try {
          const processedBuffer = await removeBackgroundWithPicWish(buffer);
          relativePathProcessada = saveProcessedImage(processedBuffer);
        } catch (bgError) {
          console.warn(`[download] remocao de fundo falhou para ${filename}:`, bgError.message);
        }

        // 3. Analisar com IA
        const analysis = await analyzeProduct({
          originalFilename: filename,
          imagePath: relativePathOriginal,
        });

        // 4. Adicionar ao catalogo
        const catalogItem = {
          id: uuidv4(),
          nomeProduto: analysis.nomeProduto,
          categoria: analysis.categoria,
          subcategoria: analysis.subcategoria,
          imagem: {
            relativePathOriginal,
            relativePathProcessada,
          },
          fonte: {
            originalFilename: filename,
            ia: {
              confianca: analysis.confianca,
              observacoes: analysis.observacoes,
            },
          },
        };

        const addResult = addCatalogItem(catalogItem);
        if (!addResult.ok) {
          results.push({ ok: false, filename, error: 'Falha ao adicionar ao catalogo.', details: addResult.errors });
          continue;
        }

        results.push({ ok: true, filename, catalogItem: addResult.item });
        console.info(`[download] processado: ${filename} -> ${analysis.nomeProduto} (${analysis.categoria})`);
      } catch (error) {
        console.error(`[download] erro processando ${filename}:`, error.message);
        results.push({ ok: false, filename, error: error.message });
      }
    }

    const okCount = results.filter((r) => r.ok).length;
    const failCount = results.filter((r) => !r.ok).length;

    return res.json({
      ok: true,
      total: files.length,
      processed: okCount,
      failed: failCount,
      results,
    });
  } catch (error) {
    console.error('[download] erro em /process:', error);
    return res.status(500).json({ ok: false, message: error.message });
  }
});

// GET /api/downloads/list
// Lista arquivos na pasta de downloads
router.get('/list', (_req, res) => {
  try {
    const files = listDownloadedFiles();
    return res.json({ ok: true, files });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

// DELETE /api/downloads/clear
// Limpa a pasta de downloads apos processamento
router.delete('/clear', (_req, res) => {
  try {
    const files = listDownloadedFiles();
    for (const file of files) {
      fs.unlinkSync(path.join(DOWNLOADS_DIR, file));
    }
    return res.json({ ok: true, removed: files.length });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

module.exports = router;
