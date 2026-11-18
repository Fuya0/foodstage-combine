export type Bounds = { min: readonly number[]; max: readonly number[] };
function valid(value: Bounds | undefined): value is Bounds {
  return !!value && value.min?.length === 3 && value.max?.length === 3 && [...value.min, ...value.max].every(Number.isFinite)
    && value.max.every((max, i) => max >= value.min[i]) && value.max.some((max, i) => max > value.min[i]);
}
export function modelPlacement(actual: Bounds, reference?: Bounds) {
  if (!valid(actual)) throw new Error("Invalid model bounds");
  const bounds = valid(reference) ? reference : actual;
  const size = bounds.max.map((max, i) => max - bounds.min[i]);
  const scale = 2.5 / Math.max(...size);
  return { center: bounds.min.map((min, i) => (min + bounds.max[i]) / 2), scale, radius: Math.hypot(...size) * scale / 2 };
}
export function cameraDistance(radius: number, aspect: number, fov = 35) {
  const vertical = fov * Math.PI / 360;
  const horizontal = Math.atan(Math.tan(vertical) * Math.max(aspect, 0.01));
  return radius * 1.08 / Math.sin(Math.min(vertical, horizontal));
}
