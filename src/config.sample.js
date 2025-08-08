// Copy this to src/config.js and fill with your Firebase keys OR leave as {} to use local-only leaderboard.
// Also optionally set a remote manifest URL for album cover & SFX URLs.
window.YETRIS_FIREBASE = {
  // apiKey: "YOUR_KEY",
  // authDomain: "your-app.firebaseapp.com",
  // databaseURL: "https://your-app-default-rtdb.firebaseio.com",
  // projectId: "your-app",
  // storageBucket: "your-app.appspot.com",
  // messagingSenderId: "1234567890",
  // appId: "1:1234567890:web:abcdefg"
};

// Where to load skins & sfx from. You can host this JSON anywhere with CORS enabled.
window.YETRIS_REMOTE_MANIFEST_URL = window.YETRIS_REMOTE_MANIFEST_URL || "assets/remote-manifest.json";
