# SplitIt

Snap a receipt, tap who had what, and request on Venmo. Installable web app (add to Home Screen), works offline, with optional Google sign-in for saved bills, paid tracking, and private invite links.

- `index.html` – screens, styling, receipt reading, split math, group text
- `cloud.js` – sign-in, saving bills, invite links (Firebase)
- `config.js` – your Firebase settings (sign-in is off until filled in)
- `firestore.rules` – database security rules (paste into Firebase)
- `sw.js` – offline support
- `firebase.js` – bundled Firebase SDK (don't edit)

Setup steps are in [SETUP.md](SETUP.md).
