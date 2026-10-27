import * as THREE from 'three';
import { makePickProxy } from '../picking';

/** 搜搜（照 /island）：白毛、深藍衣、金色頭箍，駕著白色筋斗雲（雲上有藍色漩渦） */
export function createSosoNpc(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'npc_soso';
  const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ roughness: 0.55, ...p });
  const cloud = std({ color: 0xffffff, emissive: 0xdde8ff, emissiveIntensity: 0.25 });
  const swirl = std({ color: 0x3b82f6, roughness: 0.4 });
  const navy = std({ color: 0x1e3a8a, roughness: 0.5 });
  const fur = std({ color: 0xf8fafc });
  const skin = std({ color: 0xfde2c8, roughness: 0.6 });
  const gold = std({ color: 0xfbbf24, metalness: 0.6, roughness: 0.3 });
  const dark = std({ color: 0x1c1917 });
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  const body = new THREE.Group();
  g.add(body);
  // 筋斗雲
  const puffs: [number, number, number, number][] = [[0, 0.35, 0, 0.55], [-0.55, 0.3, 0.1, 0.42], [0.55, 0.3, -0.05, 0.45], [0.15, 0.42, 0.45, 0.38], [-0.2, 0.38, -0.45, 0.4], [-0.95, 0.24, 0.25, 0.28]];
  for (const [x, y, z, r] of puffs) add(new THREE.SphereGeometry(r, 14, 12), cloud, x, y, z);
  const sw = add(new THREE.TorusGeometry(0.2, 0.04, 8, 18, Math.PI * 1.45), swirl, 0.38, 0.52, 0.42);
  sw.rotation.y = 0.5;
  // 身體（深藍衣、白毛頭、臉、金頭箍、耳朵、眼睛）
  add(new THREE.CylinderGeometry(0.26, 0.36, 0.75, 14), navy, 0, 1.1, 0);
  add(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 14), gold, 0, 0.98, 0);
  add(new THREE.SphereGeometry(0.34, 18, 14), fur, 0, 1.72, 0);
  const face = add(new THREE.SphereGeometry(0.24, 16, 12), skin, 0, 1.68, 0.16);
  face.scale.set(1, 0.85, 0.6);
  add(new THREE.TorusGeometry(0.33, 0.035, 8, 24).rotateX(Math.PI / 2), gold, 0, 1.86, 0);
  for (const s of [-1, 1]) {
    add(new THREE.SphereGeometry(0.1, 10, 8), skin, s * 0.34, 1.74, 0);
    add(new THREE.SphereGeometry(0.035, 8, 6), dark, s * 0.08, 1.72, 0.3);
    const arm = add(new THREE.CylinderGeometry(0.07, 0.08, 0.5, 8), navy, s * 0.36, 1.18, 0.05);
    arm.rotation.z = s * 0.5;
  }
  // 名牌
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = 'rgba(28,16,8,0.8)';
  ctx.beginPath();
  ctx.roundRect(48, 6, 160, 52, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(226,184,90,0.9)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#f6e7c4';
  ctx.font = '800 30px "Noto Serif TC",serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('搜搜・問職缺', 128, 33);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
  tag.scale.set(1.7, 0.42, 1);
  tag.position.y = 2.45;
  g.add(tag);
  g.add(makePickProxy(1.8, 2.6, 1.6, 0, 0, 0, { kind: 'npc', id: 'soso' }));
  // 輕輕上下飄（由畫面每幀呼叫 userData.tick）
  g.userData.tick = (t: number) => {
    body.position.y = Math.sin(t * 1.6) * 0.08;
  };
  return g;
}
