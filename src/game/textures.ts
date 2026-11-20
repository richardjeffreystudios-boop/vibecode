import * as THREE from 'three';

export interface ProceduralTextureLibrary {
  brickRoad: THREE.CanvasTexture;
  sidewalkStone: THREE.CanvasTexture;
  storefrontRed: THREE.CanvasTexture;
  storefrontCream: THREE.CanvasTexture;
  storefrontSlate: THREE.CanvasTexture;
  awningStripeRed: THREE.CanvasTexture;
  awningStripeTeal: THREE.CanvasTexture;
  awningStripeGold: THREE.CanvasTexture;
  timberPier: THREE.CanvasTexture;
  beachSand: THREE.CanvasTexture;
  parkGrass: THREE.CanvasTexture;
  rivetedSteel: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  maxAnisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, width, height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = Math.min(maxAnisotropy, 8);
  tex.needsUpdate = true;
  return tex;
}

export function createTextureLibrary(maxAnisotropy: number): ProceduralTextureLibrary {
  const all: THREE.CanvasTexture[] = [];
  const reg = (t: THREE.CanvasTexture) => {
    all.push(t);
    return t;
  };

  // St. Joseph State Street heritage red-clay brick paving
  const brickRoad = reg(
    makeCanvasTexture(
      256,
      256,
      (ctx, w, h) => {
        ctx.fillStyle = '#473632';
        ctx.fillRect(0, 0, w, h);
        const rows = 8;
        const cols = 4;
        const bh = h / rows;
        const bw = w / cols;
        const palette = ['#8f4332', '#9c4b37', '#7f3a2c', '#a3563f', '#874030'];
        for (let r = 0; r < rows; r++) {
          const offset = (r % 2) * (bw * 0.5);
          for (let c = -1; c <= cols; c++) {
            ctx.fillStyle = palette[(r * 7 + c * 3 + 11) % palette.length];
            ctx.fillRect(c * bw + offset + 2, r * bh + 2, bw - 4, bh - 4);
            ctx.fillStyle = 'rgba(255,220,190,0.08)';
            ctx.fillRect(c * bw + offset + 3, r * bh + 3, bw - 6, 4);
          }
        }
      },
      maxAnisotropy,
      10,
      10
    )
  );

  // Limestone plaza / Bluff Park sidewalk pavers
  const sidewalkStone = reg(
    makeCanvasTexture(
      256,
      256,
      (ctx, w, h) => {
        ctx.fillStyle = '#a7a093';
        ctx.fillRect(0, 0, w, h);
        const step = 64;
        for (let y = 0; y < h; y += step) {
          for (let x = 0; x < w; x += step) {
            const shade = 202 + ((x * 3 + y * 5) % 18);
            ctx.fillStyle = `rgb(${shade}, ${shade - 6}, ${shade - 15})`;
            ctx.fillRect(x + 2, y + 2, step - 4, step - 4);
          }
        }
      },
      maxAnisotropy,
      8,
      8
    )
  );

  // Historic downtown St. Joseph brick storefront facade generator
  const makeStorefront = (wallBase: string, trimColor: string) =>
    reg(
      makeCanvasTexture(
        256,
        256,
        (ctx, w, h) => {
          ctx.fillStyle = wallBase;
          ctx.fillRect(0, 0, w, h);
          // Subtle brick courses
          ctx.fillStyle = 'rgba(0,0,0,0.08)';
          for (let y = 0; y < h; y += 12) {
            ctx.fillRect(0, y, w, 1);
          }
          // Upper story windows
          for (let wx = 26; wx < w - 20; wx += 74) {
            // Stone sill & lintel
            ctx.fillStyle = trimColor;
            ctx.fillRect(wx - 4, 28, 52, 8);
            ctx.fillRect(wx - 4, 102, 52, 7);
            // Warm sunlit glass pane
            const grad = ctx.createLinearGradient(wx, 36, wx, 102);
            grad.addColorStop(0, '#2a455e');
            grad.addColorStop(0.55, '#4b6c88');
            grad.addColorStop(1, '#f4c07a');
            ctx.fillStyle = grad;
            ctx.fillRect(wx, 36, 44, 66);
            // Window mullions
            ctx.strokeStyle = trimColor;
            ctx.lineWidth = 3;
            ctx.strokeRect(wx, 36, 44, 66);
            ctx.beginPath();
            ctx.moveTo(wx + 22, 36);
            ctx.lineTo(wx + 22, 102);
            ctx.moveTo(wx, 68);
            ctx.lineTo(wx + 44, 68);
            ctx.stroke();
          }
          // Cornice trim band
          ctx.fillStyle = trimColor;
          ctx.fillRect(0, 128, w, 10);
          // Ground floor display shop windows
          for (let sx = 18; sx < w - 30; sx += 118) {
            const g2 = ctx.createLinearGradient(sx, 152, sx, 238);
            g2.addColorStop(0, '#ffdfb0');
            g2.addColorStop(1, '#c97b42');
            ctx.fillStyle = g2;
            ctx.fillRect(sx, 152, 98, 86);
            ctx.strokeStyle = '#2d241e';
            ctx.lineWidth = 5;
            ctx.strokeRect(sx, 152, 98, 86);
          }
        },
        maxAnisotropy,
        1,
        1
      )
    );

  const storefrontRed = makeStorefront('#8a3c2f', '#e5d8c5');
  const storefrontCream = makeStorefront('#cbb99d', '#6e4c36');
  const storefrontSlate = makeStorefront('#4b5d6c', '#ded5c6');

  const makeStripe = (c1: string, c2: string) =>
    reg(
      makeCanvasTexture(
        128,
        128,
        (ctx, w, h) => {
          const bands = 8;
          const bw = w / bands;
          for (let i = 0; i < bands; i++) {
            ctx.fillStyle = i % 2 === 0 ? c1 : c2;
            ctx.fillRect(i * bw, 0, bw, h);
          }
        },
        maxAnisotropy,
        2,
        1
      )
    );

  const awningStripeRed = makeStripe('#c83e2b', '#f7f1e6');
  const awningStripeTeal = makeStripe('#1b7a8a', '#f7f1e6');
  const awningStripeGold = makeStripe('#d98d2b', '#f7f1e6');

  // Weathered timber pier planks
  const timberPier = reg(
    makeCanvasTexture(
      256,
      256,
      (ctx, w, h) => {
        ctx.fillStyle = '#5a4534';
        ctx.fillRect(0, 0, w, h);
        const planks = 8;
        const ph = h / planks;
        const tones = ['#7d624a', '#705741', '#886c52', '#68503c'];
        for (let i = 0; i < planks; i++) {
          ctx.fillStyle = tones[i % tones.length];
          ctx.fillRect(0, i * ph + 2, w, ph - 3);
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          ctx.fillRect(0, i * ph + 3, w, 3);
          ctx.fillStyle = '#36291e';
          ctx.fillRect(18, i * ph + ph * 0.45, 4, 4);
          ctx.fillRect(w - 22, i * ph + ph * 0.45, 4, 4);
        }
      },
      maxAnisotropy,
      4,
      8
    )
  );

  // Silver Beach golden Lake Michigan sand
  const beachSand = reg(
    makeCanvasTexture(
      256,
      256,
      (ctx, w, h) => {
        ctx.fillStyle = '#e5cba0';
        ctx.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 16) {
          ctx.fillStyle = 'rgba(180, 140, 88, 0.14)';
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.quadraticCurveTo(w * 0.5, y + 8, w, y);
          ctx.lineTo(w, y + 6);
          ctx.quadraticCurveTo(w * 0.5, y + 14, 0, y + 6);
          ctx.closePath();
          ctx.fill();
        }
        for (let i = 0; i < 420; i++) {
          const x = (i * 73) % w;
          const y = (i * 137) % h;
          ctx.fillStyle = i % 2 === 0 ? 'rgba(255,248,230,0.28)' : 'rgba(145,112,72,0.18)';
          ctx.fillRect(x, y, 2, 2);
        }
      },
      maxAnisotropy,
      8,
      8
    )
  );

  // Lake Bluff Park lush grass
  const parkGrass = reg(
    makeCanvasTexture(
      256,
      256,
      (ctx, w, h) => {
        ctx.fillStyle = '#477b49';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 600; i++) {
          const x = (i * 47) % w;
          const y = (i * 89) % h;
          ctx.fillStyle = i % 3 === 0 ? '#5b9459' : '#3a693e';
          ctx.fillRect(x, y, 4, 9);
        }
      },
      maxAnisotropy,
      8,
      8
    )
  );

  // Painted riveted maritime steel (Swing Bridge & Lighthouse catwalk)
  const rivetedSteel = reg(
    makeCanvasTexture(
      128,
      128,
      (ctx, w, h) => {
        ctx.fillStyle = '#4c5f6e';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#394854';
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, w - 4, h - 4);
        ctx.fillStyle = '#73899b';
        for (let x = 14; x < w; x += 24) {
          ctx.beginPath();
          ctx.arc(x, 12, 3, 0, Math.PI * 2);
          ctx.arc(x, h - 12, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      },
      maxAnisotropy,
      2,
      2
    )
  );

  // Soft radial contact shadow decal
  const contactShadow = reg(
    makeCanvasTexture(
      128,
      128,
      (ctx, w, h) => {
        const g = ctx.createRadialGradient(w / 2, h / 2, 6, w / 2, h / 2, w / 2);
        g.addColorStop(0, 'rgba(6, 14, 24, 0.58)');
        g.addColorStop(0.65, 'rgba(6, 14, 24, 0.24)');
        g.addColorStop(1, 'rgba(6, 14, 24, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      },
      maxAnisotropy,
      1,
      1
    )
  );
  contactShadow.wrapS = THREE.ClampToEdgeWrapping;
  contactShadow.wrapT = THREE.ClampToEdgeWrapping;

  return {
    brickRoad,
    sidewalkStone,
    storefrontRed,
    storefrontCream,
    storefrontSlate,
    awningStripeRed,
    awningStripeTeal,
    awningStripeGold,
    timberPier,
    beachSand,
    parkGrass,
    rivetedSteel,
    contactShadow,
    dispose: () => {
      for (const tex of all) {
        tex.dispose();
      }
    },
  };
}
