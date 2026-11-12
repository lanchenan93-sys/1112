// 宣告全域變數，用來存放待機 (stop)、走路 (walk)、施法 (magic) 與特效 (effect) 的圖片精靈
let stopSheet;
let walkSheet;
let magicSheet;
let effectSheet;

// 設定待機圖片精靈的參數（11 張，總寬 1447，高 171）
const stopTotalFrames = 11;
const stopSheetWidth = 1447;
const stopSheetHeight = 171;
const stopFrameWidth = stopSheetWidth / stopTotalFrames;
const stopFrameHeight = stopSheetHeight;

// 設定走路圖片精靈的參數（8 張，總寬 1019，高 195）
const walkTotalFrames = 8;
const walkSheetWidth = 1019;
const walkSheetHeight = 195;
const walkFrameWidth = walkSheetWidth / walkTotalFrames;
const walkFrameHeight = walkSheetHeight;

// 設定施法圖片精靈的參數（9 張，總寬 1867，高 185）
const magicTotalFrames = 9;
const magicSheetWidth = 1867;
const magicSheetHeight = 185;
const magicFrameWidth = magicSheetWidth / magicTotalFrames;
const magicFrameHeight = magicSheetHeight;

// 設定特效圖片精靈的參數（10 張，總寬 2485，高 208）
const effectTotalFrames = 10;
const effectSheetWidth = 2485;
const effectSheetHeight = 208;
const effectFrameWidth = effectSheetWidth / effectTotalFrames;
const effectFrameHeight = effectSheetHeight;

// 宣告角色狀態變數
let charX;                 // 角色的 X 軸中心座標
let facing = 1;            // 角色面向方向：1 代表朝右，-1 代表朝左
let isWalking = false;     // 記錄目前是否正在按住方向鍵走路
let isCasting = false;     // 記錄目前是否正在播放施法動畫（空白鍵觸發）
let moveSpeed = 5;         // 角色每次更新的水平移動速度（像素）

// 宣告角色跳躍與物理重力變數（上方向鍵觸發）
let isJumping = false;     // 記錄目前是否正在空中跳躍
let jumpOffsetY = 0;       // 角色相對於地面的垂直位移量（負值代表往上跳離地面）
let velocityY = 0;         // 角色目前的垂直速度
const jumpStrength = -18;  // 按下上鍵時的瞬間起跳初速度（負值往上，數值越小跳越高）
const gravity = 0.9;       // 重力加速度（正值往下拉回地面）

// 設定角色動畫播放變數
let currentFrame = 0;      // 目前播放到的第幾張影格
const animFPS = 10;        // 動畫播放速度（每秒更新幾幀）

// 宣告飛行特效陣列（可支援同時存在多個發射出去的魔法特效）
let effects = [];
const effectSpeed = 10;    // 特效往左或往右飛行的移動速度（像素）
const effectAnimFPS = 12;  // 特效圖片精靈本身的動畫播放速度

// 宣告像素雲朵陣列
let clouds = [];

// preload() 會在 setup() 之前執行，預先載入所有圖片資源
function preload() {
  // 載入待機圖片精靈
  stopSheet = loadImage('1/stop/stop.png');
  // 載入走路圖片精靈
  walkSheet = loadImage('1/walk/walk.png');
  // 載入施法圖片精靈
  magicSheet = loadImage('1/magic/magic.png');
  // 載入魔法特效圖片精靈
  effectSheet = loadImage('1/effect/effect.png');
}

// setup() 在程式開始時執行一次，初始化畫布、雲朵與角色位置
function setup() {
  // 建立全螢幕畫布
  createCanvas(windowWidth, windowHeight);

  // 關閉平滑抗鋸齒，保持銳利的像素邊緣
  noSmooth();

  // 設定圖片繪製基準點為中心點
  imageMode(CENTER);

  // 設定角色初始 X 軸位置在整個畫布寬度的 2/3 處
  charX = width * (2 / 3);

  // 初始化 4 朵不同高度與速度的像素雲朵
  clouds = [
    { x: width * 0.15, y: height * 0.16, speed: 0.3, scale: 1.0 },
    { x: width * 0.45, y: height * 0.10, speed: 0.2, scale: 0.8 },
    { x: width * 0.72, y: height * 0.22, speed: 0.4, scale: 1.2 },
    { x: width * 0.90, y: height * 0.14, speed: 0.25, scale: 0.9 }
  ];
}

// keyPressed() 會在每次按下鍵盤按鍵的瞬間觸發一次
function keyPressed() {
  // 1. 判斷是否按下空白鍵，且目前沒有正在施法
  if ((key === ' ' || keyCode === 32) && !isCasting) {
    // 進入施法狀態
    isCasting = true;
    isWalking = false;
    // 將影格重設為 0，確保施法動畫從第 1 張開始完整播放一次
    currentFrame = 0;
  }

  // 2. 判斷是否按下鍵盤「上方向鍵 (UP_ARROW)」，且角色目前在地面上（非跳躍中）
  if (keyCode === UP_ARROW && !isJumping) {
    // 進入跳躍狀態，給予向上的起跳初速度
    isJumping = true;
    velocityY = jumpStrength;
  }
}

// draw() 會不斷重複執行，處理狀態切換、跳躍物理、動畫更新與畫面繪製
function draw() {
  // 1. 繪製像素風天空與草地背景
  drawPixelBackground();

  // 2. 依據目前狀態決定要使用哪一組圖片精靈的參數
  let activeSheet;
  let totalFrames;
  let frameW;
  let frameH;

  if (isCasting) {
    // 施法狀態優先權最高：鎖定使用 magic.png，直到 9 張全部播完
    activeSheet = magicSheet;
    totalFrames = magicTotalFrames;
    frameW = magicFrameWidth;
    frameH = magicFrameHeight;
  } else if (keyIsDown(RIGHT_ARROW)) {
    // 按住右鍵：切換為走路狀態並面向右邊 (1)
    isWalking = true;
    facing = 1;
    activeSheet = walkSheet;
    totalFrames = walkTotalFrames;
    frameW = walkFrameWidth;
    frameH = walkFrameHeight;
  } else if (keyIsDown(LEFT_ARROW)) {
    // 按住左鍵：切換為走路狀態並面向左邊 (-1)
    isWalking = true;
    facing = -1;
    activeSheet = walkSheet;
    totalFrames = walkTotalFrames;
    frameW = walkFrameWidth;
    frameH = walkFrameHeight;
  } else {
    // 沒有按鍵且非施法狀態：回復為待機狀態
    isWalking = false;
    activeSheet = stopSheet;
    totalFrames = stopTotalFrames;
    frameW = stopFrameWidth;
    frameH = stopFrameHeight;
  }

  // 3. 計算角色在目前畫布上的顯示高度與等比例寬度（高度為畫布的 1/3）
  let displayHeight = height / 3;
  let scaleRatio = displayHeight / frameH;
  let displayWidth = frameW * scaleRatio;

  // 4. 處理角色左右移動與畫布邊界限制（跳躍時在空中也可左右移動）
  let halfWidth = displayWidth / 2;

  if (isWalking && !isCasting) {
    charX += moveSpeed * facing;
  }
  // 限制角色不超出畫布最左端與最右端
  charX = constrain(charX, halfWidth, width - halfWidth);

  // 5. 處理角色向上彈跳與重力落地的垂直位移計算
  if (isJumping) {
    // 將目前的垂直速度累加到垂直位移量（負值代表往上飛）
    jumpOffsetY += velocityY;
    // 每一幀都加上重力加速度，使上升速度逐漸變慢並轉為向下掉落
    velocityY += gravity;

    // 判斷是否已經落回地面（jumpOffsetY 回到 0 或大於 0）
    if (jumpOffsetY >= 0) {
      // 精準貼齊地面，結束跳躍狀態並歸零垂直速度
      jumpOffsetY = 0;
      velocityY = 0;
      isJumping = false;
    }
  }

  // 計算角色中心點的 Y 軸位置：地面基準位置 + 跳躍垂直位移量 (jumpOffsetY)
  let groundCharY = height - (displayHeight / 2);
  let charY = groundCharY + jumpOffsetY;

  // 6. 更新角色動畫影格索引
  if (isCasting) {
    // 施法動畫只播放一次：依照幀率推進影格
    if (frameCount % Math.round(60 / animFPS) === 0) {
      currentFrame++;
      // 當第 9 張（索引 8）播放完畢，currentFrame 達到 totalFrames (9) 時
      if (currentFrame >= totalFrames) {
        // 結束施法狀態，並將影格歸零準備回到待機或走路
        isCasting = false;
        currentFrame = 0;

        // 施法完成瞬間，依據角色面向與當下高度產生一個飛行特效物件
        spawnEffect(charX, charY, displayWidth, displayHeight, facing);
      }
    }
  } else {
    // 一般待機或走路動畫：循環播放（跳躍落地後會自然延續原本的動作）
    currentFrame = currentFrame % totalFrames;
    if (frameCount % Math.round(60 / animFPS) === 0) {
      currentFrame = (currentFrame + 1) % totalFrames;
    }
  }

  // 安全防護：確保索引絕對不會超出總張數範圍
  let safeFrame = constrain(currentFrame, 0, totalFrames - 1);
  let sourceX = safeFrame * frameW;

  // 7. 繪製角色（包含左右轉向翻轉處理）
  push();
  translate(charX, charY);
  scale(facing, 1);
  image(
    activeSheet,
    0,
    0,
    displayWidth,
    displayHeight,
    sourceX,
    0,
    frameW,
    frameH
  );
  pop();

  // 8. 更新並繪製所有飛行中的魔法特效
  updateAndDrawEffects();
}

// 產生新魔法特效的函式（在施法動畫播完最後一張時呼叫）
function spawnEffect(originX, originY, charDispW, charDispH, dir) {
  // 依照特效原圖比例與角色高度做適當縮放，讓特效大小與角色協調
  let effectDispHeight = charDispH * 0.85;
  let effectScale = effectDispHeight / effectFrameHeight;
  let effectDispWidth = effectFrameWidth * effectScale;

  // 設定特效起始 X 座標：從角色前方（面向方向）產生
  let startX = originX + dir * (charDispW * 0.4);

  // 將新特效加入陣列管理
  effects.push({
    x: startX,
    y: originY,
    dir: dir,                    // 飛行方向：1 往右，-1 往左
    width: effectDispWidth,
    height: effectDispHeight,
    frame: 0                     // 特效自身的動畫影格索引 (0 ~ 9)
  });
}

// 更新所有飛行特效的位置、播放特效動畫，並在超出邊界時移除
function updateAndDrawEffects() {
  for (let i = effects.length - 1; i >= 0; i--) {
    let eff = effects[i];

    // 依照方向往右 (+effectSpeed) 或往左 (-effectSpeed) 移動
    eff.x += effectSpeed * eff.dir;

    // 循環播放特效自身的 10 張圖片精靈動畫
    if (frameCount % Math.round(60 / effectAnimFPS) === 0) {
      eff.frame = (eff.frame + 1) % effectTotalFrames;
    }

    // 計算特效在 effect.png 中的裁切 X 起點
    let effSourceX = eff.frame * effectFrameWidth;

    // 繪製特效（若角色面向左邊 dir === -1，特效圖案也同步水平翻轉朝左）
    push();
    translate(eff.x, eff.y);
    scale(eff.dir, 1);
    image(
      effectSheet,
      0,
      0,
      eff.width,
      eff.height,
      effSourceX,
      0,
      effectFrameWidth,
      effectFrameHeight
    );
    pop();

    // 判斷邊界消失條件：超出畫布最右端或最左端時移除
    let halfEffW = eff.width / 2;
    if (
      (eff.dir === 1 && eff.x - halfEffW > width) ||
      (eff.dir === 1 && eff.x + halfEffW < 0)
    ) {
      effects.splice(i, 1);
    }
  }
}

// 繪製自適應像素風天空與草地的專屬函式
function drawPixelBackground() {
  noStroke();
  let px = max(4, Math.floor(width / 220));
  let groundHeight = Math.floor((height * 0.18) / px) * px;
  let horizonY = height - groundHeight;

  // 分層像素天空
  let skyColors = [
    color(92, 168, 255),
    color(118, 186, 255),
    color(148, 206, 255),
    color(184, 226, 255)
  ];
  let bandHeight = horizonY / skyColors.length;
  for (let i = 0; i < skyColors.length; i++) {
    fill(skyColors[i]);
    rect(0, i * bandHeight, width, bandHeight + 1);
  }

  // 右上角像素太陽
  let sunSize = px * 10;
  let sunX = width * 0.85;
  let sunY = height * 0.15;
  fill(255, 245, 160, 150);
  rect(sunX - sunSize * 0.7, sunY - sunSize * 0.7, sunSize * 1.4, sunSize * 1.4);
  fill(255, 230, 80);
  rect(sunX - sunSize * 0.5, sunY - sunSize * 0.3, sunSize, sunSize * 0.6);
  rect(sunX - sunSize * 0.3, sunY - sunSize * 0.5, sunSize * 0.6, sunSize);

  // 緩慢飄動的像素雲朵
  for (let c of clouds) {
    c.x += c.speed;
    if (c.x > width + px * 25) {
      c.x = -px * 25;
    }
    drawPixelCloud(c.x, c.y, px * c.scale);
  }

  // 遠景像素山丘
  fill(120, 195, 130);
  for (let x = 0; x < width; x += px * 4) {
    let hillOffset = Math.floor((Math.sin(x * 0.004) + 1) * 6) * px;
    rect(x, horizonY - hillOffset, px * 4, hillOffset);
  }

  // 底部像素草地
  fill(86, 176, 76);
  rect(0, horizonY, width, groundHeight);
  fill(134, 214, 92);
  rect(0, horizonY, width, px * 3);

  for (let x = 0; x < width; x += px * 2) {
    if ((x / (px * 2)) % 2 === 0) {
      rect(x, horizonY + px * 3, px, px);
    }
  }

  for (let x = px * 8; x < width; x += px * 28) {
    let flowerY = horizonY + px * 6;
    fill(58, 138, 56);
    rect(x, flowerY, px, px * 2);
    fill((x % 56 === 0) ? color(255, 110, 110) : color(255, 250, 220));
    rect(x - px, flowerY - px, px * 3, px);
    rect(x, flowerY - px * 2, px, px * 3);
  }
}

// 繪製單朵像素雲朵的輔助函式
function drawPixelCloud(cx, cy, unit) {
  fill(220, 238, 255);
  rect(cx - unit * 6, cy + unit, unit * 14, unit * 2);
  fill(255, 255, 255);
  rect(cx - unit * 7, cy - unit, unit * 16, unit * 2);
  rect(cx - unit * 5, cy - unit * 3, unit * 11, unit * 2);
  rect(cx - unit * 3, cy - unit * 5, unit * 6, unit * 2);
}

// windowResized() 會在視窗尺寸改變時觸發，自動調整畫布並維持比例位置
function windowResized() {
  let ratioX = charX / width;
  resizeCanvas(windowWidth, windowHeight);
  noSmooth();
  charX = width * ratioX;
}