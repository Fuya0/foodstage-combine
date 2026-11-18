import { describe, expect, it } from "vitest";
import { modelForBites } from "./tastingModel";
import { modelPlacement, cameraDistance } from "./modelView";

describe("modelForBites", () => {
  it("maps twelve bites to four model stages", () => {
    const models = ["0", "1", "2", "3"] as const;
    expect([0, 2, 3, 5, 6, 8, 9, 12].map((bites) => modelForBites(models, bites)))
      .toEqual(["0", "0", "1", "1", "2", "2", "3", "3"]);
  });
});


describe("stable food model coordinates", () => {
  const full = { min: [-1.5, 0, -1.2], max: [1.5, 1.1, 1.2] };
  const remaining = { min: [-1.5, 0, -1.2], max: [1.5, 0.25, 1.2] };
  it("keeps the same plate, pivot and scale after food disappears", () => {
    const start = modelPlacement(full, full);
    const eaten = modelPlacement(remaining, full);
    expect(eaten).toEqual(start);
    expect(start.scale).toBeCloseTo(2.5 / 3);
    expect(start.center).toEqual([0, 0.55, 0]);
  });
  it("does not trust invalid model metadata", () => {
    expect(modelPlacement(full, { min: [0, 0, 0], max: [NaN, 0, 0] })).toEqual(modelPlacement(full));
    expect(() => modelPlacement({ min: [0, 0, 0], max: [0, 0, 0] })).toThrow();
  });
  it("fits a rotating model sphere in both portrait and landscape", () => {
    const radius = modelPlacement(full).radius;
    for (const aspect of [0.5, 1, 1.8]) {
      const distance = cameraDistance(radius, aspect);
      const v = 35 * Math.PI / 360;
      const h = Math.atan(Math.tan(v) * aspect);
      expect(distance * Math.sin(Math.min(v, h))).toBeGreaterThan(radius);
    }
    expect(cameraDistance(radius, 0.5)).toBeGreaterThan(cameraDistance(radius, 1.8));
  });
});
