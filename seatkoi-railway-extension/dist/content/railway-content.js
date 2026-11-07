"use strict";
(() => {
  // src/content/railway-content.ts
  var RAILWAY_ORIGIN = "https://eticket.railway.gov.bd";
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "RAILWAY_READ_CREDENTIALS") return;
    if (location.origin !== RAILWAY_ORIGIN) {
      sendResponse({ success: false, message: "Unexpected Railway origin." });
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const deviceId = localStorage.getItem("uudid");
      const deviceKey = localStorage.getItem("ssdk");
      if (!token || !deviceId || !deviceKey) {
        sendResponse({
          success: false,
          message: "Railway credentials were not found. Log in to Railway and refresh its tab first."
        });
        return;
      }
      const credentials = { token, deviceId, deviceKey };
      sendResponse({ success: true, credentials });
    } catch {
      sendResponse({
        success: false,
        message: "Unable to read the Railway session from this tab."
      });
    }
  });
})();
