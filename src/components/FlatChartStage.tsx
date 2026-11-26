import { useWorldStore } from '../store/useWorldStore';
import { BasicMandala2D } from './BasicMandala2D';
import { BodyGraph2DSvg } from './BodyGraph2DSvg';

/**
 * 2D 平面出圖舞台：
 * - displayMode === 'bodygraph-2d'：純淨 2D 平面人體圖（點中心跳 3D 中心、點閘門數字/圈圈/填色跳 3D 閘門走廊）
 * - displayMode === 'mandala-2d'：基礎版曼陀羅（外圈 64 易經卦象＋中圈閘門數字＋內圈 12 星座＋正中央可點擊人體圖）
 */
export function FlatChartStage() {
  const displayMode = useWorldStore((s) => s.displayMode);
  const chart = useWorldStore((s) => s.chart);
  const showChartDrawer = useWorldStore((s) => s.showChartDrawer);

  return (
    <div className={`flat-stage ${showChartDrawer ? 'flat-stage--with-drawer' : ''}`}>
      <div className="flat-stage__card">
        <div className="flat-stage__header">
          <div>
            <h2>{chart.name}的人類圖</h2>
            <p>
              {chart.birthDate} {chart.birthTime} · {chart.locationLabel}
            </p>
          </div>
          <span className="flat-stage__badge">
            {displayMode === 'bodygraph-2d' ? '2D 平面本命圖' : '2D 基礎版曼陀羅'}
          </span>
        </div>

        {displayMode === 'bodygraph-2d' ? (
          <div className="flat-bodygraph-layout">
            <div className="flat-bodygraph-center">
              <BodyGraph2DSvg className="bodygraph-2d-svg--full" />
            </div>
          </div>
        ) : (
          <div className="flat-mandala-layout">
            <BasicMandala2D />
          </div>
        )}

        <div className="flat-stage__footer">
          <span>© 人類設計 Lifestyle 為您呈現</span>
          <span>點中心進入 3D 中心空間 · 點閘門數字／圈圈／通道進入 3D 閘門走廊</span>
        </div>
      </div>
    </div>
  );
}
