const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { PICWISH_LOGS_DIR } = require('../utils/constants');

function writePicWishLog(entry) {
  try {
    if (!fs.existsSync(PICWISH_LOGS_DIR)) {
      fs.mkdirSync(PICWISH_LOGS_DIR, { recursive: true });
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(PICWISH_LOGS_DIR, `${stamp}-${uuidv4()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf-8');
    console.info('[picwish] log salvo:', filePath);
  } catch (error) {
    console.error('[picwish] falha ao salvar log:', error.message);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchTaskResult(taskId, apiKey) {
  const endpoints = [
    `https://techhk.aoscdn.com/api/tasks/visual/segmentation/${taskId}`,
    `https://techhk.aoscdn.com/api/tasks/visual/segmentation?task_id=${encodeURIComponent(taskId)}`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-KEY': apiKey,
        },
      });

      const text = await res.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch (_error) {
        data = null;
      }

      if (res.ok && data) {
        return { ok: true, status: res.status, data, endpoint: url };
      }
    } catch (_error) {
      // tenta o proximo endpoint
    }
  }

  return { ok: false };
}

async function downloadProcessedImage(imageUrl) {
  const maxAttempts = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) {
        lastError = new Error(`HTTP ${imgRes.status}`);
        writePicWishLog({
          createdAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          ok: false,
          phase: 'download-attempt',
          attempt,
          status: imgRes.status,
          imageUrl,
          error: `Falha ao baixar imagem processada do PicWish (HTTP ${imgRes.status}).`,
        });
        await sleep(600);
        continue;
      }

      const arrBuffer = await imgRes.arrayBuffer();
      const output = Buffer.from(arrBuffer);
      return output;
    } catch (error) {
      lastError = error;
      writePicWishLog({
        createdAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        ok: false,
        phase: 'download-attempt',
        attempt,
        status: 0,
        imageUrl,
        error: `Excecao ao baixar imagem processada: ${error.message}`,
      });
      await sleep(600);
    }
  }

  throw new Error(`Falha ao baixar imagem processada do PicWish. ${lastError ? lastError.message : ''}`.trim());
}

async function removeBackgroundWithPicWish(imageBuffer) {
  const apiKey = process.env.PICWISH_API_KEY;
  if (!apiKey) {
    throw new Error('PICWISH_API_KEY nao configurada.');
  }

  const form = new FormData();
  form.append('image_file', new Blob([imageBuffer]), 'image.png');

  const startedAt = new Date().toISOString();
  const response = await fetch('https://techhk.aoscdn.com/api/tasks/visual/segmentation', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
    },
    body: form,
  });

  if (!response.ok) {
    const errText = await response.text();
    writePicWishLog({
      createdAt: startedAt,
      finishedAt: new Date().toISOString(),
      ok: false,
      status: response.status,
      error: errText,
    });
    throw new Error(`PicWish erro HTTP ${response.status}: ${errText}`);
  }

  const data = await response.json();
  let imageUrl = data?.data?.image || '';

  const taskId = data?.data?.task_id;
  if (!imageUrl && taskId) {
    const maxAttempts = 15;
    const intervalMs = 1200;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      await sleep(intervalMs);
      const polled = await fetchTaskResult(taskId, apiKey);

      if (!polled.ok) {
        continue;
      }

      const polledImage = polled.data?.data?.image || '';
      if (polledImage) {
        imageUrl = polledImage;
        writePicWishLog({
          createdAt: startedAt,
          finishedAt: new Date().toISOString(),
          ok: true,
          phase: 'task-polled',
          status: polled.status,
          taskId,
          pollAttempt: attempt,
          pollEndpoint: polled.endpoint,
          responseData: polled.data,
        });
        break;
      }

      writePicWishLog({
        createdAt: startedAt,
        finishedAt: new Date().toISOString(),
        ok: true,
        phase: 'task-pending',
        status: polled.status,
        taskId,
        pollAttempt: attempt,
        pollEndpoint: polled.endpoint,
        responseData: polled.data,
      });
    }
  }

  if (!imageUrl) {
    writePicWishLog({
      createdAt: startedAt,
      finishedAt: new Date().toISOString(),
      ok: false,
      status: response.status,
      taskId: taskId || '',
      responseData: data,
      error: 'PicWish nao retornou URL da imagem processada nem apos polling.',
    });
    throw new Error('PicWish nao retornou URL da imagem processada (processamento ainda pendente).');
  }

  const output = await downloadProcessedImage(imageUrl);

  writePicWishLog({
    createdAt: startedAt,
    finishedAt: new Date().toISOString(),
    ok: true,
    status: response.status,
    imageUrl,
    outputBytes: output.length,
    responseData: data,
  });

  return output;
}

module.exports = {
  removeBackgroundWithPicWish,
};
