// Triangle Splitter settings.
// Leave `firebase: null` to run without accounts (everything stays on the phone).
// To turn on sign-in, paste your Firebase web app config here (see SETUP.md, step 3).
window.SPLITIT_CONFIG = {
  firebase: {
    apiKey: "AIzaSyDKMsqFOoD0AHHLWGbq8C4XwH_IC4LooO4",
    authDomain: "trianglesplitter.web.app",   // <- the site's own address, so sign-in works from the iPhone Home Screen
    projectId: "trianglesplitter",
    storageBucket: "trianglesplitter.firebasestorage.app",
    messagingSenderId: "990076289162",
    appId: "1:990076289162:web:e8161c1cb41c76bd432d73"
  },
  apple: false   // set to true after setting up Sign in with Apple (needs a paid Apple Developer account)
};
