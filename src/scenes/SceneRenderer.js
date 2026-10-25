import { CONFIG } from '../config.js';

/**
 * 場景與中央圍牆/籬笆渲染器
 * 左邊：街頭邊 (野貓領地)
 * 中間：家用籬笆或圍牆
 * 右邊：家庭後院 (家狗領地)
 */
export class SceneRenderer {
  constructor() {
    this.windParticles = Array.from({ length: 26 }, () => ({
      x: Math.random() * CONFIG.CANVAS_WIDTH,
      y: 90 + Math.random() * (CONFIG.GROUND_Y - 120),
      size: 3 + Math.random() * 4,
      speedFactor: 0.7 + Math.random() * 0.6,
      wobble: Math.random() * Math.PI * 2,
    }));

    this.clouds = [
      { x: 160, y: 115, scale: 1.0, speed: 0.2 },
      { x: 520, y: 85, scale: 0.85, speed: 0.15 },
      { x: 920, y: 120, scale: 1.1, speed: 0.22 },
    ];
  }

  render(ctx, sceneType, wind, time) {
    const theme = sceneType || 'street';
    if (theme === 'night') {
      this.renderNightTheme(ctx, time);
    } else if (theme === 'park') {
      this.renderParkTheme(ctx, time);
    } else {
      this.renderStreetTheme(ctx, time);
    }

    // 繪製隨風飄動的雲朵 (白天/黃昏)
    if (theme !== 'night') {
      this.renderClouds(ctx, wind, theme);
    }

    // 繪製地面：左邊街頭柏油/石板路，右邊家庭後院草地
    this.renderSplitGround(ctx, theme);

    // 繪製左邊街頭裝飾 (垃圾桶、路燈、街頭塗鴉牌) 與右邊後院裝飾 (狗屋、食盆、花叢)
    this.renderLeftStreetProps(ctx, theme);
    this.renderRightBackyardProps(ctx, theme);

    // 繪製中間家用籬笆或圍牆
    this.renderCenterWall(ctx, theme);

    // 繪製風速視覺粒子 (樹葉/花瓣/微塵隨風飄動)
    this.renderWindParticles(ctx, wind, theme, time);
  }

  renderStreetTheme(ctx) {
    // 晴朗藍天漸層
    const skyGrad = ctx.createLinearGradient(0, 0, 0, CONFIG.GROUND_Y);
    skyGrad.addColorStop(0, '#54a0ff');
    skyGrad.addColorStop(0.65, '#82ccdd');
    skyGrad.addColorStop(1, '#c8d6e5');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.GROUND_Y);

    // 左側遠景：城市街頭公寓剪影
    ctx.fillStyle = '#7f8fa6';
    ctx.fillRect(20, 250, 120, 295);
    ctx.fillRect(145, 290, 110, 255);
    ctx.fillRect(260, 230, 130, 315);
    ctx.fillStyle = '#dcdde1';
    for (let bx = 38; bx < 370; bx += 42) {
      for (let by = 270; by < 480; by += 45) {
        ctx.fillRect(bx, by, 18, 24);
      }
    }

    // 右側遠景：溫馨家庭洋房與後院樹木
    ctx.fillStyle = '#78e08f';
    this.drawCircle(ctx, 730, 440, 75);
    this.drawCircle(ctx, 820, 455, 65);

    // 家庭小屋背景
    ctx.fillStyle = '#f8EFBA';
    ctx.fillRect(960, 310, 210, 235);
    // 屋頂
    ctx.fillStyle = '#eb4d4b';
    ctx.beginPath();
    ctx.moveTo(935, 315);
    ctx.lineTo(1065, 225);
    ctx.lineTo(1195, 315);
    ctx.closePath();
    ctx.fill();
    // 窗戶
    ctx.fillStyle = '#dff9fb';
    ctx.fillRect(1000, 350, 52, 52);
    ctx.strokeStyle = '#c7ecee';
    ctx.lineWidth = 3;
    ctx.strokeRect(1000, 350, 52, 52);
  }

  renderParkTheme(ctx) {
    // 暖陽黃昏花園漸層
    const skyGrad = ctx.createLinearGradient(0, 0, 0, CONFIG.GROUND_Y);
    skyGrad.addColorStop(0, '#f6b93b');
    skyGrad.addColorStop(0.55, '#fad390');
    skyGrad.addColorStop(1, '#f8c291');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.GROUND_Y);

    // 夕陽
    ctx.fillStyle = 'rgba(255, 234, 167, 0.55)';
    this.drawCircle(ctx, 600, 220, 95);

    // 左側歐式街角紅磚建築
    ctx.fillStyle = '#b33939';
    ctx.fillRect(15, 260, 180, 285);
    ctx.fillStyle = '#cd6133';
    ctx.fillRect(205, 300, 155, 245);

    // 右側後院花園樹叢
    ctx.fillStyle = '#38ada9';
    this.drawCircle(ctx, 750, 430, 85);
    this.drawCircle(ctx, 880, 440, 75);
    this.drawCircle(ctx, 1080, 415, 95);
  }

  renderNightTheme(ctx, time) {
    // 霓虹星夜漸層
    const skyGrad = ctx.createLinearGradient(0, 0, 0, CONFIG.GROUND_Y);
    skyGrad.addColorStop(0, '#0c142c');
    skyGrad.addColorStop(0.6, '#1e2749');
    skyGrad.addColorStop(1, '#2f3640');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.GROUND_Y);

    // 閃爍星辰與弦月
    ctx.fillStyle = '#ffeaa7';
    this.drawCircle(ctx, 980, 120, 38);
    ctx.fillStyle = '#0c142c';
    this.drawCircle(ctx, 966, 110, 32);

    for (let i = 0; i < 30; i++) {
      const sx = (i * 137) % CONFIG.CANVAS_WIDTH;
      const sy = 35 + ((i * 79) % 210);
      const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(time * 0.002 + i));
      ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
      ctx.fillRect(sx, sy, 3, 3);
    }

    // 左側夜市街頭大樓與霓虹燈
    ctx.fillStyle = '#192a56';
    ctx.fillRect(25, 220, 140, 325);
    ctx.fillRect(175, 265, 130, 280);
    ctx.strokeStyle = '#ff6b81';
    ctx.lineWidth = 3;
    ctx.strokeRect(55, 280, 80, 36);
    ctx.fillStyle = '#ff6b81';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('FISH BAR', 62, 304);

    // 右側夜間別墅剪影与暖黃窗光
    ctx.fillStyle = '#273c75';
    ctx.fillRect(960, 305, 210, 240);
    ctx.fillStyle = '#fbc531';
    ctx.fillRect(1005, 355, 48, 48);
    ctx.fillRect(1085, 355, 48, 48);
  }

  renderClouds(ctx, wind, theme) {
    ctx.fillStyle = theme === 'park' ? 'rgba(255, 245, 225, 0.7)' : 'rgba(255, 255, 255, 0.8)';
    for (const c of this.clouds) {
      c.x += c.speed + wind * 0.14;
      if (c.x > CONFIG.CANVAS_WIDTH + 120) c.x = -120;
      if (c.x < -120) c.x = CONFIG.CANVAS_WIDTH + 120;

      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(c.scale, c.scale);
      this.drawCircle(ctx, 0, 0, 28);
      this.drawCircle(ctx, 26, -6, 34);
      this.drawCircle(ctx, 56, 0, 26);
      ctx.restore();
    }
  }

  renderSplitGround(ctx, theme) {
    const groundHeight = CONFIG.CANVAS_HEIGHT - CONFIG.GROUND_Y;
    const midX = CONFIG.WALL.x;

    // 左半邊：街頭柏油路與人行道磚
    ctx.fillStyle = theme === 'night' ? '#2f3640' : '#57606f';
    ctx.fillRect(0, CONFIG.GROUND_Y, midX, groundHeight);
    // 人行道邊石條紋
    ctx.fillStyle = '#747d8c';
    ctx.fillRect(0, CONFIG.GROUND_Y, midX, 14);
    ctx.fillStyle = '#a4b0be';
    for (let x = 10; x < midX - 20; x += 60) {
      ctx.fillRect(x, CONFIG.GROUND_Y + 3, 36, 8);
    }

    // 右半邊：家庭後院翠綠草皮與泥土層
    ctx.fillStyle = theme === 'night' ? '#218c74' : '#2ed573';
    ctx.fillRect(midX, CONFIG.GROUND_Y, CONFIG.CANVAS_WIDTH - midX, 18);
    ctx.fillStyle = theme === 'night' ? '#1e272e' : '#7bed9f';
    ctx.fillRect(midX, CONFIG.GROUND_Y + 18, CONFIG.CANVAS_WIDTH - midX, groundHeight - 18);
  }

  renderLeftStreetProps(ctx) {
    const gy = CONFIG.GROUND_Y;

    // 街頭路燈 (x = 420)
    ctx.fillStyle = '#2f3542';
    ctx.fillRect(425, gy - 190, 8, 190);
    ctx.beginPath();
    ctx.arc(429, gy - 190, 18, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 211, 42, 0.85)';
    this.drawCircle(ctx, 429, gy - 184, 9);

    // 街頭鋁製垃圾桶 (x = 72) - 野貓的地盤標誌
    ctx.fillStyle = '#747d8c';
    ctx.fillRect(48, gy - 68, 48, 68);
    ctx.fillStyle = '#57606f';
    ctx.fillRect(44, gy - 75, 56, 9);
    // 垃圾桶條紋
    ctx.strokeStyle = '#2f3542';
    ctx.lineWidth = 2;
    for (let lx = 58; lx <= 86; lx += 14) {
      ctx.beginPath();
      ctx.moveTo(lx, gy - 60);
      ctx.lineTo(lx, gy - 10);
      ctx.stroke();
    }
  }

  renderRightBackyardProps(ctx) {
    const gy = CONFIG.GROUND_Y;

    // 後院溫馨木造狗屋 (x = 1125)
    ctx.fillStyle = '#eccc68';
    ctx.fillRect(1080, gy - 82, 86, 82);
    // 狗屋紅屋頂
    ctx.fillStyle = '#ff4757';
    ctx.beginPath();
    ctx.moveTo(1068, gy - 80);
    ctx.lineTo(1123, gy - 124);
    ctx.lineTo(1178, gy - 80);
    ctx.closePath();
    ctx.fill();
    // 狗屋拱門入口
    ctx.fillStyle = '#2f3542';
    ctx.beginPath();
    ctx.arc(1123, gy - 28, 20, Math.PI, 0);
    ctx.lineTo(1143, gy);
    ctx.lineTo(1103, gy);
    ctx.closePath();
    ctx.fill();

    // 狗食盆 (x = 915)
    ctx.fillStyle = '#ff6348';
    ctx.beginPath();
    ctx.moveTo(895, gy);
    ctx.lineTo(902, gy - 14);
    ctx.lineTo(932, gy - 14);
    ctx.lineTo(939, gy);
    ctx.closePath();
    ctx.fill();
  }

  renderCenterWall(ctx, theme) {
    const { x, width, height } = CONFIG.WALL;
    const left = x - width / 2;
    const top = CONFIG.GROUND_Y - height;

    ctx.save();
    if (theme === 'park') {
      // 紅磚圍牆
      ctx.fillStyle = '#b33939';
      ctx.fillRect(left, top, width, height);
      ctx.strokeStyle = '#f7f1e3';
      ctx.lineWidth = 2;
      for (let rowY = top + 16; rowY < CONFIG.GROUND_Y; rowY += 18) {
        ctx.beginPath();
        ctx.moveTo(left, rowY);
        ctx.lineTo(left + width, rowY);
        ctx.stroke();
      }
      // 牆頂石板
      ctx.fillStyle = '#d1ccc0';
      ctx.fillRect(left - 5, top - 8, width + 10, 10);
    } else if (theme === 'night') {
      // 夜間石柱鐵網圍牆
      ctx.fillStyle = '#485460';
      ctx.fillRect(left, top, width, height);
      ctx.strokeStyle = '#d2dae2';
      ctx.lineWidth = 2;
      ctx.strokeRect(left + 4, top + 6, width - 8, height - 10);
      ctx.fillStyle = '#ffa801';
      this.drawCircle(ctx, x, top - 8, 8);
    } else {
      // 經典家用木籬笆 (Wooden Fence)
      ctx.fillStyle = '#d35400';
      ctx.fillRect(left + 4, top + 28, width - 8, 12);
      ctx.fillRect(left + 4, top + 115, width - 8, 12);

      // 籬笆尖頭木板與柱子
      ctx.fillStyle = '#e67e22';
      ctx.strokeStyle = '#a04000';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(left, CONFIG.GROUND_Y);
      ctx.lineTo(left, top + 20);
      ctx.lineTo(x, top - 4);
      ctx.lineTo(left + width, top + 20);
      ctx.lineTo(left + width, CONFIG.GROUND_Y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 木紋細節與釘子
      ctx.fillStyle = '#7f8c8d';
      this.drawCircle(ctx, x, top + 34, 3.5);
      this.drawCircle(ctx, x, top + 121, 3.5);
    }
    ctx.restore();
  }

  renderWindParticles(ctx, wind, theme, time) {
    const color =
      theme === 'night'
        ? 'rgba(255, 234, 167, 0.55)'
        : theme === 'park'
        ? 'rgba(255, 121, 121, 0.65)'
        : 'rgba(123, 237, 159, 0.72)';

    ctx.fillStyle = color;
    for (const p of this.windParticles) {
      p.x += wind * 1.45 * p.speedFactor;
      p.y += Math.sin(time * 0.004 + p.wobble) * 0.45 + 0.25;

      if (p.x > CONFIG.CANVAS_WIDTH + 20) p.x = -20;
      if (p.x < -20) p.x = CONFIG.CANVAS_WIDTH + 20;
      if (p.y > CONFIG.GROUND_Y - 15) p.y = 95;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(time * 0.003 + p.wobble);
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size * 1.4, p.size * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawCircle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}
