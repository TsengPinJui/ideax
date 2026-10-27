import * as THREE from 'three';
import { Collider, WalkableZone, BridgeZone } from './types';

export class PhysicsController {
  public static readonly PLAYER_RADIUS = 0.58; // Safe buffer so camera frustum never clips into walls
  public static readonly EYE_HEIGHT = 1.7; // Standard 1.7m eye-level

  /**
   * Check collision against all obstacles (box, cylinder, or arbitrary-angle wall segment)
   */
  public static checkCollision(
    testPos: THREE.Vector3,
    colliders: Collider[],
    radius: number = PhysicsController.PLAYER_RADIUS
  ): boolean {
    for (const c of colliders) {
      if (c.type === 'box') {
        const dx = Math.max(Math.abs(testPos.x - c.x) - c.halfWidth, 0);
        const dz = Math.max(Math.abs(testPos.z - c.z) - c.halfDepth, 0);
        if (dx * dx + dz * dz < radius * radius) {
          return true;
        }
      } else if (c.type === 'cylinder') {
        const dx = testPos.x - c.x;
        const dz = testPos.z - c.z;
        const minDist = c.radius + radius;
        if (dx * dx + dz * dz < minDist * minDist) {
          return true;
        }
      } else if (c.type === 'segment') {
        const abx = c.x2 - c.x1;
        const abz = c.z2 - c.z1;
        const lenSq = abx * abx + abz * abz;
        const t =
          lenSq > 0.00001
            ? Math.max(
                0,
                Math.min(
                  1,
                  ((testPos.x - c.x1) * abx + (testPos.z - c.z1) * abz) / lenSq
                )
              )
            : 0;
        const qx = c.x1 + t * abx;
        const qz = c.z1 + t * abz;
        const dx = testPos.x - qx;
        const dz = testPos.z - qz;
        const minDist = c.halfThickness + radius;
        if (dx * dx + dz * dz < minDist * minDist) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Push player out of any overlapping collider along shortest normal (enables smooth angled wall sliding)
   */
  public static resolvePenetration(
    pos: THREE.Vector3,
    colliders: Collider[],
    walkableZones: WalkableZone[],
    radius: number = PhysicsController.PLAYER_RADIUS
  ): void {
    for (let iter = 0; iter < 3; iter++) {
      for (const c of colliders) {
        if (c.type === 'box') {
          const relX = pos.x - c.x;
          const relZ = pos.z - c.z;
          const overlapX = c.halfWidth + radius - Math.abs(relX);
          const overlapZ = c.halfDepth + radius - Math.abs(relZ);
          if (overlapX > 0 && overlapZ > 0) {
            const candidate = pos.clone();
            if (overlapX < overlapZ) {
              candidate.x += relX >= 0 ? overlapX + 0.005 : -(overlapX + 0.005);
            } else {
              candidate.z += relZ >= 0 ? overlapZ + 0.005 : -(overlapZ + 0.005);
            }
            if (this.isInsideWalkableZones(candidate.x, candidate.z, walkableZones)) {
              pos.copy(candidate);
            }
          }
        } else if (c.type === 'cylinder') {
          const dx = pos.x - c.x;
          const dz = pos.z - c.z;
          const dist = Math.hypot(dx, dz);
          const minDist = c.radius + radius;
          if (dist < minDist && dist > 0.0001) {
            const push = minDist - dist + 0.005;
            const candidate = pos.clone();
            candidate.x += (dx / dist) * push;
            candidate.z += (dz / dist) * push;
            if (this.isInsideWalkableZones(candidate.x, candidate.z, walkableZones)) {
              pos.copy(candidate);
            }
          }
        } else if (c.type === 'segment') {
          const abx = c.x2 - c.x1;
          const abz = c.z2 - c.z1;
          const lenSq = abx * abx + abz * abz;
          const t =
            lenSq > 0.00001
              ? Math.max(
                  0,
                  Math.min(
                    1,
                    ((pos.x - c.x1) * abx + (pos.z - c.z1) * abz) / lenSq
                  )
                )
              : 0;
          const qx = c.x1 + t * abx;
          const qz = c.z1 + t * abz;
          const dx = pos.x - qx;
          const dz = pos.z - qz;
          const dist = Math.hypot(dx, dz);
          const minDist = c.halfThickness + radius;
          if (dist < minDist && dist > 0.0001) {
            const push = minDist - dist + 0.005;
            const candidate = pos.clone();
            candidate.x += (dx / dist) * push;
            candidate.z += (dz / dist) * push;
            if (this.isInsideWalkableZones(candidate.x, candidate.z, walkableZones)) {
              pos.copy(candidate);
            }
          }
        }
      }
    }
  }

  /**
   * Determine exact ground height at (x, z), smoothly supporting straight & diagonal arched bridges
   */
  public static getGroundHeight(
    x: number,
    z: number,
    bridges: BridgeZone[],
    baseGround = 0
  ): number {
    for (const b of bridges) {
      const dx = b.x2 - b.x1;
      const dz = b.z2 - b.z1;
      const lenSq = dx * dx + dz * dz;
      if (lenSq < 0.001) continue;
      const t = ((x - b.x1) * dx + (z - b.z1) * dz) / lenSq;
      if (t >= 0 && t <= 1) {
        const projX = b.x1 + t * dx;
        const projZ = b.z1 + t * dz;
        const lateral = Math.hypot(x - projX, z - projZ);
        if (lateral <= b.halfWidth + 0.5) {
          const archH = Math.sin(t * Math.PI) * b.bridgeMaxHeight;
          return baseGround + archH;
        }
      }
    }
    return baseGround;
  }

  /**
   * Check if (x, z) is within any walkable island ellipse, plaza rectangle, or bridge corridor
   */
  public static isInsideWalkableZones(
    x: number,
    z: number,
    zones: WalkableZone[]
  ): boolean {
    if (!zones || zones.length === 0) return true;
    for (const zone of zones) {
      if (zone.type === 'rect') {
        if (
          x >= zone.minX &&
          x <= zone.maxX &&
          z >= zone.minZ &&
          z <= zone.maxZ
        ) {
          return true;
        }
      } else if (zone.type === 'ellipse') {
        const nx = (x - zone.cx) / (zone.rx - 0.5);
        const nz = (z - zone.cz) / (zone.rz - 0.5);
        if (nx * nx + nz * nz <= 1.0) {
          return true;
        }
      } else if (zone.type === 'corridor') {
        const dx = zone.x2 - zone.x1;
        const dz = zone.z2 - zone.z1;
        const lenSq = dx * dx + dz * dz;
        if (lenSq < 0.001) continue;
        const t = ((x - zone.x1) * dx + (z - zone.z1) * dz) / lenSq;
        if (t >= 0 && t <= 1) {
          const projX = zone.x1 + t * dx;
          const projZ = zone.z1 + t * dz;
          const lateral = Math.hypot(x - projX, z - projZ);
          if (lateral <= zone.halfWidth) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Resolves player movement with sub-stepping, angled wall sliding, and bridge elevation
   */
  public static movePlayer(
    currentPos: THREE.Vector3,
    velocity: THREE.Vector3,
    delta: number,
    colliders: Collider[],
    walkableZones: WalkableZone[],
    bridges: BridgeZone[]
  ): THREE.Vector3 {
    const nextPos = currentPos.clone();

    const totalMoveX = velocity.x * delta;
    const totalMoveZ = velocity.z * delta;
    const totalDist = Math.hypot(totalMoveX, totalMoveZ);

    // Sub-step movement (max 0.08m per step) so player never tunnels through walls
    const steps = Math.max(1, Math.min(14, Math.ceil(totalDist / 0.08)));
    const stepX = totalMoveX / steps;
    const stepZ = totalMoveZ / steps;

    for (let s = 0; s < steps; s++) {
      // Try full step first, then resolve penetration (allows smooth sliding along angled walls & bridges)
      const candidate = nextPos.clone();
      candidate.x += stepX;
      candidate.z += stepZ;
      this.resolvePenetration(candidate, colliders, walkableZones);

      if (
        !this.checkCollision(candidate, colliders) &&
        this.isInsideWalkableZones(candidate.x, candidate.z, walkableZones)
      ) {
        nextPos.copy(candidate);
        continue;
      }

      // Fallback: test X and Z independently
      if (Math.abs(stepX) > 0.00001) {
        const testX = nextPos.clone();
        testX.x += stepX;
        if (
          !this.checkCollision(testX, colliders) &&
          this.isInsideWalkableZones(testX.x, testX.z, walkableZones)
        ) {
          nextPos.x = testX.x;
        }
      }

      if (Math.abs(stepZ) > 0.00001) {
        const testZ = nextPos.clone();
        testZ.z += stepZ;
        if (
          !this.checkCollision(testZ, colliders) &&
          this.isInsideWalkableZones(testZ.x, testZ.z, walkableZones)
        ) {
          nextPos.z = testZ.z;
        }
      }
    }

    this.resolvePenetration(nextPos, colliders, walkableZones);

    // Smooth ground height adaptation across flat plazas and arched bridges
    const targetY = this.getGroundHeight(nextPos.x, nextPos.z, bridges, 0);
    nextPos.y = THREE.MathUtils.lerp(nextPos.y, targetY, Math.min(1, delta * 20));

    return nextPos;
  }
}
