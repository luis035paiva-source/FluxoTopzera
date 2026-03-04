let lastSearchTabId = null;

const SEARCH_PREFIX = "https://www.google.com/search?tbm=isch&q=";

function setPanelBehavior() {
  if (!chrome.sidePanel || !chrome.sidePanel.setPanelBehavior) {
    return;
  }
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }, () => {
    void chrome.runtime.lastError;
  });
}

chrome.runtime.onInstalled.addListener(() => {
  setPanelBehavior();
});

chrome.runtime.onStartup.addListener(() => {
  setPanelBehavior();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === lastSearchTabId) {
    lastSearchTabId = null;
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "openSearch") {
    return;
  }

  const encoded = encodeURIComponent(String(message.term || "").trim());
  if (!encoded) {
    sendResponse({ ok: false, error: "Termo de pesquisa vazio." });
    return;
  }

  const url = `${SEARCH_PREFIX}${encoded}`;
  const reuseTab = Boolean(message.reuseTab);

  const openNewTab = () => {
    chrome.tabs.create({ url }, (tab) => {
      if (chrome.runtime.lastError || !tab || typeof tab.id !== "number") {
        sendResponse({ ok: false, error: "Falha ao abrir aba de pesquisa." });
        return;
      }
      lastSearchTabId = tab.id;
      sendResponse({ ok: true, reused: false, tabId: tab.id });
    });
  };

  if (!reuseTab || lastSearchTabId === null) {
    openNewTab();
    return true;
  }

  chrome.tabs.get(lastSearchTabId, (tab) => {
    if (chrome.runtime.lastError || !tab || typeof tab.id !== "number") {
      lastSearchTabId = null;
      openNewTab();
      return;
    }

    chrome.tabs.update(tab.id, { url, active: true }, (updatedTab) => {
      if (chrome.runtime.lastError || !updatedTab || typeof updatedTab.id !== "number") {
        lastSearchTabId = null;
        openNewTab();
        return;
      }
      lastSearchTabId = updatedTab.id;
      sendResponse({ ok: true, reused: true, tabId: updatedTab.id });
    });
  });

  return true;
});