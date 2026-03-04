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
  if (!message) return;

  if (message.type === "setProductName") {
    if (lastSearchTabId !== null) {
      chrome.tabs.sendMessage(lastSearchTabId, message, () => {
        void chrome.runtime.lastError;
      });
    }
    sendResponse({ ok: true });
    return;
  }

  if (message.type === "downloadImages") {
    const { urls, productName } = message;

    fetch("http://localhost:3000/api/downloads/fetch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls, productName })
    })
      .then((res) => res.json())
      .then((data) => sendResponse(data))
      .catch((err) => sendResponse({ ok: false, message: err.message }));

    return true;
  }

  if (message.type !== "openSearch") {
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