import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkinnedScene } from 'three/examples/jsm/utils/SkeletonUtils.js';

export type KingdomModelAsset = 'stoneLion' | 'buffalo' | 'horse' | 'horseCart' | 'crane' | 'openBoat' | 'roofedBoat' | 'dog';

const MODEL_URLS: Record<KingdomModelAsset, string> = {
  stoneLion: '/assets/models/stone-lion.glb',
  buffalo: '/assets/models/buffalo.glb',
  horse: '/assets/models/rideable-horse.glb',
  horseCart: '/assets/models/horse-cart.glb',
  crane: '/assets/models/red-crowned-crane.glb',
  openBoat: '/assets/models/open-boat.glb',
  roofedBoat: '/assets/models/roofed-boat.glb',
  dog: '/assets/models/dog.glb',
};

/**
 * Default yaw (aligning each GLB's forward axis to local -Z, or +Z for doorway stone lions)
 * and target world-space bounding envelope [width, height, length].
 * Uniform scaling is used so models never stretch or distort.
 */
const MODEL_DEFAULTS: Record<KingdomModelAsset, { yaw: number; size: [number, number, number] }> = {
  stoneLion: { yaw: 0, size: [1.25, 1.95, 1.45] },
  buffalo: { yaw: -Math.PI / 2, size: [1.65, 1.65, 2.35] },
  horse: { yaw: Math.PI, size: [1.45, 2.05, 2.55] },
  horseCart: { yaw: Math.PI, size: [2.4, 2.85, 4.95] },
  crane: { yaw: Math.PI / 2, size: [1.55, 2.15, 1.65] },
  openBoat: { yaw: -Math.PI / 2, size: [2.35, 1.45, 4.4] },
  roofedBoat: { yaw: -Math.PI / 2, size: [2.65, 2.4, 4.8] },
  dog: { yaw: Math.PI, size: [0.65, 0.72, 0.95] },
};

interface LoadedModelAsset {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const loaded = new Map<KingdomModelAsset, Promise<LoadedModelAsset>>();

function loadAsset(asset: KingdomModelAsset): Promise<LoadedModelAsset> {
  let promise = loaded.get(asset);
  if (!promise) {
    promise = loader.loadAsync(MODEL_URLS[asset]).then(({ scene, animations }) => ({
      scene,
      animations: animations || [],
    }));
    loaded.set(asset, promise);
  }
  return promise;
}

type BoneRole =
  | 'fl_upper'
  | 'fl_lower'
  | 'fr_upper'
  | 'fr_lower'
  | 'hl_upper'
  | 'hl_lower'
  | 'hr_upper'
  | 'hr_lower'
  | 'head'
  | 'tail'
  | 'spine'
  | 'wing_l'
  | 'wing_r';

interface RiggedBone {
  object: THREE.Bone;
  name: string;
  role: BoneRole | null;
  baseQuat: THREE.Quaternion;
  pitchAxis: THREE.Vector3;
  yawAxis: THREE.Vector3;
  rollAxis: THREE.Vector3;
  weight: number;
}

const BONE_ROLE_MAP: Partial<Record<KingdomModelAsset, Record<string, { role: BoneRole; weight?: number }>>> = {
  dog: {
    tripo1_left_limb_0: { role: 'fl_upper', weight: 0.75 },
    bone_18: { role: 'fl_upper', weight: 0.45 },
    tripo1_left_limb_1: { role: 'fl_lower', weight: 1.0 },
    tripo0_right_limb_0: { role: 'fr_upper', weight: 0.65 },
    tripo0_right_limb_1: { role: 'fr_upper', weight: 0.55 },
    tripo0_right_limb_2: { role: 'fr_lower', weight: 1.0 },
    tripo0_left_limb_1: { role: 'hl_upper', weight: 1.0 },
    tripo0_left_limb_2: { role: 'hl_lower', weight: 1.0 },
    bone_3: { role: 'hr_upper', weight: 1.0 },
    bone_4: { role: 'hr_lower', weight: 1.0 },
    bone_9: { role: 'head', weight: 0.55 },
    bone_10: { role: 'head', weight: 0.45 },
    bone_11: { role: 'head', weight: 0.3 },
    tripotail_0: { role: 'tail', weight: 1.0 },
    tripospine_0: { role: 'spine', weight: 0.5 },
    tripospine_1: { role: 'spine', weight: 0.5 },
  },
  buffalo: {
    tripo0_left_limb_0: { role: 'fl_upper', weight: 0.65 },
    tripo0_left_limb_1: { role: 'fl_upper', weight: 0.5 },
    tripo0_left_limb_2: { role: 'fl_lower', weight: 0.7 },
    tripo0_left_limb_3: { role: 'fl_lower', weight: 0.5 },
    tripo0_left_limb_4: { role: 'fr_upper', weight: 1.0 },
    tripo0_right_limb_0: { role: 'hl_upper', weight: 0.65 },
    tripo0_right_limb_1: { role: 'hl_upper', weight: 0.5 },
    tripo0_right_limb_2: { role: 'hl_lower', weight: 0.7 },
    tripo0_right_limb_3: { role: 'hl_lower', weight: 0.5 },
    tripo1_right_limb_0: { role: 'hr_upper', weight: 0.65 },
    tripo1_right_limb_1: { role: 'hr_upper', weight: 0.5 },
    tripo1_right_limb_2: { role: 'hr_lower', weight: 0.7 },
    tripo1_right_limb_3: { role: 'hr_lower', weight: 0.5 },
    tripohead_0: { role: 'head', weight: 0.6 },
    tripohead_1: { role: 'head', weight: 0.5 },
    tripo1_left_limb_1: { role: 'tail', weight: 0.5 },
    tripo1_left_limb_2: { role: 'tail', weight: 0.6 },
    tripo1_left_limb_3: { role: 'tail', weight: 0.6 },
    tripo1_left_limb_4: { role: 'tail', weight: 0.5 },
    tripospine_1: { role: 'spine', weight: 0.4 },
    tripospine_3: { role: 'spine', weight: 0.4 },
    tripospine_5: { role: 'spine', weight: 0.4 },
  },
  horse: {
    tripospine_7: { role: 'fl_upper', weight: 0.55 },
    bone_22: { role: 'fl_upper', weight: 0.65 },
    tripo0_left_limb_0: { role: 'fl_lower', weight: 1.0 },
    tripo0_right_limb_0: { role: 'fr_upper', weight: 0.65 },
    bone_20: { role: 'fr_upper', weight: 0.55 },
    bone_21: { role: 'fr_lower', weight: 1.0 },
    tripo1_left_limb_0: { role: 'hl_upper', weight: 0.65 },
    tripo1_left_limb_1: { role: 'hl_upper', weight: 0.55 },
    tripo1_left_limb_2: { role: 'hl_lower', weight: 0.75 },
    tripo1_left_limb_3: { role: 'hl_lower', weight: 0.5 },
    bone_61: { role: 'hr_upper', weight: 0.65 },
    tripo1_right_limb_0: { role: 'hr_upper', weight: 0.55 },
    tripo1_right_limb_1: { role: 'hr_lower', weight: 0.75 },
    tripo1_right_limb_2: { role: 'hr_lower', weight: 0.5 },
    tripohead_0: { role: 'head', weight: 0.55 },
    tripohead_1: { role: 'head', weight: 0.5 },
    bone_12: { role: 'head', weight: 0.4 },
    bone_47: { role: 'tail', weight: 0.45 },
    bone_48: { role: 'tail', weight: 0.45 },
    bone_49: { role: 'tail', weight: 0.45 },
    tripotail_0: { role: 'tail', weight: 0.5 },
    tripotail_1: { role: 'tail', weight: 0.5 },
    tripotail_2: { role: 'tail', weight: 0.5 },
    tripospine_1: { role: 'spine', weight: 0.4 },
    tripospine_3: { role: 'spine', weight: 0.4 },
    tripospine_5: { role: 'spine', weight: 0.4 },
  },
  horseCart: {
    // 僅驅動前方拉車駿馬的四肢與頭頸；車廂與車頂骨架 (tripohead_0, tripospine_0, bone_25..37) 保持完全穩定
    bone_12: { role: 'fl_upper', weight: 0.6 },
    bone_13: { role: 'fl_upper', weight: 0.55 },
    bone_16: { role: 'fl_upper', weight: 0.45 },
    bone_14: { role: 'fl_lower', weight: 0.75 },
    bone_15: { role: 'fl_lower', weight: 0.55 },
    bone_17: { role: 'fr_upper', weight: 0.6 },
    bone_18: { role: 'fr_upper', weight: 0.55 },
    bone_21: { role: 'fr_upper', weight: 0.45 },
    bone_19: { role: 'fr_lower', weight: 0.7 },
    bone_20: { role: 'fr_lower', weight: 0.5 },
    bone_22: { role: 'fr_lower', weight: 0.45 },
    bone_9: { role: 'hl_upper', weight: 0.65 },
    bone_10: { role: 'hl_upper', weight: 0.55 },
    bone_11: { role: 'hl_lower', weight: 1.0 },
    bone_6: { role: 'hr_upper', weight: 0.65 },
    bone_7: { role: 'hr_upper', weight: 0.55 },
    bone_8: { role: 'hr_lower', weight: 1.0 },
    bone_2: { role: 'head', weight: 0.6 },
    bone_3: { role: 'head', weight: 0.5 },
  },
  crane: {
    bone_11: { role: 'wing_l', weight: 0.65 },
    bone_12: { role: 'wing_l', weight: 0.55 },
    bone_14: { role: 'wing_l', weight: 0.4 },
    bone_17: { role: 'wing_r', weight: 0.65 },
    bone_18: { role: 'wing_r', weight: 0.55 },
    bone_19: { role: 'wing_r', weight: 0.4 },
    tripo0_left_limb_0: { role: 'fl_upper', weight: 0.8 },
    tripo0_left_limb_1: { role: 'fl_lower', weight: 0.8 },
    tripo0_right_limb_0: { role: 'fr_upper', weight: 0.8 },
    tripo0_right_limb_1: { role: 'fr_lower', weight: 0.8 },
    bone_3: { role: 'head', weight: 0.45 },
    bone_4: { role: 'head', weight: 0.45 },
    tripohead_0: { role: 'head', weight: 0.4 },
    tripohead_3: { role: 'head', weight: 0.35 },
  },
};

const _qPitch = new THREE.Quaternion();
const _qYaw = new THREE.Quaternion();
const _qRoll = new THREE.Quaternion();

function computeAnimatedSkinnedBounds(
  root: THREE.Object3D,
  mixer?: THREE.AnimationMixer,
  clip?: THREE.AnimationClip
): THREE.Box3 {
  if (!mixer || !clip) {
    root.updateMatrixWorld(true);
    return new THREE.Box3().setFromObject(root);
  }
  const skinnedMeshes: THREE.SkinnedMesh[] = [];
  root.traverse((node) => {
    if ((node as THREE.SkinnedMesh).isSkinnedMesh) {
      skinnedMeshes.push(node as THREE.SkinnedMesh);
    }
  });
  if (skinnedMeshes.length === 0) {
    root.updateMatrixWorld(true);
    return new THREE.Box3().setFromObject(root);
  }
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  const samples = 8;
  const duration = Math.max(clip.duration, 0.01);
  for (let s = 0; s <= samples; s++) {
    mixer.setTime((s / samples) * duration);
    root.updateMatrixWorld(true);
    for (const sm of skinnedMeshes) {
      sm.skeleton?.update();
      const posAttr = sm.geometry.attributes.position;
      const step = Math.max(1, Math.floor(posAttr.count / 600));
      for (let i = 0; i < posAttr.count; i += step) {
        sm.getVertexPosition(i, v);
        v.applyMatrix4(sm.matrixWorld);
        box.expandByPoint(v);
      }
    }
  }
  mixer.setTime(0);
  root.updateMatrixWorld(true);
  for (const sm of skinnedMeshes) {
    sm.skeleton?.update();
  }
  return box;
}

function fitClone(loadedAsset: LoadedModelAsset, target: THREE.Object3D, asset: KingdomModelAsset) {
  const { scene: source, animations } = loadedAsset;
  const clone = new THREE.Group();
  const inner = new THREE.Group();
  const clonedScene = cloneSkinnedScene(source);
  inner.add(clonedScene);
  clone.add(inner);

  clone.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      node.castShadow = true;
      node.receiveShadow = true;
      node.userData.noMerge = true;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      for (const mat of mats) {
        if (mat && (mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
          const stdMat = mat as THREE.MeshStandardMaterial;
          if (stdMat.map) {
            stdMat.map.colorSpace = THREE.SRGBColorSpace;
            stdMat.map.needsUpdate = true;
          }
          stdMat.metalness = Math.min(stdMat.metalness ?? 0, 0.12);
          stdMat.roughness = Math.max(stdMat.roughness ?? 0.65, 0.52);
          stdMat.needsUpdate = true;
        }
      }
    }
  });

  const defaults = MODEL_DEFAULTS[asset];
  const yaw = target.userData.modelYaw !== undefined ? Number(target.userData.modelYaw) : defaults.yaw;
  inner.rotation.y = yaw;
  clone.updateMatrixWorld(true);

  let mixer: THREE.AnimationMixer | undefined;
  let activeClip: THREE.AnimationClip | undefined;
  if (animations && animations.length > 0) {
    mixer = new THREE.AnimationMixer(clonedScene);
    activeClip = animations.find((a) => /walk|run|move/i.test(a.name)) || animations[0];
    const action = mixer.clipAction(activeClip);
    action.play();
    target.userData.modelMixer = mixer;
    target.userData.modelAction = action;
  }

  const bounds = computeAnimatedSkinnedBounds(clone, mixer, activeClip);
  const size = bounds.getSize(new THREE.Vector3());
  const desired = (target.userData.modelSize as [number, number, number] | undefined) || defaults.size;
  if (desired) {
    // Use uniform scaling after applying yaw so GLB proportions are 100% preserved without distortion
    const uniformScale = Math.min(
      desired[0] / Math.max(size.x, 0.001),
      desired[1] / Math.max(size.y, 0.001),
      desired[2] / Math.max(size.z, 0.001)
    );
    clone.scale.setScalar(uniformScale);
  }

  const fitted = computeAnimatedSkinnedBounds(clone, mixer, activeClip);
  const center = fitted.getCenter(new THREE.Vector3());
  clone.position.x -= center.x;
  clone.position.z -= center.z;
  // Lift by -fitted.min.y (plus a tiny 4mm pad) so animated paws rest cleanly on the ground without floor clipping
  clone.position.y -= fitted.min.y - 0.004;
  clone.updateMatrixWorld(true);

  if (!mixer) {
    // Compute each bone's world-aligned local rotation axes at rest pose for procedural skeletal animation
    const roleTable = BONE_ROLE_MAP[asset] || {};
    const bones: RiggedBone[] = [];
    clone.traverse((object) => {
      if ((object as THREE.Bone).isBone) {
        const bone = object as THREE.Bone;
        const name = bone.name.toLowerCase();
        const spec = roleTable[name];
        const invRot = new THREE.Matrix4().extractRotation(bone.matrixWorld).invert();
        const pitchAxis = new THREE.Vector3(1, 0, 0).applyMatrix4(invRot).normalize();
        const yawAxis = new THREE.Vector3(0, 1, 0).applyMatrix4(invRot).normalize();
        const rollAxis = new THREE.Vector3(0, 0, 1).applyMatrix4(invRot).normalize();
        bones.push({
          object: bone,
          name,
          role: spec ? spec.role : null,
          baseQuat: bone.quaternion.clone(),
          pitchAxis,
          yawAxis,
          rollAxis,
          weight: spec?.weight ?? 1.0,
        });
      }
    });
    target.userData.modelBones = bones;
  }

  target.add(clone);
  target.userData.modelVisual = clone;
  target.userData.modelBaseY = clone.position.y;
  const namedParts: Array<{ object: THREE.Object3D; kind: 'wheel' | 'wing' | 'leg' | 'tail'; base: THREE.Euler }> = [];
  clone.traverse((object) => {
    const name = object.name.toLowerCase();
    const kind = /wheel|tire|rim|車輪|輪子/.test(name)
      ? 'wheel'
      : /wing|翅|翼/.test(name)
        ? 'wing'
        : /leg|foot|hoof|腿|蹄/.test(name)
          ? 'leg'
          : /tail|尾/.test(name)
            ? 'tail'
            : null;
    if (kind) namedParts.push({ object, kind, base: object.rotation.clone() });
  });
  target.userData.modelParts = namedParts;
  return clone;
}

/** Movement cues for rigged GLBs: native AnimationMixer playback when embedded clips exist, or procedural skeletal gaits. */
export function animateModelMotion(target: THREE.Object3D, time: number, speed: number, kind: 'animal' | 'boat' | 'cart') {
  const visual = target.userData.modelVisual as THREE.Group | undefined;
  if (!visual) return;
  const asset = target.userData.modelAsset as KingdomModelAsset | undefined;
  const moving = speed > 0.08;
  const baseY = Number(target.userData.modelBaseY || 0);

  // Smoothly integrate gait cycle phase so speed changes (e.g. walk -> gallop) never jump
  const prevTime = target.userData.animPrevTime as number | undefined;
  const dt = prevTime !== undefined ? Math.max(0.0, Math.min(0.1, time - prevTime)) : 0.016;
  target.userData.animPrevTime = time;

  // If the GLB has a built-in AnimationMixer (e.g. poodle puppy 3d model.glb), drive it directly
  const mixer = target.userData.modelMixer as THREE.AnimationMixer | undefined;
  if (mixer) {
    visual.position.y = baseY;
    visual.rotation.x = 0;
    visual.rotation.z = 0;
    const rate = moving ? Math.max(0.85, Math.min(2.2, speed / 1.15)) : 0;
    mixer.update(dt * rate);
    return;
  }

  const isGalloping = asset === 'horse' && speed > 13.5;
  let cycleFreq = 1.4;
  if (moving) {
    if (asset === 'dog') {
      cycleFreq = 9.2 + Math.min(speed, 4) * 1.8;
    } else if (asset === 'buffalo') {
      cycleFreq = 5.4 + Math.min(speed, 9) * 0.65;
    } else if (asset === 'horseCart' || kind === 'cart') {
      cycleFreq = 6.8 + Math.min(speed, 16) * 0.58;
    } else if (asset === 'horse') {
      cycleFreq = isGalloping
        ? 13.5 + Math.min(speed - 13.5, 16) * 0.35
        : 7.4 + Math.min(speed, 13.5) * 0.45;
    } else {
      cycleFreq = 6.2;
    }
  }
  const walkPhase = ((target.userData.walkPhase as number | undefined) ?? 0) + dt * cycleFreq;
  target.userData.walkPhase = walkPhase;

  if (kind === 'boat') {
    const boatPhase = moving ? time * 6.2 : time * 1.15;
    visual.position.y = baseY + Math.sin(boatPhase) * 0.035;
    visual.rotation.z = moving ? Math.cos(boatPhase) * 0.018 : Math.sin(boatPhase) * 0.01;
    visual.rotation.x = Math.sin(boatPhase * 0.72) * 0.022;
  } else if (kind === 'cart' || asset === 'horseCart') {
    // 馬車停駐等待時完全貼地靜止，不產生任何上下漂浮或搖晃；移動時僅有輕微車輪顛簸
    visual.position.y = moving ? baseY + Math.abs(Math.sin(walkPhase)) * 0.012 : baseY;
    visual.rotation.z = moving ? Math.cos(walkPhase) * 0.008 : 0;
    visual.rotation.x = moving ? Math.sin(walkPhase * 2) * 0.006 : 0;
  } else if (asset === 'crane') {
    visual.position.y = moving ? baseY + Math.abs(Math.sin(walkPhase)) * 0.06 : baseY;
    visual.rotation.z = moving ? Math.cos(walkPhase) * 0.025 : 0;
    visual.rotation.x = moving ? Math.sin(walkPhase) * 0.02 : 0;
  } else if (isGalloping) {
    // 駿馬奔跑（Gallop）：四蹄騰空躍動與前後俯仰衝刺感
    visual.position.y = baseY + Math.abs(Math.sin(walkPhase)) * 0.11;
    visual.rotation.x = Math.cos(walkPhase) * 0.068;
    visual.rotation.z = Math.sin(walkPhase * 0.5) * 0.018;
  } else {
    // 陸地動物（狗、水牛、慢走馬）停駐時四腳貼地不漂浮，行走時自然步伐起伏
    const bounce = asset === 'dog' ? 0.026 : asset === 'buffalo' ? 0.032 : 0.042;
    visual.position.y = moving ? baseY + Math.abs(Math.sin(walkPhase)) * bounce : baseY;
    visual.rotation.z = moving ? Math.cos(walkPhase) * (asset === 'dog' ? 0.028 : 0.018) : 0;
    visual.rotation.x = moving ? Math.sin(walkPhase * 2) * 0.016 : 0;
  }

  const bones = target.userData.modelBones as RiggedBone[] | undefined;
  if (bones && bones.length > 0) {
    // Stride amplitude & knee flex by species and gait
    const strideAmp =
      asset === 'dog'
        ? 0.52
        : asset === 'buffalo'
          ? 0.42
          : asset === 'horseCart'
            ? 0.48 + Math.min(speed, 16) * 0.012
            : isGalloping
              ? 0.82
              : 0.48;
    const kneeAmp =
      asset === 'dog'
        ? 0.42
        : asset === 'buffalo'
          ? 0.34
          : asset === 'horseCart'
            ? 0.44
            : isGalloping
              ? 0.68
              : 0.42;

    // Phase offsets for the 4 limbs:
    // - Walk/Trot: diagonal pairs (FL & HR in phase, FR & HL opposite)
    // - Horse Gallop: front pair bounds with lead offset (0, 0.55), hind pair drives in opposition (PI, PI + 0.55)
    const flPhase = walkPhase;
    const frPhase = isGalloping ? walkPhase + 0.55 : walkPhase + Math.PI;
    const hlPhase = isGalloping ? walkPhase + Math.PI : walkPhase + Math.PI + 0.25;
    const hrPhase = isGalloping ? walkPhase + Math.PI + 0.55 : walkPhase + 0.25;

    for (let i = 0; i < bones.length; i++) {
      const b = bones[i];
      b.object.quaternion.copy(b.baseQuat);
      if (!b.role) continue;

      let pitch = 0;
      let yaw = 0;
      let roll = 0;

      if (!moving) {
        // Idle breathing, grazing / looking around, and tail wagging
        if (b.role === 'head') {
          if (asset === 'dog') {
            pitch = Math.sin(time * 2.1) * 0.06;
            yaw = Math.sin(time * 1.4) * 0.1;
          } else if (asset === 'buffalo') {
            pitch = Math.sin(time * 1.1) * 0.08 + 0.05;
            yaw = Math.sin(time * 0.7) * 0.06;
          } else if (asset === 'horse' || asset === 'horseCart') {
            pitch = Math.sin(time * 1.5) * 0.05;
            yaw = Math.sin(time * 0.9) * 0.04;
          }
        } else if (b.role === 'tail') {
          if (asset === 'dog') {
            yaw = Math.sin(time * 6.5) * 0.28;
            pitch = 0.12;
          } else {
            yaw = Math.sin(time * 1.8 + i * 0.3) * 0.14;
          }
        } else if (b.role === 'spine') {
          pitch = Math.sin(time * 1.6) * 0.012;
        }
      } else if (asset === 'crane') {
        if (b.role === 'wing_l') {
          roll = -(Math.sin(walkPhase * 1.4) * 0.52 + 0.1);
        } else if (b.role === 'wing_r') {
          roll = Math.sin(walkPhase * 1.4) * 0.52 + 0.1;
        } else if (b.role === 'fl_upper') {
          pitch = Math.sin(flPhase) * 0.32;
        } else if (b.role === 'fr_upper') {
          pitch = Math.sin(frPhase) * 0.32;
        } else if (b.role === 'head') {
          pitch = Math.sin(walkPhase * 1.4) * 0.08;
        }
      } else {
        // Quadruped walking & galloping skeletal animation
        switch (b.role) {
          case 'fl_upper':
            pitch = Math.sin(flPhase) * strideAmp;
            break;
          case 'fl_lower':
            // Knee bends backward (-pitch) while the leg lifts forward (cos > 0)
            pitch = -Math.max(0, Math.cos(flPhase)) * kneeAmp;
            break;
          case 'fr_upper':
            pitch = Math.sin(frPhase) * strideAmp;
            break;
          case 'fr_lower':
            pitch = -Math.max(0, Math.cos(frPhase)) * kneeAmp;
            break;
          case 'hl_upper':
            pitch = Math.sin(hlPhase) * strideAmp * (isGalloping ? 1.08 : 0.95);
            break;
          case 'hl_lower':
            pitch = -Math.max(0, Math.cos(hlPhase)) * kneeAmp * 0.9;
            break;
          case 'hr_upper':
            pitch = Math.sin(hrPhase) * strideAmp * (isGalloping ? 1.08 : 0.95);
            break;
          case 'hr_lower':
            pitch = -Math.max(0, Math.cos(hrPhase)) * kneeAmp * 0.9;
            break;
          case 'head':
            if (isGalloping) {
              // 奔跑時馬頸向前探出並隨步伐強勁律動
              pitch = 0.14 + Math.sin(walkPhase - 0.5) * 0.22;
            } else if (asset === 'dog') {
              pitch = Math.sin(walkPhase * 2) * 0.11;
              yaw = Math.cos(walkPhase) * 0.06;
            } else if (asset === 'buffalo') {
              pitch = 0.06 + Math.sin(walkPhase * 2) * 0.09;
              yaw = Math.sin(walkPhase) * 0.05;
            } else {
              pitch = Math.sin(walkPhase * 2) * 0.12;
            }
            break;
          case 'tail':
            if (isGalloping) {
              // 奔跑時馬尾揚起隨風擺動
              pitch = -0.32 + Math.cos(walkPhase) * 0.18;
              yaw = Math.sin(walkPhase * 1.5) * 0.24;
            } else if (asset === 'dog') {
              pitch = 0.18 + Math.sin(walkPhase * 2) * 0.08;
              yaw = Math.sin(walkPhase * 2.2) * 0.38;
            } else {
              yaw = Math.sin(walkPhase * 1.4 + i * 0.25) * 0.22;
              pitch = Math.cos(walkPhase * 2) * 0.06;
            }
            break;
          case 'spine':
            pitch = isGalloping ? Math.sin(walkPhase) * 0.09 : Math.sin(walkPhase * 2) * 0.025;
            break;
        }
      }

      const w = b.weight;
      if (pitch !== 0) {
        _qPitch.setFromAxisAngle(b.pitchAxis, pitch * w);
        b.object.quaternion.multiply(_qPitch);
      }
      if (yaw !== 0) {
        _qYaw.setFromAxisAngle(b.yawAxis, yaw * w);
        b.object.quaternion.multiply(_qYaw);
      }
      if (roll !== 0) {
        _qRoll.setFromAxisAngle(b.rollAxis, roll * w);
        b.object.quaternion.multiply(_qRoll);
      }
    }
  }

  const parts = target.userData.modelParts as Array<{ object: THREE.Object3D; kind: 'wheel' | 'wing' | 'leg' | 'tail'; base: THREE.Euler }> | undefined;
  parts?.forEach((part, index) => {
    part.object.rotation.copy(part.base);
    if (!moving) {
      if (part.kind === 'tail') part.object.rotation.z += Math.sin(walkPhase + index) * 0.08;
      if (part.kind === 'wing') part.object.rotation.z += Math.sin(walkPhase + index) * 0.04;
      return;
    }
    if (part.kind === 'wheel') part.object.rotation.x += walkPhase * 0.85;
    if (part.kind === 'leg') part.object.rotation.x += Math.sin(walkPhase + (index * Math.PI) / 2) * 0.22;
    if (part.kind === 'wing') part.object.rotation.z += Math.sin(walkPhase * 1.7 + index) * 0.32;
    if (part.kind === 'tail') part.object.rotation.z += Math.sin(walkPhase * 0.8 + index) * 0.16;
  });
  const oar = target.userData.oar as THREE.Object3D | undefined;
  if (oar) {
    const rowSpeed = moving ? 2.6 : 1.4;
    const rowPhase = time * rowSpeed;
    oar.rotation.z = Math.sin(rowPhase) * (moving ? 0.38 : 0.22);
    oar.rotation.x = 0.92 + Math.cos(rowPhase) * (moving ? 0.16 : 0.08);
  }
  const boatmanTorso = target.userData.boatmanTorso as THREE.Object3D | undefined;
  if (boatmanTorso) {
    const rowSpeed = moving ? 2.6 : 1.4;
    boatmanTorso.rotation.x = Math.cos(time * rowSpeed) * (moving ? 0.12 : 0.05);
  }
}

export async function loadModelInto(target: THREE.Object3D, asset: KingdomModelAsset) {
  if (target.userData.modelLoading || target.userData.modelVisual) return;
  target.userData.modelLoading = true;
  target.userData.modelLoaded = true;
  try {
    const source = await loadAsset(asset);
    const oldChildren = [...target.children];
    oldChildren.forEach((child) => {
      if (child.userData.keepOnModelSwap) return;
      target.remove(child);
    });
    fitClone(source, target, asset);
  } catch (error) {
    target.userData.modelLoaded = false;
    console.warn(`IdeaX 3D model could not be loaded: ${asset}`, error);
  } finally {
    target.userData.modelLoading = false;
  }
}

export function hydrateSceneModels(scene: THREE.Scene, _near?: THREE.Vector3, _range = 300) {
  const targets: Array<{ target: THREE.Object3D; asset: KingdomModelAsset }> = [];
  scene.traverse((node) => {
    const asset = node.userData.modelAsset as KingdomModelAsset | undefined;
    if (!asset || node.userData.modelLoaded || node.userData.modelLoading) return;
    targets.push({ target: node, asset });
  });
  targets.forEach(({ target, asset }) => {
    void loadModelInto(target, asset);
  });
}

