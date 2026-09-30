export {};

declare const self: ServiceWorkerGlobalScope;
declare const __PRECACHE__: { version: string; files: string[] };

const cachePrefix = "plate-pool-";
const { version, files } = __PRECACHE__;
const cacheName = `${cachePrefix}${version}`;
const scope = self.registration.scope;
const appShell = new URL("index.html", scope).href;
const networkTimeoutMs = 3000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    self.caches
      .open(cacheName)
      .then((cache) => cache.addAll(files.map((file) => new Request(new URL(file, scope), { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name.startsWith(cachePrefix) && name !== cacheName).map((name) => self.caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || !request.url.startsWith(scope)) return;
  event.respondWith(request.mode === "navigate" ? networkFirst(request) : cacheFirst(request));
});

async function networkFirst(request: Request): Promise<Response> {
  const network = self.fetch(request.url, { cache: "no-cache" });
  const timeout = new Promise<undefined>((resolve) => setTimeout(resolve, networkTimeoutMs));
  const response = await Promise.race([network, timeout]).catch(() => undefined);
  if (response) return response;
  return (await self.caches.match(appShell)) ?? network;
}

async function cacheFirst(request: Request): Promise<Response> {
  return (await self.caches.match(request)) ?? self.fetch(request);
}
