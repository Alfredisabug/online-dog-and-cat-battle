import { SoundEngine } from './engine/Audio.js';
import { Game } from './engine/Game.js';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const sound = new SoundEngine();

  // 畫面元素
  const screenStart = document.getElementById('screen-start');
  const screenSelect = document.getElementById('screen-select');
  const screenTutorial = document.getElementById('screen-tutorial');
  const screenGameover = document.getElementById('screen-gameover');
  const battleUI = document.getElementById('battle-ui');

  const btnHomeTop = document.getElementById('btn-home-top');
  const btnSoundToggle = document.getElementById('btn-sound-toggle');
  const btnTutorialTop = document.getElementById('btn-tutorial-top');

  const catPanel = document.getElementById('cat-item-panel');
  const dogPanel = document.getElementById('dog-item-panel');
  const turnHintPill = document.getElementById('turn-hint-pill');

  // 當前選單設定狀態
  const selectedConfig = {
    mode: '1p',
    playerRole: 'cat',
    difficulty: 'normal',
    scene: 'street',
  };

  let previousScreenBeforeTutorial = screenStart;

  const showScreen = (target) => {
    [screenStart, screenSelect, screenTutorial, screenGameover].forEach((el) => {
      if (el === target) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });
  };

  // 初始化遊戲主體
  const game = new Game(canvas, sound, {
    onUpdateUI: (uiState) => {
      if (uiState.state !== 'BATTLE') {
        battleUI.classList.add('hidden');
        return;
      }

      battleUI.classList.remove('hidden');
      btnHomeTop.classList.remove('hidden');

      const isCatTurn = uiState.currentTurn === 'cat';
      const canUseItem = uiState.phase === 'WAIT_INPUT' && !uiState.isAI;

      // 更新左右道具欄高亮與禁用狀態
      if (isCatTurn && canUseItem) {
        catPanel.classList.add('active-turn');
        catPanel.classList.remove('inactive-turn');
      } else {
        catPanel.classList.remove('active-turn');
        catPanel.classList.add('inactive-turn');
      }

      if (!isCatTurn && canUseItem) {
        dogPanel.classList.add('active-turn');
        dogPanel.classList.remove('inactive-turn');
      } else {
        dogPanel.classList.remove('active-turn');
        dogPanel.classList.add('inactive-turn');
      }

      // 更新每顆道具按鈕的「已用」與「當前啟用」狀態
      document.querySelectorAll('.item-btn').forEach((btn) => {
        const side = btn.dataset.side;
        const item = btn.dataset.item;
        const usedMap = side === 'cat' ? uiState.catItems : uiState.dogItems;
        const buffMap = side === 'cat' ? uiState.catBuffs : uiState.dogBuffs;

        const isUsed = Boolean(usedMap[item]);
        const isSelected = Boolean(buffMap[item]);

        btn.classList.toggle('used', isUsed);
        btn.classList.toggle('selected', isSelected);
        btn.disabled = isUsed || side !== uiState.currentTurn || !canUseItem;
      });

      // 更新底部中央操作提示文字
      if (uiState.isAI) {
        const aiName = isCatTurn ? '🐱 街頭野貓 (電腦)' : '🐶 後院家狗 (電腦)';
        turnHintPill.textContent = `🤖 ${aiName} 正在瞄準投擲中...`;
      } else if (uiState.phase === 'CHARGING') {
        turnHintPill.textContent = '🔥 放開滑鼠左鍵立即丟出骨頭！';
      } else if (uiState.phase === 'WAIT_INPUT') {
        const roleName = isCatTurn ? '🐱 街頭野貓' : '🐶 後院家狗';
        turnHintPill.textContent = `輪到 ${roleName}：請滑鼠按住角色蓄力，或點擊下方道具！`;
      } else {
        turnHintPill.textContent = '💨 骨頭飛行中...';
      }
    },

    onGameOver: (summary) => {
      battleUI.classList.add('hidden');

      const winnerAvatar = document.getElementById('winner-avatar');
      const winnerTitle = document.getElementById('winner-title');
      const winnerSubtitle = document.getElementById('winner-subtitle');
      const winnerBanner = document.getElementById('winner-banner');

      const isCatWin = summary.winnerSide === 'cat';
      winnerAvatar.textContent = isCatWin ? '🐱🐟' : '🐶🦴';
      winnerTitle.textContent = isCatWin ? '街頭野貓 獲勝！' : '後院家狗 獲勝！';

      if (summary.mode === '1p') {
        const playerWon = summary.winnerSide === summary.playerRole;
        winnerBanner.textContent = playerWon ? '🏆 恭喜玩家獲勝！' : '💻 電腦 AI 獲勝！';
        winnerSubtitle.textContent = playerWon
          ? '神準的拋物線與風向判斷，徹底壓制了對手！'
          : '只差一點點！調整順逆風蓄力再挑戰一次吧！';
      } else {
        winnerBanner.textContent = isCatWin ? '🏆 P1 玩家獲勝！' : '🏆 P2 玩家獲勝！';
        winnerSubtitle.textContent = isCatWin
          ? '街頭野貓的魚骨頭百發百中，稱霸全場！'
          : '後院家狗的強力肉骨頭勢不可擋，成功守護領地！';
      }

      document.getElementById('stat-turns').textContent = `${summary.turns} 回合`;
      document.getElementById('stat-cat-acc').textContent = summary.catAcc;
      document.getElementById('stat-dog-acc').textContent = summary.dogAcc;
      document.getElementById(
        'stat-hp-remain'
      ).textContent = `${summary.catHp} HP / ${summary.dogHp} HP`;

      showScreen(screenGameover);
    },
  });

  // 綁定道具按鈕點擊
  document.querySelectorAll('.item-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const side = btn.dataset.side;
      const item = btn.dataset.item;
      game.useItem(side, item);
    });
  });

  // 選單按鈕導覽邏輯
  document.getElementById('btn-go-select').addEventListener('click', () => {
    sound.playClick();
    showScreen(screenSelect);
  });

  document.getElementById('btn-back-start').addEventListener('click', () => {
    sound.playClick();
    showScreen(screenStart);
  });

  document.getElementById('btn-go-tutorial').addEventListener('click', () => {
    sound.playClick();
    previousScreenBeforeTutorial = screenStart;
    showScreen(screenTutorial);
  });

  btnTutorialTop.addEventListener('click', () => {
    sound.playClick();
    if (!screenStart.classList.contains('hidden')) {
      previousScreenBeforeTutorial = screenStart;
    } else if (!screenSelect.classList.contains('hidden')) {
      previousScreenBeforeTutorial = screenSelect;
    } else if (!screenGameover.classList.contains('hidden')) {
      previousScreenBeforeTutorial = screenGameover;
    } else {
      previousScreenBeforeTutorial = null;
    }
    showScreen(screenTutorial);
  });

  document.getElementById('btn-close-tutorial').addEventListener('click', () => {
    sound.playClick();
    if (previousScreenBeforeTutorial) {
      showScreen(previousScreenBeforeTutorial);
    } else {
      screenTutorial.classList.add('hidden');
    }
  });

  btnSoundToggle.addEventListener('click', () => {
    const enabled = sound.toggle();
    btnSoundToggle.textContent = enabled ? '🔊 音效: 開' : '🔇 音效: 關';
    if (enabled) sound.playClick();
  });

  btnHomeTop.addEventListener('click', () => {
    sound.playClick();
    game.state = 'MENU';
    battleUI.classList.add('hidden');
    btnHomeTop.classList.add('hidden');
    showScreen(screenStart);
  });

  // 選項卡片切換通用函式
  const bindOptionGroup = (containerId, dataAttr, onSelect) => {
    const container = document.getElementById(containerId);
    const cards = container.querySelectorAll('.option-card');
    cards.forEach((card) => {
      card.addEventListener('click', () => {
        sound.playClick();
        cards.forEach((c) => c.classList.remove('active'));
        card.classList.add('active');
        onSelect(card.dataset[dataAttr]);
      });
    });
  };

  const aiConfigBlock = document.getElementById('ai-config-block');
  const roleConfigTitle = document.getElementById('role-config-title');

  bindOptionGroup('mode-options', 'mode', (mode) => {
    selectedConfig.mode = mode;
    if (mode === '2p') {
      aiConfigBlock.classList.add('hidden');
      roleConfigTitle.textContent = '2. 雙人配置 (左方 P1 野貓 vs 右方 P2 家狗)';
    } else {
      aiConfigBlock.classList.remove('hidden');
      roleConfigTitle.textContent = '2. 選擇你要扮演的角色';
    }
  });

  bindOptionGroup('role-options', 'role', (role) => {
    selectedConfig.playerRole = role;
  });

  bindOptionGroup('difficulty-options', 'difficulty', (difficulty) => {
    selectedConfig.difficulty = difficulty;
  });

  bindOptionGroup('scene-options', 'scene', (scene) => {
    selectedConfig.scene = scene;
  });

  // 啟動戰鬥
  document.getElementById('btn-start-battle').addEventListener('click', () => {
    sound.playClick();
    showScreen(null);
    game.startBattle(selectedConfig);
  });

  // 結算畫面按鈕：再來一局 / 重選角色與場景 / 主選單
  document.getElementById('btn-rematch').addEventListener('click', () => {
    sound.playClick();
    showScreen(null);
    game.startBattle(selectedConfig);
  });

  document.getElementById('btn-reselect').addEventListener('click', () => {
    sound.playClick();
    showScreen(screenSelect);
  });

  document.getElementById('btn-gameover-home').addEventListener('click', () => {
    sound.playClick();
    game.state = 'MENU';
    btnHomeTop.classList.add('hidden');
    showScreen(screenStart);
  });
});
