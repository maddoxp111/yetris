
// Leaderboard with Firebase Realtime DB (optional).
// If firebase config is missing, falls back to localStorage with BroadcastChannel for "live-ish" updates.

(() => {
  const HAS_FIREBASE = typeof firebase !== 'undefined' && typeof window.YETRIS_FIREBASE === 'object';

  const FALLBACK_KEY = 'yetris:leaderboard';
  const chan = ('BroadcastChannel' in self) ? new BroadcastChannel('yetris_board') : null;

  function sortItems(items) {
    return items.sort((a,b)=>{
      if (b.score !== a.score) return b.score - a.score;
      return a.ts - b.ts; // earlier wins tie
    }).slice(0, 50);
  }

  const Fallback = {
    async list() {
      const raw = localStorage.getItem(FALLBACK_KEY);
      const items = raw ? JSON.parse(raw) : [];
      return sortItems(items);
    },
    async post({name, score}) {
      const items = await Fallback.list();
      items.push({ name, score, ts: Date.now() });
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(sortItems(items)));
      if (chan) chan.postMessage({type:'update'});
    },
    onChange(cb) {
      window.addEventListener('storage', (e)=>{
        if (e.key === FALLBACK_KEY) Fallback.list().then(cb);
      });
      if (chan) chan.onmessage = (ev)=>{
        if (ev.data?.type === 'update') Fallback.list().then(cb);
      };
      // initial
      Fallback.list().then(cb);
    }
  };

  const FirebaseBoard = {
    app: null, db: null, ref: null,
    init() {
      this.app = firebase.initializeApp(window.YETRIS_FIREBASE);
      this.db = firebase.database();
      this.ref = this.db.ref('leaderboard');
    },
    async list() {
      if (!this.app) this.init();
      const snap = await this.ref.get();
      const items = snap.exists() ? Object.values(snap.val()) : [];
      return sortItems(items);
    },
    async post({name, score}) {
      if (!this.app) this.init();
      const key = this.ref.push().key;
      const data = { name, score, ts: Date.now() };
      await this.ref.child(key).set(data);
    },
    onChange(cb) {
      if (!this.app) this.init();
      this.ref.on('value', async ()=>{
        const items = await this.list();
        cb(items);
      });
    }
  };

  window.Leaderboard = HAS_FIREBASE ? FirebaseBoard : Fallback;
})();
