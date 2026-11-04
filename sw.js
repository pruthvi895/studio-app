const C = "studio-v1", SHELL = ["./", "index.html", "app.js", "manifest.json", "icon.svg"];
self.addEventListener("install", e => e.waitUntil(caches.open(C).then(c => c.addAll(SHELL))));
self.addEventListener("fetch", e => {   // app shell only; GitHub API data is never cached
  const u = new URL(e.request.url);
  if (u.origin === location.origin) e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
