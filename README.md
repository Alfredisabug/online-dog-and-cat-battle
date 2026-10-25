# 🐱⚡🐶 貓狗大戰 (Cat vs Dog Battle)

經典 2D 回合制拋物線對戰網頁遊戲，支援**單人挑戰智慧 AI** 與 **雙人同機輪流對決 (Hotseat)**，並透過 GitHub Actions 自動化部署至 GitHub Pages。

## ✨ 遊戲特色

- **經典陣營對抗**：
  - 左邊為**街頭邊**，由**街頭野貓 🐱** 盤踞，投擲鋒利**魚骨頭 🐟**。
  - 中間隔著**家用木籬笆 / 紅磚牆 / 夜間石牆**。
  - 右邊為**家庭後院**，由**後院家狗 🐶** 守護，投擲厚重**肉骨頭 🦴**。
- **純滑鼠直覺操作**：輪到你的回合時，用滑鼠**按住自己扮演的角色**即可開始蓄力，放開滑鼠左鍵即沿拋物線丟出攻擊！
- **動態風向與風阻物理**：每回合隨機產生風向與風速（順風需減小力道、逆風需加大蓄力），畫面中更有隨風飄動的落葉與雲朵輔助判斷。
- **四大戰術道具（每場比賽各限使用 1 次）**：
  1. 🩹 **補血 (Heal)**：立即恢復最大生命值的 `1/3`（+34 HP）。
  2. 💣 **加大傷害 (Giant)**：本發投擲物體積放大 2 倍、判定範圍加大，傷害提升 1.5 倍。
  3. ⚡ **這回合丟 2 次 (Double Throw)**：本回合可連續投擲 2 次展開連擊。
  4. 🌟 **特級武器 (Special Weapon)**：召喚黃金霸王旗魚骨 / 皇家巨型金肉骨，造成超高暴擊傷害。
- **多場景與隨機選擇**：內建「經典街頭後院」、「陽光花園磚牆」、「霓虹月夜街巷」及「隨機場景」。
- **零外部素材依賴**：全 Canvas 向量繪製與 Web Audio API 即時合成卡通音效，極速載入。

## 🚀 本地開發與測試

```bash
# 安裝依賴
npm install

# 啟動本地開發伺服器 (Vite HMR)
npm run dev

# 執行物理與遊戲機制單元測試
npm test

# 打包生產環境靜態檔案 (輸出至 dist/)
npm run build
```

## 📦 GitHub Pages 自動部署 (CI/CD)

本專案已內建 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)：
1. 將專案推送至 GitHub 儲存庫的 `main` 或 `master` 分支。
2. 於 GitHub Repository 的 **Settings → Pages → Build and deployment** 中，將 **Source** 設為 **GitHub Actions**。
3. 每次 Push 時，GitHub Actions 將自動執行單元測試、Vite 打包並發布至 GitHub Pages。
