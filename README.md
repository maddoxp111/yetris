# Yetris
Physics-y mobile Tetris with Kanye album cover skins and a live leaderboard.

## Quick start (GitHub Pages)
1. **Download** this folder and push to a GitHub repo.
2. Copy `src/config.sample.js` to `src/config.js`. Leave it empty to use local-only leaderboard, or paste Firebase keys to enable realtime global scores.
3. Drop 7 album cover images into `assets/images/` with these exact names:
   - `college_dropout.jpg`
   - `late_registration.jpg`
   - `graduation.jpg`
   - `808s.jpg`
   - `mbdtf.jpg`
   - `yeezus.jpg`
   - `tlop.jpg`
4. (Optional) Add sound effects MP3s in `assets/sfx/` named: `spawn.mp3, move.mp3, rotate.mp3, soft_drop.mp3, hard_drop.mp3, lock.mp3, line.mp3, level.mp3, start.mp3, pause.mp3, reset.mp3`.
5. Commit & enable GitHub Pages (Settings → Pages → Deploy from branch).

## Firebase Leaderboard (optional but recommended)
- Create a Firebase project and enable **Realtime Database**.
- Security rules (basic / open): 
  ```json
  {
    "rules": {
      ".read": true,
      ".write": true
    }
  }
  ```
  For production, lock this down to authenticated writes or rate-limit by IP/Cloud Functions.
- Copy your web app config into `src/config.js`:
  ```js
  window.YETRIS_FIREBASE = {
    apiKey: "…",
    authDomain: "…",
    databaseURL: "…",
    projectId: "…",
    storageBucket: "…",
    messagingSenderId: "…",
    appId: "…"
  };
  ```

## Controls
- Keyboard: ← → move, ↑ rotate, ↓ soft drop, Space hard drop.
- Mobile: onscreen buttons (tap/hold down for soft drop).

## How the physics works
- Pieces spawn as rigid shapes (connected with constraints). When they settle, constraints break so loose cubes can tumble off edges.
- Lines clear when all **10 columns** have at least one cube center inside a row band. Clearing awards points and increases level/gravity.

## Notes
- This is an arcade **twist**, not purist Tetris. The physics can cause fun chaos—intended!
- If you want classic lock delay/rotation rules, you'd need deeper grid logic.

MIT License.


## Remote skins & SFX (online)
- Edit `window.YETRIS_REMOTE_MANIFEST_URL` in `src/config.js` to point to a JSON file hosted online (must allow CORS).
- The manifest format is in `assets/remote-manifest.sample.json`. Keys:
  - `skins`: map of tetromino letters `I,J,L,O,S,T,Z` → **absolute image URLs** (album covers)
  - `sfx`: map of event names → **absolute audio URLs** (`spawn, move, rotate, soft, hard, lock, line, level, start, pause, reset`)

> **Licensing note**: Album covers and artist voice clips are copyrighted. Use your own assets or properly licensed content. Hosting on your own server/GitHub Pages with permission is recommended.
