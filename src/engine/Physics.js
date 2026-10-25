import { CONFIG } from '../config.js';

export class PhysicsEngine {
  /**
   * 隨機產生新回合的風力值 (-5.0 ~ +5.0)
   * 正值代表向右吹 (對貓是順風、對狗是逆風)
   * 負值代表向左吹 (對貓是逆風、對狗是順風)
   */
  static generateWind() {
    const raw = (Math.random() * 2 - 1) * CONFIG.PHYSICS.windMaxLevel;
    return Math.round(raw * 10) / 10;
  }

  /**
   * 每回合隨機決定無風下 100% 蓄力落點：位於對手後方 3 ~ 6 個角色寬
   * 回傳 { overshootWidths, maxSpeed }
   */
  static generateTurnMaxPowerSpec(side = 'cat', customOvershootWidths = null) {
    const { overshootCharWidthsMin, overshootCharWidthsMax, gravity, launchAngleDeg } =
      CONFIG.PHYSICS;

    const overshootWidths =
      customOvershootWidths !== null
        ? customOvershootWidths
        : overshootCharWidthsMin +
          Math.random() * (overshootCharWidthsMax - overshootCharWidthsMin);

    const isCat = side === 'cat';
    const attackerCfg = isCat ? CONFIG.CAT : CONFIG.DOG;
    const targetCfg = isCat ? CONFIG.DOG : CONFIG.CAT;

    const startX = attackerCfg.x + attackerCfg.launchOffsetX;
    const baseDistance = Math.abs(targetCfg.x - startX);
    const maxRange = baseDistance + overshootWidths * targetCfg.width;

    const angleRad = (launchAngleDeg * Math.PI) / 180;
    const sin2Theta = Math.sin(2 * angleRad);

    // R = (v^2 * sin(2*theta)) / g  =>  v = sqrt(R * g / sin(2*theta))
    const maxSpeed = Math.sqrt((maxRange * gravity) / sin2Theta);

    return {
      overshootWidths: Math.round(overshootWidths * 100) / 100,
      maxRange,
      maxSpeed,
    };
  }

  /**
   * 由蓄力比例 (0.05 ~ 1.0) 與當前回合 maxSpeed 轉換為初速度純量
   */
  static powerToSpeed(powerRatio, customMaxSpeed = null) {
    const clamped = Math.max(0.05, Math.min(1.0, powerRatio));
    const minSpeed = CONFIG.PHYSICS.minSpeed;
    const maxSpeed = customMaxSpeed || CONFIG.PHYSICS.maxSpeed;
    return minSpeed + clamped * (maxSpeed - minSpeed);
  }

  /**
   * 建立飛行投擲物物件
   */
  static createProjectile(side, powerRatio, activeModifiers = {}, customMaxSpeed = null) {
    const isCat = side === 'cat';
    const charCfg = isCat ? CONFIG.CAT : CONFIG.DOG;
    const startX = charCfg.x + charCfg.launchOffsetX;
    const startY = charCfg.y + charCfg.launchOffsetY;

    const speed = this.powerToSpeed(powerRatio, customMaxSpeed);
    const angleRad = (CONFIG.PHYSICS.launchAngleDeg * Math.PI) / 180;
    const dir = isCat ? 1 : -1;

    let scale = 1.0;
    let baseDamage = CONFIG.BASE_DAMAGE;
    let isGiant = false;
    let isSpecial = false;

    if (activeModifiers.giant) {
      scale *= CONFIG.ITEMS.giant.scaleMultiplier;
      baseDamage = Math.round(baseDamage * CONFIG.ITEMS.giant.damageMultiplier);
      isGiant = true;
    }
    if (activeModifiers.special) {
      scale *= CONFIG.ITEMS.special.scaleMultiplier;
      baseDamage = Math.round(baseDamage * CONFIG.ITEMS.special.damageMultiplier);
      isSpecial = true;
    }

    return {
      side,
      x: startX,
      y: startY,
      vx: dir * speed * Math.cos(angleRad),
      vy: -speed * Math.sin(angleRad),
      radius: 17 * scale,
      scale,
      baseDamage,
      damage: baseDamage,
      isGiant,
      isSpecial,
      rotation: 0,
      rotSpeed: dir * (isSpecial ? 0.28 : 0.22),
      trail: [],
      active: true,
    };
  }

  /**
   * 計算蓄力時的短前導瞄準軌跡點 (僅顯示前 14 幀方向感)
   */
  static getAimPreviewPoints(side, powerRatio, wind, customMaxSpeed = null) {
    const proj = this.createProjectile(side, powerRatio, {}, customMaxSpeed);
    const points = [];
    const windAx = wind * CONFIG.PHYSICS.windAccelFactor;
    let x = proj.x;
    let y = proj.y;
    let vx = proj.vx;
    let vy = proj.vy;

    for (let i = 0; i < 15; i++) {
      if (i % 2 === 0) {
        points.push({ x, y, alpha: 1 - i / 16 });
      }
      vx += windAx;
      vy += CONFIG.PHYSICS.gravity;
      x += vx;
      y += vy;
    }
    return points;
  }

  /**
   * 單步推進投擲物物理並檢測碰撞與部位傷害分級
   * 回傳碰撞結果:
   * null | {
   *   type: 'wall' | 'ground' | 'character' | 'out',
   *   targetSide?: 'cat'|'dog',
   *   x, y,
   *   damage,
   *   hitTier?: 'crit' | 'normal' | 'graze',
   *   isMaxDamage?: boolean,
   *   isSpecial?: boolean,
   *   isGiant?: boolean
   * }
   */
  static stepProjectile(proj, wind) {
    if (!proj || !proj.active) return null;

    // 記錄軌跡殘影
    proj.trail.push({ x: proj.x, y: proj.y, r: proj.radius });
    if (proj.trail.length > 14) {
      proj.trail.shift();
    }

    const windAx = wind * CONFIG.PHYSICS.windAccelFactor;
    proj.vx += windAx;
    proj.vy += CONFIG.PHYSICS.gravity;
    proj.x += proj.vx;
    proj.y += proj.vy;
    proj.rotation += proj.rotSpeed;

    // 1. 檢查中間圍牆/籬笆碰撞
    const wallLeft = CONFIG.WALL.x - CONFIG.WALL.width / 2;
    const wallRight = CONFIG.WALL.x + CONFIG.WALL.width / 2;
    const wallTop = CONFIG.GROUND_Y - CONFIG.WALL.height;

    if (
      proj.x + proj.radius * 0.75 > wallLeft &&
      proj.x - proj.radius * 0.75 < wallRight &&
      proj.y + proj.radius * 0.75 > wallTop
    ) {
      proj.active = false;
      return {
        type: 'wall',
        x: proj.x,
        y: Math.min(proj.y, CONFIG.GROUND_Y - 10),
      };
    }

    // 2. 檢查對手角色命中判定與部位傷害分級 (爆頭核心 crit / 軀幹 normal / 擦邊 graze)
    const targetSide = proj.side === 'cat' ? 'dog' : 'cat';
    const targetCfg = targetSide === 'cat' ? CONFIG.CAT : CONFIG.DOG;

    const charCenterX = targetCfg.x;
    const charCenterY = targetCfg.y - targetCfg.height * 0.5;
    const hitHalfW = targetCfg.width * 0.45 + proj.radius * 0.78;
    const hitHalfH = targetCfg.height * 0.5 + proj.radius * 0.78;

    const dx = Math.abs(proj.x - charCenterX);
    const dy = Math.abs(proj.y - charCenterY);

    if (dx <= hitHalfW && dy <= hitHalfH) {
      proj.active = false;

      // 計算命中部位與精準度分級 (爆頭核心 crit / 軀幹 normal / 外圍擦傷 graze)
      const headLineY = targetCfg.y - targetCfg.height * 0.56;
      const isHeadHit = proj.y <= headLineY && dx <= hitHalfW * 0.58;
      const isCoreDirectHit = dx <= hitHalfW * 0.34 && dy <= hitHalfH * 0.42;
      const isInnerBodyHit = dx <= hitHalfW * 0.65 && dy <= hitHalfH * 0.68;

      let hitTier = 'graze';
      if (isHeadHit || isCoreDirectHit) {
        hitTier = 'crit';
      } else if (isInnerBodyHit) {
        hitTier = 'normal';
      }

      const tierCfg = CONFIG.HIT_TIERS[hitTier];
      const finalDamage = Math.round(proj.baseDamage * tierCfg.multiplier);
      const isMaxDamage = hitTier === 'crit' || proj.isSpecial || proj.isGiant;

      return {
        type: 'character',
        targetSide,
        x: proj.x,
        y: proj.y,
        damage: finalDamage,
        hitTier,
        isMaxDamage,
        isSpecial: proj.isSpecial,
        isGiant: proj.isGiant,
      };
    }

    // 3. 檢查地面或遠處出界碰撞 (允許飛到角色後方 6 個身位外才判定落地)
    if (proj.y + proj.radius * 0.5 >= CONFIG.GROUND_Y) {
      proj.active = false;
      return {
        type: 'ground',
        x: Math.max(24, Math.min(CONFIG.CANVAS_WIDTH - 24, proj.x)),
        y: CONFIG.GROUND_Y,
      };
    }

    if (
      proj.x < -750 ||
      proj.x > CONFIG.CANVAS_WIDTH + 750 ||
      proj.y > CONFIG.CANVAS_HEIGHT + 120
    ) {
      proj.active = false;
      return {
        type: 'out',
        x: Math.max(24, Math.min(CONFIG.CANVAS_WIDTH - 24, proj.x)),
        y: CONFIG.GROUND_Y,
      };
    }

    return null;
  }

  /**
   * 為 AI 計算在指定風力與本回合 maxSpeed 下命中對手核心的理想蓄力比例 (0.05 ~ 1.0)
   */
  static computeIdealPower(side, wind, customMaxSpeed = null) {
    const isCat = side === 'cat';
    const targetX = isCat ? CONFIG.DOG.x : CONFIG.CAT.x;
    const targetY = CONFIG.GROUND_Y - 58;

    let bestPower = 0.65;
    let minDiff = Infinity;

    for (let p = 0.15; p <= 0.99; p += 0.01) {
      const proj = this.createProjectile(side, p, {}, customMaxSpeed);
      const windAx = wind * CONFIG.PHYSICS.windAccelFactor;
      let x = proj.x;
      let y = proj.y;
      let vx = proj.vx;
      let vy = proj.vy;
      let hitWall = false;

      const wallLeft = CONFIG.WALL.x - CONFIG.WALL.width / 2;
      const wallRight = CONFIG.WALL.x + CONFIG.WALL.width / 2;
      const wallTop = CONFIG.GROUND_Y - CONFIG.WALL.height;

      for (let step = 0; step < 220; step++) {
        vx += windAx;
        vy += CONFIG.PHYSICS.gravity;
        x += vx;
        y += vy;

        if (x + 14 > wallLeft && x - 14 < wallRight && y + 14 > wallTop) {
          hitWall = true;
          break;
        }
        if (vy > 0 && y >= targetY) {
          break;
        }
      }

      if (!hitWall) {
        const diff = Math.abs(x - targetX);
        if (diff < minDiff) {
          minDiff = diff;
          bestPower = p;
        }
      }
    }

    return bestPower;
  }
}
