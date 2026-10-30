import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkinnedScene } from 'three/examples/jsm/utils/SkeletonUtils.js';

export type KingdomModelAsset = 'stoneLion' | 'buffalo' | 'horse' | 'horseCart' | 'crane' | 'openBoat' | 'roofedBoat';

const MODEL_URLS: Record<KingdomModelAsset, string> = {
  stoneLion: '/assets/models/stone-lion.glb',
  buffalo: '/assets/models/buffalo.glb',
  horse: '/assets/models/rideable-horse.glb',
  horseCart: '/assets/models/horse-cart.glb',
  crane: '/assets/models/red-crowned-crane.glb',
  openBoat: '/assets/models/open-boat.glb',
  roofedBoat: '/assets/models/roofed-boat.glb',
};

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const loaded = new Map<KingdomModelAsset, Promise<THREE.Group>>();

function loadAsset(asset: KingdomModelAsset): Promise<THREE.Group> {
  let promise = loaded.get(asset);
  if (!promise) {
    promise = loader.loadAsync(MODEL_URLS[asset]).then(({ scene }) => scene);
    loaded.set(asset, promise);
  }
  return promise;
}

function fitClone(source: THREE.Group, target: THREE.Object3D) {
  const clone = new THREE.Group();
  clone.add(cloneSkinnedScene(source));
  clone.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      node.castShadow = true;
      node.receiveShadow = true;
      node.userData.noMerge = true;
    }
  });

  clone.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(clone);
  const size = bounds.getSize(new THREE.Vector3());
  const desired = target.userData.modelSize as [number, number, number] | undefined;
  if (desired) {
    // GLB exports use inconsistent source scales; fit the configured world-space envelope
    // per axis so long boats and carts do not shrink to the height of their shortest dimension.
    clone.scale.set(
      desired[0] / Math.max(size.x, 0.001),
      desired[1] / Math.max(size.y, 0.001),
      desired[2] / Math.max(size.z, 0.001)
    );
  }
  clone.rotation.y = Number(target.userData.modelYaw || 0);
  clone.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(clone);
  const center = fitted.getCenter(new THREE.Vector3());
  clone.position.x -= center.x;
  clone.position.z -= center.z;
  clone.position.y -= fitted.min.y;
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
  const bones: Array<{ object: THREE.Bone; name: string; base: THREE.Euler }> = [];
  clone.traverse((object) => {
    if ((object as THREE.Bone).isBone) {
      const bone = object as THREE.Bone;
      bones.push({ object: bone, name: bone.name.toLowerCase(), base: bone.rotation.clone() });
    }
  });
  target.userData.modelBones = bones;
  return clone;
}

/** Movement cues for static GLBs: grounded gait for mounts and a gentle rocking motion for boats. */
export function animateModelMotion(target: THREE.Object3D, time: number, speed: number, kind: 'animal' | 'boat' | 'cart') {
  const visual = target.userData.modelVisual as THREE.Group | undefined;
  if (!visual) return;
  const moving = speed > 0.08;
  const phase = moving ? time * (kind === 'cart' ? 7.5 : 6.2) : time * 1.15;
  const amplitude = kind === 'boat' ? 0.035 : kind === 'cart' ? 0.055 : 0.075;
  visual.position.y = Number(target.userData.modelBaseY || 0) + Math.sin(phase) * amplitude;
  visual.rotation.z = moving ? Math.cos(phase) * (kind === 'boat' ? 0.018 : 0.035) : Math.sin(phase) * 0.012;
  visual.rotation.x = kind === 'boat' ? Math.sin(phase * 0.72) * 0.022 : Math.sin(phase * 2) * (moving ? 0.025 : 0.008);
  const bones = target.userData.modelBones as Array<{ object: THREE.Bone; name: string; base: THREE.Euler }> | undefined;
  bones?.forEach((bone, index) => {
    bone.object.rotation.copy(bone.base);
    if (!moving) {
      if (bone.name.includes('head_0')) bone.object.rotation.x += Math.sin(phase + index) * 0.04;
      if (bone.name.includes('tail_0')) bone.object.rotation.z += Math.sin(phase + index) * 0.08;
      if (bone.name.includes('spine_0')) bone.object.rotation.x += Math.sin(phase + index) * 0.012;
      return;
    }
    if (bone.name.includes('head_0')) bone.object.rotation.x += Math.sin(phase * 1.5) * 0.08;
    if (bone.name.includes('tail_0')) bone.object.rotation.z += Math.sin(phase * 1.2) * 0.16;
    if (bone.name.includes('spine_0')) bone.object.rotation.x += Math.sin(phase * 2) * (kind === 'cart' ? 0.025 : 0.045);
    if (/left_limb_0|right_limb_0/.test(bone.name)) {
      if (target.userData.modelAsset === 'crane') {
        const side = bone.name.includes('left') ? -1 : 1;
        bone.object.rotation.z += side * (Math.sin(phase * 1.8) * 0.48 + 0.08);
      } else if (kind === 'animal') {
        const stride = bone.name.includes('0_left') || bone.name.includes('0_right') ? 1 : -1;
        bone.object.rotation.x += Math.sin(phase + stride * Math.PI) * 0.3;
      }
    }
  });
  const parts = target.userData.modelParts as Array<{ object: THREE.Object3D; kind: 'wheel' | 'wing' | 'leg' | 'tail'; base: THREE.Euler }> | undefined;
  parts?.forEach((part, index) => {
    part.object.rotation.copy(part.base);
    if (!moving) {
      if (part.kind === 'tail') part.object.rotation.z += Math.sin(phase + index) * 0.08;
      if (part.kind === 'wing') part.object.rotation.z += Math.sin(phase + index) * 0.04;
      return;
    }
    if (part.kind === 'wheel') part.object.rotation.x += time * Math.max(speed, 0.4) * 0.75;
    if (part.kind === 'leg') part.object.rotation.x += Math.sin(phase + index * Math.PI / 2) * 0.22;
    if (part.kind === 'wing') part.object.rotation.z += Math.sin(phase * 1.7 + index) * 0.32;
    if (part.kind === 'tail') part.object.rotation.z += Math.sin(phase * 0.8 + index) * 0.16;
  });
}

export async function loadModelInto(target: THREE.Object3D, asset: KingdomModelAsset) {
  if (target.userData.modelLoading) return;
  target.userData.modelLoading = true;
  try {
    const source = await loadAsset(asset);
    if (!target.parent && target.userData.keepModelDetached !== true) return;
    const oldChildren = [...target.children];
    oldChildren.forEach((child) => {
      if (child.userData.keepOnModelSwap) return;
      target.remove(child);
    });
    fitClone(source, target);
  } catch (error) {
    console.warn(`IdeaX 3D model could not be loaded: ${asset}`, error);
  } finally {
    target.userData.modelLoading = false;
  }
}

export function hydrateSceneModels(scene: THREE.Scene, near?: THREE.Vector3, range = 60) {
  const targets: Array<{ target: THREE.Object3D; asset: KingdomModelAsset }> = [];
  scene.traverse((node) => {
    const asset = node.userData.modelAsset as KingdomModelAsset | undefined;
    if (!asset || node.userData.modelLoaded || node.userData.modelLoading) return;
    if (near) {
      const position = node.getWorldPosition(new THREE.Vector3());
      if (position.distanceTo(near) > range) return;
    }
    targets.push({ target: node, asset });
  });
  targets.forEach(({ target, asset }) => {
    target.userData.modelLoaded = true;
    void loadModelInto(target, asset).then(() => {
      if (target.children.length === 0) target.userData.modelLoaded = false;
    });
  });
}
