import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 0.5; });
  await page.goto('/');
});

test('start, ascend, collect a firefly, pause, resume and return home', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await expect(page).toHaveTitle('Выше — только небо впереди');
  await page.locator('#launch-button').click();
  await expect(page.locator('#game-hud')).toBeVisible();
  await expect.poll(async () => Number(await page.locator('#height-value').textContent())).toBeGreaterThan(10);
  await expect.poll(async () => Number(await page.locator('#spark-value').textContent()), { timeout: 8000 }).toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('#overlay-title')).toHaveText('Поймаем дыхание?');
  const height = await page.locator('#height-value').textContent();
  await page.waitForTimeout(400);
  await expect(page.locator('#height-value')).toHaveText(height!);
  await page.locator('#resume-button').click();
  await expect(page.locator('#game-overlay')).toBeHidden();
  await expect.poll(async () => Number(await page.locator('#height-value').textContent())).toBeGreaterThan(Number(height));
  await page.keyboard.press('Escape');
  await page.locator('#back-button').click();
  await expect(page.locator('#ready-label')).toBeVisible();
  await expect(page.locator('[data-mode="zen"]')).toBeEnabled();
  expect(errors).toEqual([]);
});

test('instructions work and sound preference survives reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Как играть' }).click();
  await expect(page.locator('#help-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#help-dialog')).toBeHidden();
  await page.getByRole('button', { name: 'Выключить звук' }).click();
  await expect(page.getByRole('button', { name: 'Включить звук' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Включить звук' })).toBeVisible();
  await page.getByRole('button', { name: 'Включить звук' }).click();
  await expect(page.getByRole('button', { name: 'Выключить звук' })).toBeVisible();
});

test('collisions end the run, save the best height, and allow restart', async ({ page }) => {
  await page.locator('#scene-start').click();
  await page.keyboard.down('ArrowLeft');
  await expect(page.locator('#result-stats')).toBeVisible({ timeout: 20_000 });
  await page.keyboard.up('ArrowLeft');
  await expect(page.locator('#hearts .lost')).toHaveCount(3);
  const result = Number(await page.locator('#result-height').textContent());
  expect(result).toBeGreaterThan(150);
  await expect(page.locator('#personal-best')).toHaveText(String(result));
  await expect(page.locator('#overlay-eyebrow')).toHaveText('ТВОЙ НОВЫЙ РЕКОРД');
  await page.locator('#resume-button').click();
  await expect(page.locator('#game-overlay')).toBeHidden();
  await expect(page.locator('#hearts .lost')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('#personal-best')).toHaveText(String(result));
});

test('zen mode allows uninterrupted flight through obstacles', async ({ page }) => {
  await page.locator('[data-mode="zen"]').click();
  await expect(page.locator('#mode-description')).toContainText('Без потери жизней');
  await page.locator('#scene-start').click();
  await page.keyboard.down('ArrowLeft');
  await page.keyboard.down('Space');
  await expect.poll(async () => Number(await page.locator('#height-value').textContent()), { timeout: 12_000 }).toBeGreaterThan(150);
  await page.keyboard.up('Space');
  await page.keyboard.up('ArrowLeft');
  await expect(page.locator('#hearts')).toHaveAttribute('aria-label', 'Режим без потери жизней');
  await expect(page.locator('#game-overlay')).toBeHidden();
  await page.keyboard.press('Escape');
  await page.locator('#back-button').click();
  await page.locator('[data-mode="adventure"]').click();
  await expect(page.locator('#personal-best')).toHaveText('0');
});

test('the game works when localStorage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage disabled', 'SecurityError'); } });
  });
  await page.reload();
  await page.keyboard.press('Enter');
  await expect(page.locator('#game-hud')).toBeVisible();
  await expect.poll(async () => Number(await page.locator('#height-value').textContent())).toBeGreaterThan(5);
});

test('mobile layout, touch steering, boost, and pause work', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#scene-start').tap();
  await expect(page.locator('#touch-controls')).toBeVisible();
  await expect.poll(async () => Number(await page.locator('#height-value').textContent())).toBeGreaterThan(3);
  const touchSession = await context.newCDPSession(page);
  const boostButton = await page.locator('#touch-boost').boundingBox();
  await touchSession.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: boostButton!.x + boostButton!.width / 2, y: boostButton!.y + boostButton!.height / 2 }] });
  await expect.poll(async () => page.locator('#energy-bar').getAttribute('style')).not.toContain('scaleX(1)');
  await touchSession.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const canvas = await page.locator('#game-canvas').boundingBox();
  await touchSession.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: canvas!.x + canvas!.width * 0.5, y: canvas!.y + canvas!.height * 0.6 }] });
  await touchSession.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: canvas!.x + canvas!.width * 0.3, y: canvas!.y + canvas!.height * 0.6 }] });
  await touchSession.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.locator('#pause-button').tap();
  await expect(page.locator('#overlay-title')).toHaveText('Поймаем дыхание?');
  await page.locator('#resume-button').tap();
  await expect(page.locator('#game-overlay')).toBeHidden();
  expect(errors).toEqual([]);
  await context.close();
});
