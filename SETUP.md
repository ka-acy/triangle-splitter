# Triangle Splitter setup

Triangle Splitter works right away with no accounts. Everything stays on the phone.
To turn on **sign-in** (saved bills, sync, paid tracking, invite links), connect it to a free Firebase project.
It takes about 15 minutes, once. Firebase's free plan is plenty for a friend group.

You'll edit one small text file: `config.js`. Any text editor works (TextEdit on Mac: Format → Make Plain Text).

---

## 1. Put the site online and get your address

1. Go to **app.netlify.com**, sign up free, then open **app.netlify.com/drop**.
2. Drag the whole `splitit` folder onto the page.
3. In **Site configuration → Change site name**, pick a name, e.g. `splitit-chang`.
   Your address is now `https://splitit-chang.netlify.app`. You'll need it below. (Replace `splitit-chang` with yours everywhere.)

## 2. Create the Firebase project

1. Go to **console.firebase.google.com** and sign in with Google.
2. **Create a project** → name it `Triangle Splitter` → you can turn off Google Analytics → **Create**.
3. Note the **Project ID** shown under the name (e.g. `splitit-4f2a1`).

## 3. Connect the app (config.js)

1. On the project home page, click the **</>** (Web) icon. Nickname: `Triangle Splitter`. Don't check Hosting. **Register app**.
2. Firebase shows a block like `const firebaseConfig = { apiKey: "...", ... }`.
3. Open `config.js` and replace `firebase: null,` with those values, like this:

```js
  firebase: {
    apiKey: "AIza...",
    authDomain: "splitit-chang.netlify.app",
    projectId: "splitit-4f2a1",
    storageBucket: "splitit-4f2a1.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abc123"
  },
```

**Important:** set `authDomain` to **your Netlify address** (no `https://`), not the `firebaseapp.com` one Firebase gives you. (Leftover from Google sign-in; harmless.)

## 4. Sign-in

Nothing to set up. People sign in by typing a username (no password, no Google).
**Anyone who types a username can see and change that account's bills and payment info**, so only share the app with people you trust.

## 6. Create the database and lock it down

1. In Firebase: **Build → Firestore Database → Create database**. Pick a US location, start in **production mode**.
2. Open the **Rules** tab, delete what's there, paste everything from `firestore.rules`, and click **Publish**.

These rules only check that usernames are well-formed. With no passwords, they can't keep amounts private.

## 7. Upload again

In Netlify, open your site → **Deploys** → drag the `splitit` folder onto the page again.
Open your address on your iPhone, tap **Sign in**, and you're set. (If you'd already added it to your Home Screen, open it once in Safari first so it picks up the new version.)

---

## Troubleshooting

- **"Couldn't save the bill" or friends see "Bill not found"**: check step 6 (database created, rules published).
