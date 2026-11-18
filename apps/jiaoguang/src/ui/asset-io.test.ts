import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MenuCover } from './MenuCover';
import { FoodPicker } from './FoodPicker';
import { foodById } from '../data/foods';

afterEach(() => vi.unstubAllEnvs());

describe('displayed public artwork', () => {
  it('rebases menu artwork at render time while preserving the catalog identifier', () => {
    vi.stubEnv('BASE_URL', './');
    const food = foodById('classic-burger');
    const html = renderToStaticMarkup(createElement(MenuCover, { src: food.cover!, name: food.name }));
    expect(html).toContain('src="./foods/burger-menu-cutout.png"');
    expect(food.cover).toBe('/foods/burger-menu-cutout.png');
  });

  it('rebases the legacy FoodPicker landing illustration', () => {
    vi.stubEnv('BASE_URL', './');
    const html = renderToStaticMarkup(createElement(FoodPicker, { foods: [], onStart: () => {} }));
    expect(html).toContain('src="./foods/fast-food-spread.svg"');
  });
});
