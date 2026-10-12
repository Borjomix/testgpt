import { test, expect } from '@playwright/test';

test('Telegram layout, native back button, and closing confirmation follow game state', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const calls: string[] = [];
    const state = window as unknown as { telegramCalls: string[]; telegramBack: () => void; Telegram: unknown };
    state.telegramCalls = calls;
    state.Telegram = { WebApp: {
      initData: 'test-launch', platform: 'android',
      ready: () => calls.push('ready'), expand: () => calls.push('expand'),
      isVersionAtLeast: () => true,
      setHeaderColor: () => {}, setBackgroundColor: () => {}, setBottomBarColor: () => {},
      enableClosingConfirmation: () => calls.push('confirm-on'),
      disableClosingConfirmation: () => calls.push('confirm-off'),
      disableVerticalSwipes: () => calls.push('disable-swipes'),
      BackButton: { show: () => calls.push('back-show'), hide: () => calls.push('back-hide'), onClick: (callback: () => void) => state.telegramBack = callback },
    } };
  });
  await page.goto('/#tgWebAppVersion=8.0&tgWebAppPlatform=android');
  await expect(page.locator('html')).toHaveClass('in-telegram');
  await expect(page.locator('.guide-strip')).toBeHidden();
  await expect(page.locator('.site-header')).toBeVisible();
  const initialCalls = await page.evaluate(() => (window as unknown as { telegramCalls: string[] }).telegramCalls);
  expect(initialCalls).toEqual(expect.arrayContaining(['ready', 'expand', 'disable-swipes', 'back-hide', 'confirm-off']));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const frame = await page.locator('#game-frame').boundingBox();
  expect(frame!.y + frame!.height).toBeLessThanOrEqual(844);
  await page.locator('#scene-start').click();
  await expect(page.locator('#game-hud')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { telegramCalls: string[] }).telegramCalls)).toContain('confirm-on');
  await page.evaluate(() => (window as unknown as { telegramBack: () => void }).telegramBack());
  await expect(page.locator('#overlay-title')).toHaveText('Поймаем дыхание?');
  await page.evaluate(() => (window as unknown as { telegramBack: () => void }).telegramBack());
  await expect(page.locator('#ready-label')).toBeVisible();
  const finalCalls = await page.evaluate(() => (window as unknown as { telegramCalls: string[] }).telegramCalls);
  expect(finalCalls.slice(-2)).toEqual(['back-hide', 'confirm-off']);
});

test('blocked Telegram SDK falls back to a playable ordinary game', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://telegram.org/js/telegram-web-app.js', route => route.abort());
  await page.goto('/#tgWebAppVersion=8.0&tgWebAppPlatform=android');
  await page.locator('#scene-start').click();
  await expect.poll(async () => Number(await page.locator('#height-value').textContent())).toBeGreaterThan(5);
  expect(errors).toEqual([]);
});
