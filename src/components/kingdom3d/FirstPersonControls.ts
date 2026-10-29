import * as THREE from 'three';
import { TouchStickState, TouchLookState, QualitySettings } from './types';
import { PhysicsController } from './PhysicsController';
import { getMobileZoomMode } from '../../utils/mobileZoomLock';

export interface ControlsInputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
}

/** 焦點在輸入框、文字區或可編輯區時，鍵盤是拿來打字的 */
export function isTypingTarget(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

function isScenePinchTouch(t: Touch): boolean {
  const el = t.target as Element | null;
  if (!el || typeof el.closest !== 'function') return true;
  return !el.closest('[data-joystick-zone], [data-ui-panel], button, a, input, select, textarea');
}

export class FirstPersonControls {
  public camera: THREE.PerspectiveCamera;
  public domElement: HTMLElement;
  private touchElement: HTMLElement;
  public settings: QualitySettings;
  public pinchZoomEnabled: boolean = getMobileZoomMode() === 'pinch';

  // Player state
  public position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public yaw: number = 0; // Horizontal rotation (radians)
  public pitch: number = 0; // Vertical angle, clamped (radians)

  // Limits
  public static readonly PITCH_LIMIT = 1.30; // ~74.5 degrees
  public static readonly WALK_SPEED = 3.3; // meters/sec
  public static readonly RUN_SPEED = 8.5; // meters/sec
  public static readonly SPRINT_MULTIPLIER = 8.5 / 3.3;

  // Desktop keyboard & mouse
  private keys: ControlsInputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
  };

  private isMouseDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  private mouseDownHandler: (e: MouseEvent) => void;
  private mouseMoveHandler: (e: MouseEvent) => void;
  private mouseUpHandler: () => void;
  private keyDownHandler: (e: KeyboardEvent) => void;
  private keyUpHandler: (e: KeyboardEvent) => void;
  private wheelHandler: (e: WheelEvent) => void;
  private touchStartHandler: (e: TouchEvent) => void;
  private touchMoveHandler: (e: TouchEvent) => void;
  private touchEndHandler: () => void;
  private zoomModeChangeHandler: (e: Event) => void;
  private pinchDistance = 0;

  // Mobile virtual joystick & look pad states
  public touchStick: TouchStickState = {
    active: false,
    touchId: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    vectorX: 0,
    vectorY: 0,
  };

  public touchLook: TouchLookState = {
    active: false,
    touchId: null,
    lastX: 0,
    lastY: 0,
    deltaX: 0,
    deltaY: 0,
  };

  // Walking head bobbing
  private bobTimer: number = 0;
  public isMoving: boolean = false;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    settings: QualitySettings
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.touchElement = domElement.parentElement || domElement;
    this.settings = settings;
    this.pinchZoomEnabled = getMobileZoomMode() === 'pinch';

    // Desktop look is controlled by dragging; the camera never captures the pointer.
    this.mouseDownHandler = (e: MouseEvent) => {
      if (e.button === 0) {
        this.isMouseDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    };

    this.mouseMoveHandler = (e: MouseEvent) => {
      const sens = this.settings.sensitivity || 1.0;
      if (this.isMouseDragging) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.yaw -= dx * 0.0032 * sens;
        this.pitch -= dy * 0.0032 * sens;
        this.clampPitch();
      }
    };

    this.mouseUpHandler = () => {
      this.isMouseDragging = false;
    };

    this.wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      this.camera.zoom = THREE.MathUtils.clamp(this.camera.zoom * Math.exp(-e.deltaY * 0.0012), 0.75, 2.4);
      this.camera.updateProjectionMatrix();
    };
    this.touchStartHandler = (e: TouchEvent) => {
      if (!this.pinchZoomEnabled) {
        this.pinchDistance = 0;
        return;
      }
      const sceneTouches = Array.from(e.touches).filter(isScenePinchTouch);
      if (sceneTouches.length >= 2) {
        this.pinchDistance = Math.hypot(
          sceneTouches[0].clientX - sceneTouches[1].clientX,
          sceneTouches[0].clientY - sceneTouches[1].clientY
        );
        if (e.cancelable) e.preventDefault();
      }
    };
    this.touchMoveHandler = (e: TouchEvent) => {
      if (!this.pinchZoomEnabled) return;
      const sceneTouches = Array.from(e.touches).filter(isScenePinchTouch);
      if (sceneTouches.length < 2) return;
      const distance = Math.hypot(
        sceneTouches[0].clientX - sceneTouches[1].clientX,
        sceneTouches[0].clientY - sceneTouches[1].clientY
      );
      if (this.pinchDistance > 0 && distance > 0) {
        this.camera.zoom = THREE.MathUtils.clamp(this.camera.zoom * (distance / this.pinchDistance), 0.65, 2.6);
        this.camera.updateProjectionMatrix();
      }
      this.pinchDistance = distance;
      if (e.cancelable) e.preventDefault();
    };
    this.touchEndHandler = () => {
      this.pinchDistance = 0;
    };
    this.zoomModeChangeHandler = (e: Event) => {
      const mode = (e as CustomEvent<'locked' | 'pinch'>).detail || getMobileZoomMode();
      this.setPinchZoomEnabled(mode === 'pinch');
    };

    this.keyDownHandler = (e: KeyboardEvent) => {
      // 在左側內頁打字（留言、搜尋）時，不要讓 WASD 走動
      if (isTypingTarget(e.target)) return;
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys.sprint = true;
          break;
      }
    };

    this.keyUpHandler = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys.sprint = false;
          break;
      }
    };

    this.domElement.addEventListener('mousedown', this.mouseDownHandler);
    document.addEventListener('mousemove', this.mouseMoveHandler);
    window.addEventListener('mouseup', this.mouseUpHandler);
    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
    this.domElement.addEventListener('wheel', this.wheelHandler, { passive: false });
    this.touchElement.addEventListener('touchstart', this.touchStartHandler, { passive: false, capture: true });
    this.touchElement.addEventListener('touchmove', this.touchMoveHandler, { passive: false, capture: true });
    this.touchElement.addEventListener('touchend', this.touchEndHandler, { capture: true });
    this.touchElement.addEventListener('touchcancel', this.touchEndHandler, { capture: true });
    window.addEventListener('ideax_mobile_zoom_mode_change', this.zoomModeChangeHandler);
  }

  public setPinchZoomEnabled(enabled: boolean) {
    this.pinchZoomEnabled = enabled;
    this.pinchDistance = 0;
    if (!enabled) {
      this.camera.zoom = 1;
      this.camera.updateProjectionMatrix();
    }
  }

  public setSpawn(pos: THREE.Vector3, yaw: number) {
    this.position.copy(pos);
    this.yaw = yaw;
    this.pitch = 0;
    this.updateCameraTransform(0);
  }

  private clampPitch() {
    this.pitch = Math.max(
      -FirstPersonControls.PITCH_LIMIT,
      Math.min(FirstPersonControls.PITCH_LIMIT, this.pitch)
    );
  }

  /**
   * Apply mobile touch look rotation (deltaX, deltaY in screen pixels)
   */
  public applyTouchLookDelta(dx: number, dy: number) {
    const sens = (this.settings.sensitivity || 1.0) * 0.0035;
    this.yaw -= dx * sens;
    this.pitch -= dy * sens;
    this.clampPitch();
  }

  /**
   * Compute desired movement velocity relative to current yaw.
   * In Three.js right-handed coordinates, camera looks down local -Z:
   * - Camera Forward (on XZ plane) = (-sin(yaw), 0, -cos(yaw))
   * - Camera Right   (on XZ plane) = ( cos(yaw), 0, -sin(yaw))
   */
  public getDesiredVelocity(): THREE.Vector3 {
    let inputX = 0; // +1 = right, -1 = left
    let inputZ = 0; // +1 = forward (up), -1 = backward (down)

    // Keyboard inputs
    if (this.keys.forward) inputZ += 1;
    if (this.keys.backward) inputZ -= 1;
    if (this.keys.left) inputX -= 1;
    if (this.keys.right) inputX += 1;

    // Mobile Virtual Joystick inputs (-1 to 1)
    if (this.touchStick.active) {
      inputX += this.touchStick.vectorX;
      inputZ -= this.touchStick.vectorY;
    }

    const len = Math.sqrt(inputX * inputX + inputZ * inputZ);
    if (len > 0.05) {
      this.isMoving = true;
      const isSprinting = this.keys.sprint || (this.settings.moveSpeedMultiplier || 1.0) > 1.2;
      const speed = isSprinting
        ? FirstPersonControls.RUN_SPEED
        : FirstPersonControls.WALK_SPEED;

      const normX = (inputX / (len > 1 ? len : 1)) * speed;
      const normZ = (inputZ / (len > 1 ? len : 1)) * speed;

      const sinY = Math.sin(this.yaw);
      const cosY = Math.cos(this.yaw);

      const worldX = normX * cosY - normZ * sinY;
      const worldZ = -normX * sinY - normZ * cosY;

      return new THREE.Vector3(worldX, 0, worldZ);
    }

    this.isMoving = false;
    return new THREE.Vector3(0, 0, 0);
  }

  /**
   * Update camera position and orientation with subtle head bobbing
   */
  /** 坐下時視線往下降（負值） */
  public eyeOffset = 0;

  public updateCameraTransform(delta: number) {
    let bobOffset = 0;
    if (this.settings.headBob && this.isMoving) {
      const sprinting = this.keys.sprint || (this.settings.moveSpeedMultiplier || 1.0) > 1.2;
      this.bobTimer += delta * (sprinting ? 13 : 7.2);
      bobOffset = Math.sin(this.bobTimer) * (sprinting ? 0.042 : 0.022);
    } else {
      this.bobTimer = 0;
    }

    this.camera.position.set(
      this.position.x,
      this.position.y + PhysicsController.EYE_HEIGHT + bobOffset + this.eyeOffset,
      this.position.z
    );

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.z = 0;
  }

  public dispose() {
    this.domElement.removeEventListener('mousedown', this.mouseDownHandler);
    document.removeEventListener('mousemove', this.mouseMoveHandler);
    window.removeEventListener('mouseup', this.mouseUpHandler);
    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);
    this.domElement.removeEventListener('wheel', this.wheelHandler);
    this.touchElement.removeEventListener('touchstart', this.touchStartHandler, true);
    this.touchElement.removeEventListener('touchmove', this.touchMoveHandler, true);
    this.touchElement.removeEventListener('touchend', this.touchEndHandler, true);
    this.touchElement.removeEventListener('touchcancel', this.touchEndHandler, true);
    window.removeEventListener('ideax_mobile_zoom_mode_change', this.zoomModeChangeHandler);
  }
}
