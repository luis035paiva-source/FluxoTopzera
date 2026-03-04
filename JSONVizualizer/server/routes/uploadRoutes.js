const express = require('express');
const multer = require('multer');
const { upload } = require('../utils/upload');
const { saveOriginalImage } = require('../services/imageService');

const router = express.Router();

router.post('/original', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Nenhuma imagem enviada.' });
    }

    const relativePathOriginal = saveOriginalImage(req.file);
    return res.status(201).json({ relativePathOriginal });
  } catch (error) {
    console.error('[upload] erro:', error.message);
    return res.status(500).json({ message: 'Erro ao salvar imagem original.', error: error.message });
  }
});

router.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ message: error.message });
  }

  return res.status(400).json({ message: error.message || 'Falha no upload.' });
});

module.exports = router;
