// SplitIt settings.
// Leave `firebase: null` to run without accounts (everything stays on the phone).
// To turn on sign-in, paste your Firebase web app config here (see SETUP.md, step 3).
window.SPLITIT_CONFIG = {
  firebase: null,
  /* example:
  firebase: {
    apiKey: "AIza...",
    authDomain: "your-site.netlify.app",   // <- your site's address, NOT the firebaseapp.com one
    projectId: "splitit-12345",
    storageBucket: "splitit-12345.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abc123"
  },
  */
  apple: false   // set to true after setting up Sign in with Apple (needs a paid Apple Developer account)
};
