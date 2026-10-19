# Triangle Splitter

Snap a receipt, tap who had what, and request on Venmo. Installable web app (add to Home Screen), works offline, with optional Google sign-in for saved bills, paid tracking, and private invite links.

- `index.html` – screens, styling, receipt reading, split math, group text
- `cloud.js` – sign-in, saving bills, invite links (Firebase)
- `config.js` – your Firebase settings (sign-in is off until filled in)
- `firestore.rules` – database security rules (paste into Firebase)
- `sw.js` – offline support
- `firebase.js` – bundled Firebase SDK (don't edit)

Hosted on Firebase Hosting at https://trianglesplitter.web.app. Every push to `main` publishes automatically (`.github/workflows/deploy.yml`, needs the `FIREBASE_SERVICE_ACCOUNT` repo secret). The old Netlify address redirects there via `_redirects`.

Setup steps are in [SETUP.md](SETUP.md). They describe the original Netlify setup; on Firebase Hosting, skip the `_redirects` step and use your `web.app` address.
