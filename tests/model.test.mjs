import test from 'node:test';
import assert from 'node:assert/strict';
import { FlightModel, WORLD_WIDTH, PLAYER_RADIUS } from '../src/model.ts';

const flight = (mode = 'adventure') => { const model = new FlightModel(() => 0.5); model.start(mode); return model; };
const advance = (model, seconds, direction = 0, boost = false) => { for (let i = 0; i < seconds * 60; i++) model.update(1 / 60, direction, boost); };

test('the bird automatically flies UP and altitude increases', () => {
  const model = flight();
  const initialY = model.y;
  advance(model, 2);
  assert.ok(model.y > initialY + 200);
  assert.ok(model.altitude() >= 44);
  assert.equal(model.hearts, 3);
});

test('steering has inertia and cannot leave the play area', () => {
  const model = flight('zen');
  advance(model, 3, -1);
  assert.equal(model.x, PLAYER_RADIUS + 4);
  assert.ok(model.vx < 0);
  advance(model, 5, 1);
  assert.equal(model.x, WORLD_WIDTH - PLAYER_RADIUS - 4);
});

test('pointer steering approaches a chosen position', () => {
  const model = flight('zen');
  for (let i = 0; i < 180; i++) model.update(1 / 60, 0, false, 200);
  assert.ok(Math.abs(model.x - 200) < 2);
});

test('boost increases ascent, consumes energy, and energy recovers', () => {
  const normal = flight(), boosted = flight();
  advance(normal, 1);
  advance(boosted, 1, 0, true);
  assert.ok(boosted.y - 200 > (normal.y - 200) * 1.7);
  assert.ok(boosted.energy < 70);
  const depleted = boosted.energy;
  advance(boosted, 1);
  assert.ok(boosted.energy > depleted);
  assert.ok(boosted.energy <= 100);
});

test('collected fireflies are counted once and replenish energy', () => {
  const model = flight();
  model.energy = 40;
  model.lights = [{ x: model.x, y: model.y + 3, collected: false, phase: 0 }];
  model.update(1 / 60, 0, false);
  assert.equal(model.sparks, 1);
  assert.ok(model.energy > 49);
  model.update(1 / 60, 0, false);
  assert.equal(model.sparks, 1);
  assert.equal(model.events.filter(event => event.type === 'spark').length, 1);
});

test('obstacles cost a life, grace period prevents duplicate hits, third hit ends flight', () => {
  const model = flight();
  model.x = 30;
  model.gates = [{ y: model.y + 2, gap: 360, width: 300, seed: 0.5, passed: false }];
  model.update(1 / 60, 0, false);
  assert.equal(model.hearts, 2);
  model.update(1 / 60, 0, false);
  assert.equal(model.hearts, 2);
  model.invincible = 0;
  model.update(1 / 60, 0, false);
  assert.equal(model.hearts, 1);
  model.invincible = 0;
  model.update(1 / 60, 0, false);
  assert.equal(model.hearts, 0);
  assert.equal(model.phase, 'over');
  assert.equal(model.events.filter(event => event.type === 'end').length, 1);
  const y = model.y;
  advance(model, 1);
  assert.equal(model.y, y);
});

test('zen mode passes through obstacles without losing lives', () => {
  const model = flight('zen');
  model.x = 30;
  model.gates = [{ y: model.y + 2, gap: 360, width: 300, seed: 0.5, passed: false }];
  advance(model, 20, -1);
  assert.equal(model.hearts, 3);
  assert.equal(model.phase, 'playing');
  assert.ok(model.altitude() > 400);
});

test('pause freezes physics and resume continues the same run', () => {
  const model = flight();
  advance(model, 1);
  model.pause();
  const snapshot = [model.x, model.y, model.energy, model.elapsed];
  advance(model, 2, 1, true);
  assert.deepEqual([model.x, model.y, model.energy, model.elapsed], snapshot);
  model.resume();
  advance(model, 1);
  assert.ok(model.y > snapshot[1]);
});

test('a ten-minute flight keeps generating fair routes and bounds object counts', () => {
  const model = flight();
  advance(model, 600);
  assert.equal(model.phase, 'playing');
  assert.ok(model.altitude() > 15000);
  assert.ok(model.sparks > 500);
  assert.ok(model.gates.length < 8);
  assert.ok(model.lights.length < 24);
  for (const gate of model.gates) {
    assert.ok(gate.width >= 205);
    assert.ok(gate.gap - gate.width / 2 >= 65);
    assert.ok(gate.gap + gate.width / 2 <= WORLD_WIDTH - 65);
  }
  assert.ok(model.events.some(event => event.type === 'milestone'));
});

test('restarting clears all state from the previous flight', () => {
  const model = flight();
  advance(model, 10);
  model.hearts = 1;
  model.pause();
  model.start('zen');
  assert.equal(model.phase, 'playing');
  assert.equal(model.mode, 'zen');
  assert.equal(model.y, 200);
  assert.equal(model.x, 360);
  assert.equal(model.hearts, 3);
  assert.equal(model.sparks, 0);
  assert.equal(model.energy, 100);
  assert.equal(model.elapsed, 0);
  assert.equal(model.events.length, 0);
});
