import * as THREE from 'three';
import type { BuildingInteractable } from '../types';
import type { Question } from '../../../types';
import { getStyleMaterials, scaledBox, buildRoofTier } from './architecture';
import { makePickProxy } from '../picking';

/**
 * 主島中央廣場的三座佈告欄（探索看板、島覽地圖、角色介紹）：
 * 不再是一棟房子，而是兩根朱柱、飛簷瓦頂的大佈告欄；點佈告欄在左側打開同樣的功能按鈕
 */

const KAI = '"DFKai-SB","BiauKai","Kaiti TC","STKaiti","KaiTi","LXGW WenKai TC","CWTeXKai","Noto Serif TC",serif';

const AGENTS: [string, string, string][] = [
  ['小燈泡', '調節器 Agent', '/agents/xiaodengpao.webp'],
  ['搜搜', '探索者 Agent', '/agents/sousou.webp'],
  ['白喵', '市場顧問 Agent', '/agents/baimiao.webp'],
  ['頂多慧', '官方客服 Agent', '/agents/duohui.webp'],
  ['007', 'AI CRM Agent', '/agents/agent007.webp'],
  ['大熊', '預備神兵', '/agents/bear.webp'],
];

const ISLANDS: [string, string, number, number][] = [
  ['主島', '中央廣場・貿易街', 0, 0],
  ['痛點島', '創點樓', -1, -1],
  ['討論島', '藏書閣・百工坊・茶藝街', 1, -1],
  ['創意島', '展覽館・電玩城・創意集', -1, 1],
  ['徵才島', '翰林院・求職廟', 1, 1],
];

const typeOf = (q: Question) =>
  q.postType === 'pain_point'
    ? '痛點'
    : q.postType === 'innovation_proposal'
    ? '提案'
    : q.postType === 'chat_discussion'
    ? '討論'
    : q.postType === 'vibecoding_app'
    ? '作品'
    : '提問';

export function drawHomeBoardTexture(id: string, questions: Question[] = []) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#efe0bd';
  ctx.fillRect(0, 0, 1024, 512);
  // 紙張紋理
  ctx.fillStyle = 'rgba(120,90,50,0.06)';
  for (let i = 0; i < 60; i++) ctx.fillRect((i * 97) % 1024, (i * 53) % 512, 120, 2);
  ctx.strokeStyle = '#7a4a22';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 1014, 502);
  ctx.fillStyle = '#8e2420';
  ctx.fillRect(16, 16, 992, 92);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff3d0';
  ctx.font = `900 58px ${KAI}`;
  const title = id === 'home-explore' ? '探索看板' : id === 'home-map' ? '島覽地圖' : '角色介紹';
  const sub = id === 'home-explore' ? '全站最新內容' : id === 'home-map' ? '五島導覽・點看板開全島地圖' : '創點源六位守護夥伴';
  ctx.fillText(title, 300, 62);
  ctx.font = `700 30px ${KAI}`;
  ctx.fillStyle = '#ffe2a0';
  ctx.fillText(sub, 740, 64);
  ctx.textAlign = 'left';
  if (id === 'home-explore') {
    const list = questions
      .filter((q) => q.status !== 'delisted' && !(q as any).isDelisted)
      .sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0))
      .slice(0, 6);
    if (!list.length) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#6b4a2a';
      ctx.font = `700 36px ${KAI}`;
      ctx.fillText('最新內容整理中', 512, 300);
    }
    list.forEach((q, i) => {
      const y = 150 + i * 60;
      ctx.fillStyle = '#b3261e';
      ctx.font = `900 26px ${KAI}`;
      ctx.fillText(`【${typeOf(q)}】`, 40, y);
      ctx.fillStyle = '#2b1a0c';
      ctx.font = `700 32px ${KAI}`;
      const t = ((q as any).appName || q.title || '').trim();
      ctx.fillText(t, 160, y, 820);
    });
  } else if (id === 'home-map') {
    // 簡單的五島圖
    for (const [name, sub2, dx, dz] of ISLANDS) {
      const x = 260 + dx * 160;
      const y = 300 + dz * 105;
      ctx.fillStyle = name === '主島' ? '#c9a45a' : '#8fae6a';
      ctx.beginPath();
      ctx.ellipse(x, y, 62, 44, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5a3a1a';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#2b1a0c';
      ctx.textAlign = 'center';
      ctx.font = `900 26px ${KAI}`;
      ctx.fillText(name, x, y);
      ctx.textAlign = 'left';
      void sub2;
    }
    ctx.strokeStyle = 'rgba(90,58,26,0.5)';
    ctx.lineWidth = 6;
    for (const [, , dx, dz] of ISLANDS.slice(1)) {
      ctx.beginPath();
      ctx.moveTo(260 + dx * 60, 300 + dz * 40);
      ctx.lineTo(260 + dx * 110, 300 + dz * 72);
      ctx.stroke();
    }
    ISLANDS.forEach(([name, sub2], i) => {
      const y = 160 + i * 66;
      ctx.fillStyle = '#8e2420';
      ctx.font = `900 32px ${KAI}`;
      ctx.fillText(name, 540, y);
      ctx.fillStyle = '#3e2a14';
      ctx.font = `700 26px ${KAI}`;
      ctx.fillText(sub2, 680, y, 320);
    });
  } else {
    AGENTS.forEach(([name, role], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 60 + col * 480;
      const y = 175 + row * 112;
      // 頭像框（圖片載入後畫進圓框裡）
      ctx.fillStyle = '#f6e7c4';
      ctx.beginPath();
      ctx.arc(x + 40, y, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b3261e';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = '#4a2a10';
      ctx.textAlign = 'center';
      ctx.font = `900 30px ${KAI}`;
      ctx.fillText(name.slice(0, 1), x + 40, y + 2);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#2b1a0c';
      ctx.font = `900 36px ${KAI}`;
      ctx.fillText(name, x + 104, y - 16);
      ctx.fillStyle = '#6b4a2a';
      ctx.font = `700 26px ${KAI}`;
      ctx.fillText(role, x + 104, y + 24);
    });
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (id === 'home-agents' && typeof Image !== 'undefined') {
    // Agent 頭像：載入後畫進圓框（照片可能比較大，畫成圓形頭像）
    AGENTS.forEach(([, , src], i) => {
      const img = new Image();
      img.onload = () => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cx = 60 + col * 480 + 40;
        const cy = 175 + row * 112;
        const r = 42;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = '#f6e7c4';
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        // 取圖片上半部（頭臉）放大填滿圓框
        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;
        const side = Math.min(iw, ih * 0.62);
        const sx = (iw - side) / 2;
        const sy = Math.max(0, ih * 0.04);
        ctx.drawImage(img, sx, sy, side, side, cx - r, cy - r, r * 2, r * 2);
        ctx.restore();
        ctx.strokeStyle = '#b3261e';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 1, 0, Math.PI * 2);
        ctx.stroke();
        t.needsUpdate = true;
      };
      img.src = src;
    });
  }
  return t;
}

export function createNoticeBoard(b: BuildingInteractable): THREE.Group {
  const sm = getStyleMaterials();
  const root = new THREE.Group();
  root.name = `board_${b.id}`;
  root.position.set(b.position.x, 0, b.position.z);
  root.rotation.y = b.facingYaw;
  const w = b.width;
  const postX = w / 2 - 0.25;
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    root.add(m);
    return m;
  };
  for (const s of [-1, 1]) {
    add(scaledBox(0.6, 0.45, 0.7, 1, 0.45, 1), sm.stone, s * postX, 0.22, 0);
    add(new THREE.CylinderGeometry(0.16, 0.18, 3.9, 12), sm.redLacquer, s * postX, 2.1, 0);
  }
  const bw = w - 0.75;
  const bh = bw * 0.5;
  const by = 2.25;
  add(new THREE.BoxGeometry(bw + 0.24, bh + 0.24, 0.16), sm.darkWood, 0, by, 0);
  add(new THREE.BoxGeometry(w - 0.1, 0.16, 0.26), sm.gold, 0, by + bh / 2 + 0.16, 0);
  add(new THREE.BoxGeometry(w - 0.1, 0.12, 0.22), sm.darkWood, 0, by - bh / 2 - 0.12, 0);
  const tex = drawHomeBoardTexture(b.id);
  const mat = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.42, roughness: 0.6 });
  const front = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), mat);
  front.position.set(0, by, 0.085);
  front.userData.noMerge = true;
  front.userData.homeBoard = b.id;
  root.add(front);
  // 背面也貼同一張（從廣場外側走過來也看得到）
  const back = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), mat);
  back.position.set(0, by, -0.085);
  back.rotation.y = Math.PI;
  back.userData.noMerge = true;
  root.add(back);
  const roof = buildRoofTier(w + 0.5, 1.1, { rise: 0.6, overhang: 0.36, curl: 0.24, theme: 'slate', ridge: true, lite: true, horns: false });
  roof.position.y = by + bh / 2 + 0.28;
  root.add(roof);
  root.add(makePickProxy(w, by + bh / 2 + 0.6, 1.2, 0, 0, 0, { kind: 'building', id: b.id }));
  return root;
}

