
// Lightweight IndexedDB helper
const IDB = (()=>{
  const DB_NAME = 'yetris-cache';
  const STORE = 'files';
  let dbp;
  function db() {
    if (!dbp) {
      dbp = new Promise((resolve, reject)=>{
        const open = indexedDB.open(DB_NAME, 1);
        open.onupgradeneeded = ()=> open.result.createObjectStore(STORE);
        open.onsuccess = ()=> resolve(open.result);
        open.onerror = ()=> reject(open.error);
      });
    }
    return dbp;
  }
  async function get(key) {
    const d = await db();
    return new Promise((res, rej)=>{
      const tx = d.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      tx.onsuccess = ()=> res(tx.result || null);
      tx.onerror = ()=> rej(tx.error);
    });
  }
  async function set(key, val) {
    const d = await db();
    return new Promise((res, rej)=>{
      const tx = d.transaction(STORE, 'readwrite').objectStore(STORE).put(val, key);
      tx.onsuccess = ()=> res();
      tx.onerror = ()=> rej(tx.error);
    });
  }
  return { get, set };
})();

// Try multiple public CORS proxies
const PROXIES = [
  (u)=>`https://r.jina.ai/http://` + u.replace(/^https?:\/\//,'').replace(/^/,'').replace(/^\/+/,''),
  (u)=>`https://r.jina.ai/https://` + u.replace(/^https?:\/\//,'').replace(/^/,'').replace(/^\/+/,''),
  (u)=>`https://api.allorigins.win/raw?url=` + encodeURIComponent(u),
  (u)=>`https://r.jina.ai/http://r.jina.ai/http://` + u.replace(/^https?:\/\//,''),
];

async function fetchThroughProxies(url, as='text') {
  let lastErr;
  for (const wrap of PROXIES) {
    const prox = wrap(url);
    try {
      const res = await fetch(prox);
      if (!res.ok) throw new Error('bad status '+res.status);
      if (as==='text') return await res.text();
      if (as==='blob') return await res.blob();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('All proxies failed');
}

// Extract candidate audio URLs from Voicy HTML
function extractAudioUrls(html) {
  const urls = new Set();
  // match http(s) urls ending with .mp3 or .ogg up to query
  const re = /https?:\/\/[^\s"'<>]+?\.(mp3|ogg)(\?[^\s"'<>]+)?/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    urls.add(m[0]);
  }
  return [...urls];
}

// Main: resolve Voicy page to object URL, caching by page URL
export async function resolveVoicyToObjectUrl(voicyPageUrl) {
  const cacheKey = `voicy:${voicyPageUrl}`;
  const cached = await IDB.get(cacheKey);
  if (cached) {
    return URL.createObjectURL(cached);
  }
  const html = await fetchThroughProxies(voicyPageUrl, 'text');
  const candidates = extractAudioUrls(html);
  // Prefer mp3 links from voicy cdn
  const preferred = candidates.find(u => /voicy|cdn|cloudfront/i.test(u)) || candidates[0];
  if (!preferred) throw new Error('No audio url found on page');
  const blob = await fetchThroughProxies(preferred, 'blob');
  await IDB.set(cacheKey, blob);
  return URL.createObjectURL(blob);
}
