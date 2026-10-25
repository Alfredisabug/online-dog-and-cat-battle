import { CONFIG } from '../config.js';
import { ProjectileRenderer } from './ProjectileRenderer.js';

/**
 * Q版二頭身 (Chibi Style) 貓與狗角色動態向量渲染器
 * 支援：
 * - Q版大頭、水汪汪大眼、粉嫩腮紅、小短手短腿
 * - 無百分比文字之純粹蓄力條
 * - 最大傷害專屬特效：頭上紅腫大包 (Head Bump) 與 3D 環繞眼冒金星 (Spinning Stars)
 */
export class CharacterRenderer {
  static renderCharacter(ctx, side, charState, time) {
    const isCat = side === 'cat';
    const cfg = isCat ? CONFIG.CAT : CONFIG.DOG;

    const {
      hp,
      pose, // 'idle' | 'charging' | 'throwing' | 'hurt' | 'victory' | 'defeat'
      chargePower,
      isCurrentTurn,
      canPlayerHold,
      activeBuffs,
      hurtTimer,
      hasHeadBump,
      dizzyStarsTimer,
    } = charState;

    ctx.save();

    // 1. 若輪到該角色操作，腳下繪製發光光圈與點擊提示
    if (isCurrentTurn && pose !== 'defeat') {
      const pulse = 0.78 + 0.22 * Math.sin(time * 0.008);
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cfg.x, cfg.y - 2, 56 * pulse, 15 * pulse, 0, 0, Math.PI * 2);
      ctx.fillStyle = isCat
        ? 'rgba(255, 107, 107, 0.38)'
        : 'rgba(30, 144, 255, 0.38)';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ffd32a';
      ctx.stroke();
      ctx.restore();

      if (canPlayerHold && pose === 'idle') {
        const floatY = cfg.y - cfg.height - 38 + Math.sin(time * 0.007) * 5;
        this.drawHoldPrompt(ctx, cfg.x, floatY);
      }
    }

    // 2. 計算角色動態位移與旋轉 (Q版彈跳呼吸、蓄力後仰、受擊震動延長、勝利跳躍)
    let offsetX = 0;
    let offsetY = 0;
    let leanAngle = 0;
    let breatheScaleY = 1 + Math.sin(time * 0.006) * 0.032;
    let breatheScaleX = 1 - Math.sin(time * 0.006) * 0.018;

    if (pose === 'charging') {
      const dir = isCat ? -1 : 1;
      leanAngle = dir * chargePower * 0.3;
      breatheScaleY = 1 - chargePower * 0.1;
      breatheScaleX = 1 + chargePower * 0.06;
    } else if (pose === 'throwing') {
      const dir = isCat ? 1 : -1;
      leanAngle = dir * 0.25;
    } else if (pose === 'hurt' || hurtTimer > 0) {
      const intensity = hasHeadBump ? 14 : 9;
      offsetX = Math.sin(time * 0.085) * intensity;
      offsetY = -Math.abs(Math.sin(time * 0.032)) * (hasHeadBump ? 16 : 10);
      leanAngle = (isCat ? -0.18 : 0.18) * Math.sin(time * 0.04);
    } else if (pose === 'victory') {
      offsetY = -Math.abs(Math.sin(time * 0.01)) * 24;
    }

    ctx.translate(cfg.x + offsetX, cfg.y + offsetY);
    ctx.rotate(leanAngle);
    ctx.scale(breatheScaleX, breatheScaleY);

    // 3. 若身上有啟用道具 Buff，繪製鬥氣光環
    if (activeBuffs && (activeBuffs.giant || activeBuffs.special || activeBuffs.double)) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, -54, 60 + Math.sin(time * 0.015) * 4, 0, Math.PI * 2);
      ctx.fillStyle = activeBuffs.special
        ? 'rgba(255, 211, 42, 0.26)'
        : 'rgba(255, 99, 72, 0.24)';
      ctx.fill();
      ctx.restore();
    }

    // 4. 分別繪製 Q版街頭野貓 或 Q版後院家狗
    if (isCat) {
      this.drawChibiCat(ctx, pose, hp, activeBuffs, hasHeadBump, dizzyStarsTimer, time);
    } else {
      this.drawChibiDog(ctx, pose, hp, activeBuffs, hasHeadBump, dizzyStarsTimer, time);
    }

    ctx.restore();

    // 5. 若正在蓄力，於角色上方繪製無百分比之純粹蓄力條 (Power Bar)
    if (pose === 'charging') {
      this.drawChargeMeter(ctx, cfg.x, cfg.y - cfg.height - 28, chargePower);
    }
  }

  /**
   * 繪製左方：Q版二頭身街頭橘虎斑野貓
   */
  static drawChibiCat(ctx, pose, hp, activeBuffs, hasHeadBump, dizzyStarsTimer, time) {
    // 1. Q版翹尾巴
    ctx.save();
    ctx.strokeStyle = '#e67e22';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    const tailWag = Math.sin(time * 0.009) * 11;
    ctx.beginPath();
    ctx.moveTo(-16, -16);
    ctx.quadraticCurveTo(-46, -28 + tailWag, -40, -56 + tailWag);
    ctx.stroke();
    ctx.restore();

    // 2. Q版圓滾滾小身體 (二頭身比例：小身體 + 大圓頭)
    ctx.fillStyle = '#ff9f43';
    ctx.strokeStyle = '#2f3542';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, -27, 25, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 奶油白小肚肚
    ctx.fillStyle = '#ffeaa7';
    ctx.beginPath();
    ctx.ellipse(4, -25, 15, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Q版小短腿與粉紅肉球腳掌
    ctx.fillStyle = '#ff9f43';
    this.drawRoundedFoot(ctx, -11, -4, 11, 7);
    this.drawRoundedFoot(ctx, 11, -4, 11, 7);

    // 3. Q版超大圓潤貓頭
    ctx.save();
    ctx.translate(2, -72);

    // 大大三角形Q版貓耳
    ctx.fillStyle = '#ff9f43';
    ctx.beginPath();
    ctx.moveTo(-28, -8);
    ctx.lineTo(-34, -42);
    ctx.lineTo(-8, -24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(8, -24);
    ctx.lineTo(34, -42);
    ctx.lineTo(28, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 粉嫩內耳
    ctx.fillStyle = '#ff7675';
    ctx.beginPath();
    ctx.moveTo(-24, -12);
    ctx.lineTo(-29, -34);
    ctx.lineTo(-12, -22);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(12, -22);
    ctx.lineTo(29, -34);
    ctx.lineTo(24, -12);
    ctx.closePath();
    ctx.fill();

    // 嬰兒肥大圓臉頰
    ctx.fillStyle = '#ff9f43';
    ctx.beginPath();
    ctx.ellipse(0, 0, 34, 29, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 臉頰兩側白色毛絨與虎斑紋
    ctx.fillStyle = '#ffeaa7';
    ctx.beginPath();
    ctx.ellipse(0, 8, 22, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // 額頭可愛 M 字虎斑紋
    ctx.strokeStyle = '#d35400';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (const tx of [-7, 0, 7]) {
      ctx.beginPath();
      ctx.moveTo(tx, -24);
      ctx.lineTo(tx, -15);
      ctx.stroke();
    }

    // 繪製Q版水汪汪五官表情 (面向右側 dir = 1)
    this.drawChibiFace(ctx, pose, hp, 1, hasHeadBump, true);

    // Q版短鬍鬚
    ctx.strokeStyle = '#2f3542';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(22, 3);
    ctx.lineTo(39, 0);
    ctx.moveTo(22, 8);
    ctx.lineTo(39, 10);
    ctx.moveTo(-20, 3);
    ctx.lineTo(-36, 0);
    ctx.moveTo(-20, 8);
    ctx.lineTo(-36, 10);
    ctx.stroke();

    // 若觸發最大傷害：頭頂繪製誇張紅腫大包！
    if (hasHeadBump) {
      this.drawHeadBump(ctx, -4, -29, time);
    }

    // 若處於眼冒金星狀態：頭頂繪製環繞旋轉金星！
    if (dizzyStarsTimer > 0 || (pose === 'hurt' && hasHeadBump)) {
      this.drawSpinningStars(ctx, 0, -40, time);
    }

    ctx.restore();

    // 4. Q版小圓手與手持魚骨頭
    ctx.save();
    const armAngle = pose === 'charging' ? -0.95 : pose === 'throwing' ? 0.75 : -0.18;
    ctx.translate(10, -34);
    ctx.rotate(armAngle);
    ctx.fillStyle = '#ff9f43';
    ctx.strokeStyle = '#2f3542';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(10, 0, 11, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 粉紅小肉球
    ctx.fillStyle = '#ff7675';
    ctx.beginPath();
    ctx.arc(15, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    if (pose === 'idle' || pose === 'charging') {
      ctx.translate(20, -4);
      const s = activeBuffs?.giant ? 1.35 : 0.88;
      ctx.scale(s, s);
      ProjectileRenderer.drawFishBone(ctx, Boolean(activeBuffs?.special));
    }
    ctx.restore();
  }

  /**
   * 繪製右方：Q版二頭身後院柴犬/家狗
   */
  static drawChibiDog(ctx, pose, hp, activeBuffs, hasHeadBump, dizzyStarsTimer, time) {
    // 1. Q版毛茸茸捲尾巴
    ctx.save();
    ctx.strokeStyle = '#e58e26';
    ctx.lineWidth = 11;
    ctx.lineCap = 'round';
    const tailWag = Math.sin(time * 0.013) * 12;
    ctx.beginPath();
    ctx.moveTo(18, -18);
    ctx.quadraticCurveTo(46, -34 + tailWag, 34, -54 + tailWag);
    ctx.stroke();
    ctx.restore();

    // 2. Q版圓滾滾狗身體
    ctx.fillStyle = '#e58e26';
    ctx.strokeStyle = '#2f3542';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, -28, 27, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 奶油白蓬鬆胸毛
    ctx.fillStyle = '#fff9eb';
    ctx.beginPath();
    ctx.ellipse(-4, -26, 17, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // 紅色Q版鈴鐺項圈
    ctx.fillStyle = '#eb2f06';
    ctx.beginPath();
    ctx.roundRect(-22, -48, 44, 9, 4);
    ctx.fill();
    ctx.stroke();
    // 黃金大鈴鐺
    ctx.fillStyle = '#ffd32a';
    ctx.beginPath();
    ctx.arc(-8, -38, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Q版小短腿
    ctx.fillStyle = '#e58e26';
    this.drawRoundedFoot(ctx, -12, -4, 12, 7.5);
    this.drawRoundedFoot(ctx, 12, -4, 12, 7.5);

    // 3. Q版超大圓潤狗頭
    ctx.save();
    ctx.translate(-2, -74);

    // 後方左垂耳
    ctx.fillStyle = '#b71540';
    ctx.fillStyle = '#9c5618';
    ctx.beginPath();
    ctx.ellipse(-24, -10, 10, 20, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 嬰兒肥大圓狗臉
    ctx.fillStyle = '#e58e26';
    ctx.beginPath();
    ctx.ellipse(0, 0, 35, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 柴犬風白色圓臉頰與白色圓眉點
    ctx.fillStyle = '#fff9eb';
    ctx.beginPath();
    ctx.ellipse(-5, 9, 25, 17, 0, 0, Math.PI * 2);
    ctx.fill();

    // 可愛白色圓豆眉
    ctx.beginPath();
    ctx.ellipse(-14, -14, 5, 3.5, -0.1, 0, Math.PI * 2);
    ctx.ellipse(5, -14, 5, 3.5, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // 前方Q彈大垂耳
    ctx.fillStyle = '#9c5618';
    ctx.beginPath();
    ctx.ellipse(25, 0, 11, 22, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Q版小巧黑鼻頭
    ctx.fillStyle = '#2f3542';
    ctx.beginPath();
    ctx.ellipse(-16, 2, 5.5, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // 繪製Q版水汪汪五官表情 (面向左側 dir = -1)
    this.drawChibiFace(ctx, pose, hp, -1, hasHeadBump, false);

    // 若觸發最大傷害：頭頂繪製誇張紅腫大包！
    if (hasHeadBump) {
      this.drawHeadBump(ctx, 5, -30, time);
    }

    // 若處於眼冒金星狀態：頭頂繪製環繞旋轉金星！
    if (dizzyStarsTimer > 0 || (pose === 'hurt' && hasHeadBump)) {
      this.drawSpinningStars(ctx, 0, -42, time);
    }

    ctx.restore();

    // 4. Q版小圓手與手持肉骨頭
    ctx.save();
    const armAngle = pose === 'charging' ? 0.95 : pose === 'throwing' ? -0.75 : 0.18;
    ctx.translate(-10, -35);
    ctx.rotate(armAngle);
    ctx.fillStyle = '#e58e26';
    ctx.strokeStyle = '#2f3542';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(-10, 0, 11, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (pose === 'idle' || pose === 'charging') {
      ctx.translate(-21, -4);
      const s = activeBuffs?.giant ? 1.35 : 0.88;
      ctx.scale(s, s);
      ProjectileRenderer.drawMeatBone(ctx, Boolean(activeBuffs?.special));
    }
    ctx.restore();
  }

  /**
   * 繪製 Q版大眼睛、粉嫩腮紅與表情
   */
  static drawChibiFace(ctx, pose, hp, facingDir, hasHeadBump, isCat) {
    const eyeCenterX = facingDir * 5;
    const eyeY = -4;
    const leftEyeX = eyeCenterX - 9;
    const rightEyeX = eyeCenterX + 9;

    // 1. 粉嫩Q版腮紅
    ctx.fillStyle = 'rgba(255, 107, 129, 0.45)';
    ctx.beginPath();
    ctx.ellipse(leftEyeX - 7, eyeY + 9, 6.5, 4, 0, 0, Math.PI * 2);
    ctx.ellipse(rightEyeX + 7, eyeY + 9, 6.5, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#2f3542';
    ctx.fillStyle = '#2f3542';
    ctx.lineWidth = 2.6;

    if (pose === 'hurt' || pose === 'defeat') {
      if (hasHeadBump) {
        // 最大傷害被打中：誇張蚊香暈眩眼 (@ _ @)
        this.drawSpiralEye(ctx, leftEyeX, eyeY);
        this.drawSpiralEye(ctx, rightEyeX, eyeY);
      } else {
        // 一般受擊：X _ X 眼
        this.drawXEye(ctx, leftEyeX, eyeY);
        this.drawXEye(ctx, rightEyeX, eyeY);
      }

      // 飆出眼淚珠
      ctx.fillStyle = '#48dbfb';
      ctx.beginPath();
      ctx.arc(leftEyeX - 10, eyeY + 4, 3.5, 0, Math.PI * 2);
      ctx.arc(rightEyeX + 10, eyeY + 4, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // 哇哇大叫嘴型
      ctx.fillStyle = '#eb2f06';
      ctx.beginPath();
      ctx.ellipse(facingDir * 4, 12, 7.5, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (pose === 'charging') {
      // 蓄力認真大眼 + 挑眉
      this.drawShinyEye(ctx, leftEyeX, eyeY, 5.8);
      this.drawShinyEye(ctx, rightEyeX, eyeY, 5.8);

      // 用力V字眉
      ctx.strokeStyle = '#2f3542';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(leftEyeX - 6, eyeY - 9);
      ctx.lineTo(leftEyeX + 5, eyeY - 5);
      ctx.moveTo(rightEyeX + 6, eyeY - 9);
      ctx.lineTo(rightEyeX - 5, eyeY - 5);
      ctx.stroke();

      // 咬牙蓄力嘴
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(facingDir * 4 - 8, 9, 16, 6, 3);
      ctx.fill();
      ctx.stroke();
    } else if (pose === 'victory') {
      // 勝利彎彎笑眼 (^ ^)
      ctx.beginPath();
      ctx.arc(leftEyeX, eyeY, 6, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(rightEyeX, eyeY, 6, Math.PI, 0);
      ctx.stroke();

      // 開心大笑嘴
      ctx.fillStyle = '#ff6b81';
      ctx.beginPath();
      ctx.arc(facingDir * 4, 8, 8, 0, Math.PI);
      ctx.fill();
      ctx.stroke();
    } else {
      // 一般待機：Q版水汪汪雙高光大眼睛
      this.drawShinyEye(ctx, leftEyeX, eyeY, 6.2);
      this.drawShinyEye(ctx, rightEyeX, eyeY, 6.2);

      // 若血量低或頭上有大包，加上生氣眉毛
      if (hp <= 50 || hasHeadBump) {
        ctx.strokeStyle = '#2f3542';
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(leftEyeX - 6, eyeY - 9);
        ctx.lineTo(leftEyeX + 4, eyeY - 5);
        ctx.moveTo(rightEyeX + 6, eyeY - 9);
        ctx.lineTo(rightEyeX - 4, eyeY - 5);
        ctx.stroke();
      }

      // Q版貓咪 ω 嘴 / 狗狗開心小舌頭
      const mouthX = facingDir * 4;
      const mouthY = 9;
      ctx.strokeStyle = '#2f3542';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(mouthX - 3.5, mouthY, 3.5, 0, Math.PI);
      ctx.arc(mouthX + 3.5, mouthY, 3.5, 0, Math.PI);
      ctx.stroke();

      if (!isCat) {
        // 狗狗吐出粉紅小舌頭
        ctx.fillStyle = '#ff6b81';
        ctx.beginPath();
        ctx.arc(mouthX, mouthY + 3.5, 3.2, 0, Math.PI);
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  static drawShinyEye(ctx, x, y, r) {
    ctx.save();
    ctx.fillStyle = '#1e272e';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // 大高光點 + 小高光點 (Q版靈動眼神)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - r * 0.28, y - r * 0.28, r * 0.42, 0, Math.PI * 2);
    ctx.arc(x + r * 0.3, y + r * 0.28, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  static drawSpiralEye(ctx, x, y) {
    ctx.save();
    ctx.strokeStyle = '#2f3542';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 3.5; a += 0.3) {
      const r = a * 0.65;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  static drawXEye(ctx, x, y) {
    ctx.beginPath();
    ctx.moveTo(x - 5, y - 5);
    ctx.lineTo(x + 5, y + 5);
    ctx.moveTo(x + 5, y - 5);
    ctx.lineTo(x - 5, y + 5);
    ctx.stroke();
  }

  /**
   * 繪製最大傷害專屬特效 1：頭頂紅腫大包 (Head Bump)
   */
  static drawHeadBump(ctx, x, y, time) {
    ctx.save();
    const pulse = 1 + Math.sin(time * 0.018) * 0.08;
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);

    // 底層紅腫大圓包
    const grad = ctx.createRadialGradient(-3, -10, 2, 0, -8, 16);
    grad.addColorStop(0, '#ff9ff3');
    grad.addColorStop(0.4, '#ff6b81');
    grad.addColorStop(1, '#eb2f06');

    ctx.fillStyle = grad;
    ctx.strokeStyle = '#b33939';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, -9, 13, Math.PI * 0.9, Math.PI * 2.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 疊加第二顆小腫包 (經典卡通雙層大包)
    ctx.beginPath();
    ctx.arc(2, -20, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 腫包高光與疼痛十字紋
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.beginPath();
    ctx.arc(-2, -22, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(5, -12);
    ctx.lineTo(10, -7);
    ctx.moveTo(10, -12);
    ctx.lineTo(5, -7);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 繪製最大傷害專屬特效 2：頭頂 3D 環繞眼冒金星 (Spinning Stars)
   */
  static drawSpinningStars(ctx, centerX, centerY, time) {
    ctx.save();
    ctx.translate(centerX, centerY);

    // 眩暈橢圓軌跡線
    ctx.strokeStyle = 'rgba(255, 211, 42, 0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.ellipse(0, 0, 34, 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3 顆金色五角星繞頭頂旋轉
    const starCount = 3;
    const baseAngle = time * 0.008;
    for (let i = 0; i < starCount; i++) {
      const angle = baseAngle + (i * Math.PI * 2) / starCount;
      const sx = Math.cos(angle) * 34;
      const sy = Math.sin(angle) * 10;
      const depthScale = 0.75 + 0.3 * ((Math.sin(angle) + 1) / 2);

      this.drawFivePointStar(ctx, sx, sy, 8 * depthScale, '#ffd32a', '#e67e22');
    }

    ctx.restore();
  }

  static drawFivePointStar(ctx, x, y, radius, fill, stroke) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const outerAngle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const innerAngle = outerAngle + Math.PI / 5;
      const ox = Math.cos(outerAngle) * radius;
      const oy = Math.sin(outerAngle) * radius;
      const ix = Math.cos(innerAngle) * (radius * 0.45);
      const iy = Math.sin(innerAngle) * (radius * 0.45);
      if (i === 0) ctx.moveTo(ox, oy);
      else ctx.lineTo(ox, oy);
      ctx.lineTo(ix, iy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  static drawRoundedFoot(ctx, x, y, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  /**
   * 繪製角色頭頂的「按住蓄力」提示氣泡
   */
  static drawHoldPrompt(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = 'rgba(20, 25, 40, 0.9)';
    ctx.strokeStyle = '#ffd32a';
    ctx.lineWidth = 2;

    const w = 134;
    const h = 30;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, 15);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x - 7, y + h / 2);
    ctx.lineTo(x + 7, y + h / 2);
    ctx.lineTo(x, y + h / 2 + 8);
    ctx.closePath();
    ctx.fillStyle = '#ffd32a';
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🖱️ 按住角色集氣', x, y);
    ctx.restore();
  }

  /**
   * 繪製蓄力進度條 (不顯示任何百分比數值，僅呈現能量槽與刻度線)
   */
  static drawChargeMeter(ctx, x, y, power) {
    const barW = 118;
    const barH = 18;
    const left = x - barW / 2;

    ctx.save();
    // 背景外框
    ctx.fillStyle = 'rgba(15, 20, 32, 0.92)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(left, y, barW, barH, 9);
    ctx.fill();
    ctx.stroke();

    // 漸層進度填充
    const grad = ctx.createLinearGradient(left, y, left + barW, y);
    grad.addColorStop(0, '#2ed573');
    grad.addColorStop(0.55, '#ffa502');
    grad.addColorStop(1, '#ff4757');

    const fillW = Math.max(6, (barW - 4) * power);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(left + 2, y + 2, fillW, barH - 4, 7);
    ctx.fill();

    // 內部裝飾刻度參考線 (25%, 50%, 75%)，無任何百分比文字
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.5;
    for (const mark of [0.25, 0.5, 0.75]) {
      const mx = left + barW * mark;
      ctx.beginPath();
      ctx.moveTo(mx, y + 2);
      ctx.lineTo(mx, y + barH - 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}
