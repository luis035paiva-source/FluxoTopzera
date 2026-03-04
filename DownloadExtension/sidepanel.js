const DEFAULT_GLOBAL_SUFFIX = "foto produto fundo branco";
const STORAGE_KEYS = {
  productList: "productList",
  reuseTab: "reuseSearchTab",
  globalSuffix: "globalSearchSuffix"
};

const DEFAULT_PRODUCTS = [
  "acém bovino foto produto fundo branco",
  "alcatra bovina foto produto fundo branco",
  "picanha bovina foto produto fundo branco",
  "contra-filé bovino foto produto fundo branco",
  "maminha bovina foto produto fundo branco",
  "patinho bovino foto produto fundo branco",
  "coxão mole bovino foto produto fundo branco",
  "coxão duro bovino foto produto fundo branco",
  "fraldinha bovina foto produto fundo branco",
  "cupim bovino foto produto fundo branco",
  "costela bovina foto produto fundo branco",
  "músculo bovino foto produto fundo branco",

  "pernil suíno foto produto fundo branco",
  "lombo suíno foto produto fundo branco",
  "costelinha suína foto produto fundo branco",
  "bisteca suína foto produto fundo branco",
  "copa lombo suíno foto produto fundo branco",
  "panceta suína foto produto fundo branco",
  "toucinho suíno foto produto fundo branco",
  "joelho suíno foto produto fundo branco",
  "pé suíno foto produto fundo branco",
  "orelha suína foto produto fundo branco",
  "rabo suíno foto produto fundo branco",

  "frango inteiro foto produto fundo branco",
  "peito de frango foto produto fundo branco",
  "coxa de frango foto produto fundo branco",
  "sobrecoxa de frango foto produto fundo branco",
  "asa de frango foto produto fundo branco",
  "meio da asa de frango foto produto fundo branco",
  "frango a passarinho foto produto fundo branco",
  "galinha caipira foto produto fundo branco",
  "peru inteiro foto produto fundo branco",
  "codorna inteira foto produto fundo branco",

  "fígado bovino foto produto fundo branco",
  "coração bovino foto produto fundo branco",
  "coração de frango foto produto fundo branco",
  "moela de frango foto produto fundo branco",
  "língua bovina foto produto fundo branco",
  "rim bovino foto produto fundo branco",
  "bucho bovino foto produto fundo branco",
  "dobradinha bovina foto produto fundo branco",
  "tripa bovina foto produto fundo branco",
  "rabada bovina foto produto fundo branco",
  "mocotó bovino foto produto fundo branco",
  "miolo bovino (cérebro) foto produto fundo branco",

  "linguiça toscana foto produto fundo branco",
  "linguiça de pernil foto produto fundo branco",
  "linguiça de frango foto produto fundo branco",
  "linguiça apimentada foto produto fundo branco",
  "salsichão foto produto fundo branco",
  "kafta crua foto produto fundo branco",
  "hambúrguer artesanal cru foto produto fundo branco",
  "almôndega crua foto produto fundo branco",
  "carne moída bovina foto produto fundo branco",
  "espetinho cru foto produto fundo branco",

  "presunto fatiado foto produto fundo branco",
  "mortadela fatiada foto produto fundo branco",
  "salame fatiado foto produto fundo branco",
  "copa fatiada foto produto fundo branco",
  "peito de peru fatiado foto produto fundo branco",
  "bacon em fatias foto produto fundo branco",
  "lombo canadense fatiado foto produto fundo branco",
  "pepperoni fatiado foto produto fundo branco",

  "pão de alho foto produto fundo branco",
  "queijo coalho para churrasco foto produto fundo branco",
  "carvão para churrasco foto produto fundo branco",
  "sal grosso foto produto fundo branco",
  "temperos para churrasco foto produto fundo branco",
  "farofa para churrasco foto produto fundo branco",
  "molhos para churrasco foto produto fundo branco"
];

const els = {
  searchInput: document.getElementById("searchInput"),
  visibleCount: document.getElementById("visibleCount"),
  productList: document.getElementById("productList"),
  reuseTabToggle: document.getElementById("reuseTabToggle"),
  globalSuffixInput: document.getElementById("globalSuffixInput"),
  editListBtn: document.getElementById("editListBtn"),
  importJsonBtn: document.getElementById("importJsonBtn"),
  exportJsonBtn: document.getElementById("exportJsonBtn"),
  resetDefaultBtn: document.getElementById("resetDefaultBtn"),
  importFileInput: document.getElementById("importFileInput"),
  statusMessage: document.getElementById("statusMessage"),
  editorDialog: document.getElementById("editorDialog"),
  editorList: document.getElementById("editorList"),
  processBtn: document.getElementById("processBtn"),
  editorInput: document.getElementById("editorInput"),
  addItemBtn: document.getElementById("addItemBtn"),
  updateItemBtn: document.getElementById("updateItemBtn"),
  removeItemBtn: document.getElementById("removeItemBtn"),
  moveUpBtn: document.getElementById("moveUpBtn"),
  moveDownBtn: document.getElementById("moveDownBtn")
};

const state = {
  products: [...DEFAULT_PRODUCTS],
  editorItems: [...DEFAULT_PRODUCTS],
  storageAreaInUse: "sync"
};

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function cleanAndDedupe(values) {
  const unique = new Set();
  const result = [];

  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }

    const normalized = normalizeText(value);
    if (!normalized) {
      continue;
    }

    const key = normalized.toLocaleLowerCase("pt-BR");
    if (unique.has(key)) {
      continue;
    }

    unique.add(key);
    result.push(normalized);
  }

  return result;
}

function updateStatus(message, isError = false) {
  els.statusMessage.textContent = message;
  els.statusMessage.classList.toggle("error", isError);
}

function updateVisibleCount(count) {
  els.visibleCount.textContent = `${count} ${count === 1 ? "item visível" : "itens visíveis"}`;
}

function storageGet(area, keys) {
  return new Promise((resolve, reject) => {
    chrome.storage[area].get(keys, (data) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(data);
    });
  });
}

function storageSet(area, data) {
  return new Promise((resolve, reject) => {
    chrome.storage[area].set(data, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    });
  });
}

async function getWithFallback(defaults) {
  try {
    const values = await storageGet("sync", defaults);
    state.storageAreaInUse = "sync";
    return values;
  } catch (_error) {
    const values = await storageGet("local", defaults);
    state.storageAreaInUse = "local";
    return values;
  }
}

async function setWithFallback(data) {
  try {
    await storageSet("sync", data);
    state.storageAreaInUse = "sync";
  } catch (_error) {
    await storageSet("local", data);
    state.storageAreaInUse = "local";
  }
}

async function persistProducts() {
  await setWithFallback({ [STORAGE_KEYS.productList]: state.products });
}

async function persistConfig() {
  await setWithFallback({
    [STORAGE_KEYS.reuseTab]: els.reuseTabToggle.checked,
    [STORAGE_KEYS.globalSuffix]: normalizeText(els.globalSuffixInput.value)
  });
}

function buildSearchTerm(baseTerm, suffix) {
  const term = normalizeText(baseTerm);
  const cleanSuffix = normalizeText(suffix);
  if (!cleanSuffix) {
    return term;
  }

  if (term.toLocaleLowerCase("pt-BR").includes(cleanSuffix.toLocaleLowerCase("pt-BR"))) {
    return term;
  }

  return normalizeText(`${term} ${cleanSuffix}`);
}

function renderProductList() {
  const filterText = normalizeText(els.searchInput.value).toLocaleLowerCase("pt-BR");
  const filteredItems = state.products.filter((item) => {
    if (!filterText) {
      return true;
    }
    return item.toLocaleLowerCase("pt-BR").includes(filterText);
  });

  els.productList.textContent = "";

  for (const item of filteredItems) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = item;
    btn.title = "Abrir pesquisa no Google Imagens";
    btn.addEventListener("click", () => openImageSearch(item));
    li.appendChild(btn);
    els.productList.appendChild(li);
  }

  updateVisibleCount(filteredItems.length);
}

function renderEditorList(selectedIndex = -1) {
  els.editorList.textContent = "";

  state.editorItems.forEach((item, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = item;
    els.editorList.appendChild(option);
  });

  if (selectedIndex >= 0 && selectedIndex < state.editorItems.length) {
    els.editorList.selectedIndex = selectedIndex;
    els.editorInput.value = state.editorItems[selectedIndex];
  } else {
    els.editorInput.value = "";
  }
}

async function openImageSearch(item) {
  const suffix = normalizeText(els.globalSuffixInput.value);
  const term = buildSearchTerm(item, suffix);

  try {
    const response = await chrome.runtime.sendMessage({
      type: "openSearch",
      term,
      reuseTab: els.reuseTabToggle.checked
    });

    if (!response || response.ok !== true) {
      updateStatus(response?.error || "Falha ao abrir a pesquisa.", true);
      return;
    }

    const mode = response.reused ? "Aba reutilizada" : "Nova aba aberta";
    updateStatus(`${mode}: ${term}`);

    // Envia o nome do produto para o content script saber o nome do arquivo
    chrome.runtime.sendMessage({ type: "setProductName", productName: item });
  } catch (_error) {
    updateStatus("Erro de comunicação com o serviço em segundo plano.", true);
  }
}

function openEditor() {
  state.editorItems = [...state.products];
  renderEditorList();

  if (typeof els.editorDialog.showModal === "function") {
    els.editorDialog.showModal();
    return;
  }

  els.editorDialog.setAttribute("open", "open");
}

async function applyEditorChanges(selectedIndex = -1) {
  state.editorItems = cleanAndDedupe(state.editorItems);
  state.products = [...state.editorItems];
  await persistProducts();
  renderProductList();
  renderEditorList(selectedIndex);
  updateStatus(`Lista atualizada e salva (${state.storageAreaInUse}).`);
}

async function onAddEditorItem() {
  const newItem = normalizeText(els.editorInput.value);
  if (!newItem) {
    updateStatus("Digite um texto válido para adicionar.", true);
    return;
  }

  const exists = state.editorItems.some(
    (item) => item.toLocaleLowerCase("pt-BR") === newItem.toLocaleLowerCase("pt-BR")
  );

  if (exists) {
    updateStatus("Item já existe na lista.", true);
    return;
  }

  state.editorItems.push(newItem);
  await applyEditorChanges(state.editorItems.length - 1);
}

async function onUpdateEditorItem() {
  const index = els.editorList.selectedIndex;
  if (index < 0) {
    updateStatus("Selecione um item para editar.", true);
    return;
  }

  const updatedText = normalizeText(els.editorInput.value);
  if (!updatedText) {
    updateStatus("Texto inválido para edição.", true);
    return;
  }

  state.editorItems[index] = updatedText;
  await applyEditorChanges(index);
}

async function onRemoveEditorItem() {
  const index = els.editorList.selectedIndex;
  if (index < 0) {
    updateStatus("Selecione um item para remover.", true);
    return;
  }

  state.editorItems.splice(index, 1);
  const nextIndex = Math.min(index, state.editorItems.length - 1);
  await applyEditorChanges(nextIndex);
}

async function onMoveEditorItem(direction) {
  const index = els.editorList.selectedIndex;
  if (index < 0) {
    updateStatus("Selecione um item para mover.", true);
    return;
  }

  const target = index + direction;
  if (target < 0 || target >= state.editorItems.length) {
    return;
  }

  const current = state.editorItems[index];
  state.editorItems[index] = state.editorItems[target];
  state.editorItems[target] = current;

  await applyEditorChanges(target);
}

async function handleImportFile(file) {
  if (!file) {
    return;
  }

  let parsed;
  try {
    const content = await file.text();
    parsed = JSON.parse(content);
  } catch (_error) {
    updateStatus("JSON inválido: não foi possível ler o arquivo.", true);
    return;
  }

  if (!Array.isArray(parsed)) {
    updateStatus("JSON inválido: o conteúdo deve ser um array.", true);
    return;
  }

  const validItems = cleanAndDedupe(parsed);
  const invalidCount = parsed.length - validItems.length;

  if (validItems.length === 0) {
    updateStatus("Importação rejeitada: nenhum item válido encontrado.", true);
    return;
  }

  state.products = validItems;
  await persistProducts();
  renderProductList();

  if (invalidCount > 0) {
    updateStatus(`Importado com avisos: ${validItems.length} válidos, ${invalidCount} ignorados.`);
  } else {
    updateStatus(`Importação concluída: ${validItems.length} itens.`);
  }
}

function exportAsJson() {
  const payload = JSON.stringify(state.products, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const date = new Date();
  const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

  const a = document.createElement("a");
  a.href = url;
  a.download = `acougue-imagens-lista-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
  updateStatus("Exportação concluída.");
}

async function resetToDefaultList() {
  const confirmed = window.confirm("Deseja resetar para a lista padrão?");
  if (!confirmed) {
    return;
  }

  state.products = [...DEFAULT_PRODUCTS];
  await persistProducts();
  renderProductList();
  updateStatus("Lista padrão restaurada.");
}

async function bootstrap() {
  const defaults = {
    [STORAGE_KEYS.productList]: [...DEFAULT_PRODUCTS],
    [STORAGE_KEYS.reuseTab]: false,
    [STORAGE_KEYS.globalSuffix]: DEFAULT_GLOBAL_SUFFIX
  };

  const saved = await getWithFallback(defaults);
  state.products = cleanAndDedupe(saved[STORAGE_KEYS.productList]);
  if (state.products.length === 0) {
    state.products = [...DEFAULT_PRODUCTS];
  }

  els.reuseTabToggle.checked = Boolean(saved[STORAGE_KEYS.reuseTab]);
  els.globalSuffixInput.value = normalizeText(saved[STORAGE_KEYS.globalSuffix]) || DEFAULT_GLOBAL_SUFFIX;

  renderProductList();
  updateStatus(`Dados carregados via storage.${state.storageAreaInUse}.`);
}

els.searchInput.addEventListener("input", renderProductList);

els.reuseTabToggle.addEventListener("change", async () => {
  await persistConfig();
  updateStatus(`Configuração salva (${state.storageAreaInUse}).`);
});

els.globalSuffixInput.addEventListener("blur", async () => {
  els.globalSuffixInput.value = normalizeText(els.globalSuffixInput.value) || DEFAULT_GLOBAL_SUFFIX;
  await persistConfig();
  updateStatus(`Sufixo salvo (${state.storageAreaInUse}).`);
});

els.editListBtn.addEventListener("click", openEditor);
els.exportJsonBtn.addEventListener("click", exportAsJson);
els.importJsonBtn.addEventListener("click", () => els.importFileInput.click());
els.resetDefaultBtn.addEventListener("click", () => {
  void resetToDefaultList();
});

els.importFileInput.addEventListener("change", async (event) => {
  const file = event.target.files && event.target.files[0];
  await handleImportFile(file);
  els.importFileInput.value = "";
});

els.editorList.addEventListener("change", () => {
  const index = els.editorList.selectedIndex;
  if (index >= 0) {
    els.editorInput.value = state.editorItems[index];
  }
});

els.addItemBtn.addEventListener("click", () => {
  void onAddEditorItem();
});

els.updateItemBtn.addEventListener("click", () => {
  void onUpdateEditorItem();
});

els.removeItemBtn.addEventListener("click", () => {
  void onRemoveEditorItem();
});

els.moveUpBtn.addEventListener("click", () => {
  void onMoveEditorItem(-1);
});

els.moveDownBtn.addEventListener("click", () => {
  void onMoveEditorItem(1);
});

async function processWithChatGPT() {
  els.processBtn.disabled = true;
  els.processBtn.textContent = "Processando...";
  updateStatus("Enviando imagens para remocao de fundo e categorizacao...");

  try {
    const res = await fetch("http://localhost:3000/api/downloads/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    const data = await res.json();

    if (data.ok) {
      const ok = data.processed || 0;
      const fail = data.failed || 0;
      updateStatus(`Processamento concluido: ${ok} com sucesso, ${fail} com falha.`);
    } else {
      updateStatus(`Erro: ${data.message || "falha desconhecida"}`, true);
    }
  } catch (error) {
    updateStatus(`Erro de comunicacao com o servidor: ${error.message}`, true);
  } finally {
    els.processBtn.disabled = false;
    els.processBtn.textContent = "Processar com ChatGPT";
  }
}

els.processBtn.addEventListener("click", () => {
  void processWithChatGPT();
});

void bootstrap();