import type { ItemId } from '../data/catalog'
import { isOutfitId, type OutfitId } from '../data/outfits'

const SAVE_KEY = 'emulites-save-v1'

export type PlacedTile = {
  x: number
  y: number
  itemId: ItemId
}

export type SaveData = {
  name: string
  outfitId: OutfitId
  playerX: number
  playerY: number
  tiles: PlacedTile[]
}

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as SaveData
    if (!data.name || !data.outfitId || !Array.isArray(data.tiles)) return null
    if (!isOutfitId(data.outfitId)) data.outfitId = 'azure'
    return data
  } catch {
    return null
  }
}

export function writeSave(data: SaveData): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(data))
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY)
}

export function hasSave(): boolean {
  return loadSave() !== null
}
