'use strict';

const EGG_SHAPE = [
  ['M', 0, -16],
  ['C', 9, -13, 14, 2, 11, 10],
  ['C', 8, 18, -8, 18, -11, 10],
  ['C', -14, 2, -9, -13, 0, -16],
  ['Z']
];

class Egg {
  constructor(laneId, duration, golden = false, startProgress = 0) {
    this.laneId = laneId;
    this.duration = duration;
    this.golden = golden;
    this.rotten = false;
    this.progress = startProgress;
    this.active = true;
    this.value = golden ? 2 : 1;
  }

  get lane() {
    return LANES[this.laneId];
  }

  get x() {
    return lerp(this.lane.startX, this.lane.endX, this.progress);
  }

  get y() {
    return lerp(this.lane.startY, this.lane.endY, this.progress);
  }

  update(deltaTime) {
    this.progress += deltaTime / this.duration;
  }

  draw(ctx) {
    const displayProgress = clamp(
      Math.floor(this.progress * EGG_DISPLAY_STEPS) / EGG_DISPLAY_STEPS,
      0,
      1
    );
    const displayX = lerp(this.lane.startX, this.lane.endX, displayProgress);
    const displayY = lerp(this.lane.startY, this.lane.endY, displayProgress);
    ctx.save();
    ctx.translate(displayX, displayY);
    ctx.rotate(this.lane.direction * 0.22);
    paintShape(
      ctx,
      EGG_SHAPE,
      this.rotten ? COLORS.INK : COLORS.LCD_LIGHT,
      this.golden ? COLORS.GOLD : COLORS.INK,
      this.golden ? 3 : 2
    );

    if (this.golden) {
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 12, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (this.rotten) {
      drawLines(ctx, [[-6, -6, 6, 6], [6, -6, -6, 6]], COLORS.LCD_LIGHT, 2);
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.ellipse(-4, -6, 2, 4, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

class RottenEgg extends Egg {
  constructor(laneId, duration) {
    super(laneId, duration, false, RULES.ROTTEN_EGG_START_PROGRESS);
    this.rotten = true;
    this.value = 0;
  }
}

class Splat {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.life = RULES.SPLAT_DURATION;
  }

  update(deltaTime) {
    this.life -= deltaTime;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = clamp(this.life / RULES.SPLAT_DURATION, 0, 1);
    ctx.fillStyle = COLORS.INK;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, 24, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    const rays = [];
    for (let i = 0; i < 6; i += 1) {
      const angle = i * Math.PI / 3;
      rays.push([
        this.x + Math.cos(angle) * 12,
        this.y + Math.sin(angle) * 4,
        this.x + Math.cos(angle) * 32,
        this.y + Math.sin(angle) * 16
      ]);
    }
    drawLines(ctx, rays, COLORS.INK, 2);
    ctx.restore();
  }
}

class Wolf {
  constructor(skin = 'new') {
    this.side = 'left';
    this.row = 'bottom';
    this.skin = skin;
  }

  get position() {
    return `${this.side}-${this.row}`;
  }

  applyControl(control) {
    if (control === 'left' || control === 'right') this.side = control;
    if (control === 'top' || control === 'bottom') this.row = control;
  }

  draw(ctx) {
    const images = this.skin === 'classic'
      ? { top: gameImages.wolfTopClassic, bottom: gameImages.wolfBottomClassic }
      : { top: gameImages.wolfTop, bottom: gameImages.wolfBottom };
    const image = this.row === 'top' ? images.top : images.bottom;
    const facing = this.side === 'right' ? 1 : -1;
    const layout = LAYOUT.wolf;
    ctx.save();
    ctx.translate(layout.x, layout.y);
    ctx.scale(facing, 1);
    drawSprite(ctx, image, layout.width, layout.spriteX, layout.spriteY);
    ctx.restore();
  }
}

class Hare {
  constructor(onThrow) {
    this.onThrow = onThrow;
    this.visible = false;
    this.delay = RULES.HARE_FIRST_APPEARANCE;
    this.visibleTime = 0;
    this.hasThrown = false;
  }

  update(deltaTime) {
    if (!this.visible) {
      this.delay -= deltaTime;
      if (this.delay <= 0) {
        this.visible = true;
        this.visibleTime = RULES.HARE_VISIBLE_TIME;
        this.hasThrown = false;
      }
      return;
    }

    this.visibleTime -= deltaTime;
    if (!this.hasThrown && this.visibleTime <= RULES.HARE_THROW_TIME_LEFT) {
      this.hasThrown = true;
      this.onThrow();
    }
    if (this.visibleTime <= 0) {
      this.visible = false;
      this.delay = randomRange(RULES.HARE_DELAY_MIN, RULES.HARE_DELAY_MAX);
    }
  }

  draw(ctx) {
    if (!this.visible) return;
    drawSprite(ctx, gameImages.hare, 170, 18, 12);
  }
}

function drawHenTemplate(ctx) {
  paintShape(ctx, [
    ['M', -34, 5], ['C', -52, -8, -59, -24, -48, -22],
    ['L', -55, -36], ['C', -36, -31, -29, -19, -25, -12],
    ['C', -13, -27, 9, -24, 20, -10], ['L', 17, -32],
    ['C', 22, -52, 44, -49, 45, -31], ['C', 56, -26, 53, -13, 39, -8],
    ['C', 43, 20, 20, 38, -6, 35], ['C', -25, 35, -39, 23, -34, 5], ['Z']
  ], COLORS.HEN_BODY, COLORS.HEN_OUTLINE, 2.5);
  paintShape(ctx, [
    ['M', 23, -43], ['L', 24, -55], ['L', 31, -49], ['L', 37, -58],
    ['L', 43, -45], ['Z']
  ], COLORS.HEN_RED, COLORS.HEN_RED_DARK, 1.5);
  paintShape(
    ctx,
    [['M', 43, -31], ['L', 60, -23], ['L', 43, -17], ['Z']],
    COLORS.HEN_BEAK,
    COLORS.HEN_BEAK_OUTLINE,
    1.5
  );
  ctx.fillStyle = COLORS.HEN_EYE;
  ctx.beginPath();
  ctx.arc(37, -33, 3.5, 0, Math.PI * 2);
  ctx.fill();
  paintShape(ctx, [['M', 40, -15], ['Q', 48, -4, 38, 0], ['Z']], COLORS.HEN_RED, null, 0);
  paintShape(ctx, [
    ['M', -27, 2], ['C', -10, -8, 12, 2, 14, 15],
    ['C', 2, 28, -19, 24, -27, 2], ['Z']
  ], COLORS.HEN_WING, COLORS.HEN_WING_OUTLINE, 1.5);
  strokeShape(ctx, [['M', -16, 4], ['Q', -3, 12, 7, 14]], COLORS.HEN_WING_LINE, 2);
  strokeShape(ctx, [['M', -12, 34], ['L', -12, 44], ['L', -22, 47]], COLORS.HEN_LEGS, 3);
  strokeShape(ctx, [['M', 10, 33], ['L', 10, 44], ['L', 1, 47]], COLORS.HEN_LEGS, 3);
}

class Hen {
  constructor(laneId) {
    this.lane = LANES[laneId];
    const layout = LAYOUT.hens;
    this.x = this.lane.side === 'left' ? layout.leftX : layout.rightX;
    this.y = this.lane.row === 'top' ? layout.topY : layout.bottomY;
    this.facing = this.lane.side === 'left' ? 1 : -1;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.facing, 1);
    drawHenTemplate(ctx);
    ctx.restore();
  }
}

function drawPaperTexture(ctx) {
  ctx.fillStyle = COLORS.PAPER;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.strokeStyle = 'rgba(111, 42, 31, 0.08)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i += 1) {
    const x = 60 + i * 108;
    drawLines(ctx, [[x, 34, x + 36, 20]], ctx.strokeStyle, 2);
  }
  ctx.fillStyle = 'rgba(61, 139, 79, 0.08)';
  ctx.beginPath();
  ctx.ellipse(820, 86, 150, 52, -0.08, 0, Math.PI * 2);
  ctx.ellipse(132, 536, 190, 42, 0.04, 0, Math.PI * 2);
  ctx.fill();
}

function drawTree(ctx) {
  strokeShape(ctx, [
    ['M', 835, 0], ['C', 820, 44, 820, 80, 798, 118]
  ], '#7a4a2b', 14);
  ctx.fillStyle = COLORS.GREEN;
  ctx.strokeStyle = COLORS.GREEN_DARK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(858, 44, 96, 34, 0, 0, Math.PI * 2);
  ctx.ellipse(910, 76, 70, 28, 0, 0, Math.PI * 2);
  ctx.ellipse(790, 70, 58, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawRoostSide(ctx, x, direction) {
  ctx.save();
  ctx.translate(x, 0);
  ctx.scale(direction, 1);
  ctx.lineCap = 'round';
  paintShape(ctx, [
    ['M', 0, 156], ['L', 112, 122], ['L', 112, 150], ['L', 0, 184], ['Z']
  ], COLORS.RED, COLORS.RED_DARK, 4);
  paintShape(ctx, [
    ['M', 10, 238], ['L', 142, 238], ['L', 142, 262], ['L', 10, 262], ['Z']
  ], COLORS.RED, COLORS.RED_DARK, 4);
  paintShape(ctx, [
    ['M', 10, 360], ['L', 142, 360], ['L', 142, 384], ['L', 10, 384], ['Z']
  ], COLORS.RED, COLORS.RED_DARK, 4);
  drawLines(ctx, [
    [26, 262, 26, 492], [126, 262, 126, 492],
    [26, 384, 26, 492], [126, 384, 126, 492]
  ], COLORS.RED_DARK, 8);
  drawLines(ctx, [[18, 270, 134, 270], [18, 392, 134, 392]], '#e07b5e', 2);
  ctx.restore();
}

function drawRoosts(ctx) {
  drawRoostSide(ctx, 24, 1);
  drawRoostSide(ctx, CANVAS_WIDTH - 24, -1);
}

function drawBush(ctx, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = COLORS.GREEN;
  ctx.strokeStyle = COLORS.GREEN_DARK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(-38, 8, 42, 24, 0, 0, Math.PI * 2);
  ctx.ellipse(0, -8, 52, 32, 0, 0, Math.PI * 2);
  ctx.ellipse(42, 8, 44, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawGrass(ctx) {
  const tufts = [
    [180, 548], [318, 520], [472, 552], [620, 532], [760, 556],
    [214, 586], [398, 574], [700, 586]
  ];
  ctx.strokeStyle = COLORS.GREEN_DARK;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  tufts.forEach(([x, y]) => {
    drawLines(ctx, [
      [x - 12, y, x - 4, y - 18],
      [x, y, x, y - 22],
      [x + 12, y, x + 4, y - 18]
    ], COLORS.GREEN_DARK, 4);
  });
}

function drawChick(ctx, x, y, facing = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, 1);
  paintShape(ctx, [
    ['M', -18, 4], ['C', -18, -12, -2, -22, 12, -12],
    ['C', 24, -4, 20, 14, 4, 18], ['C', -8, 20, -18, 14, -18, 4], ['Z']
  ], COLORS.YELLOW, COLORS.INK, 3);
  paintShape(ctx, [['M', 16, -8], ['L', 30, -3], ['L', 16, 2], ['Z']], '#e28b2d', COLORS.INK, 2);
  ctx.fillStyle = COLORS.INK;
  ctx.beginPath();
  ctx.arc(8, -10, 2.5, 0, Math.PI * 2);
  ctx.fill();
  drawLines(ctx, [[-4, 18, -8, 28], [6, 18, 10, 28]], '#b86a1c', 3);
  ctx.restore();
}

function drawBackground(ctx) {
  drawPaperTexture(ctx);
  drawTree(ctx);
  drawRoosts(ctx);
  drawBush(ctx, 116, 500, 1.05);
  drawBush(ctx, 846, 492, 0.95);
  drawBush(ctx, 486, 585, 0.7);
  drawGrass(ctx);
  drawChick(ctx, 704, 520, -1);
  drawChick(ctx, 764, 552, -1);
}

function drawChute(ctx, lane) {
  const startX = lane.startX - lane.direction * 34;
  drawLines(ctx, [
    [startX, lane.startY + 20, lane.endX, lane.endY + 20],
    [startX, lane.startY + 32, lane.endX, lane.endY + 32]
  ], COLORS.RED_DARK, 6);
  drawLines(ctx, [
    [startX, lane.startY + 20, lane.endX, lane.endY + 20]
  ], '#e07b5e', 2);
  const rungs = [];
  for (let step = 0.2; step < 1; step += 0.2) {
    const x = lerp(lane.startX, lane.endX, step);
    const y = lerp(lane.startY, lane.endY, step) + 26;
    rungs.push([x, y - 8, x, y + 8]);
  }
  drawLines(ctx, rungs, COLORS.RED, 2);
}

function drawDigit(ctx, digit, x, y, scale = 1) {
  const active = DIGIT_SEGMENTS[Number(digit)] || '';
  const width = 31 * scale;
  const height = 55 * scale;
  const thickness = 5 * scale;
  const middle = y + height / 2 - thickness / 2;
  const segments = {
    a: [x + thickness, y, width - thickness * 2, thickness],
    b: [x + width - thickness, y + thickness, thickness, height / 2 - thickness],
    c: [x + width - thickness, middle + thickness, thickness, height / 2 - thickness],
    d: [x + thickness, y + height - thickness, width - thickness * 2, thickness],
    e: [x, middle + thickness, thickness, height / 2 - thickness],
    f: [x, y + thickness, thickness, height / 2 - thickness],
    g: [x + thickness, middle, width - thickness * 2, thickness]
  };
  Object.entries(segments).forEach(([name, rectangle]) => {
    ctx.fillStyle = active.includes(name) ? COLORS.INK : COLORS.FAINT;
    ctx.fillRect(...rectangle);
  });
}

function drawHeart(ctx, x, y, color) {
  paintShape(ctx, [
    ['M', x, y + 12], ['L', x + 4, y], ['L', x + 10, y + 8],
    ['L', x + 16, y], ['L', x + 20, y + 12],
    ['Q', x + 10, y + 24, x, y + 12], ['Z']
  ], color, null, 0);
}

function drawHUD(ctx, game) {
  ctx.save();
  ctx.fillStyle = COLORS.INK;
  ctx.font = '26px "Times New Roman", serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Игра ${game.mode === 'A' ? 'А' : 'Б'}`, 350, 60);
  ctx.font = '15px "Times New Roman", serif';
  ctx.fillText(`ТЕМП ${game.level}`, 380, 90);
  ctx.fillText(`СКИН ${game.skin === 'classic' ? 'СТАРЫЙ' : 'НОВЫЙ'}`, 330, 120);

  const scoreText = String(game.score).padStart(4, '0');
  [...scoreText].forEach((digit, i) => drawDigit(ctx, digit, 630 + i * 46, 30));

  ctx.font = '15px "Times New Roman", serif';
  ctx.fillText(`РЕКОРД ${String(game.record).padStart(4, '0')}`, 630, 110);
  ctx.fillText(`ЛОТКИ ${game.activeLanes().length}`, 630, 140);
  ctx.fillText('ПРОМАХИ', 770, 140);
  for (let i = 0; i < RULES.MAX_MISSES; i += 1) {
    ctx.fillStyle = i < game.misses ? COLORS.INK : COLORS.FAINT;
    ctx.fillRect(770 + i * 22, 150, 15, 10);
  }
  for (let i = 0; i < RULES.MAX_LIVES; i += 1) {
    const color = i < game.lives ? COLORS.INK : COLORS.FAINT;
    drawHeart(ctx, 640 + i * 24, 150, color);
  }

  if (game.messageTimer > 0) {
    ctx.globalAlpha = clamp(game.messageTimer * 2, 0, 1);
    ctx.fillStyle = COLORS.INK;
    ctx.font = 'bold 36px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText(game.message, CANVAS_WIDTH / 2, 380);
  }
  ctx.restore();
}

function renderGame(game) {
  const ctx = game.ctx;
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawBackground(ctx);
  game.hens.forEach((hen) => hen.draw(ctx));
  Object.values(LANES).forEach((lane) => drawChute(ctx, lane));
  game.hare.draw(ctx);
  game.eggs.forEach((egg) => egg.draw(ctx));
  game.wolf.draw(ctx);
  game.splats.forEach((splat) => splat.draw(ctx));
  drawHUD(ctx, game);
}

class Game {
  constructor(ctx, input, sound, ui) {
    this.ctx = ctx;
    this.input = input;
    this.sound = sound;
    this.ui = ui;
    this.state = STATES.MENU;
    this.mode = 'A';
    this.skin = 'new';
    this.record = loadRecord();
    this.lastTimestamp = 0;
    this.hens = LANE_IDS.map((laneId) => new Hen(laneId));
    this.loop = this.loop.bind(this);
    this.reset();
    this.updateUI();
    this.updatePauseButton();
  }

  get difficulty() {
    const tempoIncreases = Math.floor(this.score / RULES.POINTS_PER_LEVEL);
    return 1 - Math.exp(-tempoIncreases / RULES.SPEED_CURVE_SCALE);
  }

  get level() {
    return 1 + Math.floor(this.score / RULES.POINTS_PER_LEVEL);
  }

  get speedMultiplier() {
    return this.mode === 'B' ? RULES.MODE_B_SPEED : 1;
  }

  setSkin(skin) {
    if (skin !== 'classic' && skin !== 'new') return;
    this.skin = skin;
    this.wolf.skin = skin;
    this.ui.skinClassicButton.setAttribute('aria-pressed', String(skin === 'classic'));
    this.ui.skinNewButton.setAttribute('aria-pressed', String(skin === 'new'));
  }

  reset() {
    this.score = 0;
    this.misses = 0;
    this.lives = RULES.MAX_LIVES;
    this.wolf = new Wolf(this.skin);
    this.hare = new Hare(() => this.spawnRottenEgg());
    this.eggs = [];
    this.splats = [];
    this.spawnTimer = RULES.FIRST_EGG_DELAY;
    this.message = '';
    this.messageTimer = 0;
    this.input.resetButtons();
  }

  start(mode = this.mode) {
    this.mode = mode;
    this.sound.ensureContext();
    this.reset();
    this.updateUI();
    this.state = STATES.PLAYING;
    this.hideAllScreens();
    this.updatePauseButton();
  }

  returnToMenu() {
    this.state = STATES.MENU;
    this.reset();
    this.updateUI();
    this.showScreen(STATES.MENU);
    this.updatePauseButton();
  }

  togglePause() {
    if (this.state === STATES.PLAYING) {
      this.state = STATES.PAUSED;
      this.showScreen(STATES.PAUSED);
    } else if (this.state === STATES.PAUSED) {
      this.state = STATES.PLAYING;
      this.hideAllScreens();
    }
    this.input.resetButtons();
    this.updatePauseButton();
  }

  pauseOnFocusLost() {
    if (this.state === STATES.PLAYING) this.togglePause();
  }

  controlWolf(control) {
    if (this.state === STATES.PLAYING) this.wolf.applyControl(control);
  }

  hideAllScreens() {
    Object.values(this.ui.screens).forEach((screen) => {
      screen.hidden = true;
    });
  }

  showScreen(name) {
    this.hideAllScreens();
    this.ui.screens[name].hidden = false;
  }

  updatePauseButton() {
    this.ui.pauseButton.disabled = this.state !== STATES.PLAYING && this.state !== STATES.PAUSED;
    this.ui.pauseButton.setAttribute(
      'aria-label',
      this.state === STATES.PAUSED ? 'Продолжить игру' : 'Поставить игру на паузу'
    );
  }

  updateUI() {
    this.ui.score.textContent = `Счёт: ${this.score}`;
    this.ui.lives.textContent = `Жизни: ${this.lives}`;
    this.ui.misses.textContent = `Промахи: ${this.misses} из ${RULES.MAX_MISSES}`;
    this.ui.record.textContent = `Рекорд: ${this.record}`;
  }

  updateRecord() {
    if (this.score > this.record) {
      this.record = this.score;
      saveRecord(this.record);
    }
  }

  activeLanes() {
    return this.mode === 'A' ? MODE_A_LANE_IDS : LANE_IDS;
  }

  availableLanes() {
    const occupied = new Set(
      this.eggs
        .filter((egg) => egg.active && egg.progress < RULES.LANE_LOCK_PROGRESS)
        .map((egg) => egg.laneId)
    );
    return this.activeLanes().filter((laneId) => !occupied.has(laneId));
  }

  eggDuration() {
    const baseDuration = lerp(RULES.EGG_DURATION_START, RULES.EGG_DURATION_END, this.difficulty);
    return baseDuration * this.speedMultiplier;
  }

  spawnEgg() {
    const available = this.availableLanes();
    if (available.length === 0) return;
    const laneId = randomItem(available);
    const golden = Math.random() < RULES.GOLDEN_EGG_CHANCE;
    this.eggs.push(new Egg(laneId, this.eggDuration(), golden));
  }

  spawnRottenEgg() {
    const duration = this.eggDuration() * RULES.ROTTEN_EGG_DURATION_FACTOR;
    this.eggs.push(new RottenEgg(randomItem(this.activeLanes()), duration));
  }

  catchEgg(egg) {
    const previousLevel = this.level;
    egg.active = false;
    this.score += egg.value;
    if (egg.golden) {
      this.lives = Math.min(RULES.MAX_LIVES, this.lives + 1);
      this.sound.play('golden');
    } else {
      this.sound.play('catch');
    }
    this.updateRecord();
    this.updateUI();
    if (this.level > previousLevel) {
      this.message = `ТЕМП ${this.level}`;
      this.messageTimer = RULES.MESSAGE_DURATION;
      this.sound.play('level');
    }
  }

  addSplat(egg) {
    this.splats.push(new Splat(egg.x, egg.y + 22));
  }

  missEgg(egg) {
    egg.active = false;
    this.misses += 1;
    this.addSplat(egg);
    this.sound.play('miss');
    this.updateUI();
    if (this.misses >= RULES.MAX_MISSES) {
      this.finish(STATES.GAMEOVER, 'Пять яиц упали с лотков и разбились.');
    }
  }

  catchRottenEgg(egg) {
    egg.active = false;
    this.lives -= 1;
    this.sound.play('hit');
    this.updateUI();
    if (this.lives <= 0) {
      this.finish(STATES.GAMEOVER, 'Волк поймал последнее тухлое яйцо Зайца.');
    }
  }

  finish(result, reason = '') {
    this.state = result;
    this.updateUI();
    this.updatePauseButton();
    this.ui.gameoverScore.textContent = this.score;
    this.ui.gameoverReason.textContent = reason;
    this.showScreen(STATES.GAMEOVER);
  }

  update(deltaTime) {
    this.spawnTimer -= deltaTime;
    if (this.spawnTimer <= 0) {
      this.spawnEgg();
      const interval = lerp(RULES.SPAWN_INTERVAL_START, RULES.SPAWN_INTERVAL_END, this.difficulty);
      this.spawnTimer = interval * this.speedMultiplier * randomRange(
        1 - RULES.SPAWN_INTERVAL_JITTER_RATIO,
        1 + RULES.SPAWN_INTERVAL_JITTER_RATIO
      );
    }

    this.hare.update(deltaTime);
    this.eggs.forEach((egg) => egg.update(deltaTime));
    this.eggs.forEach((egg) => {
      if (!egg.active || this.state !== STATES.PLAYING) return;
      if (egg.progress >= RULES.CATCH_PROGRESS && egg.laneId === this.wolf.position) {
        if (egg.rotten) this.catchRottenEgg(egg);
        else this.catchEgg(egg);
      } else if (egg.progress >= 1) {
        if (egg.rotten) {
          egg.active = false;
          this.addSplat(egg);
        } else {
          this.missEgg(egg);
        }
      }
    });

    this.eggs = this.eggs.filter((egg) => egg.active);
    this.splats.forEach((splat) => splat.update(deltaTime));
    this.splats = this.splats.filter((splat) => splat.life > 0);
    this.messageTimer = Math.max(0, this.messageTimer - deltaTime);
  }

  loop(timestamp) {
    const deltaTime = this.lastTimestamp === 0
      ? 0
      : Math.min((timestamp - this.lastTimestamp) / 1000, MAX_FRAME_TIME);
    this.lastTimestamp = timestamp;
    if (this.state === STATES.PLAYING) this.update(deltaTime);
    renderGame(this);
    requestAnimationFrame(this.loop);
  }
}
