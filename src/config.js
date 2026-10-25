/**
 * 遊戲全域常數與平衡參數設定
 */
export const CONFIG = {
  CANVAS_WIDTH: 1200,
  CANVAS_HEIGHT: 675,
  GROUND_Y: 545,

  // 角色位置與碰撞框 (Q版二頭身比例)
  CAT: {
    x: 190,
    y: 545,
    width: 96,
    height: 112,
    launchOffsetX: 26,
    launchOffsetY: -64,
    name: '街頭野貓',
    emoji: '🐱',
  },
  DOG: {
    x: 1010,
    y: 545,
    width: 100,
    height: 116,
    launchOffsetX: -26,
    launchOffsetY: -66,
    name: '後院家狗',
    emoji: '🐶',
  },

  // 中間圍牆/籬笆設定
  WALL: {
    x: 600,
    width: 44,
    height: 185,
  },

  // 生命值與基礎傷害
  MAX_HP: 100,
  BASE_DAMAGE: 20,

  // 部位與精準度傷害分級
  HIT_TIERS: {
    crit: {
      multiplier: 1.35, // 爆頭 / 核心正中：最大傷害 (觸發眼冒金星與頭頂腫大包)
      label: '💥最大傷害',
    },
    normal: {
      multiplier: 1.0,  // 軀幹命中：標準傷害
      label: '💢命中',
    },
    graze: {
      multiplier: 0.65, // 邊緣擦傷：輕微傷害
      label: '💨擦傷',
    },
  },

  // 受擊動畫與回合切換時間 (延長半秒讓打擊感更明顯)
  HURT_FRAMES: 68,          // 原 36 幀 -> 延長半秒 (+32幀)
  TURN_TRANSITION_MS: 1280, // 原 780ms -> 延長半秒 (+500ms)

  // 道具參數 (每場比賽各限用 1 次)
  ITEMS: {
    heal: {
      id: 'heal',
      name: '補血 1/3',
      healRatio: 1 / 3, // 恢復 1/3 最大血量 (約 34 HP)
    },
    giant: {
      id: 'giant',
      name: '加大傷害',
      scaleMultiplier: 2.0,   // 投擲物視覺與碰撞半徑放大 2 倍
      damageMultiplier: 1.5,  // 傷害 1.5 倍
    },
    double: {
      id: 'double',
      name: '這回合丟2次',
      extraThrows: 1,         // 同一次蓄力自動連續丟 2 次
    },
    special: {
      id: 'special',
      name: '特級武器',
      scaleMultiplier: 1.45,
      damageMultiplier: 1.9,  // 特級武器高傷害
    },
  },

  // 物理與拋物線參數
  PHYSICS: {
    gravity: 0.42,
    launchAngleDeg: 55,       // 經典高拋角 55 度，可跨越中間圍牆
    minSpeed: 8.5,
    maxSpeed: 23.8,           // 預設基準值 (每回合會依後方 3~6 個角色寬動態計算)
    overshootCharWidthsMin: 3.0, // 無風 100% 蓄力落點最近：對手後方 3 個角色寬
    overshootCharWidthsMax: 6.0, // 無風 100% 蓄力落點最遠：對手後方 6 個角色寬
    windMaxLevel: 5.0,        // 風力範圍 -5.0 ~ +5.0
    windAccelFactor: 0.021,   // 每單位風力造成的水平加速度
    chargeSpeed: 0.006,       // 調慢三倍 (原 0.018 -> 0.006)，讓玩家能從容瞄準
  },

  // AI 難度誤差設定
  AI: {
    easy: {
      name: '簡單',
      powerErrorRange: 0.22,  // ±22% 蓄力誤差
      ignoreWindChance: 0.55, // 常忽略風阻
      useItemChance: 0.25,
    },
    normal: {
      name: '普通',
      powerErrorRange: 0.085, // ±8.5% 蓄力誤差
      ignoreWindChance: 0.0,
      useItemChance: 0.65,
    },
    hard: {
      name: '困難',
      powerErrorRange: 0.024, // ±2.4% 神射手誤差
      ignoreWindChance: 0.0,
      useItemChance: 0.95,
    },
  },
};
