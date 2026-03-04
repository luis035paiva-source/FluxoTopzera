const CATEGORIES = [
  'Bovinos',
  'Suínos',
  'Aves',
  'Miúdos & vísceras',
  'Embutidos frescos & preparados',
  'Frios & defumados',
  'Complementos',
  'Peixes',
];

const MAX_PARALLEL_ANALYSIS = 5;

const state = {
  catalog: [],
  selectedItems: [],
  reviewQueue: [],
  reviewStats: { total: 0, saved: 0, cancelled: 0 },
  modalItemId: null,
  modalMode: 'review',
  modalCatalogItemId: null,
  autoProcessing: false,
};

const el = {
  btnNew: document.getElementById('btnNew'),
  btnImport: document.getElementById('btnImport'),
  btnClear: document.getElementById('btnClear'),
  importInput: document.getElementById('importInput'),
  searchInput: document.getElementById('searchInput'),
  filterCategoria: document.getElementById('filterCategoria'),
  filterSubcategoria: document.getElementById('filterSubcategoria'),
  fileInput: document.getElementById('fileInput'),
  originalFileName: document.getElementById('originalFileName'),
  batchStatus: document.getElementById('batchStatus'),
  previewOriginal: document.getElementById('previewOriginal'),
  previewProcessed: document.getElementById('previewProcessed'),
  btnRemoveBg: document.getElementById('btnRemoveBg'),
  btnAutoFill: document.getElementById('btnAutoFill'),
  catalogCount: document.getElementById('catalogCount'),
  catalogGrid: document.getElementById('catalogGrid'),
  modal: document.getElementById('modal'),
  modalTitle: document.getElementById('modalTitle'),
  modalHint: document.getElementById('modalHint'),
  modalNome: document.getElementById('modalNome'),
  modalCategoria: document.getElementById('modalCategoria'),
  modalSubcategoria: document.getElementById('modalSubcategoria'),
  modalConfianca: document.getElementById('modalConfianca'),
  modalObservacoes: document.getElementById('modalObservacoes'),
  modalPreview: document.getElementById('modalPreview'),
  btnModalCancel: document.getElementById('btnModalCancel'),
  btnModalSave: document.getElementById('btnModalSave'),
  toast: document.getElementById('toast'),
};

function showToast(message, isError = false) {
  el.toast.textContent = message;
  el.toast.classList.remove('hidden');
  el.toast.style.background = isError ? '#7f1d1d' : '#111827';
  setTimeout(() => el.toast.classList.add('hidden'), 2800);
}

function fillCategorySelect(select, includeAll = false) {
  const options = includeAll
    ? ['Todas as categorias', ...CATEGORIES].map((c, idx) => `<option value="${idx === 0 ? '' : c}">${c}</option>`).join('')
    : CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('');
  select.innerHTML = options;
}

function setLoading(button, loading, loadingText = 'Carregando...') {
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

function setProcessingButtonsVisibility(isProcessing) {
  el.btnRemoveBg.hidden = isProcessing;
  el.btnAutoFill.hidden = isProcessing;
}

async function requestJson(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Erro na requisicao.');
  }
  return data;
}

function createClientItemId(index) {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
}

function clearSelectedItems() {
  state.selectedItems.forEach((item) => {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
  });
  state.selectedItems = [];
}

function updateSelectionInfo() {
  const count = state.selectedItems.length;
  if (count === 0) {
    el.originalFileName.textContent = '';
    return;
  }

  if (count === 1) {
    el.originalFileName.textContent = `Arquivo: ${state.selectedItems[0].originalFilename}`;
    return;
  }

  el.originalFileName.textContent = `${count} arquivos selecionados`;
}

function updateBatchStatus(text = '') {
  el.batchStatus.textContent = text;
}

function getPrimaryItem() {
  return state.selectedItems[0] || null;
}

function updatePrimaryPreview() {
  const item = getPrimaryItem();
  if (!item) {
    el.previewOriginal.src = '';
    el.previewProcessed.src = '';
    return;
  }

  el.previewOriginal.src = item.relativePathOriginal || item.previewUrl || '';
  el.previewProcessed.src = item.relativePathProcessada || '';
}

function resetForm() {
  clearSelectedItems();
  state.reviewQueue = [];
  state.reviewStats = { total: 0, saved: 0, cancelled: 0 };
  state.modalItemId = null;
  state.modalMode = 'review';
  state.modalCatalogItemId = null;
  state.autoProcessing = false;
  setProcessingButtonsVisibility(false);
  el.fileInput.value = '';
  el.previewOriginal.src = '';
  el.previewProcessed.src = '';
  updateSelectionInfo();
  updateBatchStatus('');
}

async function loadCatalog() {
  state.catalog = await requestJson('/api/catalog');
  renderCatalog();
}

function renderCatalog() {
  const q = el.searchInput.value.trim().toLowerCase();
  const cat = el.filterCategoria.value;
  const sub = el.filterSubcategoria.value.trim().toLowerCase();

  const filtered = state.catalog.filter((item) => {
    const byName = !q || String(item.nomeProduto || '').toLowerCase().includes(q);
    const byCat = !cat || item.categoria === cat;
    const bySub = !sub || String(item.subcategoria || '').toLowerCase().includes(sub);
    return byName && byCat && bySub;
  });

  const total = state.catalog.length;
  const shown = filtered.length;
  el.catalogCount.textContent = `Produtos: ${shown}${shown !== total ? ` de ${total}` : ''}`;

  if (!filtered.length) {
    el.catalogGrid.innerHTML = '<p>Nenhum item encontrado.</p>';
    return;
  }

  el.catalogGrid.innerHTML = filtered
    .map((item) => {
      const img = item.imagem?.relativePathProcessada || item.imagem?.relativePathOriginal || '';
      return `
        <div class="catalog-item">
          <img src="${img}" alt="${item.nomeProduto}" />
          <p><strong>${item.nomeProduto}</strong></p>
          <p>${item.categoria}</p>
          <p>${item.subcategoria}</p>
          <div class="item-actions">
            <button class="btn btn-edit-item" data-id="${item.id}" type="button">Editar</button>
            <button class="btn danger btn-delete-item" data-id="${item.id}" type="button">Excluir</button>
          </div>
        </div>
      `;
    })
    .join('');
}

async function ensureOriginalUploaded(item) {
  if (item.relativePathOriginal) return item.relativePathOriginal;
  if (!item.file) throw new Error('Arquivo invalido para upload.');

  const form = new FormData();
  form.append('image', item.file);

  const data = await requestJson('/api/upload/original', {
    method: 'POST',
    body: form,
  });

  item.relativePathOriginal = data.relativePathOriginal;
  return item.relativePathOriginal;
}

function formatConfidencePercent(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-';
  const bounded = Math.max(0, Math.min(1, value));
  return `${Math.round(bounded * 100)}%`;
}

function getModalItem() {
  if (!state.modalItemId) return null;
  return state.selectedItems.find((item) => item.id === state.modalItemId) || null;
}

function openModalForItem(item) {
  if (!item || !item.analysisDraft) return;

  const draft = item.analysisDraft;
  const categoria = CATEGORIES.includes(draft.categoria) ? draft.categoria : CATEGORIES[0];
  const queueIndex = state.reviewQueue.findIndex((id) => id === item.id);
  const current = queueIndex >= 0 ? queueIndex + 1 : 1;
  const total = state.reviewStats.total || 1;

  state.modalMode = 'review';
  state.modalItemId = item.id;
  state.modalCatalogItemId = null;

  el.modalTitle.textContent = 'Confirmar dados sugeridos';
  el.btnModalCancel.textContent = 'Cancelar';
  el.btnModalSave.textContent = 'Salvar';
  el.modalHint.textContent = `Revise e edite se necessario. (${current}/${total}) - ${item.originalFilename}`;
  el.modalNome.value = draft.nomeProduto || '';
  el.modalCategoria.value = categoria;
  el.modalSubcategoria.value = draft.subcategoria || '';
  el.modalConfianca.value = formatConfidencePercent(draft.confianca);
  el.modalObservacoes.value = draft.observacoes || '-';
  el.modalPreview.src = item.analysisImagePath || item.relativePathProcessada || item.relativePathOriginal || item.previewUrl || '';
  el.modal.classList.remove('hidden');
}

function openModalForCatalogItem(item) {
  if (!item) return;

  state.modalMode = 'catalog-edit';
  state.modalItemId = null;
  state.modalCatalogItemId = item.id;

  el.modalTitle.textContent = 'Editar item do catalogo';
  el.btnModalCancel.textContent = 'Fechar';
  el.btnModalSave.textContent = 'Atualizar';
  el.modalHint.textContent = `Edite os dados aprovados do item: ${item.nomeProduto}`;
  el.modalNome.value = item.nomeProduto || '';
  el.modalCategoria.value = CATEGORIES.includes(item.categoria) ? item.categoria : CATEGORIES[0];
  el.modalSubcategoria.value = item.subcategoria || '';
  el.modalConfianca.value = formatConfidencePercent(item.fonte?.ia?.confianca);
  el.modalObservacoes.value = item.fonte?.ia?.observacoes || '-';
  el.modalPreview.src = item.imagem?.relativePathProcessada || item.imagem?.relativePathOriginal || '';
  el.modal.classList.remove('hidden');
}

function closeModal() {
  el.modal.classList.add('hidden');
  state.modalMode = 'review';
  state.modalItemId = null;
  state.modalCatalogItemId = null;
  el.modalTitle.textContent = 'Confirmar dados sugeridos';
  el.btnModalCancel.textContent = 'Cancelar';
  el.btnModalSave.textContent = 'Salvar';
}

function finalizeReviewCycle() {
  closeModal();
  const { saved, cancelled, total } = state.reviewStats;
  if (total > 0) {
    showToast(`Revisao finalizada: ${saved} salvos, ${cancelled} cancelados.`);
  }
  resetForm();
}

function openNextReviewModal() {
  while (state.reviewQueue.length) {
    const nextId = state.reviewQueue[0];
    const item = state.selectedItems.find((entry) => entry.id === nextId);
    if (item && item.analysisDraft) {
      openModalForItem(item);
      return;
    }
    state.reviewQueue.shift();
  }

  finalizeReviewCycle();
}

async function saveCurrentModalItem() {
  if (state.modalMode === 'catalog-edit') {
    await saveCatalogItemEdit();
    return;
  }

  const item = getModalItem();
  if (!item) {
    closeModal();
    return;
  }

  const nomeProduto = el.modalNome.value.trim();
  const categoria = el.modalCategoria.value;
  const subcategoria = el.modalSubcategoria.value.trim();

  if (!nomeProduto || !categoria || !subcategoria) {
    showToast('Preencha nome, categoria e subcategoria.', true);
    return;
  }

  await ensureOriginalUploaded(item);

  const payload = {
    nomeProduto,
    categoria,
    subcategoria,
    imagem: {
      relativePathOriginal: item.relativePathOriginal,
      relativePathProcessada: item.relativePathProcessada || '',
    },
    fonte: {
      originalFilename: item.originalFilename || '',
      ia: {
        confianca: item.analysisDraft?.confianca ?? null,
        observacoes: item.analysisDraft?.observacoes || '',
      },
    },
  };

  const createdItem = await requestJson('/api/catalog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  state.catalog.unshift(createdItem);
  renderCatalog();
  state.reviewStats.saved += 1;
  state.reviewQueue.shift();
  openNextReviewModal();
}

async function saveCatalogItemEdit() {
  const item = state.catalog.find((entry) => entry.id === state.modalCatalogItemId);
  if (!item) {
    closeModal();
    showToast('Item nao encontrado para edicao.', true);
    return;
  }

  const nomeProduto = el.modalNome.value.trim();
  const categoria = el.modalCategoria.value;
  const subcategoria = el.modalSubcategoria.value.trim();

  if (!nomeProduto || !categoria || !subcategoria) {
    showToast('Preencha nome, categoria e subcategoria.', true);
    return;
  }

  const payload = {
    nomeProduto,
    categoria,
    subcategoria,
    imagem: {
      relativePathOriginal: item.imagem?.relativePathOriginal || '',
      relativePathProcessada: item.imagem?.relativePathProcessada || '',
    },
    fonte: {
      originalFilename: item.fonte?.originalFilename || '',
      ia: {
        confianca: item.fonte?.ia?.confianca ?? null,
        observacoes: item.fonte?.ia?.observacoes || '',
      },
    },
  };

  const updatedItem = await requestJson(`/api/catalog/${item.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  state.catalog = state.catalog.map((entry) => (entry.id === item.id ? updatedItem : entry));
  renderCatalog();
  closeModal();
  showToast('Item atualizado com sucesso.');
}

function cancelCurrentModalItem() {
  if (state.modalMode === 'catalog-edit') {
    closeModal();
    return;
  }

  if (!state.reviewQueue.length) {
    closeModal();
    return;
  }

  state.reviewStats.cancelled += 1;
  state.reviewQueue.shift();
  openNextReviewModal();
}

async function handleRemoveBg() {
  if (state.autoProcessing) {
    showToast('Processamento automatico em andamento.', true);
    return;
  }

  if (!state.selectedItems.length) {
    showToast('Selecione uma imagem antes de continuar.', true);
    return;
  }

  setLoading(el.btnRemoveBg, true, 'Processando...');
  setProcessingButtonsVisibility(true);
  try {
    updateBatchStatus(`Removendo fundo de ${state.selectedItems.length} imagem(ns) em lotes de ${MAX_PARALLEL_ANALYSIS}...`);

    const results = await runWithConcurrency(state.selectedItems, async (item) => {
      try {
        const relativePathOriginal = await ensureOriginalUploaded(item);
        const data = await requestJson('/api/process/remove-bg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ relativePathOriginal }),
        });

        item.relativePathOriginal = data.relativePathOriginal;
        item.relativePathProcessada = data.relativePathProcessada;
        return { ok: true };
      } catch (error) {
        item.analysisError = error.message;
        return { ok: false };
      }
    }, MAX_PARALLEL_ANALYSIS);

    const successCount = results.filter((result) => result.ok).length;
    const failedCount = results.length - successCount;

    updatePrimaryPreview();
    if (failedCount > 0) {
      showToast(`Remocao concluida: ${successCount} ok, ${failedCount} com erro.`);
    } else {
      showToast(`Fundo removido com sucesso em ${successCount} imagem(ns).`);
    }
  } catch (error) {
    showToast(error.message, true);
  } finally {
    updateBatchStatus('');
    setLoading(el.btnRemoveBg, false);
    setProcessingButtonsVisibility(false);
  }
}

async function runWithConcurrency(items, worker, limit = 1) {
  const results = [];
  let index = 0;
  const safeLimit = Math.max(1, Number(limit) || 1);

  async function consume() {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  const workers = Array.from({ length: Math.min(safeLimit, items.length) }, () => consume());
  await Promise.all(workers);
  return results;
}

async function analyzeItem(item) {
  try {
    await ensureOriginalUploaded(item);
    const imagePath = item.relativePathProcessada || item.relativePathOriginal;
    item.analysisImagePath = imagePath;

    const response = await requestJson('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalFilename: item.originalFilename,
        imagePath,
      }),
    });

    const suggestion = response.data || {};
    item.analysisDraft = {
      nomeProduto: suggestion.nomeProduto || '',
      categoria: suggestion.categoria || CATEGORIES[0],
      subcategoria: suggestion.subcategoria || '',
      confianca: suggestion.confianca,
      observacoes: suggestion.observacoes || '',
    };

    return { ok: true, item };
  } catch (error) {
    item.analysisError = error.message;
    return { ok: false, item, error };
  }
}

async function handleAutoFill() {
  if (state.autoProcessing) {
    showToast('Processamento automatico em andamento.', true);
    return;
  }

  if (!state.selectedItems.length) {
    showToast('Selecione pelo menos uma imagem antes de analisar.', true);
    return;
  }

  setLoading(el.btnAutoFill, true, 'Analisando...');
  setProcessingButtonsVisibility(true);

  try {
    updateBatchStatus(`Analisando ${state.selectedItems.length} imagem(ns) em lotes de ${MAX_PARALLEL_ANALYSIS}...`);

    const results = await runWithConcurrency(state.selectedItems, analyzeItem, MAX_PARALLEL_ANALYSIS);
    const successItems = results.filter((result) => result.ok).map((result) => result.item);
    const failedItems = results.filter((result) => !result.ok).map((result) => result.item);

    if (!successItems.length) {
      showToast('Nenhuma imagem foi analisada com sucesso.', true);
      return;
    }

    state.reviewQueue = successItems.map((item) => item.id);
    state.reviewStats = { total: successItems.length, saved: 0, cancelled: 0 };

    if (failedItems.length) {
      showToast(`Analise concluida: ${successItems.length} ok, ${failedItems.length} com erro.`);
    } else {
      showToast(`Analise concluida: ${successItems.length} imagem(ns) pronta(s) para revisao.`);
    }

    openNextReviewModal();
  } finally {
    updateBatchStatus('');
    setLoading(el.btnAutoFill, false);
    setProcessingButtonsVisibility(false);
  }
}

async function processSelectedItemsAutomatically() {
  if (!state.selectedItems.length || state.autoProcessing) {
    return;
  }

  state.autoProcessing = true;
  setProcessingButtonsVisibility(true);
  el.btnRemoveBg.disabled = true;
  el.btnAutoFill.disabled = true;

  try {
    updateBatchStatus(`Processando ${state.selectedItems.length} imagem(ns): removendo fundo...`);

    const removeBgResults = await runWithConcurrency(
      state.selectedItems,
      async (item) => {
        try {
          const relativePathOriginal = await ensureOriginalUploaded(item);
          const data = await requestJson('/api/process/remove-bg', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ relativePathOriginal }),
          });

          item.relativePathOriginal = data.relativePathOriginal;
          item.relativePathProcessada = data.relativePathProcessada;
          return { ok: true, item };
        } catch (error) {
          item.analysisError = error.message;
          return { ok: false, item };
        }
      },
      MAX_PARALLEL_ANALYSIS
    );

    const itemsWithBgRemoved = removeBgResults.filter((result) => result.ok).map((result) => result.item);
    if (!itemsWithBgRemoved.length) {
      showToast('Nenhuma imagem teve fundo removido com sucesso.', true);
      return;
    }

    updatePrimaryPreview();
    updateBatchStatus(`Processando ${itemsWithBgRemoved.length} imagem(ns): analisando com ChatGPT...`);

    const analysisResults = await runWithConcurrency(itemsWithBgRemoved, analyzeItem, MAX_PARALLEL_ANALYSIS);
    const successItems = analysisResults.filter((result) => result.ok).map((result) => result.item);
    const failedAnalysis = analysisResults.length - successItems.length;
    const failedRemoveBg = state.selectedItems.length - itemsWithBgRemoved.length;

    if (!successItems.length) {
      showToast('As imagens foram processadas, mas nenhuma analise foi concluida.', true);
      return;
    }

    state.reviewQueue = successItems.map((item) => item.id);
    state.reviewStats = { total: successItems.length, saved: 0, cancelled: 0 };

    if (failedRemoveBg > 0 || failedAnalysis > 0) {
      showToast(`Processamento concluido: ${successItems.length} pronta(s), ${failedRemoveBg} falha(s) no fundo, ${failedAnalysis} falha(s) na analise.`);
    } else {
      showToast(`Processamento concluido: ${successItems.length} imagem(ns) pronta(s) para revisao.`);
    }

    openNextReviewModal();
  } catch (error) {
    showToast(error.message, true);
  } finally {
    updateBatchStatus('');
    state.autoProcessing = false;
    el.btnRemoveBg.disabled = false;
    el.btnAutoFill.disabled = false;
    setProcessingButtonsVisibility(false);
  }
}

async function handleImport(file) {
  if (!file) return;

  const form = new FormData();
  form.append('file', file);

  try {
    const result = await requestJson('/api/catalog/import', {
      method: 'POST',
      body: form,
    });

    await loadCatalog();
    const r = result.report;
    showToast(`Importado: ${r.validos} validos, ${r.ignorados} ignorados, total ${r.totalFinal}.`);
  } catch (error) {
    showToast(error.message, true);
  }
}

async function handleClearCatalog() {
  const ok = window.confirm('Deseja realmente limpar o catalogo?');
  if (!ok) return;

  try {
    await requestJson('/api/catalog', { method: 'DELETE' });
    await loadCatalog();
    showToast('Catalogo limpo com sucesso.');
  } catch (error) {
    showToast(error.message, true);
  }
}

async function handleDeleteItem(id) {
  if (!id) return;

  const ok = window.confirm('Deseja realmente excluir este item?');
  if (!ok) return;

  try {
    await requestJson(`/api/catalog/${id}`, { method: 'DELETE' });
    state.catalog = state.catalog.filter((item) => item.id !== id);
    renderCatalog();
    showToast('Item excluido com sucesso.');
  } catch (error) {
    showToast(error.message, true);
  }
}

function handleEditItem(id) {
  if (!id) return;

  const item = state.catalog.find((entry) => entry.id === id);
  if (!item) {
    showToast('Item nao encontrado para edicao.', true);
    return;
  }

  openModalForCatalogItem(item);
}

function bindEvents() {
  el.btnNew.addEventListener('click', resetForm);
  el.searchInput.addEventListener('input', renderCatalog);
  el.filterCategoria.addEventListener('change', renderCatalog);
  el.filterSubcategoria.addEventListener('input', renderCatalog);

  el.fileInput.addEventListener('change', (event) => {
    const files = Array.from(event.target.files || []);
    clearSelectedItems();
    state.reviewQueue = [];
    state.reviewStats = { total: 0, saved: 0, cancelled: 0 };
    state.modalItemId = null;
    state.modalMode = 'review';
    state.modalCatalogItemId = null;
    state.autoProcessing = false;

    state.selectedItems = files.map((file, index) => ({
      id: createClientItemId(index),
      file,
      originalFilename: file.name,
      previewUrl: URL.createObjectURL(file),
      relativePathOriginal: '',
      relativePathProcessada: '',
      analysisImagePath: '',
      analysisDraft: null,
      analysisError: '',
    }));

    updateSelectionInfo();
    updatePrimaryPreview();
    updateBatchStatus('');

    if (state.selectedItems.length) {
      processSelectedItemsAutomatically();
    }
  });

  el.btnRemoveBg.addEventListener('click', handleRemoveBg);
  el.btnAutoFill.addEventListener('click', handleAutoFill);

  el.btnModalCancel.addEventListener('click', cancelCurrentModalItem);
  el.btnModalSave.addEventListener('click', async () => {
    setLoading(el.btnModalSave, true, 'Salvando...');
    try {
      await saveCurrentModalItem();
    } catch (error) {
      showToast(error.message, true);
    } finally {
      setLoading(el.btnModalSave, false);
    }
  });

  el.modal.addEventListener('click', (event) => {
    if (event.target === el.modal) {
      cancelCurrentModalItem();
    }
  });

  el.btnImport.addEventListener('click', () => el.importInput.click());
  el.importInput.addEventListener('change', (event) => {
    handleImport(event.target.files?.[0]);
    event.target.value = '';
  });

  el.btnClear.addEventListener('click', handleClearCatalog);
  el.catalogGrid.addEventListener('click', (event) => {
    const editButton = event.target.closest('.btn-edit-item');
    if (editButton) {
      handleEditItem(editButton.dataset.id);
      return;
    }

    const button = event.target.closest('.btn-delete-item');
    if (!button) return;
    handleDeleteItem(button.dataset.id);
  });
}

async function init() {
  fillCategorySelect(el.modalCategoria);
  fillCategorySelect(el.filterCategoria, true);
  bindEvents();
  resetForm();

  try {
    await loadCatalog();
  } catch (error) {
    showToast(`Erro ao carregar catalogo: ${error.message}`, true);
  }
}

init();
