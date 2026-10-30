import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

export type KingdomModelAsset = 'stoneLion' | 'buffalo' | 'horse' | 'cartHorse' | 'crane' | 'openBoat' | 'roofedBoat';

const MODEL_URLS: Record<KingdomModelAsset, string> = {
  stoneLion: '/assets/models/stone-lion.glb',
  buffalo: '/assets/models/buffalo.glb',
  horse: '/assets/models/rideable-horse.glb',
  cartHorse: '/assets/models/horse-cart-horse.glb',
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
  const clone = source.clone(true);
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
    const ratios = [desired[0] / Math.max(size.x, 0.001), desired[1] / Math.max(size.y, 0.001), desired[2] / Math.max(size.z, 0.001)];
    const scale = Math.min(...ratios);
    clone.scale.setScalar(scale);
  }
  clone.rotation.y = Number(target.userData.modelYaw || 0);
  clone.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(clone);
  const center = fitted.getCenter(new THREE.Vector3());
  clone.position.x -= center.x;
  clone.position.z -= center.z;
  clone.position.y -= fitted.min.y;
  target.add(clone);
  return clone;
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
