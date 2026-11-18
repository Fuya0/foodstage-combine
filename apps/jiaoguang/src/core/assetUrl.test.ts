import { afterEach, describe, expect, it, vi } from 'vitest';
import { assetUrl } from './assetUrl';

afterEach(() => vi.unstubAllEnvs());

describe('public asset URL boundary', () => {
  it.each([
    ['/models-runtime/burger-0.glb', './', './models-runtime/burger-0.glb'],
    ['/audio/food/bite.mp3', './', './audio/food/bite.mp3'],
    ['/foods/dish.png?size=2#cover', './', './foods/dish.png?size=2#cover'],
    ['/dishes/satay.png', '/prefix/xlsk/', '/prefix/xlsk/dishes/satay.png'],
    ['/models-stage-image/tom-yum-0.glb', '/prefix/xlsk', '/prefix/xlsk/models-stage-image/tom-yum-0.glb'],
    ['/foods/dish.png', '/', '/foods/dish.png'],
    ['/foods/dish.png', '', './foods/dish.png'],
  ])('resolves %s against %s', (source, base, expected) => {
    expect(assetUrl(source, base)).toBe(expected);
  });

  it.each([
    'https://cdn.example.test/food.glb', 'http://cdn.example.test/sound.mp3',
    '//cdn.example.test/food.png', 'data:image/svg+xml,<svg/>',
    'blob:https://example.test/asset', './foods/dish.png', '../models/food.glb',
    'audio/bite.mp3', '', '#cover', '?variant=small',
  ])('preserves an already relative or independent URL: %s', source => {
    expect(assetUrl(source, '/prefix/shop/')).toBe(source);
  });

  it.each([
    ['https://example.test/jiaoguang/?table=A01', 'https://example.test/jiaoguang/models-runtime/burger-0.glb'],
    ['https://example.test/prefix/jiaoguang/?table=A01', 'https://example.test/prefix/jiaoguang/models-runtime/burger-0.glb'],
    ['https://example.test/xlsk/?table=A01', 'https://example.test/xlsk/models-runtime/burger-0.glb'],
    ['https://example.test/prefix/xlsk/?table=A01', 'https://example.test/prefix/xlsk/models-runtime/burger-0.glb'],
  ])('stays inside the current application at %s', (page, expected) => {
    expect(new URL(assetUrl('/models-runtime/burger-0.glb', './'), page).href).toBe(expected);
  });

  it('uses Vite BASE_URL when no explicit base is supplied', () => {
    vi.stubEnv('BASE_URL', './');
    expect(assetUrl('/audio/ui/complete.ogg')).toBe('./audio/ui/complete.ogg');
  });
});
