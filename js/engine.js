'use strict';

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 600;
const MAX_FRAME_TIME = 0.034;
const MAX_PIXEL_RATIO = 2;
const STORAGE_KEY = 'nu-pogodi-lcd-record';

const STATES = {
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAMEOVER: 'gameover'
};

const EGG_DISPLAY_STEPS = 12;

const RULES = {
  MAX_MISSES: 5,
  MAX_LIVES: 3,
  POINTS_PER_LEVEL: 10,
  SPEED_CURVE_SCALE: 1.8,
  CATCH_PROGRESS: (EGG_DISPLAY_STEPS - 1) / EGG_DISPLAY_STEPS,
  LANE_LOCK_PROGRESS: 0.28,
  ROTTEN_EGG_START_PROGRESS: 0.12,
  ROTTEN_EGG_DURATION_FACTOR: 1.08,
  SPAWN_INTERVAL_JITTER_RATIO: 0.12,
  FIRST_EGG_DELAY: 0.8,
  SPAWN_INTERVAL_START: 1.28,
  SPAWN_INTERVAL_END: 0.6,
  EGG_DURATION_START: 3.1,
  EGG_DURATION_END: 1.5,
  GOLDEN_EGG_CHANCE: 0.08,
  MODE_B_SPEED: 0.82,
  HARE_FIRST_APPEARANCE: 6.5,
  HARE_DELAY_MIN: 7,
  HARE_DELAY_MAX: 11,
  HARE_VISIBLE_TIME: 2.7,
  HARE_THROW_TIME_LEFT: 1.75,
  SPLAT_DURATION: 0.55,
  MESSAGE_DURATION: 1.2
};

const COLORS = {
  LCD_LIGHT: '#fff6df',
  INK: '#1e2b33',
  FAINT: 'rgba(30, 43, 51, 0.1)',
  GOLD: '#d99a1f',
  PAPER: '#f3ead8',
  PAPER_DARK: '#dfcfb4',
  RED: '#b84a35',
  RED_DARK: '#6f2a1f',
  GREEN: '#3d8b4f',
  GREEN_DARK: '#245c36',
  YELLOW: '#f0c431',
  HEN_BODY: '#fff8ea',
  HEN_OUTLINE: '#1e2b33',
  HEN_RED: '#c84b32',
  HEN_RED_DARK: '#6f2a1f',
  HEN_BEAK: '#e2ae3f',
  HEN_BEAK_OUTLINE: '#74552b',
  HEN_EYE: '#1e2b33',
  HEN_WING: '#f1dfb8',
  HEN_WING_OUTLINE: '#71857a',
  HEN_WING_LINE: '#b99b64',
  HEN_LEGS: '#b88a37'
};

const LAYOUT = {
  lanes: {
    left: { startX: 148, endX: 355, direction: 1 },
    right: { startX: 812, endX: 605, direction: -1 }
  },
  hens: {
    leftX: 108,
    rightX: 852,
    topY: 180,
    bottomY: 316
  },
  wolf: {
    x: CANVAS_WIDTH / 2,
    y: 595,
    width: 255,
    spriteX: -90,
    spriteY: -300
  }
};

function createLane(side, row, startY, endY) {
  const layout = LAYOUT.lanes[side];
  return {
    side,
    row,
    startX: layout.startX,
    startY,
    endX: layout.endX,
    endY,
    direction: layout.direction
  };
}

const LANES = {
  'left-top': createLane('left', 'top', 221, 370),
  'left-bottom': createLane('left', 'bottom', 347, 460),
  'right-top': createLane('right', 'top', 221, 370),
  'right-bottom': createLane('right', 'bottom', 347, 460)
};
const LANE_IDS = Object.keys(LANES);
const MODE_A_LANE_IDS = LANE_IDS.filter((laneId) => laneId !== 'right-bottom');

const KEY_CONTROLS = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'top',
  KeyW: 'top',
  ArrowDown: 'bottom',
  KeyS: 'bottom'
};

const DIGIT_SEGMENTS = [
  'abcdef',
  'bc',
  'abdeg',
  'abcdg',
  'bcfg',
  'acdfg',
  'acdefg',
  'abc',
  'abcdefg',
  'abcdfg'
];

const ASSET_PATHS = {
  wolfTop: 'wolf-top.png',
  wolfBottom: 'wolf-bottom.png',
  wolfTopClassic: 'wolf-top-classic.png',
  wolfBottomClassic: 'wolf-bottom-classic.png',
  hare: 'hare.png'
};

const gameImages = {
  wolfTop: { image: new Image(), ratio: 1 },
  wolfBottom: { image: new Image(), ratio: 1 },
  wolfTopClassic: { image: new Image(), ratio: 1 },
  wolfBottomClassic: { image: new Image(), ratio: 1 },
  hare: { image: new Image(), ratio: 1 }
};

const SOUND = {
  attackMax: 0.005,
  minGain: 0.0001,
  releaseEnd: 0.001,
  stopDelay: 0.01
};

const SOUND_PATTERNS = {
  catch: [[880, 0.07]],
  golden: [[880, 0.08], [1175, 0.1, 0.04, 0.08]],
  miss: [[130, 0.22, 0.055]],
  hit: [[110, 0.16, 0.055], [85, 0.18, 0.05, 0.14]],
  level: [[660, 0.07, 0.035], [990, 0.09, 0.035, 0.08]]
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function randomItem(items) {
  if (items.length === 0) throw new Error('Cannot choose an item from an empty array');
  return items[Math.floor(Math.random() * items.length)];
}

function loadRecord() {
  try {
    const value = parseInt(localStorage.getItem(STORAGE_KEY), 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function saveRecord(value) {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    return;
  }
}

function tracePath(ctx, commands) {
  ctx.beginPath();
  commands.forEach(([command, ...values]) => {
    switch (command) {
      case 'M':
        ctx.moveTo(...values);
        break;
      case 'L':
        ctx.lineTo(...values);
        break;
      case 'C':
        ctx.bezierCurveTo(...values);
        break;
      case 'Q':
        ctx.quadraticCurveTo(...values);
        break;
      case 'Z':
        ctx.closePath();
        break;
      default:
        throw new Error(`Unknown path command: ${command}`);
    }
  });
}

function paintShape(ctx, commands, fill, stroke = COLORS.INK, width = 2) {
  tracePath(ctx, commands);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke && width > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

function strokeShape(ctx, commands, color, width = 2) {
  tracePath(ctx, commands);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function drawLines(ctx, lines, color = ctx.strokeStyle, width = ctx.lineWidth) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  lines.forEach(([startX, startY, endX, endY]) => {
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
  });
  ctx.stroke();
}

function drawSprite(ctx, sprite, width, x, y) {
  const { image, ratio } = sprite;
  if (!image.complete || image.naturalWidth === 0) return;
  ctx.drawImage(image, x, y, width, width * ratio);
}

function preloadImages(sources) {
  const loaders = Object.entries(sources).map(([name, sprite]) => new Promise((resolve, reject) => {
    const { image } = sprite;
    image.addEventListener('load', () => {
      sprite.ratio = image.naturalHeight / image.naturalWidth;
      resolve();
    }, { once: true });
    image.addEventListener('error', reject, { once: true });
    image.src = ASSET_PATHS[name];
  }));
  return Promise.all(loaders).then(() => sources);
}

class SoundManager {
  constructor() {
    this.enabled = true;
    this.audioContext = null;
  }

  ensureContext() {
    if (!this.enabled) return;
    const AudioContextClass = typeof AudioContext !== 'undefined'
      ? AudioContext
      : typeof webkitAudioContext !== 'undefined' ? webkitAudioContext : null;
    if (!AudioContextClass) return;
    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContextClass();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
    } catch {
      this.audioContext = null;
    }
  }

  tone(frequency, duration, volume = 0.045, delay = 0) {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.audioContext) return;
    const start = this.audioContext.currentTime + delay;
    const attackTime = Math.min(SOUND.attackMax, duration / 2);
    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(SOUND.minGain, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + attackTime);
    gain.gain.exponentialRampToValueAtTime(SOUND.minGain, start + duration);
    gain.gain.setValueAtTime(0, start + duration + SOUND.releaseEnd);
    oscillator.connect(gain);
    gain.connect(this.audioContext.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + SOUND.stopDelay);
  }

  play(name) {
    const pattern = SOUND_PATTERNS[name];
    if (!pattern) return;
    for (const [frequency, duration, volume = 0.045, delay = 0] of pattern) {
      this.tone(frequency, duration, volume, delay);
    }
  }

  destroy() {
    if (this.audioContext) this.audioContext.close().catch(() => {});
    this.audioContext = null;
  }
}

class InputManager {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.abortController = new AbortController();
    this.bindKeyboard();
    this.bindPositionButtons();
  }

  bindKeyboard() {
    const { signal } = this.abortController;
    window.addEventListener('keydown', (event) => {
      if (event.code in KEY_CONTROLS) {
        event.preventDefault();
        if (!event.repeat) this.callbacks.onControl?.(KEY_CONTROLS[event.code]);
      }
      if ((event.code === 'KeyP' || event.code === 'Escape') && !event.repeat) {
        event.preventDefault();
        this.callbacks.onPause?.();
      }
    }, { signal });
    window.addEventListener('blur', () => {
      this.resetButtons();
      this.callbacks.onFocusLost?.();
    }, { signal });
  }

  bindPositionButtons() {
    const { signal } = this.abortController;
    document.querySelectorAll('[data-position]').forEach((button) => {
      const position = LANES[button.dataset.position];
      if (!position) throw new Error(`Unknown wolf position: ${button.dataset.position}`);
      const release = () => button.classList.remove('position-button--pressed');
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        button.classList.add('position-button--pressed');
        try {
          button.setPointerCapture(event.pointerId);
        } catch {
          release();
        }
        this.callbacks.onControl?.(position.side);
        this.callbacks.onControl?.(position.row);
      }, { signal });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((eventName) => {
        button.addEventListener(eventName, release, { signal });
      });
    });
  }

  resetButtons() {
    document.querySelectorAll('.position-button--pressed').forEach((button) => {
      button.classList.remove('position-button--pressed');
    });
  }

  destroy() {
    this.abortController.abort();
    this.resetButtons();
  }
}
