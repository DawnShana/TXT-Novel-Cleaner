const CACHE='novel-cleaner-pwa-v3';
const STATIC=[
  './','./index.html','./app.css','./enhancements.css','./app.js','./src/main.js','./src/state.js','./src/clean-flow.js','./src/rules-ui.js','./src/github-sync.js','./cleaner-core.js','./worker.js',
  './manifest.webmanifest','./icon.svg','./pinyin-p.json','./pinyin-u.json','./pinyin-b.json','./pinyin-t.json',
  './rules/builtin/builtin-ad-1.json','./rules/builtin/builtin-ad-2.json','./rules/builtin/builtin-ad-3.json',
  './rules/builtin/builtin-ad-4.json','./rules/builtin/builtin-ad-5.json'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(u.pathname.endsWith('/rules.json')||u.pathname.endsWith('rules.json')){
    e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{
      const copy=r.clone();
      caches.open(CACHE).then(c=>c.put(e.request,copy));
      return r;
    }).catch(()=>caches.match(e.request)));
    return;
  }
  if(e.request.method==='GET'){
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(n=>{
      const copy=n.clone();
      caches.open(CACHE).then(c=>c.put(e.request,copy));
      return n;
    })));
  }
});
