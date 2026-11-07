import type { RailwayCredentials, SeatKoiTransferResponse } from "../shared/types";

const SEATKOI_ORIGIN = "https://seatkoi.vercel.app";
const STORAGE_KEY = "SeatKoi_user_credentials";

if (location.origin === SEATKOI_ORIGIN && location.pathname === "/token") {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "SEATKOI_SAVE_CREDENTIALS") return;

    try {
      const credentials = message.credentials as RailwayCredentials;
      if (
        !credentials ||
        typeof credentials.token !== "string" ||
        typeof credentials.deviceId !== "string" ||
        typeof credentials.deviceKey !== "string" ||
        !credentials.token ||
        !credentials.deviceId ||
        !credentials.deviceKey
      ) {
        sendResponse({ success: false, message: "Received incomplete Railway credentials." } satisfies SeatKoiTransferResponse);
        return;
      }

      // This content script runs in the SeatKoi tab, so this is that tab's sessionStorage.
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
      sendResponse({ success: true } satisfies SeatKoiTransferResponse);
    } catch {
      sendResponse({ success: false, message: "Could not save credentials in SeatKoi session storage." } satisfies SeatKoiTransferResponse);
    }
  });

  // Run at document_start so sessionStorage is populated before the Next.js
  // page hydrates and TokenForm performs its one-time sessionStorage read.
  // Automatically request the transfer when /token loads; no extra button is needed.
  chrome.runtime.sendMessage({ type: "SEATKOI_TOKEN_PAGE_READY" })
    .then((response: SeatKoiTransferResponse | undefined) => {
      if (!response?.success) {
        console.info("SeatKoi Railway Connector:", response?.message ?? "No response from extension.");
      }
    })
    .catch(() => {
      console.info("SeatKoi Railway Connector is not available or is disabled.");
    });
}
