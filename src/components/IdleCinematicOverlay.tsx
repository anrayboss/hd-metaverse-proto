import { useEffect, useRef, useState } from 'react';
import { IDLE_CINEMATIC_TIMEOUT_MS, useWorldStore } from '../store/useWorldStore';

const TARGET_ASPECT = 16 / 9;

interface CinemaBars {
  topBottomPx: number;
  leftRightPx: number;
}

function compute16x9Bars(vw: number, vh: number): CinemaBars {
  if (vw <= 0 || vh <= 0) return { topBottomPx: 0, leftRightPx: 0 };
  const currentAspect = vw / vh;

  // 若螢幕本身已接近 16:9，內縮一層 7% 電影暗邊並維持嚴格 16:9 畫幅，打造明確電影感
  if (Math.abs(currentAspect - TARGET_ASPECT) < 0.04) {
    const padY = Math.round(vh * 0.07);
    const innerH = Math.max(1, vh - padY * 2);
    const innerW = innerH * TARGET_ASPECT;
    const padX = Math.max(0, Math.round((vw - innerW) / 2));
    return { topBottomPx: padY, leftRightPx: padX };
  }

  // 螢幕比 16:9 更高（例如 16:10、4:3、手機直屏）：上下加暗色遮罩，保留 16:9 寬銀幕
  if (currentAspect < TARGET_ASPECT) {
    const targetH = vw / TARGET_ASPECT;
    const rawPadY = Math.max(0, (vh - targetH) / 2);
    // 同步給一點點左右暗邊（維持嚴格 16:9）強化四周包覆感
    const extraPadX = Math.round(vw * 0.025);
    const innerW = Math.max(1, vw - extraPadX * 2);
    const innerH = innerW / TARGET_ASPECT;
    const padY = Math.max(rawPadY, Math.round((vh - innerH) / 2));
    return { topBottomPx: Math.round(padY), leftRightPx: extraPadX };
  }

  // 螢幕比 16:9 更寬（例如 21:9、32:9 超寬螢幕）：左右加暗色遮罩＋微幅上下暗邊維持 16:9
  const extraPadY = Math.round(vh * 0.055);
  const innerH = Math.max(1, vh - extraPadY * 2);
  const innerW = innerH * TARGET_ASPECT;
  const padX = Math.max(0, Math.round((vw - innerW) / 2));
  return { topBottomPx: extraPadY, leftRightPx: padX };
}

/**
 * GTA 風格待機電影模式：
 * - 3D 模式下閒置 3 分鐘自動進入，圍繞金探子水平＋垂直混搭旋轉
 * - 四周套上暗色遮罩，將可視畫面收束為 16:9 電影寬銀幕比例
 * - 任意滑鼠／鍵盤／觸控／滾輪操作立即平滑退出
 * - 快捷鍵 Shift + C 可隨時手動預覽待機電影模式
 */
export function IdleCinematicOverlay() {
  const displayMode = useWorldStore((s) => s.displayMode);
  const isIdleCinematic = useWorldStore((s) => s.isIdleCinematic);
  const setIdleCinematic = useWorldStore((s) => s.setIdleCinematic);

  const timerRef = useRef<number | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const [bars, setBars] = useState<CinemaBars>(() =>
    typeof window !== 'undefined'
      ? compute16x9Bars(window.innerWidth, window.innerHeight)
      : { topBottomPx: 0, leftRightPx: 0 }
  );

  useEffect(() => {
    const updateBars = () => {
      setBars(compute16x9Bars(window.innerWidth, window.innerHeight));
    };
    updateBars();
    window.addEventListener('resize', updateBars);
    return () => window.removeEventListener('resize', updateBars);
  }, []);

  useEffect(() => {
    if (displayMode !== 'universe-3d') {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setIdleCinematic(false);
      return;
    }

    const scheduleIdle = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        if (useWorldStore.getState().displayMode === 'universe-3d') {
          useWorldStore.getState().setIdleCinematic(true);
        }
      }, IDLE_CINEMATIC_TIMEOUT_MS);
    };

    const wakeAndReset = () => {
      if (useWorldStore.getState().isIdleCinematic) {
        useWorldStore.getState().setIdleCinematic(false);
      }
      scheduleIdle();
    };

    const onPointerMove = (e: PointerEvent) => {
      const prev = lastPointerRef.current;
      if (prev) {
        const dist = Math.hypot(e.clientX - prev.x, e.clientY - prev.y);
        if (dist < 4) return;
      }
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      wakeAndReset();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // Shift + C 快速切換預覽待機電影模式（輸入框內不觸發）
      const inInput =
        e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (!inInput && e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && e.code === 'KeyC') {
        e.preventDefault();
        const next = !useWorldStore.getState().isIdleCinematic;
        useWorldStore.getState().setIdleCinematic(next);
        if (!next) scheduleIdle();
        else if (timerRef.current !== null) {
          window.clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        return;
      }
      wakeAndReset();
    };

    scheduleIdle();

    window.addEventListener('pointerdown', wakeAndReset, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('wheel', wakeAndReset, { passive: true });
    window.addEventListener('touchstart', wakeAndReset, { passive: true });
    window.addEventListener('touchmove', wakeAndReset, { passive: true });
    window.addEventListener('keydown', onKeyDown);

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      window.removeEventListener('pointerdown', wakeAndReset);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('wheel', wakeAndReset);
      window.removeEventListener('touchstart', wakeAndReset);
      window.removeEventListener('touchmove', wakeAndReset);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [displayMode, setIdleCinematic]);

  if (displayMode !== 'universe-3d') return null;

  return (
    <div
      className={`idle-cinematic-overlay ${isIdleCinematic ? 'idle-cinematic-overlay--active' : ''}`}
      aria-hidden={!isIdleCinematic}
    >
      {/* 上下 16:9 暗色電影遮罩 */}
      <div
        className="idle-cinematic-bar idle-cinematic-bar--top"
        style={{ height: `${bars.topBottomPx}px` }}
      />
      <div
        className="idle-cinematic-bar idle-cinematic-bar--bottom"
        style={{ height: `${bars.topBottomPx}px` }}
      />
      {/* 左右 16:9 暗色電影遮罩 */}
      <div
        className="idle-cinematic-bar idle-cinematic-bar--left"
        style={{ width: `${bars.leftRightPx}px` }}
      />
      <div
        className="idle-cinematic-bar idle-cinematic-bar--right"
        style={{ width: `${bars.leftRightPx}px` }}
      />

      {/* 電影暗角與極簡 16:9 細框 */}
      <div
        className="idle-cinematic-frame"
        style={{
          top: `${bars.topBottomPx}px`,
          bottom: `${bars.topBottomPx}px`,
          left: `${bars.leftRightPx}px`,
          right: `${bars.leftRightPx}px`,
        }}
      />

      <div
        className="idle-cinematic-caption"
        style={{ bottom: `${Math.max(12, Math.round(bars.topBottomPx / 2) - 8)}px` }}
      >
        CINEMATIC IDLE · 16:9 · 移動滑鼠或按任意鍵返回
      </div>
    </div>
  );
}
