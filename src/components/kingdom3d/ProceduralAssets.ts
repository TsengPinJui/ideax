import * as THREE from 'three';
import {
  BuildingInteractable,
  BridgeZone,
  CourtyardWallSegment,
  Collider,
  RegionManifest,
} from './types';
import { getStyleMaterials, LanternBatch, scaledBox } from './stylized/architecture';

// ==========================================
// 1. Clean Signboard Label Texture (High-Contrast Architectural Label)
// ==========================================

export function createSignPlaqueTexture(
  title: string,
  subtitle?: string,
  _accentHex: number = 0xd97706
): THREE.CanvasTexture {
  // 深色漆木匾＋金框金字
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 160);
  g.addColorStop(0, '#4a2412');
  g.addColorStop(1, '#2b130a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = '#d4a637';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 144);
  ctx.fillStyle = '#f2c94c';
  ctx.font = '900 52px "Noto Serif TC","Songti TC","PMingLiU",serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 256, subtitle ? 64 : 80);
  if (subtitle) {
    ctx.fillStyle = '#e9d8a6';
    ctx.font = '700 24px "Noto Serif TC","Songti TC","PMingLiU",serif';
    ctx.fillText(subtitle, 256, 118);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// ==========================================
// 2. Whitebox / Blockout Material Palette (No surface texture clutter)
// ==========================================

export class MaterialPalette {
  public islandGroundMat: THREE.MeshStandardMaterial;
  public plazaMat: THREE.MeshStandardMaterial;
  public roadCurbMat: THREE.MeshStandardMaterial;
  public wallWhiteMat: THREE.MeshStandardMaterial;
  public wallInteriorMat: THREE.MeshStandardMaterial;
  public floorInteriorMat: THREE.MeshStandardMaterial;
  public roofSlateMat: THREE.MeshStandardMaterial;
  public pillarMat: THREE.MeshStandardMaterial;
  public bridgeDeckMat: THREE.MeshStandardMaterial;
  public bridgeRailMat: THREE.MeshStandardMaterial;
  public waterMat: THREE.MeshStandardMaterial;
  public beaconMat: THREE.MeshBasicMaterial;

  constructor() {
    this.islandGroundMat = new THREE.MeshStandardMaterial({
      color: 0xd6d3d1, // Warm architectural light grey-stone blockout
      roughness: 0.9,
      metalness: 0.02,
    });

    this.plazaMat = new THREE.MeshStandardMaterial({
      color: 0xe7e5e4, // Brighter stone plaza blockout
      roughness: 0.85,
      metalness: 0.04,
    });

    this.roadCurbMat = new THREE.MeshStandardMaterial({
      color: 0x78716c, // Distinct darker curb border
      roughness: 0.85,
      metalness: 0.05,
    });

    this.wallWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf5f5f4, // Clean architectural whitebox wall
      roughness: 0.88,
      metalness: 0.02,
    });

    this.wallInteriorMat = new THREE.MeshStandardMaterial({
      color: 0xfafaf9,
      roughness: 0.85,
      metalness: 0.02,
    });

    this.floorInteriorMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7, // Warm light interior floor to distinguish walkable building interior
      roughness: 0.8,
      metalness: 0.05,
    });

    this.roofSlateMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Slate architectural roof block
      roughness: 0.7,
      metalness: 0.1,
    });

    this.pillarMat = new THREE.MeshStandardMaterial({
      color: 0x44403c,
      roughness: 0.75,
      metalness: 0.08,
    });

    this.bridgeDeckMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.82,
      metalness: 0.05,
    });

    this.bridgeRailMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.8,
      metalness: 0.08,
    });

    this.waterMat = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      roughness: 0.25,
      metalness: 0.15,
      transparent: true,
      opacity: 0.82,
    });

    this.beaconMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    });
  }

  public dispose() {
    const mats = [
      this.islandGroundMat,
      this.plazaMat,
      this.roadCurbMat,
      this.wallWhiteMat,
      this.wallInteriorMat,
      this.floorInteriorMat,
      this.roofSlateMat,
      this.pillarMat,
      this.bridgeDeckMat,
      this.bridgeRailMat,
      this.waterMat,
      this.beaconMat,
    ];
    for (const m of mats) {
      m.dispose();
    }
  }
}

// ==========================================
// 3. Walk-In Hollow Building Blockout Generator (可走入的主要建築物內部空間)
// ==========================================

export function createHollowBuildingBlockout(
  building: BuildingInteractable,
  mats: MaterialPalette
): THREE.Group {
  const root = new THREE.Group();
  root.position.copy(building.position);
  root.rotation.y = building.facingYaw;
  root.name = `building_${building.id}`;

  const w = building.width;
  const d = building.depth;
  const h = building.height;
  const doorW = building.doorWidth || 3.8;
  const doorH = Math.min(3.6, h - 0.8);
  const wallThick = 0.45;
  const tiers = building.tiers || 1;

  const accentMat = new THREE.MeshStandardMaterial({
    color: building.colorHex || 0xd97706,
    roughness: 0.65,
    metalness: 0.08,
  });

  // 1. Interior Walkable Floor Slab (flush at y = 0.03)
  const floorGeo = new THREE.BoxGeometry(w - 0.2, 0.06, d - 0.2);
  const floorMesh = new THREE.Mesh(floorGeo, mats.floorInteriorMat);
  floorMesh.position.y = 0.03;
  floorMesh.receiveShadow = true;
  root.add(floorMesh);

  // Threshold carpet / entrance step marker at front door (+Z)
  const stepMesh = new THREE.Mesh(
    new THREE.BoxGeometry(doorW, 0.07, 1.4),
    accentMat
  );
  stepMesh.position.set(0, 0.035, d / 2);
  root.add(stepMesh);

  // 2. Back Wall (-Z)
  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, wallThick),
    mats.wallWhiteMat
  );
  backWall.position.set(0, h / 2, -d / 2);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  root.add(backWall);

  // 3. Left Wall (-X)
  const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(wallThick, h, d),
    mats.wallWhiteMat
  );
  leftWall.position.set(-w / 2, h / 2, 0);
  leftWall.castShadow = true;
  leftWall.receiveShadow = true;
  root.add(leftWall);

  // 4. Right Wall (+X)
  const rightWall = new THREE.Mesh(
    new THREE.BoxGeometry(wallThick, h, d),
    mats.wallWhiteMat
  );
  rightWall.position.set(w / 2, h / 2, 0);
  rightWall.castShadow = true;
  rightWall.receiveShadow = true;
  root.add(rightWall);

  // 5. Front Wall Left & Right Wings (+Z, leaving open doorway in the middle)
  const frontWingW = Math.max(0.8, (w - doorW) / 2);
  const frontLeftWall = new THREE.Mesh(
    new THREE.BoxGeometry(frontWingW, h, wallThick),
    mats.wallWhiteMat
  );
  frontLeftWall.position.set(-w / 2 + frontWingW / 2, h / 2, d / 2);
  frontLeftWall.castShadow = true;
  root.add(frontLeftWall);

  const frontRightWall = new THREE.Mesh(
    new THREE.BoxGeometry(frontWingW, h, wallThick),
    mats.wallWhiteMat
  );
  frontRightWall.position.set(w / 2 - frontWingW / 2, h / 2, d / 2);
  frontRightWall.castShadow = true;
  root.add(frontRightWall);

  // 6. Lintel Wall Above Open Doorway
  const lintelH = Math.max(0.6, h - doorH);
  const lintelWall = new THREE.Mesh(
    new THREE.BoxGeometry(doorW + 0.1, lintelH, wallThick),
    mats.wallWhiteMat
  );
  lintelWall.position.set(0, doorH + lintelH / 2, d / 2);
  root.add(lintelWall);

  // Door frame pillars (accent color) so the entrance doorway is super obvious
  const jambGeo = new THREE.BoxGeometry(0.32, doorH, wallThick + 0.14);
  const leftJamb = new THREE.Mesh(jambGeo, accentMat);
  leftJamb.position.set(-doorW / 2, doorH / 2, d / 2);
  root.add(leftJamb);

  const rightJamb = new THREE.Mesh(jambGeo, accentMat);
  rightJamb.position.set(doorW / 2, doorH / 2, d / 2);
  root.add(rightJamb);

  const topBeam = new THREE.Mesh(
    new THREE.BoxGeometry(doorW + 0.6, 0.32, wallThick + 0.18),
    accentMat
  );
  topBeam.position.set(0, doorH, d / 2);
  root.add(topBeam);

  // 7. Corner Columns
  const colGeo = new THREE.CylinderGeometry(0.28, 0.28, h + 0.2, 8);
  const corners = [
    [-w / 2, -d / 2],
    [w / 2, -d / 2],
    [-w / 2, d / 2],
    [w / 2, d / 2],
  ];
  for (const [cx, cz] of corners) {
    const col = new THREE.Mesh(colGeo, mats.pillarMat);
    col.position.set(cx, h / 2, cz);
    root.add(col);
  }

  // 8. Stacked Architectural Roof Tiers (Whitebox Massing)
  for (let t = 0; t < tiers; t++) {
    const scale = 1 - t * 0.18;
    const tierW = (w + 1.6) * scale;
    const tierD = (d + 1.6) * scale;
    const tierY = h + t * 2.1;

    if (t > 0) {
      const upperBody = new THREE.Mesh(
        new THREE.BoxGeometry(tierW * 0.82, 1.4, tierD * 0.82),
        mats.wallWhiteMat
      );
      upperBody.position.set(0, tierY - 0.6, 0);
      root.add(upperBody);
    }

    const roofSlab = new THREE.Mesh(
      new THREE.BoxGeometry(tierW, 0.45, tierD),
      t === 0 ? accentMat : mats.roofSlateMat
    );
    roofSlab.position.set(0, tierY + 0.22, 0);
    roofSlab.castShadow = true;
    root.add(roofSlab);

    const roofCap = new THREE.Mesh(
      new THREE.ConeGeometry(Math.max(tierW, tierD) * 0.62, 1.35, 4),
      mats.roofSlateMat
    );
    roofCap.position.set(0, tierY + 1.1, 0);
    roofCap.rotation.y = Math.PI / 4;
    roofCap.scale.set(tierW / Math.max(tierW, tierD), 1, tierD / Math.max(tierW, tierD));
    root.add(roofCap);
  }

  // 9. Exterior Signboard Above Front Doorway (+Z)
  const plaqueTex = createSignPlaqueTexture(
    building.name,
    building.previewBadge,
    building.colorHex
  );
  const plaqueMat = new THREE.MeshBasicMaterial({ map: plaqueTex });
  const exteriorPlaque = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 1.45),
    plaqueMat
  );
  exteriorPlaque.position.set(0, doorH + 0.95, d / 2 + 0.3);
  root.add(exteriorPlaque);

  // 10. Interior Interactive Station / Desk + Back-Wall Feature Board (室內互動點)
  const deskGroup = new THREE.Group();
  deskGroup.position.set(0, 0, -d * 0.25);

  const deskPedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.8, 1.05, 12),
    accentMat
  );
  deskPedestal.position.y = 0.525;
  deskGroup.add(deskPedestal);

  const deskRing = new THREE.Mesh(
    new THREE.RingGeometry(1.2, 1.5, 24),
    mats.beaconMat
  );
  deskRing.rotation.x = -Math.PI / 2;
  deskRing.position.y = 0.06;
  deskGroup.add(deskRing);

  // Interior back-wall board so when player walks inside, they see the station title clearly
  const interiorBoard = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 1.65),
    plaqueMat
  );
  interiorBoard.position.set(0, 2.5, -d / 2 + 0.28);
  root.add(interiorBoard);

  root.add(deskGroup);

  return root;
}

// ==========================================
// 4. Career Island Courtyard Wall & Moon Gate Generator (徵才島園林圍牆與月洞門)
// ==========================================

export function createCourtyardWallMesh(
  seg: CourtyardWallSegment,
  _mats: MaterialPalette
): THREE.Group {
  // 粉牆黛瓦：白色粉牆、石砌牆基、黑瓦牆帽，月洞門兩側掛燈籠
  const sm = getStyleMaterials();
  const group = new THREE.Group();
  const dx = seg.x2 - seg.x1;
  const dz = seg.z2 - seg.z1;
  const len = Math.hypot(dx, dz);
  group.position.set((seg.x1 + seg.x2) / 2, 0, (seg.z1 + seg.z2) / 2);
  group.rotation.y = -Math.atan2(dz, dx);

  const h = seg.height || 3.2;
  const thick = 0.45;
  const wallPiece = (l: number, x: number) => {
    const base = new THREE.Mesh(scaledBox(l + 0.05, 0.6, thick + 0.12, 2, 0.6, 2), sm.stone);
    base.position.set(x, 0.3, 0);
    group.add(base);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(l, h - 0.6, thick), sm.plaster);
    wall.position.set(x, 0.6 + (h - 0.6) / 2, 0);
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);
    const coping = new THREE.Mesh(scaledBox(l + 0.3, 0.22, thick + 0.7, 1.5, 0.22, 1.5), sm.roofs.slate);
    coping.position.set(x, h + 0.11, 0);
    group.add(coping);
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(l + 0.3, 0.18, 0.22), sm.ridges.slate);
    ridge.position.set(x, h + 0.3, 0);
    group.add(ridge);
  };

  if (!seg.hasMoonGate) {
    wallPiece(len, 0);
  } else {
    const gateW = seg.gateWidth || 5.6;
    const wingLen = Math.max(0.5, (len - gateW) / 2);
    [-1, 1].forEach((dir) => {
      wallPiece(wingLen, dir * (gateW / 2 + wingLen / 2));
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, h + 0.5, 12), sm.redLacquer);
      pillar.position.set(dir * (gateW / 2), (h + 0.5) / 2, 0);
      group.add(pillar);
    });
    const header = new THREE.Mesh(new THREE.BoxGeometry(gateW + 0.8, 0.65, thick + 0.25), sm.plaster);
    header.position.set(0, h + 0.45, 0);
    group.add(header);
    const headerCap = new THREE.Mesh(scaledBox(gateW + 1.2, 0.22, thick + 0.8, 1.5, 0.22, 1.5), sm.roofs.slate);
    headerCap.position.set(0, h + 0.88, 0);
    group.add(headerCap);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(gateW / 2, 0.22, 10, 28, Math.PI), sm.stoneLight);
    rim.position.set(0, h - 0.8, 0);
    rim.scale.y = Math.min(1, 2.8 / (gateW / 2));
    group.add(rim);
    const lan = new LanternBatch();
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) lan.addHanging(sx * (gateW / 2 + 0.9), h - 0.6, sz * 0.75, 0.95);
    group.add(lan.build());
    if (seg.gateLabel) {
      const tex = createSignPlaqueTexture(seg.gateLabel, undefined, 0x0d9488);
      const signMat = new THREE.MeshBasicMaterial({ map: tex });
      for (const side of [1, -1]) {
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 1.1), signMat);
        sign.position.set(0, h + 1.5, side * 0.3);
        if (side < 0) sign.rotation.y = Math.PI;
        group.add(sign);
      }
    }
  }
  return group;
}

// ==========================================
// 5. Straight & Diagonal Arched Bridge Blockout Generator (橋上空間)
// ==========================================

export function createStoneArchBridge(
  bridge: BridgeZone,
  mats: MaterialPalette
): THREE.Group {
  const root = new THREE.Group();
  root.name = `bridge_${bridge.id}`;

  const dx = bridge.x2 - bridge.x1;
  const dz = bridge.z2 - bridge.z1;
  const span = Math.hypot(dx, dz);
  const midX = (bridge.x1 + bridge.x2) / 2;
  const midZ = (bridge.z1 + bridge.z2) / 2;
  const angle = Math.atan2(dx, dz);

  root.position.set(midX, 0, midZ);
  root.rotation.y = angle;

  const w = bridge.halfWidth * 2;
  const maxH = bridge.bridgeMaxHeight;
  const segments = 16;
  const stepZ = span / segments;

  for (let i = 0; i < segments; i++) {
    const t1 = i / segments;
    const t2 = (i + 1) / segments;
    const tMid = (t1 + t2) / 2;

    const localZ = (tMid - 0.5) * span;
    const y1 = Math.sin(t1 * Math.PI) * maxH;
    const y2 = Math.sin(t2 * Math.PI) * maxH;
    const yMid = Math.sin(tMid * Math.PI) * maxH;
    const pitch = Math.atan2(y1 - y2, stepZ);

    // Bridge deck segment
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.35, stepZ + 0.08),
      mats.bridgeDeckMat
    );
    deck.position.set(0, yMid - 0.12, localZ);
    deck.rotation.x = pitch;
    deck.receiveShadow = true;
    root.add(deck);

    // Left and right solid balustrade guardrails
    const railH = 1.05;
    [-w / 2 + 0.18, w / 2 - 0.18].forEach((rx) => {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, railH, stepZ + 0.06),
        mats.bridgeRailMat
      );
      rail.position.set(rx, yMid + railH / 2, localZ);
      rail.rotation.x = pitch;
      rail.castShadow = true;
      root.add(rail);
    });
  }

  // 4 Bridge Entry/Exit Corner Pillars with Bridge Sign
  const endOffsets = [
    [-w / 2, -span / 2],
    [w / 2, -span / 2],
    [-w / 2, span / 2],
    [w / 2, span / 2],
  ];
  for (const [px, pz] of endOffsets) {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 1.8, 0.55),
      mats.roadCurbMat
    );
    post.position.set(px, 0.9, pz);
    root.add(post);
  }

  return root;
}

// ==========================================
// 6. Island Landmass & Central Plaza Blockout Generator (島上與廣場內空間)
// ==========================================

export function createIslandWhiteboxBase(
  manifest: RegionManifest,
  mats: MaterialPalette
): THREE.Group {
  const group = new THREE.Group();
  const [cx, cz] = manifest.center;
  group.position.set(cx, 0, cz);
  group.name = `island_base_${manifest.id}`;

  const rx = manifest.islandRadiusX;
  const rz = manifest.islandRadiusZ;

  // 1. Main Elliptical Island Platform
  const islandGeo = new THREE.CylinderGeometry(1, 1.04, 1.6, 40);
  islandGeo.scale(rx, 1, rz);
  const islandMesh = new THREE.Mesh(islandGeo, mats.islandGroundMat);
  islandMesh.position.y = -0.8;
  islandMesh.receiveShadow = true;
  group.add(islandMesh);

  // 2. Perimeter Low Curb Ring (marks the walkable edge of the island clearly)
  const curbGeo = new THREE.RingGeometry(0.97, 1.0, 40);
  curbGeo.rotateX(-Math.PI / 2);
  curbGeo.scale(rx, 1, rz);
  const curbMesh = new THREE.Mesh(curbGeo, mats.roadCurbMat);
  curbMesh.position.y = 0.015;
  group.add(curbMesh);

  // 3. Central Walkable Plaza Disc (廣場內)
  const plazaGeo = new THREE.CylinderGeometry(
    manifest.plazaRadius,
    manifest.plazaRadius,
    0.04,
    36
  );
  const plazaMesh = new THREE.Mesh(plazaGeo, mats.plazaMat);
  plazaMesh.position.y = 0.01;
  plazaMesh.receiveShadow = true;
  group.add(plazaMesh);

  // Plaza border ring
  const plazaRimGeo = new THREE.RingGeometry(
    manifest.plazaRadius - 0.25,
    manifest.plazaRadius,
    36
  );
  plazaRimGeo.rotateX(-Math.PI / 2);
  const plazaRim = new THREE.Mesh(plazaRimGeo, mats.roadCurbMat);
  plazaRim.position.y = 0.025;
  group.add(plazaRim);

  // 4. Optional Central Landmark (e.g., Central Lightbulb Monument on 主島)
  if (manifest.landmark) {
    const lm = manifest.landmark;
    const lmGroup = new THREE.Group();
    lmGroup.position.set(lm.x - cx, 0, lm.z - cz);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(lm.radius, lm.radius + 0.4, 1.4, 16),
      mats.roadCurbMat
    );
    base.position.y = 0.7;
    lmGroup.add(base);

    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.9, lm.height - 2.5, 12),
      mats.wallWhiteMat
    );
    pillar.position.y = 1.4 + (lm.height - 2.5) / 2;
    lmGroup.add(pillar);

    const bulbMat = new THREE.MeshStandardMaterial({
      color: lm.colorHex,
      emissive: lm.colorHex,
      emissiveIntensity: 0.7,
      roughness: 0.3,
    });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(1.65, 16, 16), bulbMat);
    bulb.position.y = lm.height;
    lmGroup.add(bulb);

    group.add(lmGroup);
  }

  return group;
}

// ==========================================
// 7. Debug Collider Wireframe Visualizer
// ==========================================

export function createColliderWireframes(colliders: Collider[]): THREE.Group {
  const group = new THREE.Group();
  group.name = 'debug_collider_wireframes';

  const wireMat = new THREE.MeshBasicMaterial({
    color: 0xef4444,
    wireframe: true,
    transparent: true,
    opacity: 0.65,
  });

  for (const c of colliders) {
    if (c.type === 'box') {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(c.halfWidth * 2, 2.2, c.halfDepth * 2),
        wireMat
      );
      m.position.set(c.x, 1.1, c.z);
      group.add(m);
    } else if (c.type === 'cylinder') {
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(c.radius, c.radius, 2.2, 12),
        wireMat
      );
      m.position.set(c.x, 1.1, c.z);
      group.add(m);
    } else if (c.type === 'segment') {
      const dx = c.x2 - c.x1;
      const dz = c.z2 - c.z1;
      const len = Math.hypot(dx, dz);
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(len, 2.2, c.halfThickness * 2),
        wireMat
      );
      m.position.set((c.x1 + c.x2) / 2, 1.1, (c.z1 + c.z2) / 2);
      m.rotation.y = -Math.atan2(dz, dx);
      group.add(m);
    }
  }

  return group;
}
