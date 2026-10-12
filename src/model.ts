export type Phase = 'ready' | 'playing' | 'paused' | 'over';
export type Mode = 'adventure' | 'zen';
export interface Gate { y: number; gap: number; width: number; seed: number; passed: boolean }
export interface Spark { x: number; y: number; collected: boolean; phase: number }
export interface FlightEvent { type: 'spark' | 'hit' | 'end' | 'milestone'; x: number; y: number }

export const WORLD_WIDTH = 720;
export const PLAYER_RADIUS = 15;

export class FlightModel {
  phase: Phase = 'ready';
  mode: Mode = 'adventure';
  x = 360;
  y = 200;
  vx = 0;
  energy = 100;
  hearts = 3;
  sparks = 0;
  invincible = 0;
  elapsed = 0;
  boosting = false;
  gates: Gate[] = [];
  lights: Spark[] = [];
  events: FlightEvent[] = [];
  private nextGate = 630;
  private lastGap = 360;
  private milestone = 0;
  private random: () => number;

  constructor(random = Math.random) { this.random = random; }

  altitude() { return Math.max(0, Math.floor((this.y - 200) / 5)); }
  get speed() { return 110 + Math.min(this.altitude() * 0.08, 70); }

  start(mode: Mode = this.mode) {
    this.mode = mode;
    this.phase = 'playing';
    this.x = 360;
    this.y = 200;
    this.vx = 0;
    this.energy = 100;
    this.hearts = 3;
    this.sparks = 0;
    this.invincible = 0;
    this.elapsed = 0;
    this.boosting = false;
    this.gates = [];
    this.lights = [];
    this.events = [];
    this.nextGate = 630;
    this.lastGap = 360;
    this.milestone = 0;
    this.populate();
  }

  pause() { if (this.phase === 'playing') this.phase = 'paused'; }
  resume() { if (this.phase === 'paused') this.phase = 'playing'; }

  update(dt: number, direction: number, boost: boolean, targetX?: number) {
    if (this.phase !== 'playing') return;
    dt = Math.min(Math.max(dt, 0), 0.04);
    this.elapsed += dt;
    this.invincible = Math.max(0, this.invincible - dt);
    this.boosting = boost && this.energy > 2;
    this.energy = Math.max(0, Math.min(100, this.energy + (this.boosting ? -34 : 19) * dt));
    const steering = targetX === undefined ? direction : Math.max(-1, Math.min(1, (targetX - this.x) / 50));
    this.vx += (steering * 340 - this.vx) * Math.min(1, dt * 9);
    this.x = Math.max(PLAYER_RADIUS + 4, Math.min(WORLD_WIDTH - PLAYER_RADIUS - 4, this.x + this.vx * dt));
    this.y += this.speed * (this.boosting ? 1.8 : 1) * dt;

    for (const gate of this.gates) {
      const hit = Math.abs(this.y - gate.y) < 24 + PLAYER_RADIUS
        && (this.x - PLAYER_RADIUS < gate.gap - gate.width / 2 || this.x + PLAYER_RADIUS > gate.gap + gate.width / 2);
      if (hit && this.invincible <= 0 && this.mode === 'adventure') {
        this.hearts--;
        this.invincible = 2.1;
        this.events.push({ type: 'hit', x: this.x, y: this.y });
        if (this.hearts <= 0) {
          this.phase = 'over';
          this.boosting = false;
          this.events.push({ type: 'end', x: this.x, y: this.y });
          return;
        }
      }
      if (!gate.passed && this.y > gate.y + 42) gate.passed = true;
    }
    for (const light of this.lights) {
      if (!light.collected && Math.hypot(this.x - light.x, this.y - light.y) < 34) {
        light.collected = true;
        this.sparks++;
        this.energy = Math.min(100, this.energy + 9);
        this.events.push({ type: 'spark', x: light.x, y: light.y });
      }
    }
    const milestone = Math.floor(this.altitude() / 250);
    if (milestone > this.milestone) {
      this.milestone = milestone;
      this.events.push({ type: 'milestone', x: this.x, y: this.y });
    }
    this.gates = this.gates.filter(gate => gate.y > this.y - 500);
    this.lights = this.lights.filter(light => light.y > this.y - 500);
    this.populate();
  }

  private populate() {
    while (this.nextGate < this.y + 1100) {
      const width = Math.max(205, 320 - this.altitude() * 0.07);
      const shift = (this.random() - 0.5) * 260;
      const gap = Math.max(width / 2 + 65, Math.min(WORLD_WIDTH - width / 2 - 65, this.lastGap + shift));
      this.gates.push({ y: this.nextGate, gap, width, seed: this.random(), passed: false });
      for (let i = 0; i < 3; i++) {
        this.lights.push({ x: gap + Math.sin(i * 0.8) * 25, y: this.nextGate - 80 + i * 67, collected: false, phase: this.random() * Math.PI * 2 });
      }
      this.lastGap = gap;
      this.nextGate += 280 + this.random() * 70;
    }
  }
}
