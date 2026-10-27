import * as THREE from 'three';

export interface PerformanceStats {
  fps: number;
  frameTimeMs: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
}

export class PerformanceMonitor {
  private frameCount = 0;
  private lastTime = performance.now();
  private lastFrameTimestamp = performance.now();
  private fpsValues: number[] = [];
  public currentStats: PerformanceStats = {
    fps: 30,
    frameTimeMs: 33.3,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
  };

  /**
   * Call once per frame inside requestAnimationFrame loop
   */
  public update(renderer: THREE.WebGLRenderer): PerformanceStats {
    const now = performance.now();
    const frameDelta = now - this.lastFrameTimestamp;
    this.lastFrameTimestamp = now;

    this.frameCount++;

    // Calculate rolling average every 30 frames or ~500ms
    if (now - this.lastTime >= 500) {
      const elapsedSec = (now - this.lastTime) / 1000;
      const instantaneousFps = Math.round(this.frameCount / elapsedSec);

      this.fpsValues.push(instantaneousFps);
      if (this.fpsValues.length > 5) this.fpsValues.shift();

      const avgFps = Math.round(
        this.fpsValues.reduce((a, b) => a + b, 0) / this.fpsValues.length
      );

      this.currentStats = {
        fps: Math.max(1, Math.min(120, avgFps)),
        frameTimeMs: Math.round(frameDelta * 10) / 10,
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
      };

      this.frameCount = 0;
      this.lastTime = now;
    }

    return this.currentStats;
  }
}
