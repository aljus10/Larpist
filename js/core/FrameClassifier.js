// -------------------------------------------------------------
// EARTHTONE STUDIO - NASA SVS FRAME CLASSIFICATION ENGINE
// Nearest-neighbor anchor matching across 5 latitude bands
// -------------------------------------------------------------

import { bands } from './JukeboxStore.js';

const ANCHORS = {
  cool: [
    [22, 47, 109],
    [62, 100, 160],
    [168, 201, 224]
  ],
  reference: [
    [232, 235, 228],
    [247, 244, 210]
  ],
  warm: [
    [250, 215, 62],
    [226, 119, 27],
    [177, 17, 9]
  ]
};

function nearestGroup(r, g, b) {
  // Exclude background / black space
  if ((r + g + b) / 3 < 34) return null;

  let winner = 'reference';
  let bestDist = Infinity;

  for (const [group, colors] of Object.entries(ANCHORS)) {
    for (const [ar, ag, ab] of colors) {
      const dist = (r - ar) ** 2 + (g - ag) ** 2 + (b - ab) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        winner = group;
      }
    }
  }
  return winner;
}

class FrameClassifier {
  constructor() {
    this.cache = new Map();
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 256;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
  }

  async analyzeYear(year) {
    if (this.cache.has(year)) {
      return this.cache.get(year);
    }

    const img = new Image();
    img.src = `assets/eic/${year}.webp`;

    try {
      await img.decode();
    } catch {
      throw new Error(`NASA frame for ${year} could not be decoded.`);
    }

    this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
    const imgData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const pixels = imgData.data;

    const vectors = bands.map((band) => {
      const counts = { cool: 0, reference: 0, warm: 0, valid: 0, unclassified: 0 };
      const yStart = Math.floor(this.canvas.height * band.start);
      const yEnd = Math.ceil(this.canvas.height * band.end);

      // Sample stride = 2 for both X and Y
      for (let y = yStart; y < yEnd; y += 2) {
        for (let x = 0; x < this.canvas.width; x += 2) {
          const offset = (y * this.canvas.width + x) * 4;
          // Alpha check
          if (pixels[offset + 3] < 220) {
            counts.unclassified++;
            continue;
          }
          const group = nearestGroup(pixels[offset], pixels[offset + 1], pixels[offset + 2]);
          if (!group) {
            counts.unclassified++;
            continue;
          }
          counts[group]++;
          counts.valid++;
        }
      }

      const divisor = Math.max(1, counts.valid);
      return {
        cool: counts.cool / divisor,
        reference: counts.reference / divisor,
        warm: counts.warm / divisor,
        valid: counts.valid,
        unclassified: counts.unclassified
      };
    });

    this.cache.set(year, vectors);
    return vectors;
  }
}

export const frameClassifier = new FrameClassifier();
