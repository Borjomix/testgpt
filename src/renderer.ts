import { FlightModel, WORLD_WIDTH } from './model';

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string }

export class FlightRenderer {
  height = 650;
  camera = 0;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private time = 0;
  private shake = 0;
  private observer: ResizeObserver;
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(private canvas: HTMLCanvasElement, private model: FlightModel) {
    this.ctx = canvas.getContext('2d')!;
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.resize();
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(rect.width * ratio);
    this.canvas.height = Math.round(rect.height * ratio);
    this.height = rect.height / rect.width * WORLD_WIDTH;
  }

  burst(x: number, y: number, hit = false) {
    if (hit && !this.reducedMotion) this.shake = 0.3;
    for (let i = 0; i < (this.reducedMotion ? 5 : 18); i++) {
      const angle = Math.random() * Math.PI * 2;
      const life = 0.4 + Math.random() * 0.5;
      this.particles.push({ x, y, vx: Math.cos(angle) * (25 + Math.random() * 70), vy: Math.sin(angle) * 70, life, max: life, size: 1.5 + Math.random() * 3, color: hit ? '#f9b190' : '#fff1b0' });
    }
  }

  clear() { this.particles = []; this.camera = 0; }

  draw(dt: number) {
    const c = this.ctx;
    const m = this.model;
    const h = this.height;
    const active = m.phase === 'playing';
    if (active || m.phase === 'ready') this.time += dt;
    this.camera = m.phase === 'ready' ? 0 : Math.max(0, m.y - h * 0.36);
    c.setTransform(this.canvas.width / WORLD_WIDTH, 0, 0, this.canvas.width / WORLD_WIDTH, 0, 0);
    c.clearRect(0, 0, WORLD_WIDTH, h);
    c.save();
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt);
      c.translate(Math.sin(this.time * 92) * this.shake * 13, Math.cos(this.time * 78) * this.shake * 9);
    }
    this.background();
    if (m.phase === 'ready') {
      this.island(0, h * 0.38, 155, true, 0.4);
      this.island(558, h * 0.52, 162, false, 0.7);
      for (let i = 0; i < 5; i++) this.light(330 + Math.sin(i * 0.85) * 48, h * 0.49 - i * 32, i * 0.8);
    } else {
      for (const gate of m.gates) {
        const y = this.screenY(gate.y);
        if (y > -100 && y < h + 100) {
          this.island(0, y, gate.gap - gate.width / 2, true, gate.seed);
          this.island(gate.gap + gate.width / 2, y, WORLD_WIDTH - gate.gap - gate.width / 2, false, 1 - gate.seed);
        }
      }
      for (const light of m.lights) {
        if (!light.collected) {
          const y = this.screenY(light.y);
          if (y > -20 && y < h + 20) this.light(light.x, y, light.phase);
        }
      }
    }
    this.ambient();
    const bx = m.phase === 'ready' ? 359 + Math.sin(this.time * 0.7) * 13 : m.x;
    const by = m.phase === 'ready' ? h * 0.59 + Math.sin(this.time * 1.5) * 7 : this.screenY(m.y);
    if (m.phase === 'ready' || active) {
      if (!this.reducedMotion) {
        const life = m.boosting ? 0.65 : 0.4;
        this.particles.push({ x: bx + (Math.random() - 0.5) * 12, y: m.phase === 'ready' ? h - by - 22 : m.y - 22, vx: (Math.random() - 0.5) * 15, vy: -20 - Math.random() * 20, life, max: life, size: Math.random() * (m.boosting ? 4 : 2.4) + 1, color: m.boosting ? '#ffe4a2' : '#fbefd0' });
      }
    }
    for (const p of this.particles) {
      if (active || m.phase === 'ready') { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; }
      c.globalAlpha = Math.max(0, p.life / p.max) * 0.8;
      c.fillStyle = p.color;
      c.beginPath(); c.arc(p.x, this.screenY(p.y), p.size, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
    this.particles = this.particles.filter(p => p.life > 0);
    if (!(m.invincible > 0 && Math.sin(this.time * 25) < -0.25)) this.bird(bx, by, m.phase === 'ready' ? -0.12 : m.vx / 1100);
    this.foreground();
    c.restore();
  }

  private screenY(y: number) { return this.height - (y - this.camera); }

  private background() {
    const c = this.ctx, h = this.height;
    const night = this.model.altitude() >= 1500;
    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, night ? '#517d83' : '#d5e6db');
    sky.addColorStop(0.5, night ? '#739b96' : '#bad6c7');
    sky.addColorStop(1, '#7bac99');
    c.fillStyle = sky; c.fillRect(0, 0, WORLD_WIDTH, h);

    const sunX = 490, sunY = h * 0.28;
    const glow = c.createRadialGradient(sunX, sunY, 20, sunX, sunY, 200);
    glow.addColorStop(0, '#fff5d627'); glow.addColorStop(1, '#fff5d600');
    c.fillStyle = glow; c.fillRect(270, sunY - 200, 430, 400);
    c.fillStyle = night ? '#e9f0d1' : '#eef0d5';
    c.beginPath(); c.arc(sunX, sunY, 70, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#eff5df55'; c.lineWidth = 1;
    c.beginPath(); c.arc(sunX, sunY, 86, 0, Math.PI * 2); c.stroke();

    this.cloud(100 + Math.sin(this.time * 0.035) * 20, h * 0.14, 1, 0.38);
    this.cloud(560 - Math.sin(this.time * 0.025) * 35, h * 0.4, 0.85, 0.3);
    this.cloud(255 + Math.sin(this.time * 0.045) * 12, h * 0.66, 1.3, 0.18);

    // Layers move down as the bird ascends, establishing upward travel.
    const drift = Math.min(110, this.camera * 0.018);
    this.mountain('#9bc1b0', [[-30,h*.7+drift],[120,h*.34+drift],[230,h*.62+drift],[320,h*.43+drift],[500,h*.78+drift],[610,h*.45+drift],[780,h*.75+drift]]);
    this.mountain('#7eac98', [[-20,h*.85+drift*.8],[85,h*.65+drift*.8],[190,h*.78+drift*.8],[345,h*.56+drift*.8],[465,h*.74+drift*.8],[590,h*.64+drift*.8],[750,h*.86+drift*.8]]);
    this.mountain('#639582', [[-30,h*.86+drift*.6],[80,h*.79+drift*.6],[210,h*.95+drift*.6],[420,h*.72+drift*.6],[570,h*.88+drift*.6],[750,h*.72+drift*.6]]);

    c.strokeStyle = '#f3f5dd58'; c.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) {
      const x = 70 + i * 122;
      const y = ((i * 91 + this.time * 13 + this.camera * 0.15) % (h + 50)) - 25;
      c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x - 12, y + 16, x + 12, y + 30, x, y + 52); c.stroke();
    }
    for (let i = 0; i < 5; i++) {
      const x = 110 + i * 17, y = h * 0.2 + Math.sin(i * 1.5) * 12;
      c.strokeStyle = '#487a6f55'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(x - 4,y); c.quadraticCurveTo(x-2,y-3,x,y); c.quadraticCurveTo(x+3,y-3,x+5,y); c.stroke();
    }
  }

  private cloud(x: number, y: number, scale: number, opacity: number) {
    const c = this.ctx;
    c.save(); c.translate(x,y); c.scale(scale,scale); c.globalAlpha = opacity; c.fillStyle = '#f8faec';
    c.beginPath(); c.roundRect(-55,-8,145,15,10); c.fill();
    c.beginPath(); c.roundRect(-20,-22,78,20,14); c.fill();
    c.beginPath(); c.roundRect(-73,15,108,5,3); c.fill(); c.restore();
  }

  private mountain(color: string, points: number[][]) {
    const c = this.ctx;
    c.fillStyle = color; c.beginPath(); c.moveTo(-20,this.height+100);
    points.forEach(([x,y], i) => { if (i === 0) c.lineTo(x,y); else { const prev = points[i-1]; c.quadraticCurveTo((prev[0]+x)/2,prev[1]-8,x,y); } });
    c.lineTo(WORLD_WIDTH+20,this.height+100); c.closePath(); c.fill();
  }

  private pine(x: number, y: number, height: number, color: string) {
    const c = this.ctx;
    c.fillStyle = color;
    c.beginPath(); c.moveTo(x,y-height); c.lineTo(x+height*.17,y-height*.47); c.lineTo(x+height*.09,y-height*.49); c.lineTo(x+height*.27,y-height*.12); c.lineTo(x+height*.045,y-height*.12); c.lineTo(x+height*.045,y); c.lineTo(x-height*.045,y); c.lineTo(x-height*.045,y-height*.12); c.lineTo(x-height*.27,y-height*.12); c.lineTo(x-height*.09,y-height*.49); c.lineTo(x-height*.17,y-height*.47); c.closePath(); c.fill();
  }

  private island(x: number, y: number, width: number, left: boolean, seed: number) {
    if (width < 2) return;
    const c = this.ctx;
    c.save(); c.translate(x,y);
    const gradient = c.createLinearGradient(0,-15,0,65);
    gradient.addColorStop(0,'#466d59'); gradient.addColorStop(1,'#365d50');
    c.fillStyle = gradient;
    c.beginPath(); c.moveTo(0,-16); c.quadraticCurveTo(width*.4,-32,width,-17); c.lineTo(width-8,7); c.lineTo(width*.84,20); c.lineTo(width*.73,51); c.lineTo(width*.57,37); c.lineTo(width*.43,68); c.lineTo(width*.28,35); c.lineTo(width*.12,42); c.lineTo(0,20); c.closePath(); c.fill();
    c.fillStyle = '#739677';
    c.beginPath(); c.ellipse(width*.5,-17,width*.5,10,0,0,Math.PI*2); c.fill();
    c.fillStyle = '#94b28b';
    c.beginPath(); c.ellipse(width*.53,-21,width*.44,4,0,0,Math.PI*2); c.fill();
    c.strokeStyle = '#274d4244'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(width*.25,0); c.lineTo(width*.34,17); c.lineTo(width*.27,34); c.moveTo(width*.66,6); c.lineTo(width*.57,26); c.stroke();
    const treeX = left ? width*.25 : width*.7;
    this.pine(treeX,-22,49 + seed*22,'#456e57');
    this.pine(treeX+(left?24:-25),-22,31+seed*14,'#597d5d');
    c.strokeStyle='#88a675'; c.lineWidth=2;
    for (let i=0;i<3;i++) {
      const vx=left?width-29-i*16:20+i*15;
      c.beginPath(); c.moveTo(vx,10); c.quadraticCurveTo(vx+6,24,vx-2,35+seed*19-i*4); c.stroke();
      c.fillStyle='#8aa579'; c.beginPath(); c.ellipse(vx+2,27+i*4,5,2.5,-.5,0,Math.PI*2); c.fill();
    }
    c.restore();
  }

  private light(x: number, y: number, phase: number) {
    const c=this.ctx;
    const pulse=1+Math.sin(this.time*3+phase)*.13;
    const gradient=c.createRadialGradient(x,y,0,x,y,23*pulse);
    gradient.addColorStop(0,'#fff0ad66'); gradient.addColorStop(1,'#fff0ad00');
    c.fillStyle=gradient; c.fillRect(x-25,y-25,50,50);
    c.save(); c.translate(x,y); c.rotate(Math.PI/4); c.fillStyle='#fff3b7';
    c.beginPath(); c.roundRect(-4*pulse,-4*pulse,8*pulse,8*pulse,2); c.fill(); c.restore();
    c.strokeStyle='#fff5c57a'; c.lineWidth=1;
    c.beginPath(); c.arc(x,y,10*pulse,-.4,1.6); c.stroke();
  }

  private bird(x: number, y: number, tilt: number) {
    const c=this.ctx;
    c.save(); c.translate(x,y); c.rotate(tilt);
    const flap=this.reducedMotion?0:Math.sin(this.time*(this.model.boosting?23:12))*.18;
    // Small tail, broad wings, warm belly, and an upturned beak.
    c.fillStyle='#c86845'; c.beginPath(); c.moveTo(-8,13); c.lineTo(-9,35); c.lineTo(0,28); c.lineTo(9,35); c.lineTo(8,13); c.fill();
    c.save(); c.rotate(flap); c.fillStyle='#e69b6c'; c.beginPath(); c.moveTo(-8,-5); c.bezierCurveTo(-22,-15,-36,-28,-45,-26); c.bezierCurveTo(-41,-7,-26,15,-7,17); c.closePath(); c.fill();
    c.fillStyle='#f2b484'; c.beginPath(); c.moveTo(-13,-1); c.quadraticCurveTo(-31,-13,-41,-22); c.quadraticCurveTo(-34,-6,-20,4); c.fill(); c.restore();
    c.save(); c.rotate(-flap); c.fillStyle='#e69b6c'; c.beginPath(); c.moveTo(8,-5); c.bezierCurveTo(22,-15,36,-28,45,-26); c.bezierCurveTo(41,-7,26,15,7,17); c.closePath(); c.fill();
    c.fillStyle='#f2b484'; c.beginPath(); c.moveTo(13,-1); c.quadraticCurveTo(31,-13,41,-22); c.quadraticCurveTo(34,-6,20,4); c.fill(); c.restore();
    c.fillStyle='#f3ba85'; c.beginPath(); c.ellipse(0,0,15,25,0,0,Math.PI*2); c.fill();
    c.fillStyle='#fce0b3'; c.beginPath(); c.ellipse(0,4,10,17,0,0,Math.PI*2); c.fill();
    c.fillStyle='#dc8558'; c.beginPath(); c.moveTo(-5,-22); c.lineTo(0,-33); c.lineTo(5,-22); c.fill();
    c.fillStyle='#2e4a3e'; c.beginPath(); c.arc(-6,-13,2,0,Math.PI*2); c.arc(6,-13,2,0,Math.PI*2); c.fill();
    c.restore();
  }

  private ambient() {
    const c=this.ctx,h=this.height;
    for(let i=0;i<22;i++) {
      const x=(i*137.5+Math.sin(this.time*.4+i)*12)%WORLD_WIDTH;
      const y=(i*83.7+this.time*(7+i%3)+this.camera*.45)%(h+20)-10;
      c.fillStyle=i%3===0?'#f4edb388':'#eff6dd66';
      c.beginPath(); c.arc(x,y,i%4===0?2:1,0,Math.PI*2); c.fill();
    }
    if(this.model.boosting) {
      c.strokeStyle='#f6f1cf75'; c.lineWidth=1.5;
      for(let i=0;i<12;i++) {
        const x=(i*97+30)%WORLD_WIDTH, y=(i*97+this.time*540)%h;
        c.beginPath(); c.moveTo(x,y); c.lineTo(x,y+30+i%3*12); c.stroke();
      }
    }
  }

  private foreground() {
    const c=this.ctx,h=this.height;
    const drift=Math.min(110,this.camera*.07);
    this.mountain('#3d7462', [[-20,h*.9+drift],[70,h*.83+drift],[170,h*.98+drift],[300,h+40],[540,h*.98+drift],[655,h*.87+drift],[750,h*.91+drift]]);
    for(let i=0;i<13;i++) {
      const x=i*64-30, edge=Math.abs(x-360)/360;
      this.pine(x,h+30+drift,65+edge*100+Math.sin(i*4)*22,'#315e50');
    }
    c.fillStyle='#274e43';
    c.beginPath(); c.moveTo(0,h); c.lineTo(0,h-30); c.quadraticCurveTo(80,h-8,170,h); c.fill();
    c.beginPath(); c.moveTo(720,h); c.lineTo(720,h-45); c.quadraticCurveTo(670,h-10,570,h); c.fill();
  }
}
