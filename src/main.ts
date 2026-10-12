import '@fontsource/manrope/cyrillic-400.css';
import '@fontsource/manrope/cyrillic-500.css';
import '@fontsource/manrope/cyrillic-600.css';
import '@fontsource/manrope/cyrillic-700.css';
import '@fontsource/manrope/cyrillic-800.css';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-700.css';
import '@fontsource/manrope/latin-800.css';
import './style.css';
import { FlightModel, type Mode } from './model';
import { FlightRenderer } from './renderer';
import { FlightAudio } from './audio';
import { connectTelegram } from './telegram';

const icons: Record<string, string> = {
  arrow: '<path d="M6 18 18 6M6 6h12v12"/>',
  up: '<path d="m6 10 6-6 6 6M12 4v16"/>',
  sound: '<path d="m11 5-6 4H2v6h3l6 4V5ZM15 8a6 6 0 0 1 0 8M18 4a11 11 0 0 1 0 16"/>',
  muted: '<path d="m11 5-6 4H2v6h3l6 4V5ZM16 9l6 6m0-6-6 6"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="m9 5 11 7-11 7V5Z"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  star: '<path d="m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8L12 2Z"/>',
  cup: '<path d="M8 3h8v7a4 4 0 0 1-8 0V3ZM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4M12 14v6m-4 1h8"/>',
  wind: '<path d="M3 8h12a3 3 0 1 0-3-3M2 12h17a3 3 0 1 1-3 3M4 16h5a3 3 0 1 1-3 3"/>',
  leaf: '<path d="M20 3S6 1 4 10a7 7 0 0 0 10 9c6-3 6-16 6-16ZM4 21l11-12"/>',
  left: '<path d="m14 6-6 6 6 6"/>',
  right: '<path d="m10 6 6 6-6 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
  restart: '<path d="M3 10a9 9 0 1 1 1 7M3 4v6h6"/>',
};
const icon = (name: string, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] ?? ''}</svg>`;
const wing = '<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="m5 26 10-17 5 12 6-16 10 21-16-6Z" fill="currentColor"/></svg>';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="site-shell">
    <header class="site-header">
      <a class="brand" href="./" aria-label="Выше — главная"><span class="brand-mark">${wing}</span><span>выше<span class="brand-dot">.</span></span></a>
      <div class="header-note"><span class="little-line"></span> Только небо впереди</div>
      <div class="header-actions"><button class="how-button" id="how-button">Как играть ${icon('info')}</button><span class="header-divider"></span><button class="icon-button sound-button" id="sound-button" aria-label="Выключить звук" aria-pressed="true">${icon('sound')}</button></div>
    </header>

    <main>
      <section class="hero" aria-label="Игра Выше">
        <div class="intro">
          <div class="eyebrow"><span class="status-dot"></span> МАЛЕНЬКОЕ ПРИКЛЮЧЕНИЕ</div>
          <h1>Выше <br>облаков<span class="title-dot">.</span><svg class="title-swish" viewBox="0 0 150 22" aria-hidden="true"><path d="M3 17Q67 1 145 8M22 20Q74 9 124 12"/></svg></h1>
          <p class="intro-copy">Расправь крылья. Поймай ветер. <br>И оставь всё лишнее где-то внизу.</p>
          <div class="mode-switch" aria-label="Режим игры"><button class="mode-button active" data-mode="adventure" aria-pressed="true">${icon('star')} Приключение</button><button class="mode-button" data-mode="zen" aria-pressed="false">${icon('leaf')} Дзен</button></div>
          <p class="mode-description" id="mode-description">Три жизни. Тысячи метров. Твой рекорд.</p>
          <button class="primary-button launch-button" id="launch-button">Начать полёт ${icon('arrow')}</button>
          <div class="keyboard-note" id="keyboard-note"><span class="key small">↵</span> или нажми Enter</div>
          <div class="personal-best"><span class="best-icon">${icon('cup')}</span><div><span class="tiny-label">ТВОЯ ЛУЧШАЯ ВЫСОТА</span><strong><span id="personal-best">0</span> <span class="unit">м</span></strong></div><svg class="best-spark" viewBox="0 0 46 43" fill="none" aria-hidden="true"><path d="m24 3-3 9M40 13l-9 5M38 33l-10-5M8 24l-5 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>
          <div class="intro-bottom"><span class="small-bird">${wing}</span><span>Без спешки. Без загрузок.<br>Просто ты и небо.</span></div>
        </div>

        <div class="game-column">
          <div class="game-frame" id="game-frame">
            <canvas id="game-canvas" tabindex="0" aria-label="Игровое поле: лети вверх, управляй стрелками влево и вправо. Пробел — ускорение, Escape — пауза."></canvas>
            <div class="scene-top" id="scene-top"><span class="location-badge"><span class="status-dot"></span><span id="location-name">ДОЛИНА ВЕТРОВ</span></span><span class="scene-number">01 / ∞</span></div>
            <div class="game-hud hidden" id="game-hud"><div class="height-pill">${icon('up')}<span id="height-value">0</span><small>м</small></div><div class="hud-right"><div class="spark-pill">${icon('star')}<span id="spark-value">0</span></div><button class="hud-button" id="pause-button" aria-label="Пауза">${icon('pause')}</button></div></div>
            <div class="ready-label" id="ready-label"><span>СЛЕДУЙ ЗА ВЕТРОМ</span><h2>Большое небо.<br>Твои маленькие крылья.</h2></div>
            <div class="ready-bottom" id="ready-bottom"><span class="ready-tag">${icon('wind')} Ветер сегодня попутный</span><button class="scene-start" id="scene-start">Полетели ${icon('arrow')}</button></div>
            <div class="game-bottom hidden" id="game-bottom"><div class="hearts" id="hearts" aria-label="3 жизни">${icon('heart')}${icon('heart')}${icon('heart')}</div><div class="boost-meter"><span>${icon('wind')} ПОТОК</span><div class="meter-track"><div id="energy-bar"></div></div><kbd>SPACE</kbd></div></div>
            <div class="toast" id="toast" role="status"></div>
            <div class="game-overlay hidden" id="game-overlay"><div class="overlay-card"><div class="overlay-symbol" id="overlay-symbol">${icon('wind')}</div><span class="overlay-eyebrow" id="overlay-eyebrow">МОМЕНТ ТИШИНЫ</span><h2 id="overlay-title">Поймаем дыхание?</h2><p id="overlay-copy">Небо подождёт. Продолжай, когда захочешь.</p><div class="result-stats hidden" id="result-stats"><div><strong id="result-height">0</strong><span>МЕТРОВ ВВЕРХ</span></div><div><strong id="result-sparks">0</strong><span>СВЕТЛЯЧКОВ</span></div></div><button class="primary-button" id="resume-button">Продолжить ${icon('play')}</button><button class="text-button" id="back-button">На стартовый экран</button></div></div>
            <div class="touch-controls hidden" id="touch-controls"><button class="touch-steer" id="touch-left" aria-label="Лететь влево">${icon('left')}</button><button class="touch-boost" id="touch-boost" aria-label="Ускориться">${icon('wind')}</button><button class="touch-steer" id="touch-right" aria-label="Лететь вправо">${icon('right')}</button></div>
          </div>
          <div class="game-caption"><span><span class="live-dot"></span> Вверх — единственное направление</span><span>СОЗДАНО ДЛЯ МАЛЕНЬКОГО ПЕРЕРЫВА ${icon('star')}</span></div>
        </div>
      </section>

      <section class="guide-strip" aria-label="Подсказки по игре">
        <div class="guide-item"><span class="guide-number">01</span><div class="guide-icon controls-icon"><span class="key">←</span><span class="key">→</span></div><div><h3>Поймай направление</h3><p>Стрелки или A / D. На телефоне — касание.</p></div></div>
        <div class="guide-item"><span class="guide-number">02</span><div class="guide-icon spark-icon">${icon('star')}</div><div><h3>Собирай светлячков</h3><p>Маленькие огоньки дают силы лететь.</p></div></div>
        <div class="guide-item"><span class="guide-number">03</span><div class="guide-icon wind-icon">${icon('wind')}</div><div><h3>Будь легче ветра</h3><p>Пробел — ускорение. Облетай острова.</p></div></div>
      </section>
    </main>
    <footer><span>выше. <span class="footer-dot">·</span> Маленькая игра о большом полёте</span><span>Не вниз. Только вверх. ${icon('arrow')}</span></footer>
  </div>

  <dialog id="help-dialog" class="help-dialog"><button class="dialog-close icon-button" id="close-help" aria-label="Закрыть инструкцию">${icon('close')}</button><span class="dialog-mark">${wing}</span><span class="eyebrow">ТВОЙ ПЕРВЫЙ ПОЛЁТ</span><h2>Небо — проще,<br>чем кажется.</h2><p class="help-intro">Птица летит вверх сама. Тебе остаётся выбрать путь.</p><div class="help-rows"><div><span class="help-keys"><kbd>←</kbd><kbd>→</kbd></span><p><strong>Меняй направление</strong><span>Стрелками или A / D. На телефоне веди пальцем по небу или удерживай кнопки.</span></p></div><div><span class="help-keys"><kbd>SPACE</kbd></span><p><strong>Лови воздушный поток</strong><span>Удерживай пробел или кнопку ветра для ускорения. Энергия восстанавливается сама.</span></p></div><div><span class="help-keys">${icon('star')}</span><p><strong>Собирай светлячков</strong><span>Они пополняют энергию. Облетай острова: в приключении у тебя три жизни.</span></p></div><div><span class="help-keys"><kbd>ESC</kbd></span><p><strong>Делай паузы</strong><span>Escape или P — остановить полёт. В режиме «Дзен» жизни не тратятся.</span></p></div></div><button class="primary-button" id="help-done">Всё понятно ${icon('arrow')}</button></dialog>
`;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const model = new FlightModel();
const canvas = $<HTMLCanvasElement>('game-canvas');
const renderer = new FlightRenderer(canvas, model);
const audio = new FlightAudio();
let mode: Mode = 'adventure';
let best = readNumber('vyshe-best');
let bestZen = readNumber('vyshe-best-zen');
let previousBest = 0;
let left = false, right = false, boost = false;
let pointerX: number | undefined;
let pointerId: number | undefined;
let toastTimer: ReturnType<typeof setTimeout>;
const keys = new Set<string>();
const help = $<HTMLDialogElement>('help-dialog');
let telegram = { update(_phase: typeof model.phase) {} };

function readNumber(key: string) { try { const number = Number(localStorage.getItem(key)); return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0; } catch { return 0; } }
function save(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* Gameplay also works with browser storage disabled. */ } }
try { audio.enabled = localStorage.getItem('vyshe-sound') !== 'off'; } catch { /* Keep the default. */ }

function updateSound() {
  $('sound-button').innerHTML = icon(audio.enabled ? 'sound' : 'muted');
  $('sound-button').setAttribute('aria-label', audio.enabled ? 'Выключить звук' : 'Включить звук');
  $('sound-button').setAttribute('aria-pressed', String(audio.enabled));
}
updateSound();

function clearInput() { keys.clear(); left = right = boost = false; pointerX = undefined; pointerId = undefined; }
function updateBest() { $('personal-best').textContent = (mode === 'adventure' ? best : bestZen).toLocaleString('ru-RU'); }
updateBest();

function start() {
  clearInput();
  audio.unlock(); audio.play('start');
  previousBest = mode === 'adventure' ? best : bestZen;
  lastSavedAltitude = 0;
  model.start(mode); renderer.clear();
  syncScreen();
  canvas.focus({ preventScroll: true });
  if (window.innerWidth < 850 && !document.documentElement.classList.contains('in-telegram')) $('game-frame').scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  showToast(mode === 'zen' ? 'Никакой спешки. Просто лети.' : 'Следуй за огоньками. Только вверх!');
}

function syncScreen() {
  telegram.update(model.phase);
  const ready = model.phase === 'ready', playing = model.phase === 'playing';
  for (const id of ['ready-label', 'ready-bottom', 'scene-top']) $(id).classList.toggle('hidden', !ready);
  for (const id of ['game-hud', 'game-bottom']) $(id).classList.toggle('hidden', ready);
  $('touch-controls').classList.toggle('hidden', !playing);
  $('game-overlay').classList.toggle('hidden', ready || playing);
  $('game-frame').classList.toggle('is-playing', playing);
  $('launch-button').innerHTML = (ready ? 'Начать полёт' : model.phase === 'paused' ? 'Продолжить' : model.phase === 'over' ? 'Попробовать ещё' : 'На паузу') + icon(playing ? 'pause' : 'arrow');
  $('keyboard-note').innerHTML = playing ? '<span class="key small">Esc</span> чтобы сделать паузу' : '<span class="key small">↵</span> или нажми Enter';
  document.querySelectorAll<HTMLButtonElement>('.mode-button').forEach(button => { button.disabled = !ready; });
  $('pause-button').setAttribute('aria-label', model.phase === 'paused' ? 'Продолжить полёт' : 'Пауза');
  $('pause-button').innerHTML = icon(model.phase === 'paused' ? 'play' : 'pause');
  if (model.phase === 'paused') {
    $('overlay-symbol').innerHTML = icon('wind');
    $('overlay-eyebrow').textContent = 'МОМЕНТ ТИШИНЫ';
    $('overlay-title').textContent = 'Поймаем дыхание?';
    $('overlay-copy').textContent = 'Небо подождёт. Продолжай, когда захочешь.';
    $('result-stats').classList.add('hidden');
    $('resume-button').innerHTML = 'Продолжить ' + icon('play');
  }
  if (model.phase === 'over') {
    const record = model.altitude() > previousBest;
    $('overlay-symbol').innerHTML = icon(record ? 'cup' : 'leaf');
    $('overlay-eyebrow').textContent = record ? 'ТВОЙ НОВЫЙ РЕКОРД' : 'КАЖДЫЙ ПОЛЁТ — ПРИКЛЮЧЕНИЕ';
    $('overlay-title').textContent = record ? 'Ещё немного выше!' : 'Отличный был полёт.';
    $('overlay-copy').textContent = 'Отдохни, расправь крылья — и снова в небо.';
    $('result-stats').classList.remove('hidden');
    $('result-height').textContent = model.altitude().toLocaleString('ru-RU');
    $('result-sparks').textContent = String(model.sparks);
    $('resume-button').innerHTML = 'Ещё один полёт ' + icon('restart');
  }
}

function togglePause() {
  if (model.phase === 'playing') { model.pause(); clearInput(); }
  else if (model.phase === 'paused') { model.resume(); canvas.focus({ preventScroll: true }); }
  syncScreen();
}

function record() {
  if (mode === 'adventure' && model.altitude() > best) { best = model.altitude(); save('vyshe-best', String(best)); }
  if (mode === 'zen' && model.altitude() > bestZen) { bestZen = model.altitude(); save('vyshe-best-zen', String(bestZen)); }
  updateBest();
}

function showToast(message: string) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 2800);
}

function launchAction() { if (model.phase === 'ready' || model.phase === 'over') start(); else togglePause(); }
function returnHome() {
  record(); model.phase = 'ready'; model.y = 200; model.invincible = 0; model.boosting = false;
  renderer.clear(); clearInput(); syncScreen();
  if (window.innerWidth >= 701) $('launch-button').focus({ preventScroll: true });
  else $('scene-start').focus({ preventScroll: true });
}
$('launch-button').addEventListener('click', launchAction);
$('scene-start').addEventListener('click', start);
$('pause-button').addEventListener('click', togglePause);
$('resume-button').addEventListener('click', () => model.phase === 'over' ? start() : togglePause());
$('back-button').addEventListener('click', returnHome);
$('sound-button').addEventListener('click', () => { audio.enabled = !audio.enabled; save('vyshe-sound', audio.enabled ? 'on' : 'off'); audio.unlock(); updateSound(); if (audio.enabled) audio.play('spark'); });

document.querySelectorAll<HTMLButtonElement>('.mode-button').forEach(button => button.addEventListener('click', () => {
  if (model.phase !== 'ready') return;
  mode = button.dataset.mode as Mode;
  document.querySelectorAll<HTMLButtonElement>('.mode-button').forEach(item => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active)); });
  $('mode-description').textContent = mode === 'adventure' ? 'Три жизни. Тысячи метров. Твой рекорд.' : 'Без потери жизней. Просто навстречу небу.';
  updateBest();
}));

$('how-button').addEventListener('click', () => { if (model.phase === 'playing') togglePause(); help.showModal(); });
for (const id of ['close-help', 'help-done']) $(id).addEventListener('click', () => help.close());
help.addEventListener('click', event => { if (event.target === help) { const rect = help.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) help.close(); } });

window.addEventListener('keydown', event => {
  if (help.open) return;
  const focusedButton = event.target instanceof HTMLButtonElement;
  if (event.code === 'Enter' && !focusedButton && !event.repeat) { event.preventDefault(); if (model.phase !== 'playing') launchAction(); return; }
  if (event.code === 'Escape' || event.code === 'KeyP') { if (!event.repeat && (model.phase === 'playing' || model.phase === 'paused')) { event.preventDefault(); togglePause(); } return; }
  if (model.phase === 'playing' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space', 'KeyA', 'KeyD', 'KeyW'].includes(event.code)) { event.preventDefault(); keys.add(event.code); }
});
window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => { clearInput(); if (model.phase === 'playing') togglePause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && model.phase === 'playing') togglePause(); });
window.addEventListener('pagehide', record);

canvas.addEventListener('pointerdown', event => { if (model.phase !== 'playing') return; event.preventDefault(); pointerId = event.pointerId; canvas.setPointerCapture(pointerId); pointerX = (event.clientX - canvas.getBoundingClientRect().left) / canvas.clientWidth * 720; });
canvas.addEventListener('pointermove', event => { if (event.pointerId === pointerId) pointerX = Math.max(0, Math.min(720, (event.clientX - canvas.getBoundingClientRect().left) / canvas.clientWidth * 720)); });
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, () => { pointerX = undefined; pointerId = undefined; });

function holdButton(id: string, set: (value: boolean) => void) {
  const button = $(id);
  button.addEventListener('pointerdown', event => { event.preventDefault(); if (model.phase !== 'playing') return; button.setPointerCapture(event.pointerId); set(true); });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, () => set(false));
}
holdButton('touch-left', value => left = value);
holdButton('touch-right', value => right = value);
holdButton('touch-boost', value => boost = value);

let lastTime = performance.now();
let lastHud = '';
let lastSavedAltitude = 0;
function frame(now: number) {
  const dt = Math.min((now - lastTime) / 1000, 0.04);
  lastTime = now;
  const direction = Number(right || keys.has('ArrowRight') || keys.has('KeyD')) - Number(left || keys.has('ArrowLeft') || keys.has('KeyA'));
  model.update(dt, direction, boost || keys.has('Space') || keys.has('ArrowUp') || keys.has('KeyW'), pointerX);
  for (const event of model.events.splice(0)) {
    audio.play(event.type);
    if (event.type === 'spark' || event.type === 'hit') renderer.burst(event.x, event.y, event.type === 'hit');
    if (event.type === 'hit' && model.hearts > 0) showToast('Крылья целы. Летим дальше!');
    if (event.type === 'end') { record(); clearInput(); syncScreen(); $('resume-button').focus({ preventScroll: true }); }
    if (event.type === 'milestone') showToast(model.altitude() >= 1500 ? 'Ты добрался до сумеречного неба ✦' : `${model.altitude()} метров. Небо становится ближе ✦`);
  }
  renderer.draw(dt);
  const state = `${model.altitude()}/${model.sparks}/${model.hearts}/${Math.floor(model.energy)}/${mode}`;
  if (state !== lastHud) {
    lastHud = state;
    $('height-value').textContent = model.altitude().toLocaleString('ru-RU');
    $('spark-value').textContent = String(model.sparks);
    $('energy-bar').style.transform = `scaleX(${model.energy / 100})`;
    $('energy-bar').classList.toggle('low', model.energy < 20);
    $('hearts').innerHTML = mode === 'zen' ? '<span class="zen-heart">∞ <small>ДЗЕН</small></span>' : [0,1,2].map(index => icon('heart', index >= model.hearts ? 'lost' : '')).join('');
    $('hearts').setAttribute('aria-label', mode === 'zen' ? 'Режим без потери жизней' : `Жизней: ${model.hearts}`);
    if (model.phase === 'playing' && model.altitude() >= lastSavedAltitude + 20) { record(); lastSavedAltitude = model.altitude(); }
  }
  requestAnimationFrame(frame);
}
telegram = connectTelegram(() => {
  if (help.open) { help.close(); return; }
  if (model.phase === 'playing') togglePause();
  else if (model.phase !== 'ready') returnHome();
});
syncScreen();
requestAnimationFrame(frame);
