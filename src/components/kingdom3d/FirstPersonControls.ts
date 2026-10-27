import * as THREE from 'three';
import { TouchStickState, TouchLookState, QualitySettings } from './types';
import { PhysicsController } from './PhysicsController';

export interface ControlsInputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
}

export class FirstPersonControls {
  public camera: THREE.PerspectiveCamera;
  public domElement: HTMLElement;
  public settings: QualitySettings;

  // Player state
  public position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public yaw: number = 0; // Horizontal rotation (radians)
  public pitch: number = 0; // Vertical angle, clamped (radians)

  // Limits
  public static readonly PITCH_LIMIT = 1.30; // ~74.5 degrees
  public static readonly WALK_SPEED = 5.4; // meters/sec
  public static readonly SPRINT_MULTIPLIER = 1.65;
  public static readonly MOUSE_SENSITIVITY = 0.0022;

  // Desktop keyboard & mouse
  private keys: ControlsInputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
  };

  public isLocked: boolean = false;
  private isMouseDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  private pointerLockChangeHandler: () => void;
  private mouseDownHandler: (e: MouseEvent) => void;
  private mouseMoveHandler: (e: MouseEvent) => void;
  private mouseUpHandler: () => void;
  private keyDownHandler: (e: KeyboardEvent) => void;
  private keyUpHandler: (e: KeyboardEvent) => void;

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
    this.settings = settings;

    // Desktop bindings (supports both PointerLock and Click-and-Drag look)
    this.pointerLockChangeHandler = () => {
      this.isLocked = document.pointerLockElement === this.domElement;
    };

    this.mouseDownHandler = (e: MouseEvent) => {
      if (e.button === 0 && !this.isLocked) {
        this.isMouseDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    };

    this.mouseMoveHandler = (e: MouseEvent) => {
      const sens = this.settings.sensitivity || 1.0;
      if (this.isLocked) {
        this.yaw -= e.movementX * FirstPersonControls.MOUSE_SENSITIVITY * sens;
        this.pitch -= e.movementY * FirstPersonControls.MOUSE_SENSITIVITY * sens;
        this.clampPitch();
      } else if (this.isMouseDragging) {
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

    this.keyDownHandler = (e: KeyboardEvent) => {
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

    document.addEventListener('pointerlockchange', this.pointerLockChangeHandler);
    this.domElement.addEventListener('mousedown', this.mouseDownHandler);
    document.addEventListener('mousemove', this.mouseMoveHandler);
    window.addEventListener('mouseup', this.mouseUpHandler);
    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
  }

  public lockPointer() {
    try {
      this.domElement.requestPointerLock();
    } catch {
      // Browser pointer lock policy
    }
  }

  public unlockPointer() {
    try {
      if (document.exitPointerLock) {
        document.exitPointerLock();
      }
    } catch {}
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
      const speedMult =
        (this.keys.sprint ? FirstPersonControls.SPRINT_MULTIPLIER : 1.0) *
        (this.settings.moveSpeedMultiplier || 1.0);
      const speed = FirstPersonControls.WALK_SPEED * speedMult;

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
  public updateCameraTransform(delta: number) {
    let bobOffset = 0;
    if (this.settings.headBob && this.isMoving) {
      this.bobTimer += delta * 11.5;
      bobOffset = Math.sin(this.bobTimer) * 0.038;
    } else {
      this.bobTimer = 0;
    }

    this.camera.position.set(
      this.position.x,
      this.position.y + PhysicsController.EYE_HEIGHT + bobOffset,
      this.position.z
    );

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.z = 0;
  }

  public dispose() {
    document.removeEventListener('pointerlockchange', this.pointerLockChangeHandler);
    this.domElement.removeEventListener('mousedown', this.mouseDownHandler);
    document.removeEventListener('mousemove', this.mouseMoveHandler);
    window.removeEventListener('mouseup', this.mouseUpHandler);
    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);
    this.unlockPointer();
  }
}
