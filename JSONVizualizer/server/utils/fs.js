const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function ensureFile(filePath, fallbackContent = '[]') {
  if (!fs.existsSync(filePath)) {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, fallbackContent, 'utf-8');
  }
}

function toPosixRelativePath(absPath) {
  return `/${path.relative(path.resolve(__dirname, '..', '..'), absPath).replace(/\\/g, '/')}`;
}

function isSafeRelativeDataPath(p) {
  if (typeof p !== 'string') return false;
  if (!p.startsWith('/data/')) return false;
  if (p.includes('..')) return false;
  return true;
}

module.exports = {
  ensureDir,
  ensureFile,
  toPosixRelativePath,
  isSafeRelativeDataPath,
};
