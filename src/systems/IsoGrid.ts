export const TILE_W = 64
export const TILE_H = 32
export const MAP_SIZE = 148

export type GridPos = { x: number; y: number }
export type ScreenPos = { x: number; y: number }

/** Map origin offset so the diamond sits near the camera center. */
export const ORIGIN_X = (MAP_SIZE * TILE_W) / 2
export const ORIGIN_Y = 80

export function gridToScreen(gx: number, gy: number): ScreenPos {
  return {
    x: ORIGIN_X + (gx - gy) * (TILE_W / 2),
    y: ORIGIN_Y + (gx + gy) * (TILE_H / 2),
  }
}

export function screenToGrid(sx: number, sy: number): GridPos {
  const dx = sx - ORIGIN_X
  const dy = sy - ORIGIN_Y
  const gx = (dx / (TILE_W / 2) + dy / (TILE_H / 2)) / 2
  const gy = (dy / (TILE_H / 2) - dx / (TILE_W / 2)) / 2
  return { x: gx, y: gy }
}

export function snapGrid(gx: number, gy: number): GridPos {
  return { x: Math.floor(gx), y: Math.floor(gy) }
}

export function inBounds(gx: number, gy: number): boolean {
  return gx >= 0 && gy >= 0 && gx < MAP_SIZE && gy < MAP_SIZE
}

export function depthFor(gx: number, gy: number, layer = 0): number {
  return (gx + gy) * 10 + layer
}

export function worldBounds(): { width: number; height: number } {
  return {
    width: ORIGIN_X * 2 + TILE_W,
    height: ORIGIN_Y + MAP_SIZE * TILE_H + 200,
  }
}
