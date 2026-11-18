import { describe, expect, it, vi } from 'vitest';
import { biteRecipe, biteUrls } from './biteRecipe';

describe('recorded bite selection', () => {
  it('varies rice middle chews while preserving the opening and closing roles', () => {
    const random = vi.spyOn(Math, 'random');
    try {
      random.mockReturnValue(0);
      expect(biteRecipe('mango-rice', 2)!.url).toContain('/chew-1.mp3');
      random.mockReturnValue(.99);
      expect(biteRecipe('mango-rice', 2)!.url).toContain('/chew-2.mp3');
      expect(biteRecipe('mango-rice', 1)!.url).toContain('/bite.mp3');
      expect(biteRecipe('mango-rice', 3)!.url).toContain('/finish.mp3');
    } finally { random.mockRestore(); }
  });
  for (const dish of ['satay', 'pad-thai', 'mango-rice', 'tom-yum']) {
    it(`${dish}: all twelve bites resolve to shipped stage recordings`, () => {
      for (let bite = 1; bite <= 12; bite++) {
        const recipe = biteRecipe(dish, bite)!;
        expect(recipe.stage).toBe(Math.floor((bite - 1) / 3));
        expect(recipe.url).toMatch(new RegExp(`/${dish}/v[23456789]/stage-${recipe.stage}/`));
      }
      expect(biteUrls(dish)).toHaveLength(16);
      expect(biteRecipe(dish, 3)!.url).toContain('/stage-0/finish.mp3');
      expect(biteRecipe(dish, 4)!.url).toContain('/stage-1/bite.mp3');
      expect(biteRecipe(dish, 12)!.url).toContain('/stage-3/finish.mp3');
    });
  }
  it('ignores unknown dishes and invalid bite counts', () => {
    expect(biteRecipe('unknown', 1)).toBeNull();
    expect(biteUrls('unknown')).toEqual([]);
    for (const bite of [-1, 0, 13, NaN, 1.5]) expect(biteRecipe('satay', bite)).toBeNull();
  });
});
