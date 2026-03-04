const path = require('path');

function extensionFromMimetype(mimetype) {
  const map = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/bmp': '.bmp',
    'image/tiff': '.tiff',
  };

  return map[mimetype] || '.png';
}

function normalizeText(value) {
  return String(value || '').trim();
}

function safeFileName(base, ext) {
  const cleanExt = ext && ext.startsWith('.') ? ext : '.png';
  return `${base}${cleanExt.replace(/[^a-zA-Z0-9.]/g, '')}`;
}

function absoluteFromRelativeProjectPath(relPath) {
  return path.resolve(__dirname, '..', '..', relPath.replace(/^\//, ''));
}

module.exports = {
  extensionFromMimetype,
  normalizeText,
  safeFileName,
  absoluteFromRelativeProjectPath,
};
