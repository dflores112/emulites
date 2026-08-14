import Phaser from 'phaser'
import { mountCreateUI, type CreateResult } from '../ui/createUi'
import type { OutfitId } from '../data/outfits'
import { generatePlayerTextures } from '../systems/Textures'
import { loadSave } from '../systems/SaveSystem'

export type PlayerProfile = {
  name: string
  outfitId: OutfitId
  continueSave: boolean
}

export class CreateScene extends Phaser.Scene {
  private unmount: (() => void) | null = null

  constructor() {
    super('Create')
  }

  preload(): void {
    this.load.image('emulite-person', '/assets/emulite-person.png')
  }

  create(): void {
    // Reload keeps your world — jump straight back in
    const existing = loadSave()
    if (existing) {
      this.scene.start('World', {
        name: existing.name,
        outfitId: existing.outfitId,
        continueSave: true,
      } satisfies PlayerProfile)
      return
    }

    const previews = generatePlayerTextures(this)
    const root = document.getElementById('create-ui')
    if (!root) {
      this.scene.start('World', {
        name: 'Emulite',
        outfitId: 'azure',
        continueSave: false,
      } satisfies PlayerProfile)
      return
    }

    this.unmount = mountCreateUI(
      root,
      (result: CreateResult) => {
        this.unmount?.()
        this.unmount = null
        this.scene.start('World', {
          name: result.name,
          outfitId: result.outfitId,
          continueSave: result.continueSave,
        } satisfies PlayerProfile)
      },
      previews,
    )
  }

  shutdown(): void {
    this.unmount?.()
    this.unmount = null
  }
}
