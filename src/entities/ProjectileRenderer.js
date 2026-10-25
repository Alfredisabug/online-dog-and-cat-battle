/**
 * 投擲物渲染器
 * 貓：丟魚骨頭 (一般魚骨 / 加大2倍魚骨 / 黃金霸王旗魚骨)
 * 狗：丟肉骨頭 (一般肉骨 / 加大2倍肉骨 / 皇家巨型金肉骨)
 */
export class ProjectileRenderer {
  static render(ctx, proj) {
    if (!proj || !proj.active) return;

    // 1. 繪製飛行殘影軌跡
    for (let i = 0; i < proj.trail.length; i++) {
      const t = proj.trail[i];
      const ratio = (i + 1) / proj.trail.length;
      ctx.save();
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r * 0.45 * ratio, 0, Math.PI * 2);
      if (proj.isSpecial) {
        ctx.fillStyle = `rgba(255, 211, 42, ${ratio * 0.55})`;
      } else if (proj.isGiant) {
        ctx.fillStyle = `rgba(255, 99, 72, ${ratio * 0.5})`;
      } else {
        ctx.fillStyle = `rgba(255, 255, 255, ${ratio * 0.38})`;
      }
      ctx.fill();
      ctx.restore();
    }

    // 2. 繪製投擲物本體
    ctx.save();
    ctx.translate(proj.x, proj.y);
    ctx.rotate(proj.rotation);
    ctx.scale(proj.scale, proj.scale);

    // 若有加大傷害或特級武器，外圍加上能量光暈
    if (proj.isSpecial || proj.isGiant) {
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.fillStyle = proj.isSpecial
        ? 'rgba(255, 215, 0, 0.32)'
        : 'rgba(255, 71, 87, 0.26)';
      ctx.fill();
    }

    if (proj.side === 'cat') {
      this.drawFishBone(ctx, proj.isSpecial);
    } else {
      this.drawMeatBone(ctx, proj.isSpecial);
    }

    ctx.restore();
  }

  /**
   * 繪製貓咪的魚骨頭 (Fish Bone)
   */
  static drawFishBone(ctx, isSpecial = false) {
    const mainColor = isSpecial ? '#ffd32a' : '#f5f6fa';
    const strokeColor = isSpecial ? '#b33939' : '#2f3640';

    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = mainColor;
    ctx.lineWidth = 2.4;

    // 魚脊椎中軸
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(14, 0);
    ctx.stroke();

    // 魚刺肋骨 (3 根弧形刺)
    for (const rx of [-7, 0, 7]) {
      ctx.beginPath();
      ctx.moveTo(rx, -11);
      ctx.quadraticCurveTo(rx + 2, 0, rx, 11);
      ctx.stroke();
    }

    // 右端：魚頭三角形
    ctx.beginPath();
    ctx.moveTo(11, -11);
    ctx.lineTo(24, 0);
    ctx.lineTo(11, 11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 魚眼孔
    ctx.fillStyle = strokeColor;
    ctx.beginPath();
    ctx.arc(16, -2, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // 左端：魚尾分叉
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.moveTo(-15, 0);
    ctx.lineTo(-24, -10);
    ctx.lineTo(-21, 0);
    ctx.lineTo(-24, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  /**
   * 繪製狗狗的一般肉骨頭 / 黃金巨型骨頭 (Meat Bone)
   */
  static drawMeatBone(ctx, isSpecial = false) {
    const mainColor = isSpecial ? '#ffd32a' : '#ffffff';
    const strokeColor = isSpecial ? '#c23616' : '#2f3640';

    ctx.fillStyle = mainColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.4;

    // 兩端骨節 (4 顆圓球)
    const knobs = [
      [-15, -6],
      [-15, 6],
      [15, -6],
      [15, 6],
    ];
    for (const [kx, ky] of knobs) {
      ctx.beginPath();
      ctx.arc(kx, ky, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // 中央骨幹覆蓋連接
    ctx.fillRect(-15, -5, 30, 10);
    ctx.beginPath();
    ctx.moveTo(-13, -5);
    ctx.lineTo(13, -5);
    ctx.moveTo(-13, 5);
    ctx.lineTo(13, 5);
    ctx.stroke();

    // 若是特級武器，中央加上紅寶石護環
    if (isSpecial) {
      ctx.fillStyle = '#eb2f06';
      ctx.fillRect(-4, -5.5, 8, 11);
      ctx.strokeRect(-4, -5.5, 8, 11);
    }
  }
}
