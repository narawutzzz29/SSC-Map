const CACHE = "ssc-map-site-v2";
const SHELL = ["./", "./index.html", "./manifest.webmanifest"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function tell(msg) {
  self.clients.matchAll({ includeUncontrolled: true }).then(cs => cs.forEach(c => c.postMessage(msg)));
}
const tag = res => (res && (res.headers.get("etag") || res.headers.get("last-modified") || res.headers.get("content-length"))) || "";

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  const isPage = e.request.mode === "navigate" || /\.html$/.test(url.pathname) || url.pathname.endsWith("/");
  e.respondWith(caches.match(e.request).then(hit => {
    const net = fetch(e.request).then(res => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        if (isPage && hit && tag(hit) && tag(res) && tag(hit) !== tag(res)) tell({ ssc: "update" });
      }
      return res;
    }).catch(() => hit || caches.match("./index.html"));
    return hit || net;
  }));
});
