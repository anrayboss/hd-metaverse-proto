# HANDOFF.md — 人類設計宇宙 #1 & #2 完整上下文打包

> 本檔整理至 **2026-11-27（HEAD `744456c`）**，涵蓋 **#1 基礎原型** 與 **#2 專業跑圖＋雙曼陀羅整合** 的完整脈絡，供新開對話直接接手。
> 新對話開局建議依序讀取：`AGENTS.md` → `SPEC.md` → `WORLD.md` → 本檔（視需要補充 `D:\Victor's brain\人類設計宇宙整理.md` 與 `D:\Victor's brain\hd-metaverse-log.md` 近期幾筆）。

---

## 1. 專案定位與核心設計
- **產品願景**：無 Mentor 的開放世界「人類設計宇宙」（空間體驗對標 GTA 6 無縫進出；探索／商業模式對標 Promptasy 與小地圖）。
- **核心底圖**：`D:\Victor's brain\附件\終極人類設計曼陀羅海報.pdf` 十層同心圓結構，打造大阪世博「大屋根」式扁平實心圓盤建築。
- **三視圖一體**：
  1. **2D 本命圖**（`BodyGraph2DSvg.tsx`）：完整移植過往專案 `public/assets/body-graph.svg`，含九中心、64 閘門單/雙色、`coveringGates` 覆蓋與點擊跳 3D。
  2. **2D 基礎曼陀羅**（`BasicMandala2D.tsx`）：純 SVG 向量四圈結構（最外圈 64 卦象無外框 → 6 爻小色塊 → 閘門阿拉伯數字 → 12 星座 → 放射星體符號 → 中央可點擊 2D 人體圖）。
  3. **3D 終極曼陀羅元宇宙**（`UniverseScene.tsx`）：十層同心圓 3D 建築 + 64 條 `1/64` 貫穿走廊 + 中庭躺平 3D 人體圖（`public/models/bodygraph.glb`）+ 36 條可穿梭中空通道管。

---

## 2. 技術棧與關鍵檔案地圖
- **核心套件**：`Vite 6` + `React 18` + `TypeScript` + `Three.js` + `@react-three/fiber` + `@react-three/drei` + `Zustand` + `leva`（僅 `DEV`）+ `swisseph-wasm`。
- **計算引擎 (`src/engine/`)**：
  - `ephemeris.ts`：封裝 `swisseph-wasm`（支援 `Chiron` 與 `Mean Lilith`），二分搜尋精確回推設計時刻（太陽退 88° 誤差 `0.000000°`）。
  - `hdCalculator.ts`：30 星體黃經轉 `Gate/Line/Color/Tone/Base/FixingState`、即時 `analyzeBodygraph`（支援視角 `0/1/2` 與星體開關）、四箭頭 `VariableArrow`（含 `base` 1–5）、192 組人生主題 `resolveIncarnationCross` 與過往專案中文術語對照 `TERM_MAP`。
  - `hdChart.ts` & `chartRecords.ts`：整合離線城市（`src/data/cities.ts`）與 IANA 時區，純 `localStorage` 存讀歷史跑圖紀錄（`src/data/chartRecords.json` 已排除於 `.gitignore`）。
- **資料層 (`src/data/`)**：
  - `mandalaData.ts`：64 閘門 Rave Mandala 序列（Gate 10/11 在 12 點鐘）、4 象限、8 八卦（乾卦對齊 Gate 1–11）、12 星座（天蠍／射手交界對齊 Gate 14／34）、16 神格、22 密碼子環（含雙球短 bar 造型與 90° 切線排列）、9 大中心與 36 條通道（已與 `src/data/通道字典.md` 對齊）。
  - `fixings.ts` / `dictionary.json` / `crossNames.json`：384 爻曜升落陷規則、說明字典、192 組交叉名。
  - `sceneConfig.json`：所有 3D 尺寸／高度與 23 項全站調色盤色碼之預設存檔。
- **狀態管理 (`src/store/`)**：
  - `useWorldStore.ts`：主題（預設 `light`）、`displayMode`（`bodygraph-2d` / `mandala-2d` / `universe-3d`）、`stage`（`ENABLE_SUN_GUIDE = false` 暫隱紅黑太陽導覽）、`viewMode`（`0/1/2`）、`variableDetailLevel`（`0` 隱藏 / `1` 純箭頭 / `2` CT / `3` CTB，預設 `3`）、`planetToggles`、`interiorSpace`、`activeCorridorIndex`、`corridorRadius`。
  - `useSceneConfigStore.ts`：管理全場景參數與 23 項色碼，DEV 模式透過 `vite.config.ts` 的 `POST /__save-scene-config` 寫回 `sceneConfig.json`。
- **3D 場景 (`src/world/`)**：
  - `UniverseScene.tsx`：Canvas（啟用 `logarithmicDepthBuffer: true` 防高空 Z-fighting）、燈光、HDRI／星空與主場景掛載。
  - `MandalaRing3D.tsx`：十層圓盤貼圖（獨立 4/8/12/16/64 切塊外框、6 圈 384 爻細刻度與小色塊、放射星體符號、純白底）+ 立體卦象／數字／GLB 中心示意三角體（純水平平移保留原始姿態）／雙球密碼子環。
  - `BodyGraph3D.tsx`：`SplineAtriumBodyGraph`（載入使用者微調過的 `public/models/bodygraph.glb`）、36 條中空可穿梭 `ChannelConduit`（含 34/10 匯流至 57-20 主幹線、Gate 10 朝 9 點鐘水平接管）與 `VariableArrows3D`（`SVGLoader` 直接擠出 `body-graph.svg` 原版書法箭頭 + `Times New Roman` `CanvasTexture`，整組置中 Ajna 兩側，左側吸收／環境為純黑 `#000000`）。
  - `PhysiologyCorridors3D.tsx`：1/64 閘門走廊極座標結構與側牆點擊切換鄰近閘門。
  - `CameraRig.tsx` & `PlayerAvatar.tsx`：OrbitControls + 4 層優先權接管（人體圖內部自由步行 ↔ 走廊極座標 ↔ 定點過場 ↔ 鳥瞰自由探索）與金探子化身。
- **UI 與調參 (`src/components/`)**：
  - `HudOverlay.tsx` / `ChartResultPanel.tsx` / `InfoModal.tsx`：頂部操作列、右側跑圖抽屜（Zen HD、預設折疊 Ra 標籤包、四箭頭 4 檔滾輪＋觸控控制條、30 星體點擊直飛走廊）、左下操作提示（含橘色「退出人體圖內部空間」按鈕）。
  - `SceneStudioPanel.tsx`：左上角標題下方 `.studio-leva-dock` 垂直堆疊 3 個折疊面板：① `🧭 檢視模式`（支援折疊態直接滾輪切換 2D / 曼陀羅 / 3D + 展開滑桿）、② `🎛️ 場景調參 Studio`（僅 3D 顯示，尺規置頂）、③ `🎨 全站調色盤 (2D / 3D)`（23 項色碼，2D/3D 共用；`useState(() => useCreateStore())` + `neverHide` 防 HMR 消失）。

---

## 3. 協作規則與使用者偏好（務必嚴格遵守）
- **Git & Log 規範（見 `AGENTS.md`）**：
  1. 每次專案檔案變動後務必檢查 `git status`（排除 `.env` 或無關暫存檔），並以**正體中文 + Conventional Commits** 提交。
  2. 每則使用者指令與 Agent 操作重點必須**倒序寫入** `D:\Victor's brain\hd-metaverse-log.md`，timetag 與標題加橘色螢光筆 `==🟠[[YYYY-MM-DD (星期X)]] HH:mm \`hash\`｜\`...\`==`。
- **程式碼與內容紅線**：
  - 絕不覆蓋使用者手動調整的數值、`public/models/bodygraph.glb`、`AGENTS.md`、`src/data/通道字典.md` 或 `sceneConfig.json` 參數；修改任何檔案前先 `read_file`。
  - 禁止主動建立 `README.md`；禁止使用新細明體（PMingLiU）；禁止使用任何 PROC 相關服務或工具。
  - 全介面與回覆皆使用**正體中文（zh-TW）**，預設幣別 NTD、次要 USD；回覆風格精簡、直接給結果與實作細節。
- **Windows PowerShell 5.1 注意**：串接指令不可用 `&&`，請用 `; if ($LASTEXITCODE -eq 0) { ... }`。

---

## 4. 常用指令
```powershell
npm run dev      # 啟動本機預覽（http://localhost:5178/）+ 調參與調色盤
npm run verify   # 驗證 64 閘門資料完整性 + swisseph-wasm 30 星體回歸測試
npm run build    # TypeScript 嚴格檢查 + Vite 正式建置
```

---

## 5. 下一階段待辦（開新對話建議優先順序）
1. **終極曼陀羅十層分層控制**（`人類設計宇宙整理.md` L15）：在側欄或獨立面板實作各層顯隱開關與自訂層次排序（卦象、象限、數字、中心塊狀體、神格、星座、八卦、密碼子環、生理對應）。
2. **走廊內部與情境關卡深化**：在 1/64 走廊與中心內室加入基因天命球體／生理對應 3D 知識積木與第一批互動練習關卡。
3. **重啟完整新手導覽（`ENABLE_SUN_GUIDE`）**：當教學體驗準備好時，將 `useWorldStore.ts` 的 `ENABLE_SUN_GUIDE` 改為 `true` 並打磨紅太陽進 → 黑太陽出引導。
4. **行動端體驗與字型優化**：微調手機觸控操作手感、確保 CJK 字型子集與 WebGL 資源載入效能。
5. **推送遠端 GitHub**：遠端已設 `origin`（`https://github.com/anrayboss/hd-metaverse-proto.git`），待確認遠端 Repo 就緒後 `git push -u origin main`。
