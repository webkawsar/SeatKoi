"use strict";
(() => {
  // src/background/service-worker.ts
  var SEATKOI_ORIGIN = "https://seatkoi.vercel.app";
  var RAILWAY_MATCH = "https://eticket.railway.gov.bd/*";
  async function getRailwayCredentials() {
    const tabs = await chrome.tabs.query({ url: [RAILWAY_MATCH] });
    if (tabs.length === 0) {
      throw new Error("No Railway tab found. Open Railway, log in, and keep that tab open.");
    }
    let lastMessage = "Railway credentials were not found.";
    for (const tab of tabs) {
      if (typeof tab.id !== "number") continue;
      try {
        const result = await chrome.tabs.sendMessage(
          tab.id,
          { type: "RAILWAY_READ_CREDENTIALS" }
        );
        if (result?.success) return result.credentials;
        if (result && !result.success) lastMessage = result.message;
      } catch {
      }
    }
    throw new Error(`${lastMessage} Refresh the logged-in Railway tab and reload SeatKoi /token.`);
  }
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== "SEATKOI_TOKEN_PAGE_READY") return;
    let senderUrl = null;
    try {
      if (sender.tab?.url) senderUrl = new URL(sender.tab.url);
    } catch {
      senderUrl = null;
    }
    if (!senderUrl || senderUrl.origin !== SEATKOI_ORIGIN || senderUrl.pathname !== "/token") {
      sendResponse({ success: false, message: "Unauthorized SeatKoi page." });
      return;
    }
    getRailwayCredentials().then(async (credentials) => {
      if (typeof sender.tab?.id !== "number") {
        sendResponse({ success: false, message: "SeatKoi tab is unavailable." });
        return;
      }
      const response = await chrome.tabs.sendMessage(
        sender.tab.id,
        { type: "SEATKOI_SAVE_CREDENTIALS", credentials }
      );
      sendResponse(response ?? { success: false, message: "Could not save credentials in SeatKoi." });
    }).catch((error) => {
      sendResponse({
        success: false,
        message: error instanceof Error ? error.message : "Could not connect to Railway."
      });
    });
    return true;
  });
})();
