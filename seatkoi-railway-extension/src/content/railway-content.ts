import type { RailwayCredentials, RailwayReadResponse } from "../shared/types";

const RAILWAY_ORIGIN = "https://eticket.railway.gov.bd";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "RAILWAY_READ_CREDENTIALS") return;

  if (location.origin !== RAILWAY_ORIGIN) {
    sendResponse({ success: false, message: "Unexpected Railway origin." } satisfies RailwayReadResponse);
    return;
  }

  try {
    // Read only the 3 required values from the user's existing Railway session.
    const token = localStorage.getItem("token");
    const deviceId = localStorage.getItem("uudid");
    const deviceKey = localStorage.getItem("ssdk");

    if (!token || !deviceId || !deviceKey) {
      sendResponse({
        success: false,
        message: "Railway credentials were not found. Log in to Railway and refresh its tab first."
      } satisfies RailwayReadResponse);
      return;
    }

    const credentials: RailwayCredentials = { token, deviceId, deviceKey };
    sendResponse({ success: true, credentials } satisfies RailwayReadResponse);
  } catch {
    sendResponse({
      success: false,
      message: "Unable to read the Railway session from this tab."
    } satisfies RailwayReadResponse);
  }
});
