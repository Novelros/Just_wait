'use strict';

const canvas = document.getElementById('game-canvas');
const context = canvas.getContext('2d');

function collectUI() {
  const byId = (id) => document.getElementById(id);
  return {
    score: byId('score-value'),
    lives: byId('lives-value'),
    misses: byId('misses-value'),
    record: byId('record-value'),
    pauseButton: byId('pause-button'),
    soundButton: byId('sound-button'),
    skinClassicButton: byId('skin-classic-button'),
    skinNewButton: byId('skin-new-button'),
    gameoverScore: byId('gameover-score'),
    gameoverReason: byId('gameover-reason'),
    screens: {
      [STATES.MENU]: byId('menu-screen'),
      [STATES.PAUSED]: byId('pause-screen'),
      [STATES.GAMEOVER]: byId('gameover-screen')
    }
  };
}

function resizeCanvas() {
  const pixelRatio = Math.min(devicePixelRatio || 1, MAX_PIXEL_RATIO);
  canvas.width = CANVAS_WIDTH * pixelRatio;
  canvas.height = CANVAS_HEIGHT * pixelRatio;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

const ui = collectUI();
const sound = new SoundManager();
let game;
const input = new InputManager({
  onControl: (control) => game.controlWolf(control),
  onPause: () => game.togglePause(),
  onFocusLost: () => game.pauseOnFocusLost()
});
game = new Game(context, input, sound, ui);

const buttonActions = {
  'start-a-button': () => game.start('A'),
  'start-b-button': () => game.start('B'),
  'side-start-a-button': () => game.start('A'),
  'side-start-b-button': () => game.start('B'),
  'skin-classic-button': () => game.setSkin('classic'),
  'skin-new-button': () => game.setSkin('new'),
  'restart-button': () => game.start(),
  'resume-button': () => game.togglePause(),
  'pause-button': () => game.togglePause(),
  'pause-menu-button': () => game.returnToMenu(),
  'gameover-menu-button': () => game.returnToMenu()
};

Object.entries(buttonActions).forEach(([id, action]) => {
  document.getElementById(id).addEventListener('click', action);
});

ui.soundButton.addEventListener('click', () => {
  sound.enabled = !sound.enabled;
  ui.soundButton.setAttribute('aria-pressed', String(sound.enabled));
  ui.soundButton.setAttribute('aria-label', sound.enabled ? 'Выключить звук' : 'Включить звук');
  if (sound.enabled) {
    sound.ensureContext();
    sound.play('catch');
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) game.pauseOnFocusLost();
});

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
preloadImages(gameImages).then(() => {
  requestAnimationFrame(game.loop);
});
