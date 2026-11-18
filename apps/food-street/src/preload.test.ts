import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const manifest = { version: 1, stores: [{ href: './jiaoguang/', resources: [
  { href: './jiaoguang/', kind: 'document', bytes: 700 },
  { href: './jiaoguang/assets/main-12345678.js', kind: 'script', bytes: 1200000 },
  { href: './jiaoguang/assets/style-12345678.css', kind: 'style', bytes: 45000 },
] }, { href: './xlsk/', resources: [{ href: './xlsk/assets/main-12345678.js', kind: 'script', bytes: 280000 }] }] };
let appended: Record<string, unknown>[], fetcher: ReturnType<typeof vi.fn>, page: { baseURI: string; visibilityState: string };
beforeEach(() => {
  vi.resetModules(); appended = [];
  page = { baseURI: 'https://example.test/event/demo/#shops', visibilityState: 'visible' };
  vi.stubGlobal('document', { ...page, head: { appendChild: (node: Record<string, unknown>) => appended.push(node) }, createElement: () => ({ relList: { supports: () => true }, setAttribute: vi.fn() }) });
  vi.stubGlobal('navigator', { connection: { saveData: false, effectiveType: '4g' } });
  fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => structuredClone(manifest) });
  vi.stubGlobal('fetch', fetcher);
});
afterEach(() => vi.unstubAllGlobals());

describe('intent-only store resource hints', () => {
  it('keeps startup inert and warms only the chosen store under the current mount', async () => {
    const { warmStore } = await import('./preload');
    expect(fetcher).not.toHaveBeenCalled();
    await warmStore('./jiaoguang/');
    expect(appended.map(node => node.href)).toEqual([
      'https://example.test/event/demo/jiaoguang/',
      'https://example.test/event/demo/jiaoguang/assets/main-12345678.js',
      'https://example.test/event/demo/jiaoguang/assets/style-12345678.css',
    ]);
    expect(appended.every(node => node.rel === 'prefetch')).toBe(true);
    expect(appended.every(node => !String(node.href).includes('/xlsk/'))).toBe(true);
    await warmStore('./jiaoguang/');
    expect(appended).toHaveLength(3);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each([{ saveData: true, effectiveType: '4g' }, { saveData: false, effectiveType: '2g' }, { saveData: false, effectiveType: '3g' }])('does not speculate on a constrained connection %o', async connection => {
    vi.stubGlobal('navigator', { connection });
    const { warmStore } = await import('./preload');
    await warmStore('./jiaoguang/');
    expect(fetcher).not.toHaveBeenCalled(); expect(appended).toEqual([]);
  });
  it('skips hidden pages and browsers without prefetch support', async () => {
    const { warmStore } = await import('./preload');
    (document as unknown as { visibilityState: string }).visibilityState = 'hidden';
    await warmStore('./jiaoguang/'); expect(fetcher).not.toHaveBeenCalled();
    (document as unknown as { visibilityState: string }).visibilityState = 'visible';
    vi.stubGlobal('document', { ...document, createElement: () => ({ relList: { supports: () => false } }) });
    await warmStore('./jiaoguang/'); expect(fetcher).not.toHaveBeenCalled();
  });
  it('never downloads model/image/audio or another origin/store from malformed metadata', async () => {
    const data = structuredClone(manifest);
    data.stores[0]!.resources.push(
      { href: './jiaoguang/models-runtime/burger-0.glb', kind: 'script', bytes: 100 },
      { href: './xlsk/assets/other.js', kind: 'script', bytes: 100 },
      { href: 'https://outside.test/file.js', kind: 'script', bytes: 100 },
      { href: './jiaoguang/audio/bite.mp3', kind: 'document', bytes: 100 },
    );
    fetcher.mockResolvedValue({ ok: true, json: async () => data });
    const { warmStore } = await import('./preload'); await warmStore('./jiaoguang/');
    expect(appended).toHaveLength(3);
  });
  it('shares a two-MiB visit budget and does not enqueue oversized or duplicate resources', async () => {
    const data = structuredClone(manifest);
    data.stores[0]!.resources.push({ href: './jiaoguang/assets/oversized.js', kind: 'script', bytes: 3 * 1024 * 1024 });
    data.stores[1]!.resources.push({ href: './xlsk/assets/extra.js', kind: 'script', bytes: 900000 });
    fetcher.mockResolvedValue({ ok: true, json: async () => data });
    const { warmStore } = await import('./preload');
    await Promise.all([warmStore('./jiaoguang/'), warmStore('./jiaoguang/')]); await warmStore('./xlsk/');
    expect(appended).toHaveLength(4);
    expect(appended.some(node => /oversized|extra/.test(String(node.href)))).toBe(false);
  });
  it('fails quietly and can retry after an optional metadata request fails', async () => {
    fetcher.mockRejectedValueOnce(new Error('offline'));
    const { warmStore } = await import('./preload');
    await expect(warmStore('./jiaoguang/')).resolves.toBeUndefined(); expect(appended).toEqual([]);
    await warmStore('./jiaoguang/'); expect(appended).toHaveLength(3);
  });
  it('does not start speculative resources if the page became hidden during metadata loading', async () => {
    let resolve!: (value: unknown) => void;
    fetcher.mockReturnValue(new Promise(r => { resolve = r; }));
    const { warmStore } = await import('./preload'); const pending = warmStore('./jiaoguang/');
    (document as unknown as { visibilityState: string }).visibilityState = 'hidden';
    resolve({ ok: true, json: async () => structuredClone(manifest) }); await pending;
    expect(appended).toEqual([]);
  });
  it('drops stale intent after metadata resolves without aborting another store consumer', async () => {
    let resolve!: (value: unknown) => void;
    fetcher.mockReturnValue(new Promise(r => { resolve = r; }));
    const { warmStore } = await import('./preload');
    const intent = new AbortController();
    const canceled = warmStore('./jiaoguang/', intent.signal);
    const current = warmStore('./xlsk/');
    intent.abort();
    resolve({ ok: true, json: async () => structuredClone(manifest) });
    await Promise.all([canceled, current]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(appended).toHaveLength(1);
    expect(String(appended[0]!.href)).toContain('/xlsk/assets/');
  });

});
