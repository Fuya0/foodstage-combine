export type StoreKind = "burger" | "siam" | "noodle" | "coffee" | "dessert";

export interface Store {
  id: StoreKind;
  name: string;
  shortName: string;
  category: string;
  note: string;
  status: "open" | "renovating";
  href?: string;
}

// Same-site links resolve from the portal document, including nested static mounts.
export const restaurantLinks = {
  burger: "./jiaoguang/",
  siam: "./xlsk/",
} as const;

export const stores: Store[] = [
  {
    id: "burger",
    name: "食刻 · 手作汉堡",
    shortName: "食刻",
    category: "汉堡 · 薯条 · 冷饮",
    note: "红黄美漫小馆",
    status: "open",
    href: restaurantLinks.burger,
  },
  {
    id: "siam",
    name: "暹罗食刻",
    shortName: "暹罗食刻",
    category: "冬阴功 · 沙嗲 · 金边粉",
    note: "东南亚手绘菜单",
    status: "open",
    href: restaurantLinks.siam,
  },
  {
    id: "noodle",
    name: "巷口面馆",
    shortName: "巷口面馆",
    category: "汤面 · 拌面 · 小食",
    note: "一碗热乎的街坊味",
    status: "renovating",
  },
  {
    id: "coffee",
    name: "山野咖啡",
    shortName: "山野咖啡",
    category: "咖啡 · 茶饮 · 烘焙",
    note: "街角的一小段休息时间",
    status: "renovating",
  },
  {
    id: "dessert",
    name: "甜品补给站",
    shortName: "甜品补给站",
    category: "蛋糕 · 布丁 · 冰品",
    note: "给这一餐留一点甜",
    status: "renovating",
  },
];
