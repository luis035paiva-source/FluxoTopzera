(() => {
  "use strict";

  let currentProductName = "";

  // Recebe o nome do produto do sidepanel via background.js
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message && message.type === "setProductName") {
      currentProductName = message.productName || "";
      sendResponse({ ok: true });
      return;
    }
  });

  function extractImageUrls(maxCount = 20) {
    const urls = new Set();

    // Estrategia 1: Links /imgres que contem a URL original da imagem
    const imgresLinks = document.querySelectorAll('a[href*="/imgres?"]');
    for (const link of imgresLinks) {
      if (urls.size >= maxCount) break;
      try {
        const params = new URL(link.href).searchParams;
        const imgurl = params.get("imgurl");
        if (imgurl && (imgurl.startsWith("http://") || imgurl.startsWith("https://"))) {
          urls.add(imgurl);
        }
      } catch (_) {
        /* link malformado, ignorar */
      }
    }

    // Estrategia 2: Fallback para tags <img> com src real (nao base64, nao thumbnail do Google)
    if (urls.size < maxCount) {
      const images = document.querySelectorAll("img[src]");
      for (const img of images) {
        if (urls.size >= maxCount) break;
        const src = img.src;
        if (
          src &&
          src.startsWith("http") &&
          !src.includes("encrypted-tbn") &&
          !src.includes("gstatic.com") &&
          !src.startsWith("data:") &&
          !src.includes("google.com/images")
        ) {
          if (img.naturalWidth > 100 && img.naturalHeight > 100) {
            urls.add(src);
          }
        }
      }
    }

    return Array.from(urls).slice(0, maxCount);
  }

  function injectDownloadButton() {
    if (document.getElementById("ext-download-20-btn")) return;

    const btn = document.createElement("button");
    btn.id = "ext-download-20-btn";
    btn.textContent = "Baixar 20";
    Object.assign(btn.style, {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      zIndex: "99999",
      padding: "12px 24px",
      background: "#4a7c59",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      fontSize: "16px",
      fontWeight: "600",
      cursor: "pointer",
      boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    });

    btn.addEventListener("mouseenter", () => {
      btn.style.background = "#396349";
    });
    btn.addEventListener("mouseleave", () => {
      if (!btn.disabled) btn.style.background = "#4a7c59";
    });

    btn.addEventListener("click", async () => {
      btn.disabled = true;
      btn.style.background = "#73685a";
      btn.style.cursor = "wait";
      btn.textContent = "Extraindo URLs...";

      const urls = extractImageUrls(20);
      if (urls.length === 0) {
        btn.textContent = "Nenhuma imagem encontrada";
        resetButton(btn, 3000);
        return;
      }

      btn.textContent = `Baixando ${urls.length} imagens...`;

      const productName = currentProductName || document.title;

      chrome.runtime.sendMessage(
        { type: "downloadImages", urls, productName },
        (response) => {
          if (chrome.runtime.lastError) {
            btn.textContent = "Erro de comunicacao";
            resetButton(btn, 4000);
            return;
          }

          if (response && response.ok) {
            btn.textContent = `${response.saved} salvas, ${response.failed} falhas`;
          } else {
            btn.textContent = `Erro: ${(response && response.message) || "desconhecido"}`;
          }
          resetButton(btn, 5000);
        }
      );
    });

    document.body.appendChild(btn);
  }

  function resetButton(btn, delayMs) {
    setTimeout(() => {
      btn.textContent = "Baixar 20";
      btn.disabled = false;
      btn.style.background = "#4a7c59";
      btn.style.cursor = "pointer";
    }, delayMs);
  }

  // Injeta o botao e observa mudancas na pagina (Google Images e SPA)
  function init() {
    injectDownloadButton();

    const observer = new MutationObserver(() => {
      if (!document.getElementById("ext-download-20-btn")) {
        injectDownloadButton();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
