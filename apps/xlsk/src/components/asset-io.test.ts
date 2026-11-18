import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import MenuRibbon from './MenuRibbon';
import SketchDish from './SketchDish';
import { dishes } from '../data';

const settings = { sound: false, reducedMotion: true };
afterEach(() => vi.unstubAllEnvs());

describe('displayed public artwork', () => {
  it('rebases ribbon images without changing the shared dish catalog', () => {
    vi.stubEnv('BASE_URL', './');
    const html = renderToStaticMarkup(createElement(MenuRibbon, { settings, onSelect: () => {} }));
    expect(html).toContain('src="./dishes/stage-tom-yum.png"');
    expect(dishes.find(dish => dish.id === 'tom-yum')!.image).toBe('/dishes/stage-tom-yum.png');
  });

  it('rebases a static SketchDish image when no 3D model is available', () => {
    vi.stubEnv('BASE_URL', './');
    const dish = { ...dishes[0], tastingModels: undefined };
    const html = renderToStaticMarkup(createElement(SketchDish, { dish, settings }));
    expect(html).toContain('src="./dishes/stage-tom-yum.png"');
  });
});
