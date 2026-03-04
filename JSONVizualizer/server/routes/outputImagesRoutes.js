const express = require('express');
const fs = require('fs');
const path = require('path');
const { PHOTOSHOP_OUTPUT_DIR } = require('../utils/constants');

const router = express.Router();

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.tiff', '.tif']);

router.get('/', (_req, res) => {
  try {
    if (!fs.existsSync(PHOTOSHOP_OUTPUT_DIR)) {
      return res.json([]);
    }

    const files = fs.readdirSync(PHOTOSHOP_OUTPUT_DIR);
    const images = files
      .filter((f) => {
        const ext = path.extname(f).toLowerCase();
        return IMAGE_EXTENSIONS.has(ext);
      })
      .map((filename) => ({
        filename,
        url: `/output-images/${encodeURIComponent(filename)}`,
      }));

    return res.json(images);
  } catch (error) {
    console.error('[output-images] erro ao listar:', error.message);
    return res.status(500).json({ message: 'Erro ao listar imagens do output.' });
  }
});

module.exports = router;
