export type TastingModels = readonly [string, string, string, string];

export function modelForBites(models: TastingModels, bites: number): string {
  return models[Math.min(3, Math.max(0, Math.floor(bites / 3)))];
}
