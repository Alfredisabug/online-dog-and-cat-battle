import { CONFIG } from '../config.js';

/**
 * 戰鬥頂部 HUD (血量條、純圖像無數值風向儀、回合橫幅) 渲染器
 */
export class HUDRenderer {
  static render(ctx, hudData, time) {
    const {
      catHp,
      dogHp,
      catLabel,
      dogLabel,
      catBuffs,
      dogBuffs,
      wind,
      currentTurn,
      turnNumber,
      extraThrowsLeft,
    } = hudData;

    // 1. 左上：街頭野貓血量面板
    this.drawHealthPanel(ctx, {
      x: 24,
      y: 18,
      width: 345,
      hp: catHp,
      maxHp: CONFIG.MAX_HP,
      name: `🐱 ${CONFIG.CAT.name}`,
      subLabel: catLabel,
      isActive: currentTurn === 'cat',
      align: 'left',
      buffs: catBuffs,
    });

    // 2. 右上：後院家狗血量面板
    this.drawHealthPanel(ctx, {
      x: CONFIG.CANVAS_WIDTH - 24 - 345,
      y: 18,
      width: 345,
      hp: dogHp,
      maxHp: CONFIG.MAX_HP,
      name: `🐶 ${CONFIG.DOG.name}`,
      subLabel: dogLabel,
      isActive: currentTurn === 'dog',
      align: 'right',
      buffs: dogBuffs,
    });

    // 3. 正中：無數值純圖像風向儀與當前回合指示器
    this.drawWindAndTurnBox(ctx, {
      wind,
      currentTurn,
      turnNumber,
      extraThrowsLeft,
      time,
    });
  }

  static drawHealthPanel(ctx, opts) {
    const { x, y, width, hp, maxHp, name, subLabel, isActive, align, buffs } = opts;
    const height = 66;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 20, 34, 0.85)';
    ctx.strokeStyle = isActive ? '#ffd32a' : 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = isActive ? 3 : 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 14);
    ctx.fill();
    ctx.stroke();

    // 角色名稱與玩家標籤
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = align === 'left' ? 'left' : 'right';
    const textX = align === 'left' ? x + 16 : x + width - 16;
    ctx.fillText(`${name} (${subLabel})`, textX, y + 24);

    // HP 數字顯示
    const hpClamped = Math.max(0, Math.round(hp));
    ctx.fillStyle = hpClamped <= 30 ? '#ff4757' : '#ffd32a';
    ctx.font = '900 15px sans-serif';
    ctx.textAlign = align === 'left' ? 'right' : 'left';
    const numX = align === 'left' ? x + width - 16 : x + 16;
    ctx.fillText(`HP ${hpClamped}/${maxHp}`, numX, y + 24);

    // 血條背景槽
    const barX = x + 14;
    const barY = y + 34;
    const barW = width - 28;
    const barH = 18;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 9);
    ctx.fill();

    // 血條填充
    const ratio = Math.max(0, Math.min(1, hp / maxHp));
    if (ratio > 0) {
      const fillW = Math.max(8, barW * ratio);
      const fillX = align === 'left' ? barX : barX + (barW - fillW);
      const hpColor =
        ratio > 0.5 ? '#2ed573' : ratio > 0.25 ? '#ffa502' : '#ff4757';
      ctx.fillStyle = hpColor;
      ctx.beginPath();
      ctx.roundRect(fillX, barY, fillW, barH, 9);
      ctx.fill();
    }

    // 當前啟用的道具 Buff 標籤
    const activeTags = [];
    if (buffs?.giant) activeTags.push('💣加大傷害');
    if (buffs?.double) activeTags.push('⚡連丟2次');
    if (buffs?.special) activeTags.push('🌟特級武器');

    if (activeTags.length > 0) {
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = align === 'left' ? 'left' : 'right';
      ctx.fillStyle = '#ffd32a';
      ctx.fillText(`啟用中: ${activeTags.join(' + ')}`, textX, y + height + 18);
    }

    ctx.restore();
  }

  /**
   * 繪製頂部中央回合與純視覺風向計 (不顯示任何風力數值)
   */
  static drawWindAndTurnBox(ctx, { wind, currentTurn, turnNumber, extraThrowsLeft, time }) {
    const boxW = 350;
    const boxH = 68;
    const x = (CONFIG.CANVAS_WIDTH - boxW) / 2;
    const y = 16;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 20, 34, 0.88)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, boxW, boxH, 16);
    ctx.fill();
    ctx.stroke();

    // 第 1 行：回合資訊
    const turnName = currentTurn === 'cat' ? '🐱 街頭野貓回合' : '🐶 後院家狗回合';
    const comboTag = extraThrowsLeft > 0 ? ' (⚡連丟準備)' : '';
    ctx.fillStyle = currentTurn === 'cat' ? '#ff9f43' : '#48dbfb';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`第 ${turnNumber} 回合 ‧ ${turnName}${comboTag}`, CONFIG.CANVAS_WIDTH / 2, y + 23);

    // 第 2 行：純視覺風向槽與動態方向箭頭 (無數值)
    const absWind = Math.abs(wind);
    const centerBarX = CONFIG.CANVAS_WIDTH / 2;
    const barY = y + 46;
    const halfMaxW = 112;

    // 左右方向圖示
    ctx.fillStyle = wind < -0.15 ? '#ffd32a' : 'rgba(255, 255, 255, 0.3)';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('◀ WIND', centerBarX - halfMaxW - 8, barY + 5);

    ctx.fillStyle = wind > 0.15 ? '#ffd32a' : 'rgba(255, 255, 255, 0.3)';
    ctx.textAlign = 'left';
    ctx.fillText('WIND ▶', centerBarX + halfMaxW + 8, barY + 5);

    // 風力刻度背景槽
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.beginPath();
    ctx.roundRect(centerBarX - halfMaxW, barY - 7, halfMaxW * 2, 14, 7);
    ctx.fill();

    // 風力指示條與流動波紋 (不顯示數值)
    if (absWind >= 0.1) {
      const ratio = Math.min(1, absWind / CONFIG.PHYSICS.windMaxLevel);
      const fillLen = Math.max(8, ratio * halfMaxW);
      const isRight = wind > 0;

      const grad = ctx.createLinearGradient(
        centerBarX,
        barY,
        isRight ? centerBarX + halfMaxW : centerBarX - halfMaxW,
        barY
      );
      grad.addColorStop(0, '#1dd1a1');
      grad.addColorStop(0.6, '#feca57');
      grad.addColorStop(1, '#ff6b6b');

      ctx.fillStyle = grad;
      ctx.beginPath();
      if (isRight) {
        ctx.roundRect(centerBarX, barY - 6, fillLen, 12, 6);
      } else {
        ctx.roundRect(centerBarX - fillLen, barY - 6, fillLen, 12, 6);
      }
      ctx.fill();

      // 動態箭頭指示風的流動方向
      const arrowOffset = ((time * 0.03) % 14) * (isRight ? 1 : -1);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      const arrowX = isRight
        ? centerBarX + Math.min(fillLen - 8, halfMaxW * 0.5) + arrowOffset * 0.4
        : centerBarX - Math.min(fillLen - 8, halfMaxW * 0.5) + arrowOffset * 0.4;
      if (fillLen > 22) {
        ctx.fillText(isRight ? '»' : '«', arrowX, barY + 4);
      }
    }

    // 中心基準線
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(centerBarX, barY - 10);
    ctx.lineTo(centerBarX, barY + 10);
    ctx.stroke();

    ctx.restore();
  }
}
