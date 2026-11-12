# maxhertlein.com dashboard

Responsive personal start page with editable bookmarks, category filters, search, theme toggle, bookmark import/export and an installable PWA shell.

## Preview locally
Serve this directory with a local HTTP server (for example, VS Code Live Server). Service workers and PWA installation require localhost or HTTPS.

## Deploy with Cloudflare Pages
1. Open Cloudflare **Workers & Pages**.
2. Choose **Create application → Pages → Connect to Git**.
3. Select `mxhert/maxhertlein-dashboard`.
4. Framework preset: **None**.
5. Build command: leave blank.
6. Build output directory: `/` (repository root).
7. Deploy.
8. In the Pages project, open **Custom domains** and add `maxhertlein.com`.

Do not remove existing DNS records until Cloudflare has confirmed the required domain configuration.

## Current limitations
- Bookmarks are stored in this browser's local storage; they do not yet sync between devices.
- Bookmark icons load from Google's favicon service.
- The workout route is a placeholder, not a functioning tracker.
- Do not put a PIN, API key or other secret in this public frontend repository.

## Next development phase
Build the workout application with server-side PIN verification, rate limiting, secure session cookies and Cloudflare D1 persistence for cross-device sync.