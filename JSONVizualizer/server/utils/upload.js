const multer = require('multer');
const { MAX_FILE_SIZE } = require('./constants');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('Arquivo invalido. Envie apenas imagens.'));
    }

    cb(null, true);
  },
});

module.exports = {
  upload,
};
