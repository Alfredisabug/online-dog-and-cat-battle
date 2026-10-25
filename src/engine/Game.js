import { CONFIG } from '../config.js';
import { PhysicsEngine } from './Physics.js';
import { SceneRenderer } from '../scenes/SceneRenderer.js';
import { CharacterRenderer } from '../entities/CharacterRenderer.js';
import { ProjectileRenderer } from '../entities/ProjectileRenderer.js';
import { HUDRenderer } from '../ui/HUDRenderer.js';

export class Game {
  constructor(canvas, sound, callbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sound = sound;
    this.callbacks = callbacks; // { onUpdateUI, onGameOver }

    this.sceneRenderer = new SceneRenderer();

    // 對戰設定
    this.settings = {
      mode: '1p',          // '1p' | '2p'
      playerRole: 'cat',   // 1p 模式下玩家扮演 'cat' 或 'dog'
      difficulty: 'normal',// 'easy' | 'normal' | 'hard'
      scene: 'street',     // 'street' | 'park' | 'night' | 'random'
    };

    this.actualScene = 'street';
    this.state = 'MENU';   // 'MENU' | 'BATTLE' | 'GAMEOVER'
    this.phase = 'WAIT_INPUT'; // 'WAIT_INPUT' | 'CHARGING' | 'FLYING' | 'TRANSITION'

    this.wind = 0;
    this.turnMaxSpeed = CONFIG.PHYSICS.maxSpeed;
    this.turnOvershootWidths = 4.5;

    this.turnNumber = 1;
    this.currentTurn = 'cat'; // 'cat' | 'dog'
    this.extraThrowsLeft = 0;

    this.chargePower = 0.06;
    this.savedChargePower = 0.5;
    this.chargeDir = 1;

    this.projectile = null;
    this.particles = [];
    this.floatingTexts = [];

    this.aiTimer = null;
    this.aiTargetPower = 0.6;
    this.isAiCharging = false;

    this.resetCombatants();
    this.bindCanvasInput();

    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  resetCombatants() {
    this.fighters = {
      cat: {
        hp: CONFIG.MAX_HP,
        pose: 'idle',
        hurtTimer: 0,
        hasHeadBump: false,
        dizzyStarsTimer: 0,
        usedItems: { heal: false, giant: false, double: false, special: false },
        activeBuffs: { giant: false, double: false, special: false },
        shots: 0,
        hits: 0,
      },
      dog: {
        hp: CONFIG.MAX_HP,
        pose: 'idle',
        hurtTimer: 0,
        hasHeadBump: false,
        dizzyStarsTimer: 0,
        usedItems: { heal: false, giant: false, double: false, special: false },
        activeBuffs: { giant: false, double: false, special: false },
        shots: 0,
        hits: 0,
      },
    };
  }

  /**
   * 啟動新的一局對戰
   */
  startBattle(newSettings) {
    if (newSettings) {
      this.settings = { ...this.settings, ...newSettings };
    }

    if (this.aiTimer) {
      clearTimeout(this.aiTimer);
      this.aiTimer = null;
    }

    // 決定場景 (支援隨機場景)
    const scenes = ['street', 'park', 'night'];
    if (this.settings.scene === 'random') {
      this.actualScene = scenes[Math.floor(Math.random() * scenes.length)];
    } else {
      this.actualScene = this.settings.scene;
    }

    this.resetCombatants();
    this.state = 'BATTLE';
    this.turnNumber = 1;
    this.currentTurn = 'cat'; // 野貓先攻
    this.extraThrowsLeft = 0;
    this.projectile = null;
    this.particles = [];
    this.floatingTexts = [];

    this.beginTurn();
  }

  /**
   * 開始新回合：隨機決定風向，並隨機決定本回合無風 100% 蓄力落點 (對手後方 3~6 個角色寬)
   */
  beginTurn() {
    if (this.state !== 'BATTLE') return;

    this.wind = PhysicsEngine.generateWind();
    const maxSpec = PhysicsEngine.generateTurnMaxPowerSpec(this.currentTurn);
    this.turnMaxSpeed = maxSpec.maxSpeed;
    this.turnOvershootWidths = maxSpec.overshootWidths;

    // 輪到該角色行動時，上一回合被打出的大包消腫
    this.fighters[this.currentTurn].hasHeadBump = false;
    this.fighters[this.currentTurn].dizzyStarsTimer = 0;

    this.phase = 'WAIT_INPUT';
    this.chargePower = 0.06;
    this.chargeDir = 1;
    this.isAiCharging = false;

    this.fighters.cat.pose = 'idle';
    this.fighters.dog.pose = 'idle';

    this.syncUI();

    if (this.isCurrentTurnAI()) {
      this.scheduleAITurn();
    }
  }

  isCurrentTurnAI() {
    if (this.settings.mode === '2p') return false;
    return this.currentTurn !== this.settings.playerRole;
  }

  /**
   * 電腦 AI 智慧決策與自動集氣投擲
   */
  scheduleAITurn() {
    if (this.aiTimer) clearTimeout(this.aiTimer);

    this.aiTimer = setTimeout(() => {
      if (this.state !== 'BATTLE' || this.phase !== 'WAIT_INPUT') return;

      const aiSide = this.currentTurn;
      const aiFighter = this.fighters[aiSide];
      const diffCfg = CONFIG.AI[this.settings.difficulty] || CONFIG.AI.normal;

      // 1. AI 判斷是否使用道具
      if (
        aiFighter.hp <= 55 &&
        !aiFighter.usedItems.heal &&
        Math.random() < diffCfg.useItemChance + 0.25
      ) {
        this.useItem(aiSide, 'heal');
      } else if (Math.random() < diffCfg.useItemChance * 0.55) {
        const availableOffensive = ['special', 'giant', 'double'].filter(
          (k) => !aiFighter.usedItems[k] && !aiFighter.activeBuffs[k]
        );
        if (availableOffensive.length > 0) {
          const pick =
            availableOffensive[Math.floor(Math.random() * availableOffensive.length)];
          this.useItem(aiSide, pick);
        }
      }

      // 2. AI 依據本回合動態 maxSpeed 計算目標蓄力值
      const consideredWind =
        Math.random() < diffCfg.ignoreWindChance ? 0 : this.wind;
      const ideal = PhysicsEngine.computeIdealPower(
        aiSide,
        consideredWind,
        this.turnMaxSpeed
      );
      const error = (Math.random() * 2 - 1) * diffCfg.powerErrorRange;
      this.aiTargetPower = Math.max(0.18, Math.min(0.96, ideal + error));

      // 3. AI 進入蓄力動畫
      this.aiTimer = setTimeout(() => {
        if (this.state !== 'BATTLE' || this.phase !== 'WAIT_INPUT') return;
        this.phase = 'CHARGING';
        this.isAiCharging = true;
        this.chargePower = 0.06;
        this.chargeDir = 1;
        this.fighters[aiSide].pose = 'charging';
        this.sound.startChargeSound();
        this.syncUI();
      }, 450);
    }, 650);
  }

  /**
   * 使用道具 (每次比賽各限用一次)
   */
  useItem(side, itemKey) {
    if (this.state !== 'BATTLE') return false;
    if (side !== this.currentTurn) return false;
    if (this.phase !== 'WAIT_INPUT') return false;

    const fighter = this.fighters[side];
    if (!fighter || fighter.usedItems[itemKey]) return false;

    const charCfg = side === 'cat' ? CONFIG.CAT : CONFIG.DOG;

    if (itemKey === 'heal') {
      const healAmount = Math.round(CONFIG.MAX_HP * CONFIG.ITEMS.heal.healRatio);
      fighter.hp = Math.min(CONFIG.MAX_HP, fighter.hp + healAmount);
      fighter.usedItems.heal = true;
      this.sound.playItemUse('heal');
      this.spawnFloatingText(
        charCfg.x,
        charCfg.y - 125,
        `🩹 +${healAmount} HP!`,
        '#2ed573'
      );
      this.spawnParticles(charCfg.x, charCfg.y - 60, '#2ed573', 18);
    } else if (itemKey === 'giant') {
      fighter.usedItems.giant = true;
      fighter.activeBuffs.giant = true;
      this.sound.playItemUse('buff');
      this.spawnFloatingText(charCfg.x, charCfg.y - 125, '💣 骨頭巨大化!', '#ffa502');
      this.spawnParticles(charCfg.x, charCfg.y - 60, '#ffa502', 16);
    } else if (itemKey === 'double') {
      fighter.usedItems.double = true;
      fighter.activeBuffs.double = true;
      this.extraThrowsLeft += CONFIG.ITEMS.double.extraThrows;
      this.sound.playItemUse('buff');
      this.spawnFloatingText(
        charCfg.x,
        charCfg.y - 125,
        '⚡ 同蓄力連丟2次!',
        '#48dbfb'
      );
      this.spawnParticles(charCfg.x, charCfg.y - 60, '#48dbfb', 16);
    } else if (itemKey === 'special') {
      fighter.usedItems.special = true;
      fighter.activeBuffs.special = true;
      this.sound.playItemUse('buff');
      const weaponName = side === 'cat' ? '🌟 黃金霸王魚骨!' : '🌟 皇家巨型金肉骨!';
      this.spawnFloatingText(charCfg.x, charCfg.y - 125, weaponName, '#ffd32a');
      this.spawnParticles(charCfg.x, charCfg.y - 60, '#ffd32a', 20);
    }

    this.syncUI();
    return true;
  }

  /**
   * 綁定滑鼠與觸控事件 (按住自己扮演的角色蓄力，放開丟出)
   */
  bindCanvasInput() {
    const getCanvasPos = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = CONFIG.CANVAS_WIDTH / rect.width;
      const scaleY = CONFIG.CANVAS_HEIGHT / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    };

    const handlePointerDown = (clientX, clientY) => {
      if (this.state !== 'BATTLE' || this.phase !== 'WAIT_INPUT') return;
      if (this.isCurrentTurnAI()) return;

      const pos = getCanvasPos(clientX, clientY);
      const activeCfg = this.currentTurn === 'cat' ? CONFIG.CAT : CONFIG.DOG;

      const charCenterX = activeCfg.x;
      const charCenterY = activeCfg.y - activeCfg.height * 0.5;
      const dx = Math.abs(pos.x - charCenterX);
      const dy = Math.abs(pos.y - charCenterY);

      if (dx <= 115 && dy <= 125) {
        this.startPlayerCharge();
      } else {
        this.spawnFloatingText(
          activeCfg.x,
          activeCfg.y - 140,
          '👇 請按住角色集氣!',
          '#ffd32a'
        );
      }
    };

    const handlePointerUp = () => {
      if (
        this.state === 'BATTLE' &&
        this.phase === 'CHARGING' &&
        !this.isAiCharging
      ) {
        this.releaseThrow();
      }
    };

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      handlePointerDown(e.clientX, e.clientY);
    });

    window.addEventListener('mouseup', () => {
      handlePointerUp();
    });

    this.canvas.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length > 0) {
          e.preventDefault();
          handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
        }
      },
      { passive: false }
    );

    window.addEventListener('touchend', () => {
      handlePointerUp();
    });
  }

  startPlayerCharge() {
    this.phase = 'CHARGING';
    this.isAiCharging = false;
    this.chargePower = 0.06;
    this.chargeDir = 1;
    this.fighters[this.currentTurn].pose = 'charging';
    this.sound.startChargeSound();
    this.syncUI();
  }

  /**
   * 放開蓄力並發射投擲物 (同時記錄本次蓄力值供「連丟2次」自動使用)
   */
  releaseThrow(overridePower = null) {
    const side = this.currentTurn;
    const fighter = this.fighters[side];

    const usedPower = overridePower !== null ? overridePower : this.chargePower;
    this.savedChargePower = usedPower;

    this.phase = 'FLYING';
    fighter.pose = 'throwing';
    fighter.shots += 1;

    this.projectile = PhysicsEngine.createProjectile(
      side,
      usedPower,
      fighter.activeBuffs,
      this.turnMaxSpeed
    );

    this.sound.playThrow(Boolean(fighter.activeBuffs.special));

    // 若沒有剩餘連擊次數，才清除單回合強化狀態；若處於「連丟2次」，保留蓄力給自動第 2 發
    if (this.extraThrowsLeft === 0) {
      fighter.activeBuffs.giant = false;
      fighter.activeBuffs.special = false;
    }

    setTimeout(() => {
      if (fighter.pose === 'throwing') {
        fighter.pose = 'idle';
      }
    }, 280);

    this.syncUI();
  }

  /**
   * 處理投擲物碰撞結果 (支援部位傷害分級、眼冒金星與頭上腫大包、延長受擊動畫半秒)
   */
  handleProjectileImpact(hit) {
    const attacker = this.fighters[this.currentTurn];
    let transitionDelay = 800;

    if (hit.type === 'character') {
      const victimSide = hit.targetSide;
      const victim = this.fighters[victimSide];
      const victimCfg = victimSide === 'cat' ? CONFIG.CAT : CONFIG.DOG;

      attacker.hits += 1;
      victim.hp = Math.max(0, victim.hp - hit.damage);
      victim.pose = 'hurt';
      // 延長受擊動畫半秒 (+32幀 -> 共 68 幀)
      victim.hurtTimer = CONFIG.HURT_FRAMES;
      transitionDelay = CONFIG.TURN_TRANSITION_MS;

      const isMax = Boolean(hit.isMaxDamage);
      this.sound.playHitCharacter(victimSide, isMax);

      const tierCfg = CONFIG.HIT_TIERS[hit.hitTier] || CONFIG.HIT_TIERS.normal;
      const tierLabel = hit.isSpecial
        ? '🌟特武暴擊'
        : hit.isGiant
        ? '💣巨骨重擊'
        : tierCfg.label;

      const textColor =
        hit.hitTier === 'crit' || isMax
          ? '#ffd32a'
          : hit.hitTier === 'normal'
          ? '#ff4757'
          : '#ffa502';

      this.spawnFloatingText(
        hit.x,
        hit.y - 34,
        `${tierLabel} -${hit.damage} HP!`,
        textColor
      );

      // 達到最大傷害時：觸發眼冒金星與頭上腫大包特效！
      if (isMax) {
        victim.hasHeadBump = true;
        victim.dizzyStarsTimer = 105;
        this.spawnFloatingText(
          victimCfg.x,
          victimCfg.y - victimCfg.height - 46,
          '💫 眼冒金星！頭腫大包！',
          '#ff6b81'
        );
      }

      this.spawnParticles(
        hit.x,
        hit.y,
        isMax ? '#ffd32a' : '#ff6b6b',
        isMax ? 32 : 18
      );
    } else if (hit.type === 'wall') {
      this.sound.playHitWallOrGround();
      this.spawnFloatingText(hit.x, hit.y - 20, '🧱 撞牆!', '#dfe4ea');
      this.spawnParticles(hit.x, hit.y, '#e67e22', 14);
    } else {
      this.sound.playHitWallOrGround();
      this.spawnFloatingText(hit.x, hit.y - 24, '💨 MISS!', '#a4b0be');
      this.spawnParticles(hit.x, hit.y, '#a4b0be', 10);
    }

    this.phase = 'TRANSITION';
    this.syncUI();

    setTimeout(() => {
      if (this.state !== 'BATTLE') return;

      // 1. 檢查是否有人血量歸零
      if (this.fighters.cat.hp <= 0 || this.fighters.dog.hp <= 0) {
        const winnerSide = this.fighters.cat.hp <= 0 ? 'dog' : 'cat';
        const loserSide = winnerSide === 'cat' ? 'dog' : 'cat';
        this.fighters[winnerSide].pose = 'victory';
        this.fighters[loserSide].pose = 'defeat';
        this.state = 'GAMEOVER';
        this.sound.playVictory();
        if (this.callbacks.onGameOver) {
          this.callbacks.onGameOver(this.getMatchSummary(winnerSide));
        }
        return;
      }

      // 2. 檢查是否有「這回合丟2次」：自動以同一次蓄力值丟出第 2 發，無需再次按壓蓄力！
      if (this.extraThrowsLeft > 0) {
        this.extraThrowsLeft -= 1;
        const activeFighter = this.fighters[this.currentTurn];
        activeFighter.activeBuffs.double = false;

        const charCfg = this.currentTurn === 'cat' ? CONFIG.CAT : CONFIG.DOG;
        this.spawnFloatingText(
          charCfg.x,
          charCfg.y - 135,
          '⚡ 同力道自動第 2 發!',
          '#48dbfb'
        );

        // 短暫拉弓預備姿勢後直接以 savedChargePower 發射第 2 發
        activeFighter.pose = 'charging';
        this.chargePower = this.savedChargePower;
        setTimeout(() => {
          if (this.state !== 'BATTLE') return;
          this.releaseThrow(this.savedChargePower);
        }, 320);
      } else {
        // 3. 切換對方回合
        if (this.currentTurn === 'dog') {
          this.turnNumber += 1;
        }
        this.currentTurn = this.currentTurn === 'cat' ? 'dog' : 'cat';
        this.beginTurn();
      }
    }, transitionDelay);
  }

  getMatchSummary(winnerSide) {
    const catAcc =
      this.fighters.cat.shots > 0
        ? Math.round((this.fighters.cat.hits / this.fighters.cat.shots) * 100)
        : 0;
    const dogAcc =
      this.fighters.dog.shots > 0
        ? Math.round((this.fighters.dog.hits / this.fighters.dog.shots) * 100)
        : 0;

    return {
      winnerSide,
      turns: this.turnNumber,
      catAcc: `${catAcc}% (${this.fighters.cat.hits}/${this.fighters.cat.shots})`,
      dogAcc: `${dogAcc}% (${this.fighters.dog.hits}/${this.fighters.dog.shots})`,
      catHp: this.fighters.cat.hp,
      dogHp: this.fighters.dog.hp,
      mode: this.settings.mode,
      playerRole: this.settings.playerRole,
    };
  }

  spawnParticles(x, y, color, count = 15) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        r: 3 + Math.random() * 4.5,
        color,
        alpha: 1,
      });
    }
  }

  spawnFloatingText(x, y, text, color = '#ffd32a') {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      alpha: 1.0,
      vy: -1.25,
    });
  }

  syncUI() {
    if (this.callbacks.onUpdateUI) {
      this.callbacks.onUpdateUI({
        state: this.state,
        phase: this.phase,
        currentTurn: this.currentTurn,
        isAI: this.isCurrentTurnAI(),
        catItems: this.fighters.cat.usedItems,
        dogItems: this.fighters.dog.usedItems,
        catBuffs: this.fighters.cat.activeBuffs,
        dogBuffs: this.fighters.dog.activeBuffs,
      });
    }
  }

  update() {
    // 更新蓄力條擺動 (已調慢 3 倍: chargeSpeed = 0.006)
    if (this.state === 'BATTLE' && this.phase === 'CHARGING') {
      this.chargePower += CONFIG.PHYSICS.chargeSpeed * this.chargeDir;
      if (this.chargePower >= 1.0) {
        this.chargePower = 1.0;
        this.chargeDir = -1;
      } else if (this.chargePower <= 0.06) {
        this.chargePower = 0.06;
        this.chargeDir = 1;
      }
      this.sound.updateChargeSound(this.chargePower);

      // 若是 AI 正在蓄力，達到目標值時自動釋放
      if (this.isAiCharging && this.chargePower >= this.aiTargetPower) {
        this.releaseThrow();
      }
    }

    // 更新飛行中投擲物
    if (this.state === 'BATTLE' && this.phase === 'FLYING' && this.projectile) {
      const hit = PhysicsEngine.stepProjectile(this.projectile, this.wind);
      if (hit) {
        this.handleProjectileImpact(hit);
      }
    }

    // 更新角色受擊計時器與眼冒金星計時器
    for (const side of ['cat', 'dog']) {
      const f = this.fighters[side];
      if (f.hurtTimer > 0) {
        f.hurtTimer -= 1;
        if (f.hurtTimer === 0 && f.pose === 'hurt') {
          f.pose = 'idle';
        }
      }
      if (f.dizzyStarsTimer > 0) {
        f.dizzyStarsTimer -= 1;
      }
    }

    // 更新爆炸與治療粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22;
      p.alpha -= 0.026;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 更新浮動傷害/狀態文字
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 0.018;
      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  render(time) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // 1. 繪製背景場景、地面與中央籬笆圍牆
    this.sceneRenderer.render(ctx, this.actualScene, this.wind, time);

    // 2. 若正在蓄力，繪製短前導拋物線瞄準點
    if (this.state === 'BATTLE' && this.phase === 'CHARGING') {
      const pts = PhysicsEngine.getAimPreviewPoints(
        this.currentTurn,
        this.chargePower,
        this.wind,
        this.turnMaxSpeed
      );
      for (const pt of pts) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 211, 42, ${pt.alpha * 0.85})`;
        ctx.fill();
        ctx.restore();
      }
    }

    // 3. 繪製左右 Q版角色 (左邊野貓、右邊家狗)
    const canHold =
      this.state === 'BATTLE' &&
      this.phase === 'WAIT_INPUT' &&
      !this.isCurrentTurnAI();

    CharacterRenderer.renderCharacter(
      ctx,
      'cat',
      {
        hp: this.fighters.cat.hp,
        pose: this.fighters.cat.pose,
        chargePower: this.currentTurn === 'cat' ? this.chargePower : 0,
        isCurrentTurn: this.state === 'BATTLE' && this.currentTurn === 'cat',
        canPlayerHold: canHold && this.currentTurn === 'cat',
        activeBuffs: this.fighters.cat.activeBuffs,
        hurtTimer: this.fighters.cat.hurtTimer,
        hasHeadBump: this.fighters.cat.hasHeadBump,
        dizzyStarsTimer: this.fighters.cat.dizzyStarsTimer,
      },
      time
    );

    CharacterRenderer.renderCharacter(
      ctx,
      'dog',
      {
        hp: this.fighters.dog.hp,
        pose: this.fighters.dog.pose,
        chargePower: this.currentTurn === 'dog' ? this.chargePower : 0,
        isCurrentTurn: this.state === 'BATTLE' && this.currentTurn === 'dog',
        canPlayerHold: canHold && this.currentTurn === 'dog',
        activeBuffs: this.fighters.dog.activeBuffs,
        hurtTimer: this.fighters.dog.hurtTimer,
        hasHeadBump: this.fighters.dog.hasHeadBump,
        dizzyStarsTimer: this.fighters.dog.dizzyStarsTimer,
      },
      time
    );

    // 4. 繪製飛行中的魚骨頭或肉骨頭
    if (this.projectile && this.projectile.active) {
      ProjectileRenderer.render(ctx, this.projectile);
    }

    // 5. 繪製粒子特效
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 6. 繪製頂部 HUD (戰鬥或結算狀態時顯示)
    if (this.state === 'BATTLE' || this.state === 'GAMEOVER') {
      const catLabel =
        this.settings.mode === '2p'
          ? 'P1 玩家'
          : this.settings.playerRole === 'cat'
          ? '玩家'
          : `電腦 ${CONFIG.AI[this.settings.difficulty].name}`;
      const dogLabel =
        this.settings.mode === '2p'
          ? 'P2 玩家'
          : this.settings.playerRole === 'dog'
          ? '玩家'
          : `電腦 ${CONFIG.AI[this.settings.difficulty].name}`;

      HUDRenderer.render(
        ctx,
        {
          catHp: this.fighters.cat.hp,
          dogHp: this.fighters.dog.hp,
          catLabel,
          dogLabel,
          catBuffs: this.fighters.cat.activeBuffs,
          dogBuffs: this.fighters.dog.activeBuffs,
          wind: this.wind,
          currentTurn: this.currentTurn,
          turnNumber: this.turnNumber,
          extraThrowsLeft: this.extraThrowsLeft,
        },
        time
      );
    }

    // 7. 繪製浮動傷害與狀態文字
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.font = '900 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#1e272e';
      ctx.lineWidth = 4;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  loop(time) {
    this.update();
    this.render(time);
    requestAnimationFrame((t) => this.loop(t));
  }
}
