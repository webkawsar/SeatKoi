# SeatKoi Railway Connector — Chrome Manifest V3

## Automatic flow
1. Sign in to `https://eticket.railway.gov.bd/` in Chrome and keep that tab open.
2. Open `https://seatkoi.vercel.app/token`.
3. The extension content script starts at `document_start`, before the SeatKoi app hydrates, and asks the extension background service worker to retrieve credentials.
4. The extension reads only Railway Local Storage keys `token`, `uudid`, and `ssdk`.
5. It transfers them to the same SeatKoi tab's `sessionStorage` under `SeatKoi_user_credentials` as `{ token, deviceId, deviceKey }`.
6. The existing TokenForm reads that sessionStorage entry on mount and fills its existing fields.

No extra button, page event, or automatic form submission is used. The user still clicks the existing **Connect Railway Account** button.

## Build
Requires Node.js 20+.

```bash
npm install
npm run typecheck
npm run build
```

Then open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the built extension folder (the folder containing `manifest.json`).

## Usage notes
- Keep the logged-in Railway tab open when opening SeatKoi `/token`.
- If Railway credentials are not available, refresh the logged-in Railway tab and then refresh SeatKoi `/token`.
- The transfer runs at `document_start` to give it time to finish before Next.js hydrates TokenForm. The extension does not send a page event; TokenForm only performs its normal one-time sessionStorage read.
- Credentials remain in that SeatKoi tab's `sessionStorage`; the extension does not send them to a separate server.
- Any JavaScript executing on the SeatKoi origin may be able to read sessionStorage. Protect the site against XSS and untrusted scripts.
- This extension only matches the exact Railway and SeatKoi production domains listed in `manifest.json`.
