
// Simple SFX manager. Drop audio files in assets/sfx/ with given names.
// Now supports a remote manifest of SFX URLs.
  const REMOTE_MANIFEST_URL = (typeof window.YETRIS_REMOTE_MANIFEST_URL === 'string') ? window.YETRIS_REMOTE_MANIFEST_URL : null;
  let remoteManifest = null;
  async function loadManifest() {
    if (!REMOTE_MANIFEST_URL) return null;
    try {
      const res = await fetch(REMOTE_MANIFEST_URL, { mode:'cors' });
      if (!res.ok) throw new Error('manifest fetch failed');
      return await res.json();
    } catch (e) {
      console.warn('SFX manifest load error', e);
      return null;
    }
  }

// If missing, use WebAudio bleeps.
(() => {
  // import-like dynamic loader for voicy pages
  let resolveVoicyToObjectUrl;
  (async()=>{
    try { const mod = await import('./voicy_scraper.js'); resolveVoicyToObjectUrl = mod.resolveVoicyToObjectUrl; } catch(e){ console.warn('voicy loader failed', e); }
  })();

  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const files = {
    spawn: 'assets/sfx/spawn.mp3',
    move: 'assets/sfx/move.mp3',
    rotate: 'assets/sfx/rotate.mp3',
    soft: 'assets/sfx/soft_drop.mp3',
    hard: 'assets/sfx/hard_drop.mp3',
    lock: 'assets/sfx/lock.mp3',
    line: 'assets/sfx/line.mp3',
    level: 'assets/sfx/level.mp3',
    start: 'assets/sfx/start.mp3',
    pause: 'assets/sfx/pause.mp3',
    reset: 'assets/sfx/reset.mp3',
  };

  const buffers = new Map();

  async function load(url) {
    try {
      let finalUrl = url;
      if (/^https?:\/\/www\.voicy\.network\//i.test(url) && resolveVoicyToObjectUrl) {
        finalUrl = await resolveVoicyToObjectUrl(url);
      }
      const res = await fetch(finalUrl);
      const arr = await res.arrayBuffer();
      return await ctx.decodeAudioData(arr);
    } catch (e) {
      console.warn('SFX load failed', url, e);
      return null;
    }
  }

  async function ensure() {
    remoteManifest = await loadManifest();
    const merged = { ...files };
    if (remoteManifest?.sfx) {
      for (const [k, url] of Object.entries(remoteManifest.sfx)) {
        merged[k] = url;
      }
    }
    for (const [k, url] of Object.entries(merged)) {
      const buf = await load(url);
      if (buf) buffers.set(k, buf);
    }
  }
  ensure();

  function beep(freq=440, dur=0.06) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = freq;
    g.gain.value = 0.05;
    o.start();
    setTimeout(()=>{ o.stop(); }, dur*1000);
  }
  function play(name, def=[550,0.06]) {
    const buf = buffers.get(name);
    if (buf) {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start();
    } else {
      beep(...def);
    }
  }
  window.SFX = {
    onSpawn(){ play('spawn',[660,0.05]); },
    onMove(){ play('move',[480,0.03]); },
    onRotate(){ play('rotate',[720,0.04]); },
    onSoftDrop(){ play('soft',[420,0.03]); },
    onHardDrop(){ play('hard',[240,0.08]); },
    onLock(){ play('lock',[320,0.05]); },
    onLine(){ play('line',[880,0.08]); },
    onLevel(){ play('level',[990,0.08]); },
    onStart(){ play('start',[700,0.08]); },
    onPause(){ play('pause',[300,0.06]); },
    onReset(){ play('reset',[300,0.06]); },
  };
})();
