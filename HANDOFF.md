# HANDOFF.md — 人類設計宇宙專案遷移與完整上下文打包

> 本檔整理自初始規劃與 Phase 1 原型開發對話（2026-11-24 ~ 2026-11-25），供新開獨立專案對話時直接讀取接手。
> 新對話開局請先讀：`AGENTS.md` → `SPEC.md` → `WORLD.md` → 本檔。

---

## 1. 專案定位與核心目標
- **產品願景**：無 Mentor 的開放世界「人類設計宇宙」（對標 Promptasy 的自主探索學習＋小地圖的 3 個月變現與 Build in Public 模式）。
- **價值主張**：把自主權還給你，在立體曼陀羅空間內自由探索、體驗微中子能量進出人體，找回自性（The Self）。
- **核心設計底圖**：以 `D:\Victor's brain\附件\終極人類設計曼陀羅海報.pdf` 十層同心圓結構為核心，做成大阪世博「大屋根」式扁平厚實心圓盤建築。
- **新手教學動線（零過場）**：輸入出生資料 → 紅太陽卦象（外環，出生前 88°）→ 沿該閘門 1/64 走廊由外向內穿越 8 層立體物件進入中央人體圖 → 再由內向外走黑太陽閘門走廊走出曼陀羅 → 進入自由探索模式。

---

## 2. 技術棧與關鍵架構決策
- **核心套件**：`Vite 6` + `React 18` + `TypeScript` + `Three.js` + `@react-three/fiber` + `@react-three/drei` + `Zustand` + `leva`（僅 `DEV` 顯示）。
- **資料層與渲染層解耦**：
  - `src/engine/hdChart.ts`：簡化天文太陽黃經計算（誤差 < 0.05°；紅太陽精確退 88°），輸出標準 `ChartData`。未來可直接替換為 `Human Design Alive` API 或 `swisseph-wasm`，完全不動 3D 層。
  - `src/data/mandalaData.ts`：完整 64 閘門 Rave Mandala 排序（已對齊海報鳥瞰方位：Gate 10/11 在 12 點鐘、Gate 55 在 10 點鐘）、16 神格、12 星座、8 八卦、22 個密碼子環（含 Victor 指定色碼與胺基酸）、九中心（已更新 Victor 指定色碼並移除 `biology`，改以閘門生理對應為主）。
- **空間與互動實作**：
  - **實心圓盤底盤**：[MandalaRing3D.tsx](src/world/MandalaRing3D.tsx) 中央不挖空、降低至 `floorY` 防裁切；64 卦象皆具備全填滿透明點擊區（點爻線空隙必中）＋ `<Billboard follow>` 永遠正對鏡頭（卦象與數字皆為 WebGL 原生，避免 64 個 DOM `<Html>` 卡頓）。
  - **1/64 完整閘門走廊**：[PhysiologyCorridors3D.tsx](src/world/PhysiologyCorridors3D.tsx) 每一個閘門都是從 `R=88` 貫穿到 `R=22` 的獨立走廊，以極座標鎖定實現零物理引擎透明牆，走廊內設懸浮半透明填色左右箭頭切換鄰近閘門；In 依序經過 `象限 → 數字 → 中心塊狀體 → 神格 → 星座 → 八卦 → 密碼子環 Token → 生理對應 → 人體圖`，Out 順序完全相反。
  - **中央人體圖**：[BodyGraph3D.tsx](src/world/BodyGraph3D.tsx) 已隱藏站立人體點雲（`showVertical3D = false`），中庭改用 Victor 匯入的 `public/models/bodygraph.glb`（`SplineAtriumBodyGraph`），第三步鏡頭已綁定至躺平人體圖俯視。
  - **主題切換**：預設淺色模式，右上角支援一鍵切換淺／深色（3D 場景與 HUD 同步）。
  - **即時調參與本機存檔**：[SceneStudioPanel.tsx](src/components/SceneStudioPanel.tsx) + [vite.config.ts](vite.config.ts)（`POST /__save-scene-config`），調整完按「💾 寫回本機 JSON」即可覆寫 [sceneConfig.json](src/data/sceneConfig.json) 進 Git。

---

## 3. 協作規則與使用者偏好（務必遵守）
- 遵守 [AGENTS.md](AGENTS.md)：每次檔案變動都要用**正體中文** commit，並**同步倒敘寫入** `D:\Victor's brain\hd-metaverse-log.md`。
- 不主動建立 `README.md`（專案完成後再寫）。
- 絕不覆蓋使用者手動調整的數值、幾何形狀（如 `head`/`ajna`/`ego` 三角朝向）或自定義命名。
- 避免使用新細明體（PMingLiU）；所有介面與回覆皆使用正體中文（zh-TW）。
- `.env` 嚴禁入版控，只追蹤 `.env.example`。

---

## 4. 常用指令
```bash
npm run dev      # 啟動本機預覽（http://localhost:5178/）+ leva 調參面板
npm run verify   # 驗證 64 閘門曼陀羅資料完整性
npm run build    # TypeScript 檢查 + Vite 正式建置
```

---

## 5. 待辦與下一階段建議
1. **推送遠端 GitHub**：已綁定 `origin`（`https://github.com/anrayboss/hd-metaverse-proto.git`），待在 GitHub 建立空 Repo 後執行 `git push -u origin main`。
2. **串接完整跑圖資料**：將 `src/engine/hdChart.ts` 接入 `Human Design Alive` 完整 26 星體、9 中心定義與 36 通道點亮邏輯。
3. **精細化走廊內容與關卡**：強化各閘門走廊內的生理對應／基因天命視覺表現，並實作第一批離線情境模擬關卡。
4. **行動端與字型優化**：加入手機觸控微調與 CJK 字型子集切割，準備 Phase 1 公開體驗與 Build in Public 曝光。
