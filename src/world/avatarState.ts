import * as THREE from 'three';

/**
 * 60/120fps 零 React 重繪的玩家化身共享空間狀態
 * 未來擴充自訂角色或捏臉系統時，位置與朝向仍由此處統一驅動
 */
export const avatarState = {
  position: new THREE.Vector3(0, 14, 48),
  velocity: new THREE.Vector3(),
  heading: 0,
};
