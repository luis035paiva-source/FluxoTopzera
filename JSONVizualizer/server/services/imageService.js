const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { IMAGES_DIR, PROCESSED_IMAGES_DIR } = require('../utils/constants');
const { ensureDir, toPosixRelativePath, isSafeRelativeDataPath } = require('../utils/fs');
const { extensionFromMimetype, safeFileName, absoluteFromRelativeProjectPath } = require('../utils/helpers');

ensureDir(IMAGES_DIR);
ensureDir(PROCESSED_IMAGES_DIR);

function saveOriginalImage(file) {
  const ext = extensionFromMimetype(file.mimetype);
  const name = safeFileName(uuidv4(), ext);
  const absPath = path.join(IMAGES_DIR, name);
  fs.writeFileSync(absPath, file.buffer);

  const relativePath = toPosixRelativePath(absPath);
  console.info('[image] original salva:', relativePath);
  return relativePath;
}

function readImageBufferFromRelativePath(relativePath) {
  if (!isSafeRelativeDataPath(relativePath)) {
    throw new Error('Caminho relativo de imagem invalido.');
  }

  const abs = absoluteFromRelativeProjectPath(relativePath);
  if (!fs.existsSync(abs)) {
    throw new Error('Imagem nao encontrada no servidor.');
  }

  return fs.readFileSync(abs);
}

function saveProcessedImage(buffer) {
  const name = safeFileName(uuidv4(), '.png');
  const absPath = path.join(PROCESSED_IMAGES_DIR, name);
  fs.writeFileSync(absPath, buffer);

  const relativePath = toPosixRelativePath(absPath);
  console.info('[image] processada salva:', relativePath);
  return relativePath;
}

module.exports = {
  saveOriginalImage,
  readImageBufferFromRelativePath,
  saveProcessedImage,
};
