const CANVAS_ID = 'gold-dust';

function ensureCanvas() {
  let c = document.getElementById(CANVAS_ID);
  if (!c) {
    c = document.createElement('canvas');
    c.id = CANVAS_ID;
    c.style.position = 'fixed';
    c.style.inset = '0';
    c.style.zIndex = '0';
    c.style.pointerEvents = 'none';
    document.body.prepend(c);
  }
  return c;
}

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 245, g: 158, b: 11 };
}

function getAccentColor() {
  const css = getComputedStyle(document.documentElement);
  const rgbVar = css.getPropertyValue('--accent-color-rgb').trim();
  if (rgbVar) {
    const parts = rgbVar.split(',').map(v => parseInt(v.trim(), 10));
    if (parts.length === 3) return { r: parts[0], g: parts[1], b: parts[2] };
  }
  const hex = css.getPropertyValue('--accent-color').trim() || '#f59e0b';
  return hexToRgb(hex);
}

class DailyAtmosphere {
  constructor() {
    this.canvas = ensureCanvas();
    this.ctx = this.canvas.getContext('2d');
    this.day = new Date().getDay();
    this.particles = [];
    this.enabled = (localStorage.getItem('sf_canvas_enabled') !== 'false');
    this.resize = this.resize.bind(this);
    this.draw = this.draw.bind(this);
    this.initParticles = this.initParticles.bind(this);
    
    window.addEventListener('resize', this.resize);
    
    // Turbo integration: Re-initialize on navigation
    window.addEventListener('turbo:load', () => {
        console.log("[DailyAtmosphere] Neural Re-Sync: Recalculating canvas boundaries");
        this.canvas = ensureCanvas();
        if (this.canvas) {
          this.ctx = this.canvas.getContext('2d');
          this.resize();
        }
    });

    this.resize();
    this.initParticles();
    this.draw();
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.initParticles();
  }

  initParticles() {
    if (!this.canvas) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cfg = {
      0: { c: 300, s: 0.15, r: 1.2 },
      1: { c: 400, s: 0.3, r: 1.5 },
      2: { c: 50,  s: 0.2, r: 2.0 },
      3: { c: 15,  s: 0.4, r: 150 },
      4: { c: 80,  s: 0.5, r: 2.0 },
      5: { c: 120, s: 1.2, r: 1.5 },
      6: { c: 25,  s: 0.3, r: 80 }
    }[this.day];
    
    this.particles.length = 0;
    const limit = Math.min(cfg.c, Math.floor((w * h) / ([3, 6].includes(this.day) ? 15000 : 8000)));
    for (let i = 0; i < limit; i++) {
      this.particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * cfg.s,
        vy: (Math.random() - 0.5) * cfg.s,
        r: Math.random() * cfg.r + ([3, 6].includes(this.day) ? 40 : 0.5),
        ph: Math.random() * Math.PI * 2
      });
    }
  }

  draw() {
    if (!this.ctx || !this.canvas) {
      requestAnimationFrame(this.draw);
      return;
    }
    
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    if (!this.enabled) {
      ctx.clearRect(0, 0, w, h);
      requestAnimationFrame(this.draw);
      return;
    }

    ctx.clearRect(0, 0, w, h);
    const col = getAccentColor();
    const isDark = !document.body.classList.contains('light');
    const color = isDark ? col : { r: Math.max(0, col.r - 80), g: Math.max(0, col.g - 50), b: Math.max(0, col.b - 10) };
    
    ctx.lineCap = 'round';
    ctx.lineWidth = 0.5;

    switch (this.day) {
      case 0:
        for (let p of this.particles) {
          p.ph += 0.01;
          const a = 0.3 + 0.4 * Math.abs(Math.sin(p.ph));
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${a})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * (0.8 + 0.4 * Math.sin(p.ph)), 0, Math.PI * 2);
          ctx.fill();
          p.y -= p.vy * 0.2;
          if (p.y < 0) p.y = h;
        }
        break;
      case 1:
        for (let p of this.particles) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
          if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
          p.ph += 0.015;
          const a = 0.5 + 0.3 * Math.sin(p.ph);
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${a})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 2:
        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${isDark ? 0.12 : 0.15})`;
        const step = 60;
        for (let x = 0; x < w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
        for (let y = 0; y < h; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
        for (let p of this.particles) {
          p.ph += 0.02;
          const a = 0.2 + 0.4 * Math.abs(Math.sin(p.ph));
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${a})`;
          ctx.beginPath();
          ctx.arc(p.x - (p.x % step), p.y - (p.y % step), 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 3:
        for (let p of this.particles) {
          p.ph += 0.01;
          const a = 0.15 + 0.1 * Math.abs(Math.sin(p.ph));
          const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          gr.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${a})`);
          gr.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
          ctx.fillStyle = gr;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          p.x += Math.cos(p.ph) * 0.5;
          p.y += Math.sin(p.ph) * 0.5;
        }
        break;
      case 4:
        for (let p of this.particles) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.5)`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
          ctx.fill();
          for (let o of this.particles) {
            const dx = p.x - o.x, dy = p.y - o.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 100) {
              ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${0.25 * (1 - dist / 100)})`;
              ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(o.x, o.y); ctx.stroke();
            }
          }
        }
        break;
      case 5:
        for (let p of this.particles) {
          p.y += p.vy * 2;
          if (p.y > h) { p.y = 0; p.x = Math.random() * w; }
          ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.25)`;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y + 15); ctx.stroke();
        }
        break;
      case 6:
        for (let p of this.particles) {
          p.ph += 0.005;
          const a = 0.1 + 0.1 * Math.sin(p.ph);
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${a})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
          p.x += p.vx; p.y += p.vy;
          if (p.x < -p.r) p.x = w + p.r; if (p.x > w + p.r) p.x = -p.r;
          if (p.y < -p.r) p.y = h + p.r; if (p.y > h + p.r) p.y = -p.r;
        }
        break;
    }
    requestAnimationFrame(this.draw);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.dailyAtmosphere = new DailyAtmosphere();
});

