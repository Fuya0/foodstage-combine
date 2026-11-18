import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
const output = fileURLToPath(new URL("../../../.codex/screenshots/", import.meta.url));
mkdirSync(output, { recursive: true });

async function fits(page: import("@playwright/test").Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

test("门户保持原美食街风格，选店前不加载3D资源", async ({ page }, info) => {
  const models: string[] = [];
  page.on("request", request => { if (/\.glb(?:\?|$)/.test(request.url())) models.push(request.url()); });
  await page.goto("./");
  await expect(page.locator(".welcome-copy h1")).toHaveText("食刻美食街");
  await page.screenshot({ path: `${output}/${info.project.name}-welcome.png`, fullPage: true });
  await page.getByRole("button", { name: "开街逛逛" }).click();
  await expect(page).toHaveURL(/#shops$/);
  await expect(page.locator("[data-status='open']")).toHaveCount(2);
  await expect(page.locator("[data-status='renovating']")).toHaveCount(3);
  await expect(page.locator("[data-store='burger']")).toHaveAttribute("href", "./jiaoguang/");
  await expect(page.locator("[data-store='siam']")).toHaveAttribute("href", "./xlsk/");
  await page.screenshot({ path: `${output}/${info.project.name}-shops.png`, fullPage: true });
  expect(models).toEqual([]);
  await page.getByRole("button", { name: "返回街口" }).click();
  await expect(page.getByRole("button", { name: "开街逛逛" })).toBeVisible();
});

for (const store of ["burger", "siam"] as const) {
  test(`${store}同站进店、刷新和浏览器返回美食街`, async ({ page, baseURL }) => {
    const errors: string[] = [], failures: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) failures.push(response.url()); });
    await page.goto("./#shops");
    await page.locator(`[data-store='${store}']`).click();
    const directory = store === "burger" ? "jiaoguang/" : "xlsk/";
    await expect(page).toHaveURL(new URL(directory, baseURL!).href);
    if (store === "burger") await expect(page.locator('[data-testid="menu-model-preview"][data-ready="true"]').first()).toBeVisible();
    else await expect(page.locator('.model-surface[data-model-state="ready"]').first()).toBeVisible();
    await page.reload();
    if (store === "burger") await expect(page.locator('[data-testid="menu-model-preview"][data-ready="true"]').first()).toBeVisible();
    else await expect(page.locator('.model-surface[data-model-state="ready"]').first()).toBeVisible();
    await fits(page);
    await page.goBack();
    await expect(page).toHaveURL(/#shops$/);
    await expect(page.locator('[data-status="open"]')).toHaveCount(2);
    expect(errors).toEqual([]);
    expect(failures).toEqual([]);
  });
}

test("手机和平板门户无横向溢出，装修店不可点击", async ({ page }, info) => {
  for (const width of [390, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("./");
    await fits(page);
    await page.getByRole("button", { name: "开街逛逛" }).click();
    await fits(page);
    await expect(page.locator("a[data-status='renovating']")).toHaveCount(0);
    await page.screenshot({ path: `${output}/${info.project.name}-shops-${width}.png`, fullPage: true });
  }
});

test.describe("触屏试吃资源和交互", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  for (const app of ["jiaoguang", "xlsk"] as const) {
    test(`${app}四阶段12口、结束、重玩与资源子目录`, async ({ page, baseURL }) => {
      const errors: string[] = [], failures: string[] = [], assets: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("response", response => { if (response.status() >= 400) failures.push(response.url()); });
      page.on("request", request => { if (/\.(glb|mp3|ogg|wav)(?:\?|$)/.test(request.url())) assets.push(request.url()); });
      await page.addInitScript(() => {
        localStorage.setItem('foodstage-3d-settings', JSON.stringify({ sound: false, haptics: false, motion: 'full', sensitivity: 1 }));
        localStorage.setItem('siam-shike-sketch-settings-v1', JSON.stringify({ sound: false, reducedMotion: false }));
      });
      if (app === "jiaoguang") {
        await page.goto("./jiaoguang/?table=A01&item=classic-burger&view=tasting");
        for (let n = 1; n <= 12; n++) {
          await page.waitForFunction(() => document.querySelector('[data-testid="experience"]')?.getAttribute('data-phase') === 'idle' && document.querySelector('.food-input')?.getAttribute('data-hit-ready') === 'true');
          await page.locator('.food-input').press('Space');
          await page.waitForFunction(n => Number(document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')) >= Math.round(n / 12 * 100), n);
        }
        await page.getByRole('button', { name: '再吃一次', exact: true }).click();
        await page.waitForFunction(() => document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow') === '0');
      } else {
        await page.goto("./xlsk/");
        await page.getByRole('button', { name: '翻开菜单', exact: true }).click();
        await page.locator('[data-dish="tom-yum"] .card-tasting').click();
        for (let n = 1; n <= 12; n++) {
          await page.waitForFunction(() => document.querySelector('.tasting-interaction')?.getAttribute('data-ready') === 'true');
          await page.locator('.tasting-interaction').press('Enter');
          await page.waitForFunction(n => document.querySelector('.tasting-interaction')?.getAttribute('data-bites') === String(n), n);
        }
        await expect(page.getByRole('heading', { name: '吃光了，刚刚好。', exact: true })).toBeVisible();
        await page.getByRole('button', { name: '再尝一次', exact: true }).click();
        await page.waitForFunction(() => document.querySelector('.tasting-interaction')?.getAttribute('data-ready') === 'true' && document.querySelector('.tasting-interaction')?.getAttribute('data-bites') === '0');
      }
      const prefix = new URL(`${app}/`, baseURL!).href;
      const uiSounds = await page.evaluate(async ({ prefix }) => {
        const context = new AudioContext();
        try {
          const result = [];
          for (const name of ['complete.ogg', 'stage-transition.wav']) {
            const url = `${prefix}audio/ui/${name}`, response = await fetch(url);
            if (!response.ok) throw new Error(url);
            const audio = await context.decodeAudioData(await response.arrayBuffer());
            result.push(audio.duration);
          }
          return result;
        } finally { await context.close(); }
      }, { prefix });
      expect(uiSounds.every(duration => duration > 0)).toBe(true);
      expect(assets.some(url => url.endsWith('.glb'))).toBe(true);
      expect(assets.every(url => url.startsWith(prefix))).toBe(true);
      await fits(page);
      expect(errors).toEqual([]);
      expect(failures).toEqual([]);
    });
  }
});
