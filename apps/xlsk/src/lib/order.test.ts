import { describe, expect, it, vi } from "vitest";
import { addLine, cartTotal, changeQuantity, defaultChoices, lineKey, lineTotal, makeReceipt, unitPrice, readSession } from "./order";
import { emptySession } from "./order";
import type { CartLine } from "../types";

function satay(note = ""): CartLine {
  const choices = { ...defaultChoices("satay"), count: "ten", sauce: "lime" };
  return { key: lineKey("satay", choices, note), dishId: "satay", choices, note, quantity: 2 };
}

describe("菜单计价", () => {
  it("读取新菜单默认规格", () => {
    expect(defaultChoices("tom-yum")).toEqual({ size: "one", spice: "gentle", shrimp: "regular" });
  });

  it("份量和蘸酱加价进入单价", () => {
    expect(unitPrice(satay())).toBe(8600);
    expect(lineTotal(satay())).toBe(17200);
  });

  it("只有菜品、规格和备注都相同才合并", () => {
    const first = satay();
    const merged = addLine([], first);
    const same = addLine(merged, { ...first, quantity: 1 });
    expect(same).toHaveLength(1);
    expect(same[0].quantity).toBe(3);
    const noted = satay("酱料另放");
    expect(addLine(same, noted)).toHaveLength(2);
    const other = satay();
    other.choices = { ...other.choices, count: "five" };
    other.key = lineKey(other.dishId, other.choices, other.note);
    expect(addLine(same, other)).toHaveLength(2);
  });

  it("合并超过单次添加上限后加减仍只改变一份", () => {
    const line = { ...satay(), quantity: 20 };
    const combined = addLine(addLine([], line), line);
    expect(combined[0].quantity).toBe(40);
    expect(changeQuantity(combined, line.key, 1)[0].quantity).toBe(41);
    expect(changeQuantity(combined, line.key, -1)[0].quantity).toBe(39);
  });

  it("数量减到零时移除该行", () => {
    const lines = changeQuantity([satay()], satay().key, -2);
    expect(lines).toEqual([]);
  });

  it("整单金额读取同一份菜单定义", () => {
    const tomChoices = { ...defaultChoices("tom-yum"), size: "share", shrimp: "extra" };
    const tom = { key: lineKey("tom-yum", tomChoices, ""), dishId: "tom-yum", choices: tomChoices, note: "", quantity: 1 };
    expect(cartTotal([satay(), tom])).toBe(28600);
  });

  it("堂食提交需要桌号并生成可核对回执", () => {
    const session = { ...emptySession(), table: "", lines: [satay()] };
    expect(() => makeReceipt(session)).toThrow("请填写桌号");
    const receipt = makeReceipt({ ...session, table: "B06" }, new Date("2026-11-12T12:00:00.000Z"), 0.5);
    expect(receipt.id).toMatch(/^SIAM-20261112-/);
    expect(receipt.total).toBe(17200);
    expect(receipt.table).toBe("B06");
  });

  it("空菜单不能提交", () => {
    expect(() => makeReceipt(emptySession())).toThrow("菜单还是空的");
  });
});


describe("历史订单兼容", () => {
  it("损坏回执含未知菜品时保留有效购物车", () => {
    const valid = satay();
    const stored = { ...emptySession(), lines: [valid], receipt: {
      ...makeReceipt({ ...emptySession(), lines: [valid] }),
      lines: [{ ...valid, dishId: "retired-dish" }],
    } };
    vi.stubGlobal("localStorage", { getItem: () => JSON.stringify(stored) });
    try {
      const session = readSession();
      expect(session.receipt).toBeNull();
      expect(session.lines).toEqual([valid]);
      expect(cartTotal(session.lines)).toBe(17200);
    } finally { vi.unstubAllGlobals(); }
  });
  it("仍在菜单中的已保存回执可以继续显示", () => {
    const stored = { ...emptySession(), receipt: makeReceipt({ ...emptySession(), lines: [satay()] }) };
    vi.stubGlobal("localStorage", { getItem: () => JSON.stringify(stored) });
    try { expect(readSession().receipt).toEqual(stored.receipt); }
    finally { vi.unstubAllGlobals(); }
  });
});


describe("下架菜品历史回执", () => {
  it("混合旧单跨刷新保留全部菜品与总额，下架菜不再进入购物车", () => {
    const valid = satay();
    const retired: CartLine = { key: "old-fish-cake", dishId: "fish-cake", choices: { count: "four", sauce: "cucumber" }, note: "", quantity: 1 };
    const receipt = { ...makeReceipt({ ...emptySession(), lines: [valid] }), lines: [valid, retired], total: 21400 };
    let saved = JSON.stringify({ ...emptySession(), lines: [valid, retired], receipt });
    vi.stubGlobal("localStorage", { getItem: () => saved });
    try {
      const first = readSession();
      expect(first.receipt).toEqual(receipt);
      expect(first.lines).toEqual([valid]);
      saved = JSON.stringify(first);
      const refreshed = readSession();
      expect(refreshed.receipt).toEqual(receipt);
      expect(cartTotal(refreshed.receipt!.lines)).toBe(21400);
      expect(refreshed.lines).toEqual([valid]);
    } finally { vi.unstubAllGlobals(); }
  });
});
