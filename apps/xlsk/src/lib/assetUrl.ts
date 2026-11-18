/** Keep catalog/cache identifiers canonical; resolve public paths only at an I/O boundary. */
export function assetUrl(source: string, base = import.meta.env.BASE_URL): string {
  if (!source.startsWith('/') || source.startsWith('//')) return source;
  const prefix = base ? `${base.replace(/\/+$/, '')}/` : './';
  return `${prefix}${source.slice(1)}`;
}
