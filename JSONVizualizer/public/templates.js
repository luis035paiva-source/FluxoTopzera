const TEMPLATE_CATEGORIES = [
  'Ano Novo (Réveillon)',
  'Férias',
  'Carnaval',
  'Quaresma',
  'Semana Santa',
  'Páscoa',
  'Dia das Mães',
  'Dia dos Namorados',
  'Festas Juninas (São João / São Pedro)',
  'Inverno',
  'Dia dos Pais',
  'Independência do Brasil',
  'Primavera',
  'Dia das Crianças',
  'Outubro Rosa',
  'Novembro Azul',
  'Black Friday',
  'Verão',
  'Natal',
  'Jogos da Seleção Brasileira',
  'Copa do Mundo',
  'Copa América',
  'Final de Campeonato Brasileiro',
  'Libertadores',
];

const MAX_PARALLEL_TPL = 3;

const tplState = {
  outputImages: [],
  templates: [],
  reviewQueue: [],
  reviewStats: { total: 0, saved: 0, cancelled: 0 },
  modalFilename: null,
  modalMode: 'review',
  modalTemplateId: null,
  analyzing: false,
};

const tpl = {
  btnLoad: document.getElementById('tplBtnLoad'),
  btnAnalyzeAll: document.getElementById('tplBtnAnalyzeAll'),
  btnImport: document.getElementById('tplBtnImport'),
  btnClear: document.getElementById('tplBtnClear'),
  importInput: document.getElementById('tplImportInput'),
  searchInput: document.getElementById('tplSearchInput'),
  filterCategoria: document.getElementById('tplFilterCategoria'),
  outputStatus: document.getElementById('tplOutputStatus'),
  outputGrid: document.getElementById('tplOutputGrid'),
  catalogCount: document.getElementById('tplCatalogCount'),
  catalogGrid: document.getElementById('tplCatalogGrid'),
  modal: document.getElementById('tplModal'),
  modalTitle: document.getElementById('tplModalTitle'),
  modalHint: document.getElementById('tplModalHint'),
  modalNome: document.getElementById('tplModalNome'),
  modalCategoria: document.getElementById('tplModalCategoria'),
  modalConfianca: document.getElementById('tplModalConfianca'),
  modalObservacoes: document.getElementById('tplModalObservacoes'),
  modalPreview: document.getElementById('tplModalPreview'),
  btnModalCancel: document.getElementById('tplBtnModalCancel'),
  btnModalSave: document.getElementById('tplBtnModalSave'),
  toast: document.getElementById('toast'),
};

function tplShowToast(message, isError = false) {
  tpl.toast.textContent = message;
  tpl.toast.classList.remove('hidden');
  tpl.toast.style.background = isError ? '#7f1d1d' : '#111827';
  setTimeout(() => tpl.toast.classList.add('hidden'), 2800);
}

function tplSetLoading(button, loading, loadingText = 'Carregando...') {
  if (!button) return;
  if (loading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}

async function tplRequestJson(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Erro na requisicao.');
  return data;
}

function tplFormatConfidence(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-';
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function tplFillCategorySelect(select, includeAll = false) {
  const options = includeAll
    ? ['Todas as categorias', ...TEMPLATE_CATEGORIES]
        .map((c, i) => `<option value="${i === 0 ? '' : c}">${c}</option>`)
        .join('')
    : TEMPLATE_CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('');
  select.innerHTML = options;
}

// ─── Output images ────────────────────────────────────────────────────────────

async function tplLoadOutputImages() {
  tplSetLoading(tpl.btnLoad, true, 'Carregando...');
  try {
    tplState.outputImages = await tplRequestJson('/api/output-images');
    tplRenderOutputGrid();
    tpl.outputStatus.textContent =
      tplState.outputImages.length === 0
        ? 'Nenhuma imagem encontrada na pasta output.'
        : `${tplState.outputImages.length} imagem(ns) encontrada(s).`;
  } catch (error) {
    tplShowToast(error.message, true);
  } finally {
    tplSetLoading(tpl.btnLoad, false);
  }
}

function tplRenderOutputGrid() {
  if (!tplState.outputImages.length) {
    tpl.outputGrid.innerHTML = '<p class="hint">Nenhuma imagem carregada. Clique em "Carregar imagens do output".</p>';
    return;
  }

  tpl.outputGrid.innerHTML = tplState.outputImages
    .map(({ filename, url }) => {
      return `
        <div class="catalog-item">
          <img src="${url}" alt="${filename}" />
          <p title="${filename}">${filename}</p>
          <div class="item-actions">
            <button class="btn primary tpl-btn-analyze-one" data-filename="${filename}" type="button">Analisar</button>
          </div>
        </div>
      `;
    })
    .join('');
}

// ─── Templates catalog ────────────────────────────────────────────────────────

async function tplLoadTemplates() {
  tplState.templates = await tplRequestJson('/api/templates');
  tplRenderCatalog();
}

function tplRenderCatalog() {
  const q = tpl.searchInput.value.trim().toLowerCase();
  const cat = tpl.filterCategoria.value;

  const filtered = tplState.templates.filter((item) => {
    const byName = !q || String(item.nomeTemplate || '').toLowerCase().includes(q);
    const byCat = !cat || item.categoria === cat;
    return byName && byCat;
  });

  const total = tplState.templates.length;
  const shown = filtered.length;
  tpl.catalogCount.textContent = `Templates: ${shown}${shown !== total ? ` de ${total}` : ''}`;

  if (!filtered.length) {
    tpl.catalogGrid.innerHTML = '<p class="hint">Nenhum template cadastrado.</p>';
    return;
  }

  tpl.catalogGrid.innerHTML = filtered
    .map((item) => {
      return `
        <div class="catalog-item">
          <img src="${item.imagePath}" alt="${item.nomeTemplate}" />
          <p><strong>${item.nomeTemplate}</strong></p>
          <p>${item.categoria}</p>
          <div class="item-actions">
            <button class="btn tpl-btn-edit" data-id="${item.id}" type="button">Editar</button>
            <button class="btn danger tpl-btn-delete" data-id="${item.id}" type="button">Excluir</button>
          </div>
        </div>
      `;
    })
    .join('');
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

async function tplRunWithConcurrency(items, worker, limit = 1) {
  const results = [];
  let index = 0;
  const safeLimit = Math.max(1, Number(limit) || 1);

  async function consume() {
    while (index < items.length) {
      const i = index;
      index += 1;
      results[i] = await worker(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(safeLimit, items.length) }, () => consume());
  await Promise.all(workers);
  return results;
}

async function tplAnalyzeOne(filename) {
  try {
    const response = await tplRequestJson('/api/templates/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename }),
    });

    const suggestion = response.data || {};
    return {
      ok: true,
      filename,
      draft: {
        nomeTemplate: suggestion.nomeTemplate || '',
        categoria: suggestion.categoria || TEMPLATE_CATEGORIES[0],
        confianca: suggestion.confianca,
        observacoes: suggestion.observacoes || '',
      },
    };
  } catch (error) {
    return { ok: false, filename, error: error.message };
  }
}

async function tplHandleAnalyzeAll() {
  if (tplState.analyzing) {
    tplShowToast('Analise em andamento.', true);
    return;
  }

  if (!tplState.outputImages.length) {
    tplShowToast('Carregue as imagens do output antes de analisar.', true);
    return;
  }

  tplState.analyzing = true;
  tplSetLoading(tpl.btnAnalyzeAll, true, 'Analisando...');
  tplSetLoading(tpl.btnLoad, true);

  try {
    const filenames = tplState.outputImages.map((img) => img.filename);
    tpl.outputStatus.textContent = `Analisando ${filenames.length} imagem(ns)...`;

    const results = await tplRunWithConcurrency(
      filenames,
      (filename) => tplAnalyzeOne(filename),
      MAX_PARALLEL_TPL
    );

    const success = results.filter((r) => r.ok);
    const failed = results.length - success.length;

    if (!success.length) {
      tplShowToast('Nenhuma imagem foi analisada com sucesso.', true);
      return;
    }

    tplState.reviewQueue = success.map((r) => ({ filename: r.filename, draft: r.draft }));
    tplState.reviewStats = { total: success.length, saved: 0, cancelled: 0 };

    if (failed > 0) {
      tplShowToast(`Analise: ${success.length} ok, ${failed} com erro.`);
    } else {
      tplShowToast(`${success.length} imagem(ns) pronta(s) para revisao.`);
    }

    tplOpenNextReview();
  } finally {
    tpl.outputStatus.textContent = `${tplState.outputImages.length} imagem(ns) carregada(s).`;
    tplState.analyzing = false;
    tplSetLoading(tpl.btnAnalyzeAll, false);
    tplSetLoading(tpl.btnLoad, false);
  }
}

async function tplHandleAnalyzeSingle(filename) {
  if (tplState.analyzing) {
    tplShowToast('Analise em andamento.', true);
    return;
  }

  tplState.analyzing = true;

  const btn = tpl.outputGrid.querySelector(`[data-filename="${filename}"]`);
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Analisando...';
  }

  try {
    const result = await tplAnalyzeOne(filename);

    if (!result.ok) {
      tplShowToast(`Erro ao analisar ${filename}: ${result.error}`, true);
      return;
    }

    tplState.reviewQueue = [{ filename: result.filename, draft: result.draft }];
    tplState.reviewStats = { total: 1, saved: 0, cancelled: 0 };
    tplOpenNextReview();
  } finally {
    tplState.analyzing = false;
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Analisar';
    }
  }
}

// ─── Review modal ─────────────────────────────────────────────────────────────

function tplOpenNextReview() {
  if (!tplState.reviewQueue.length) {
    tplCloseModal();
    const { saved, cancelled, total } = tplState.reviewStats;
    if (total > 0) {
      tplShowToast(`Revisao concluida: ${saved} salvos, ${cancelled} cancelados.`);
    }
    return;
  }

  const { filename, draft } = tplState.reviewQueue[0];
  const current = tplState.reviewStats.total - tplState.reviewQueue.length + 1;
  const total = tplState.reviewStats.total;

  tplState.modalMode = 'review';
  tplState.modalFilename = filename;
  tplState.modalTemplateId = null;

  tpl.modalTitle.textContent = 'Confirmar template';
  tpl.btnModalCancel.textContent = 'Cancelar';
  tpl.btnModalSave.textContent = 'Salvar';
  tpl.modalHint.textContent = `Revise e edite se necessario. (${current}/${total}) — ${filename}`;
  tpl.modalNome.value = draft.nomeTemplate || '';
  tpl.modalCategoria.value = TEMPLATE_CATEGORIES.includes(draft.categoria) ? draft.categoria : TEMPLATE_CATEGORIES[0];
  tpl.modalConfianca.value = tplFormatConfidence(draft.confianca);
  tpl.modalObservacoes.value = draft.observacoes || '';

  const imgEntry = tplState.outputImages.find((img) => img.filename === filename);
  tpl.modalPreview.src = imgEntry ? imgEntry.url : '';

  tpl.modal.classList.remove('hidden');
}

function tplOpenEditModal(id) {
  const item = tplState.templates.find((t) => t.id === id);
  if (!item) {
    tplShowToast('Template nao encontrado.', true);
    return;
  }

  tplState.modalMode = 'edit';
  tplState.modalFilename = null;
  tplState.modalTemplateId = id;

  tpl.modalTitle.textContent = 'Editar template';
  tpl.btnModalCancel.textContent = 'Fechar';
  tpl.btnModalSave.textContent = 'Atualizar';
  tpl.modalHint.textContent = `Editando: ${item.nomeTemplate}`;
  tpl.modalNome.value = item.nomeTemplate || '';
  tpl.modalCategoria.value = TEMPLATE_CATEGORIES.includes(item.categoria) ? item.categoria : TEMPLATE_CATEGORIES[0];
  tpl.modalConfianca.value = tplFormatConfidence(item.fonte?.ia?.confianca);
  tpl.modalObservacoes.value = item.fonte?.ia?.observacoes || '';
  tpl.modalPreview.src = item.imagePath || '';

  tpl.modal.classList.remove('hidden');
}

function tplCloseModal() {
  tpl.modal.classList.add('hidden');
  tplState.modalMode = 'review';
  tplState.modalFilename = null;
  tplState.modalTemplateId = null;
}

async function tplSaveModal() {
  if (tplState.modalMode === 'edit') {
    await tplSaveEdit();
    return;
  }

  const nomeTemplate = tpl.modalNome.value.trim();
  const categoria = tpl.modalCategoria.value;

  if (!nomeTemplate || !categoria) {
    tplShowToast('Preencha nome e categoria.', true);
    return;
  }

  const { filename, draft } = tplState.reviewQueue[0];
  const imgEntry = tplState.outputImages.find((img) => img.filename === filename);

  const payload = {
    nomeTemplate,
    categoria,
    observacoes: tpl.modalObservacoes.value.trim(),
    imagePath: imgEntry ? imgEntry.url : `/output-images/${encodeURIComponent(filename)}`,
    fonte: {
      originalFilename: filename,
      ia: {
        confianca: draft.confianca ?? null,
        observacoes: draft.observacoes || '',
      },
    },
  };

  const created = await tplRequestJson('/api/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  tplState.templates.unshift(created);
  tplRenderCatalog();
  tplState.reviewStats.saved += 1;
  tplState.reviewQueue.shift();
  tplOpenNextReview();
}

async function tplSaveEdit() {
  const item = tplState.templates.find((t) => t.id === tplState.modalTemplateId);
  if (!item) {
    tplCloseModal();
    return;
  }

  const nomeTemplate = tpl.modalNome.value.trim();
  const categoria = tpl.modalCategoria.value;

  if (!nomeTemplate || !categoria) {
    tplShowToast('Preencha nome e categoria.', true);
    return;
  }

  const payload = {
    nomeTemplate,
    categoria,
    observacoes: tpl.modalObservacoes.value.trim(),
    imagePath: item.imagePath,
    fonte: {
      originalFilename: item.fonte?.originalFilename || '',
      ia: {
        confianca: item.fonte?.ia?.confianca ?? null,
        observacoes: item.fonte?.ia?.observacoes || '',
      },
    },
  };

  const updated = await tplRequestJson(`/api/templates/${item.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  tplState.templates = tplState.templates.map((t) => (t.id === item.id ? updated : t));
  tplRenderCatalog();
  tplCloseModal();
  tplShowToast('Template atualizado.');
}

function tplCancelModal() {
  if (tplState.modalMode === 'edit') {
    tplCloseModal();
    return;
  }

  if (!tplState.reviewQueue.length) {
    tplCloseModal();
    return;
  }

  tplState.reviewStats.cancelled += 1;
  tplState.reviewQueue.shift();
  tplOpenNextReview();
}

// ─── Delete / clear ───────────────────────────────────────────────────────────

async function tplHandleDelete(id) {
  if (!id) return;
  if (!window.confirm('Excluir este template?')) return;

  try {
    await tplRequestJson(`/api/templates/${id}`, { method: 'DELETE' });
    tplState.templates = tplState.templates.filter((t) => t.id !== id);
    tplRenderCatalog();
    tplShowToast('Template excluido.');
  } catch (error) {
    tplShowToast(error.message, true);
  }
}

async function tplHandleClear() {
  if (!window.confirm('Limpar todos os templates?')) return;

  try {
    await tplRequestJson('/api/templates', { method: 'DELETE' });
    tplState.templates = [];
    tplRenderCatalog();
    tplShowToast('Templates limpos.');
  } catch (error) {
    tplShowToast(error.message, true);
  }
}

// ─── Import ───────────────────────────────────────────────────────────────────

async function tplHandleImport(file) {
  if (!file) return;

  const form = new FormData();
  form.append('file', file);

  try {
    const result = await tplRequestJson('/api/templates/import', { method: 'POST', body: form });
    await tplLoadTemplates();
    const r = result.report;
    tplShowToast(`Importado: ${r.validos} validos, ${r.ignorados} ignorados, total ${r.totalFinal}.`);
  } catch (error) {
    tplShowToast(error.message, true);
  }
}

// ─── Events ───────────────────────────────────────────────────────────────────

function tplBindEvents() {
  tpl.btnLoad.addEventListener('click', tplLoadOutputImages);
  tpl.btnAnalyzeAll.addEventListener('click', tplHandleAnalyzeAll);
  tpl.btnClear.addEventListener('click', tplHandleClear);

  tpl.btnImport.addEventListener('click', () => tpl.importInput.click());
  tpl.importInput.addEventListener('change', (e) => {
    tplHandleImport(e.target.files?.[0]);
    e.target.value = '';
  });

  tpl.searchInput.addEventListener('input', tplRenderCatalog);
  tpl.filterCategoria.addEventListener('change', tplRenderCatalog);

  tpl.outputGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.tpl-btn-analyze-one');
    if (btn) tplHandleAnalyzeSingle(btn.dataset.filename);
  });

  tpl.catalogGrid.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.tpl-btn-edit');
    if (editBtn) {
      tplOpenEditModal(editBtn.dataset.id);
      return;
    }

    const delBtn = e.target.closest('.tpl-btn-delete');
    if (delBtn) tplHandleDelete(delBtn.dataset.id);
  });

  tpl.btnModalCancel.addEventListener('click', tplCancelModal);
  tpl.btnModalSave.addEventListener('click', async () => {
    tplSetLoading(tpl.btnModalSave, true, 'Salvando...');
    try {
      await tplSaveModal();
    } catch (error) {
      tplShowToast(error.message, true);
    } finally {
      tplSetLoading(tpl.btnModalSave, false);
    }
  });

  tpl.modal.addEventListener('click', (e) => {
    if (e.target === tpl.modal) tplCancelModal();
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function tplInit() {
  tplFillCategorySelect(tpl.modalCategoria);
  tplFillCategorySelect(tpl.filterCategoria, true);
  tplBindEvents();

  tpl.outputGrid.innerHTML = '<p class="hint">Clique em "Carregar imagens do output" para comecar.</p>';

  try {
    await tplLoadTemplates();
  } catch (error) {
    tplShowToast(`Erro ao carregar templates: ${error.message}`, true);
  }
}

tplInit();
