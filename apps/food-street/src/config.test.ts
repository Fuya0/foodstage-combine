import { describe, expect, it } from "vitest";
import { restaurantLinks, stores } from "./config";

describe("美食街店铺配置", () => {
  it("提供两家可进入的营业店", () => {
    const openStores = stores.filter((store) => store.status === "open");
    expect(openStores.map((store) => store.id)).toEqual(["burger", "siam"]);
    expect(openStores.every((store) => Boolean(store.href))).toBe(true);
  });

  it("三家装修店不包含跳转地址", () => {
    const renovatingStores = stores.filter((store) => store.status === "renovating");
    expect(renovatingStores).toHaveLength(3);
    expect(renovatingStores.every((store) => store.href === undefined)).toBe(true);
  });

  it("keeps both restaurants on the current host and preserves a nested mount", () => {
    for (const mount of ["https://example.test/", "https://example.test/event/demo/"]) {
      const burger = new URL(restaurantLinks.burger, mount);
      const siam = new URL(restaurantLinks.siam, mount);
      expect(burger.origin).toBe(new URL(mount).origin);
      expect(siam.origin).toBe(burger.origin);
      expect(burger.pathname).toBe(`${new URL(mount).pathname}jiaoguang/`);
      expect(siam.pathname).toBe(`${new URL(mount).pathname}xlsk/`);
      expect(burger.pathname).not.toBe(siam.pathname);
    }
  });
});
