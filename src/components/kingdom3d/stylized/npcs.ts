import * as THREE from 'three';
import { makePickProxy } from '../picking';
import { buildSousou } from './agents3d';

/** 搜搜（照 /island）：白毛、深藍衣、金色頭箍，駕著白色筋斗雲（雲上有藍色漩渦） */
export function createSosoNpc(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'npc_soso';
  // 造型和島上空飛的搜搜同一套（agents3d：銀髮藍頭巾、白藍衣、金藍棍、筋斗雲）
  const body = buildSousou();
  body.scale.setScalar(1.3);
  body.position.y = 0.45;
  g.add(body);
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
  ctx.fillStyle = '#fff9de';
  ctx.font = '900 30px "DFKai-SB","BiauKai","Kaiti TC","STKaiti","KaiTi","LXGW WenKai TC","CWTeXKai","Noto Serif TC",serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('搜搜・問職缺', 128, 33);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
  tag.scale.set(1.7, 0.42, 1);
  tag.position.y = 3.05;
  g.add(tag);
  g.add(makePickProxy(1.8, 2.6, 1.6, 0, 0, 0, { kind: 'npc', id: 'soso' }));
  // 輕輕上下飄（由畫面每幀呼叫 userData.tick）
  g.userData.tick = (t: number) => {
    body.position.y = 0.45 + Math.sin(t * 1.6) * 0.08;
  };
  return g;
}
