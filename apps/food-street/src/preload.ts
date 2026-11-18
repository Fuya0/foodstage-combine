type Connection = { saveData?: boolean; effectiveType?: string };
type Hint = { href: string; kind: 'document' | 'script' | 'style'; bytes: number };
type Manifest = { version: 1; stores: { href: string; resources: Hint[] }[] };
const budget = 2 * 1024 * 1024;
let usedBytes = 0;
const requested = new Set<string>();
let pending: Promise<Manifest | null> | undefined;

function allowed() {
  if (typeof document === 'undefined' || document.visibilityState !== 'visible') return false;
  const connection = (navigator as Navigator & { connection?: Connection }).connection;
  if (connection?.saveData || ['slow-2g', '2g', '3g'].includes(connection?.effectiveType ?? '')) return false;
  return document.createElement('link').relList?.supports?.('prefetch') ?? false;
}
function readManifest(): Promise<Manifest | null> {
  if (pending) return pending;
  const request = fetch(new URL('./shop-preload.json', document.baseURI), { cache: 'no-cache', credentials: 'same-origin' })
    .then(async response => {
      if (!response.ok) return null;
      const data = await response.json() as Partial<Manifest>;
      if (data?.version !== 1 || !Array.isArray(data.stores) || !data.stores.every(store => store && typeof store.href === 'string' && Array.isArray(store.resources))) return null;
      return data as Manifest;
    }).catch(() => null);
  pending = request;
  void request.then(value => { if (!value && pending === request) pending = undefined; });
  return request;
}
/** Small metadata only; no store code or 3D model is loaded on directory entry. */
export function prepareStoreHints(): void { if (allowed()) void readManifest(); }

/** Network-only hints for the store the visitor points at. Normal anchor navigation stays independent. */
export async function warmStore(href: string, signal?: AbortSignal): Promise<void> {
  try {
    if (signal?.aborted || !allowed()) return;
    const base = new URL(document.baseURI), target = new URL(href, base);
    if (target.origin !== base.origin || !target.pathname.endsWith('/')) return;
    const manifest = await readManifest();
    if (!manifest || signal?.aborted || !allowed()) return;
    const store = manifest.stores.find(store => {
      const url = new URL(store.href, base);
      return url.origin === target.origin && url.pathname === target.pathname;
    });
    if (!store) return;
    for (const resource of store.resources) {
      if (signal?.aborted) return;
      if (!resource || !Number.isFinite(resource.bytes) || resource.bytes <= 0 || typeof resource.href !== 'string') continue;
      const url = new URL(resource.href, base);
      if (url.origin !== target.origin) continue;
      if (resource.kind === 'document') {
        if (url.pathname !== target.pathname) continue;
        url.search = target.search;
      } else {
        if (!url.pathname.startsWith(`${target.pathname}assets/`)) continue;
        if (!(resource.kind === 'script' && url.pathname.endsWith('.js')) && !(resource.kind === 'style' && url.pathname.endsWith('.css'))) continue;
      }
      if (requested.has(url.href) || usedBytes + resource.bytes > budget) continue;
      const link = document.createElement('link');
      link.rel = 'prefetch'; link.href = url.href; link.fetchPriority = 'low';
      if (resource.kind !== 'document') { link.as = resource.kind; link.crossOrigin = 'anonymous'; }
      link.setAttribute('data-store-prefetch', '');
      requested.add(url.href); usedBytes += resource.bytes;
      document.head.appendChild(link);
    }
  } catch { /* Optional warm-up must never block entering a store. */ }
}
