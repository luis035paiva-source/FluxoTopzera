const express = require('express');
const multer = require('multer');
const { upload } = require('../utils/upload');
const { saveProcessedImage, readImageBufferFromRelativePath } = require('../services/imageService');
const { saveOriginalImage } = require('../services/imageService');
const { removeBackgroundWithPicWish } = require('../services/picwishService');

const router = express.Router();

router.post('/remove-bg', upload.single('image'), async (req, res) => {
  try {
    let sourceBuffer;
    let relativePathOriginal = req.body.relativePathOriginal || '';

    if (req.file) {
      relativePathOriginal = saveOriginalImage(req.file);
      sourceBuffer = req.file.buffer;
    } else if (relativePathOriginal) {
      sourceBuffer = readImageBufferFromRelativePath(relativePathOriginal);
    } else {
      return res.status(400).json({ message: 'Envie uma imagem ou relativePathOriginal.' });
    }

    const processedBuffer = await removeBackgroundWithPicWish(sourceBuffer);
    const relativePathProcessada = saveProcessedImage(processedBuffer);

    return res.json({
      relativePathOriginal,
      relativePathProcessada,
      message: 'Remocao de fundo concluida com sucesso.',
    });
  } catch (error) {
    console.error('[picwish] erro remove-bg:', error.message);
    if (error.message.includes('PICWISH_API_KEY')) {
      return res.status(400).json({
        message: 'PicWish nao configurado no servidor. Continue sem remover fundo.',
        error: error.message,
      });
    }

    return res.status(500).json({ message: 'Falha ao remover fundo.', error: error.message });
  }
});

router.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ message: error.message });
  }

  return res.status(400).json({ message: error.message || 'Falha no upload.' });
});

module.exports = router;
