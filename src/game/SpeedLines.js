// ===================================================
// SpeedLines.js — Dynamic Radial Anime Speed Lines Canvas
// High-velocity visual feedback during sprinting and gliding
// ===================================================

export class SpeedLines {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.intensity = 0.0; // 0..1
    this.targetIntensity = 0.0;
    this.numLines = 28;
    this.lines = [];
    this._initLines();
    this.resize();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => this.resize());
    }
  }

  _initLines() {
    this.lines = [];
    for (let i = 0; i < this.numLines; i++) {
      this.lines.push({
        angle: (i / this.numLines) * Math.PI * 2 + (Math.random() - 0.5) * 0.1,
        length: 80 + Math.random() * 120,
        innerRadius: 180 + Math.random() * 80,
        width: 1.5 + Math.random() * 2.5,
        alpha: 0.3 + Math.random() * 0.7,
        speed: 1.2 + Math.random() * 1.5,
      });
    }
  }

  resize() {
    if (!this.canvas || typeof window === 'undefined') return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  setIntensity(val) {
    this.targetIntensity = Math.max(0, Math.min(1, val));
  }

  update(delta) {
    if (!this.ctx || !this.canvas) return;

    // Smoothly interpolate intensity
    this.intensity += (this.targetIntensity - this.intensity) * Math.min(1.0, delta * 8.0);

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.intensity < 0.02) return;

    const cx = this.canvas.width * 0.5;
    const cy = this.canvas.height * 0.5;
    const maxRadius = Math.sqrt(cx * cx + cy * cy);

    ctx.save();
    ctx.translate(cx, cy);

    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];

      // Pulse lengths
      const curInner = Math.min(cx, cy) * 0.45 + (Math.sin(performance.now() * 0.01 * line.speed + i) * 20);
      const curOuter = curInner + line.length * (0.8 + this.intensity * 0.6);

      const x1 = Math.cos(line.angle) * curInner;
      const y1 = Math.sin(line.angle) * curInner;
      const x2 = Math.cos(line.angle) * Math.min(maxRadius, curOuter);
      const y2 = Math.sin(line.angle) * Math.min(maxRadius, curOuter);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);

      ctx.strokeStyle = `rgba(255, 255, 255, ${(line.alpha * this.intensity * 0.85).toFixed(2)})`;
      ctx.lineWidth = line.width * (0.8 + this.intensity * 0.5);
      ctx.lineCap = 'round';
      ctx.stroke();

      // Slightly rotate
      line.angle += delta * 0.2 * (i % 2 === 0 ? 1 : -1);
    }

    ctx.restore();
  }
}
