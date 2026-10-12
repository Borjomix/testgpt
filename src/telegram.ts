import type { Phase } from './model';

interface TelegramWebApp {
  initData: string;
  platform: string;
  ready(): void;
  expand(): void;
  isVersionAtLeast(version: string): boolean;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  setBottomBarColor?(color: string): void;
  enableClosingConfirmation(): void;
  disableClosingConfirmation(): void;
  disableVerticalSwipes?(): void;
  BackButton: { show(): void; hide(): void; onClick(handler: () => void): void };
}

declare global {
  interface Window { Telegram?: { WebApp?: TelegramWebApp } }
}

/** Loads Telegram's SDK only in a Mini App, keeping the ordinary game standalone. */
export function connectTelegram(onBack: () => void) {
  let app: TelegramWebApp | undefined;
  let phase: Phase = 'ready';
  const params = new URLSearchParams(location.hash.slice(1));
  const isMiniApp = params.has('tgWebAppVersion') || Boolean(window.Telegram?.WebApp?.initData);

  function update(next: Phase) {
    phase = next;
    if (!app) return;
    if (app.isVersionAtLeast('6.1')) {
      if (phase === 'ready') app.BackButton.hide();
      else app.BackButton.show();
    }
    if (app.isVersionAtLeast('6.2')) {
      if (phase === 'playing' || phase === 'paused') app.enableClosingConfirmation();
      else app.disableClosingConfirmation();
    }
  }

  function attach() {
    app = window.Telegram?.WebApp;
    if (!app) return;
    document.documentElement.classList.add('in-telegram');
    app.ready();
    app.expand();
    if (app.isVersionAtLeast('6.1')) {
      app.setHeaderColor('#f5f6f0');
      app.setBackgroundColor('#f5f6f0');
      app.BackButton.onClick(onBack);
    }
    // Let vertical drags steer the bird without collapsing the Mini App.
    if (app.isVersionAtLeast('7.7')) app.disableVerticalSwipes?.();
    if (app.isVersionAtLeast('7.10')) app.setBottomBarColor?.('#f5f6f0');
    update(phase);
  }

  if (isMiniApp) {
    if (window.Telegram?.WebApp) attach();
    else {
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-web-app.js';
      script.async = true;
      script.addEventListener('load', attach, { once: true });
      // A failed SDK request must not prevent ordinary touch gameplay.
      script.addEventListener('error', () => script.remove(), { once: true });
      document.head.append(script);
    }
  }

  return { update };
}
