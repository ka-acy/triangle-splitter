# SplitIt setup

SplitIt works right away with no accounts. Everything stays on the phone.
To turn on **sign-in** (saved bills, sync, paid tracking, invite links), connect it to a free Firebase project.
It takes about 15 minutes, once. Firebase's free plan is plenty for a friend group.

You'll edit two small text files: `config.js` and `_redirects`. Any text editor works (TextEdit on Mac: Format → Make Plain Text).

---

## 1. Put the site online and get your address

1. Go to **app.netlify.com**, sign up free, then open **app.netlify.com/drop**.
2. Drag the whole `SplitIt` folder onto the page.
3. In **Site configuration → Change site name**, pick a name, e.g. `splitit-chang`.
   Your address is now `https://splitit-chang.netlify.app`. You'll need it below. (Replace `splitit-chang` with yours everywhere.)

## 2. Create the Firebase project

1. Go to **console.firebase.google.com** and sign in with Google.
2. **Create a project** → name it `SplitIt` → you can turn off Google Analytics → **Create**.
3. Note the **Project ID** shown under the name (e.g. `splitit-4f2a1`). You'll need it in step 5.

## 3. Connect the app (config.js)

1. On the project home page, click the **</>** (Web) icon. Nickname: `SplitIt`. Don't check Hosting. **Register app**.
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

**Important:** set `authDomain` to **your Netlify address** (no `https://`), not the `firebaseapp.com` one Firebase gives you. That's what makes sign-in work from the iPhone Home Screen.

## 4. Turn on Google sign-in

1. In Firebase: **Build → Authentication → Get started**.
2. **Sign-in method → Google → Enable**, pick your email as the support email, **Save**.
3. **Settings → Authorized domains → Add domain** → `splitit-chang.netlify.app`.

## 5. Point sign-in at your site (_redirects)

Open `_redirects` and replace `YOUR-PROJECT-ID` with your Project ID from step 2:

```
/__/auth/*  https://splitit-4f2a1.firebaseapp.com/__/auth/:splat  200
```

Then allow that address in Google's settings:

1. Go to **console.cloud.google.com**, and pick your SplitIt project at the top.
2. **APIs & Services → Credentials** → click **Web client (auto created by Google Service)**.
3. Under **Authorized redirect URIs**, **Add URI**: `https://splitit-chang.netlify.app/__/auth/handler` → **Save**.

## 6. Create the database and lock it down

1. In Firebase: **Build → Firestore Database → Create database**. Pick a US location, start in **production mode**.
2. Open the **Rules** tab, delete what's there, paste everything from `firestore.rules`, and click **Publish**.

These rules are what make sure friends only ever see their own amount.

## 7. Upload again

In Netlify, open your site → **Deploys** → drag the `SplitIt` folder onto the page again.
Open your address on your iPhone, tap **Sign in**, and you're set. (If you'd already added it to your Home Screen, open it once in Safari first so it picks up the new version.)

---

## Optional: Sign in with Apple

Needs a paid Apple Developer account ($99/year). In Firebase, **Authentication → Sign-in method → Apple**, follow its steps
(Services ID, key, and the same `https://splitit-chang.netlify.app/__/auth/handler` return URL), then set `apple: true` in `config.js` and upload again.

## Troubleshooting

- **"This web address isn't approved for sign-in"**: redo step 4.3 with exactly your Netlify address.
- **Sign-in page shows an error about redirect_uri**: redo step 5 (the URI must end in `/__/auth/handler`).
- **"Couldn't save the bill" or friends see "Bill not found"**: check step 6 (database created, rules published).
