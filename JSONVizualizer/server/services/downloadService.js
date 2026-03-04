const fs = require('fs');
const path = require('path');
const { DOWNLOADS_DIR } = require('../utils/constants');
const { ensureDir } = require('../utils/fs');

ensureDir(DOWNLOADS_DIR);

const KNOWN_SUFFIX_RE = /\s*foto\s+produto\s+fundo\s+branco\s*/gi;
const IMAGE_EXT_RE = /\.(jpe?g|png|webp)$/i;

function removeAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function productNameToFileBase(rawName) {
  let name = rawName.replace(KNOWN_SUFFIX_RE, '').trim();
  name = removeAccents(name);
  return name
    .split(/[\s\-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

function extensionFromContentType(contentType) {
  if (!contentType) return '.jpg';
  if (contentType.includes('png')) return '.png';
  if (contentType.includes('webp')) return '.webp';
  return '.jpg';
}

async function downloadAndSave(url, baseName, index, destDir) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      return { ok: false, url, error: `HTTP ${res.status}` };
    }

    const contentType = res.headers.get('content-type') || '';
    const ext = extensionFromContentType(contentType);
    const buffer = Buffer.from(await res.arrayBuffer());

    if (buffer.length < 1000) {
      return { ok: false, url, error: 'Imagem muito pequena (< 1KB), provavelmente invalida.' };
    }

    const filename = `${baseName}${index}${ext}`;
    const filePath = path.join(destDir, filename);
    fs.writeFileSync(filePath, buffer);
    console.info(`[download] salvo: ${filePath}`);

    return { ok: true, filename, bytes: buffer.length };
  } catch (error) {
    clearTimeout(timeout);
    return { ok: false, url, error: error.name === 'AbortError' ? 'Timeout (15s)' : error.message };
  }
}

function listDownloadedFiles() {
  ensureDir(DOWNLOADS_DIR);
  return fs
    .readdirSync(DOWNLOADS_DIR)
    .filter((f) => IMAGE_EXT_RE.test(f))
    .sort();
}

module.exports = {
  productNameToFileBase,
  downloadAndSave,
  listDownloadedFiles,
  DOWNLOADS_DIR,
};
