import Phaser from 'phaser'
import type { PlayerProfile } from './CreateScene'
import { generateTextures, PLAYER_DISPLAY_SCALE } from '../systems/Textures'
import {
  depthFor,
  gridToScreen,
  inBounds,
  MAP_SIZE,
  screenToGrid,
  snapGrid,
  TILE_H,
  TILE_W,
  worldBounds,
} from '../systems/IsoGrid'
import { BuildSystem } from '../systems/BuildSystem'
import { NAMEPLATE_STYLE, PALETTE } from '../systems/art'
import { loadSave, writeSave, clearSave, type SaveData } from '../systems/SaveSystem'
import { getOutfit, type OutfitId } from '../data/outfits'
import { mountHud } from '../ui/hud'
import { hotbarIconsFromScene } from '../ui/hotbarIcons'
import { mountChat, type ChatHandle } from '../ui/chat'
import type { ItemId } from '../data/catalog'
import { LANDMARKS, type Landmark } from '../data/landmarks'
import { WorldGen } from '../systems/WorldGen'
import { NpcSystem } from '../systems/NpcSystem'
import { AnimalSystem } from '../systems/AnimalSystem'

const SPEED = 120
const SAVE_EVERY_MS = 1500
/**
 * Only clean ratios: nearest-neighbour sampling at fractional zoom drops and
 * doubles pixel rows unevenly, which makes the pixel art look chewed up.
 */
const ZOOM_STEPS = [0.5, 0.75, 1, 1.5, 2, 3]
const ZOOM_DEFAULT = 1
const DRAG_THRESHOLD = 8

export class WorldScene extends Phaser.Scene {
  private profile!: PlayerProfile
  private player!: Phaser.GameObjects.Image
  private nameTag!: Phaser.GameObjects.Text
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: {
    W: Phaser.Input.Keyboard.Key
    A: Phaser.Input.Keyboard.Key
    S: Phaser.Input.Keyboard.Key
    D: Phaser.Input.Keyboard.Key
  }
  private build!: BuildSystem
  private world!: WorldGen
  private npcs!: NpcSystem
  private animals!: AnimalSystem
  private hud: ReturnType<typeof mountHud> | null = null
  private chat: ChatHandle | null = null
  private saveTimer = 0
  private playerFrac = { x: 74.5, y: 76.5 }
  private dragMode = true

  private dragging = false
  private dragMoved = false
  private dragStartX = 0
  private dragStartY = 0
  private camStartX = 0
  private camStartY = 0
  private onBeforeUnload: (() => void) | null = null
  private allowPersist = true

  constructor() {
    super('World')
  }

  init(data: PlayerProfile): void {
    this.profile = data
  }

  create(): void {
    if (!this.textures.exists('emulite-person')) {
      this.load.image('emulite-person', '/assets/emulite-person.png')
      this.load.once(Phaser.Loader.Events.COMPLETE, () => this.bootWorld())
      this.load.start()
      return
    }
    this.bootWorld()
  }

  private bootWorld(): void {
    generateTextures(this)

    const bounds = worldBounds()
    this.cameras.main.setBounds(0, 0, bounds.width, bounds.height)
    this.cameras.main.setBackgroundColor(PALETTE.grassDark)
    this.cameras.main.setRoundPixels(false)

    this.build = new BuildSystem(this)
    this.world = new WorldGen(this)
    this.world.generate(this.build)

    let outfitId: OutfitId = this.profile.outfitId
    let name = this.profile.name

    if (this.profile.continueSave) {
      this.build.clearAll()
      const save = loadSave()
      if (save) {
        name = save.name
        outfitId = save.outfitId
        this.playerFrac = { x: save.playerX, y: save.playerY }
        this.build.loadTiles(save.tiles)
      }
    }

    this.profile = { ...this.profile, name, outfitId }
    getOutfit(outfitId)

    if (!this.canWalk(this.playerFrac.x, this.playerFrac.y)) {
      this.playerFrac = { x: 74.5, y: 76.5 }
    }

    const start = gridToScreen(this.playerFrac.x, this.playerFrac.y)
    this.player = this.add
      .image(start.x, start.y, `player-${outfitId}`)
      .setOrigin(0.5, 1)
      .setScale(PLAYER_DISPLAY_SCALE)
      .setDepth(depthFor(this.playerFrac.x, this.playerFrac.y, 8))

    this.nameTag = this.add
      .text(start.x, start.y - this.player.displayHeight - 4, name, {
        ...NAMEPLATE_STYLE,
        fontSize: '12px',
      })
      .setOrigin(0.5, 1)
      .setDepth(10001)

    this.npcs = new NpcSystem(this, this.world, this.build)
    this.npcs.spawn(40)
    this.animals = new AnimalSystem(this, this.world, this.build)
    this.animals.spawn(55)

    // Free camera: start centered on player, no hard follow
    this.cameras.main.setZoom(ZOOM_DEFAULT)
    this.cameras.main.centerOn(this.player.x, this.player.y)

    const kb = this.input.keyboard!
    this.cursors = kb.createCursorKeys()
    this.wasd = {
      W: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    }

    this.build.bindHotkeys(kb)
    kb.on('keydown-X', () => {
      this.build.tryRemoveAt(this.player.x, this.player.y - TILE_H / 4)
      this.persist()
    })
    kb.on('keydown-C', () => this.findPlayer())
    kb.on('keydown-H', () => {
      // Grab is the default — H always returns to pan, never to place
      this.setDragMode(true)
      this.hud?.setDragMode(true)
    })
    kb.on('keydown-ESC', () => {
      this.setDragMode(true)
      this.hud?.setDragMode(true)
    })
    kb.on('keydown-M', () => {
      this.hud?.toggleTravel()
    })

    // Zoom toward pointer
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gos: unknown, _dx: number, dy: number) => {
      const cam = this.cameras.main
      const prev = cam.zoom
      const next = this.stepZoom(prev, dy > 0 ? -1 : 1)
      if (next === prev) return
      const worldPoint = cam.getWorldPoint(_pointer.x, _pointer.y)
      cam.setZoom(next)
      const after = cam.getWorldPoint(_pointer.x, _pointer.y)
      cam.scrollX += worldPoint.x - after.x
      cam.scrollY += worldPoint.y - after.y
    })

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.dragMode && this.dragging && pointer.isDown) {
        const dx = pointer.x - this.dragStartX
        const dy = pointer.y - this.dragStartY
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD) this.dragMoved = true
        if (this.dragMoved) {
          const zoom = this.cameras.main.zoom
          this.cameras.main.setScroll(
            this.camStartX - dx / zoom,
            this.camStartY - dy / zoom,
          )
          this.setCanvasCursor('grabbing')
          return
        }
      }
      if (!this.dragMode) {
        const worldPt = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
        this.build.updateGhost(worldPt.x, worldPt.y)
      }
    })

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown() || pointer.button === 2) {
        // Right-click removes even while panning; cancel an unfinished drag first
        this.dragging = false
        this.dragMoved = false
        const worldPt = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
        this.build.tryRemoveAt(worldPt.x, worldPt.y)
        this.persist()
        if (this.dragMode) this.setCanvasCursor('grab')
        return
      }
      if (pointer.button === 0 || pointer.leftButtonDown()) {
        if (this.dragMode) {
          this.dragging = true
          this.dragMoved = false
          this.dragStartX = pointer.x
          this.dragStartY = pointer.y
          this.camStartX = this.cameras.main.scrollX
          this.camStartY = this.cameras.main.scrollY
          this.setCanvasCursor('grabbing')
          return
        }
        const worldPt = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
        const g = snapGrid(screenToGrid(worldPt.x, worldPt.y).x, screenToGrid(worldPt.x, worldPt.y).y)
        if (!this.world.isBlockedTerrain(g.x, g.y)) {
          this.build.tryPlaceAt(worldPt.x, worldPt.y)
          this.persist()
        }
      }
    })

    this.input.on('pointerup', () => {
      if (!this.dragging) return
      this.dragging = false
      this.dragMoved = false
      if (this.dragMode) this.setCanvasCursor('grab')
    })

    this.input.mouse?.disableContextMenu()

    const hudRoot = document.getElementById('hud-ui')
    if (hudRoot) {
      this.hud = mountHud(hudRoot, {
        name,
        selected: this.build.getSelected(),
        dragMode: true,
        icons: hotbarIconsFromScene(this),
        landmarks: LANDMARKS,
        onSelect: (id: ItemId) => {
          // Hotbar pick enters place mode; Grab / H returns to pan
          this.setDragMode(false)
          this.build.setSelected(id)
        },
        onDragMode: (on) => this.setDragMode(on),
        onTravel: (mark) => this.travelTo(mark),
        onFindMe: () => this.findPlayer(),
        onNewGame: () => {
          this.goToCreateScreen()
        },
      })
      this.chat = mountChat(hudRoot, name)
      this.setDragMode(true)
    }

    this.events.on('build-selected', (id: ItemId) => {
      this.setDragMode(false)
      this.hud?.setSelected(id)
      this.hud?.setDragMode(false)
    })

    this.onBeforeUnload = () => this.persist()
    window.addEventListener('beforeunload', this.onBeforeUnload)

    this.persist()
  }

  private setDragMode(on: boolean): void {
    this.dragMode = on
    this.dragging = false
    this.dragMoved = false
    this.build.setEnabled(!on)
    this.setCanvasCursor(on ? 'grab' : '')
  }

  private setCanvasCursor(cursor: string): void {
    const canvas = this.game.canvas
    if (canvas) canvas.style.cursor = cursor
  }

  update(time: number, delta: number): void {
    // Don't steal WASD while typing in chat
    const typing =
      document.activeElement instanceof HTMLInputElement ||
      document.activeElement instanceof HTMLTextAreaElement

    if (!typing) {
      let dx = 0
      let dy = 0
      const pad = this.hud?.getPad()
      if (this.cursors.left?.isDown || this.wasd.A.isDown || pad?.left) dx -= 1
      if (this.cursors.right?.isDown || this.wasd.D.isDown || pad?.right) dx += 1
      if (this.cursors.up?.isDown || this.wasd.W.isDown || pad?.up) dy -= 1
      if (this.cursors.down?.isDown || this.wasd.S.isDown || pad?.down) dy += 1

      if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy) || 1
        dx /= len
        dy /= len
        const moveScale = (SPEED * delta) / 1000 / (TILE_W / 2)
        const gridDx = (dx + dy) * moveScale * 0.5
        const gridDy = (-dx + dy) * moveScale * 0.5
        this.tryMove(gridDx, gridDy)
      }
    }

    this.syncPlayerSprite()
    this.npcs.update(delta)
    this.animals.update(delta)
    this.world.tick(time)
    this.chat?.tick(delta)

    this.saveTimer += delta
    if (this.saveTimer >= SAVE_EVERY_MS) {
      this.saveTimer = 0
      this.persist()
    }
  }

  private canWalk(x: number, y: number): boolean {
    const g = snapGrid(x, y)
    if (!inBounds(g.x, g.y)) return false
    if (this.world.isBlockedTerrain(g.x, g.y)) return false
    if (this.build.isBlocked(g.x, g.y)) return false
    return true
  }

  /** Snap to the neighbouring clean zoom level rather than a smooth ramp. */
  private stepZoom(current: number, dir: number): number {
    let index = ZOOM_STEPS.findIndex((z) => Math.abs(z - current) < 0.001)
    if (index === -1) {
      index = ZOOM_STEPS.reduce(
        (best, z, i) =>
          Math.abs(z - current) < Math.abs(ZOOM_STEPS[best]! - current) ? i : best,
        0,
      )
    }
    return ZOOM_STEPS[Phaser.Math.Clamp(index + dir, 0, ZOOM_STEPS.length - 1)]!
  }

  /** Recentre on the player and flash a marker so they stand out in a crowd. */
  private findPlayer(): void {
    this.cameras.main.pan(this.player.x, this.player.y, 250, 'Sine.easeInOut')
    this.pingPlayer()
  }

  private pingPlayer(): void {
    const ping = this.add.ellipse(this.player.x, this.player.y, TILE_W, TILE_H, 0xffe9a8, 0)
    ping.setStrokeStyle(2, 0xffe9a8, 1)
    ping.setDepth(depthFor(this.playerFrac.x, this.playerFrac.y, 9))
    this.tweens.add({
      targets: ping,
      scale: 2.6,
      alpha: 0,
      duration: 700,
      ease: 'Sine.easeOut',
      onComplete: () => ping.destroy(),
    })
  }

  /** Fast travel: drop the player on the nearest open tile and swing the camera over. */
  private travelTo(mark: Landmark): void {
    const spot = this.findWalkableNear(mark.gx + 0.5, mark.gy + 0.5)
    if (!spot) return
    this.playerFrac = spot
    this.syncPlayerSprite()
    this.cameras.main.pan(this.player.x, this.player.y, 420, 'Sine.easeInOut')
    this.pingPlayer()
    this.persist()
  }

  private findWalkableNear(x: number, y: number): { x: number; y: number } | null {
    if (this.canWalk(x, y)) return { x, y }
    for (let r = 1; r <= 30; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue
          if (this.canWalk(x + dx, y + dy)) return { x: x + dx, y: y + dy }
        }
      }
    }
    return null
  }

  private tryMove(gdx: number, gdy: number): void {
    const nextX = this.playerFrac.x + gdx
    const nextY = this.playerFrac.y + gdy

    if (this.canWalk(nextX, this.playerFrac.y)) this.playerFrac.x = nextX
    if (this.canWalk(this.playerFrac.x, nextY)) this.playerFrac.y = nextY

    this.playerFrac.x = Phaser.Math.Clamp(this.playerFrac.x, 0.2, MAP_SIZE - 0.2)
    this.playerFrac.y = Phaser.Math.Clamp(this.playerFrac.y, 0.2, MAP_SIZE - 0.2)
  }

  private syncPlayerSprite(): void {
    const s = gridToScreen(this.playerFrac.x, this.playerFrac.y)
    this.player.setPosition(s.x, s.y + TILE_H / 2)
    this.player.setDepth(depthFor(this.playerFrac.x, this.playerFrac.y, 8))
    this.nameTag.setPosition(this.player.x, this.player.y - this.player.displayHeight - 4)
    this.nameTag.setDepth(10001)
  }

  private persist(): void {
    if (!this.allowPersist) return
    const data: SaveData = {
      name: this.profile.name,
      outfitId: this.profile.outfitId,
      playerX: this.playerFrac.x,
      playerY: this.playerFrac.y,
      tiles: this.build.exportTiles(),
    }
    writeSave(data)
  }

  private goToCreateScreen(): void {
    this.allowPersist = false
    if (this.onBeforeUnload) {
      window.removeEventListener('beforeunload', this.onBeforeUnload)
      this.onBeforeUnload = null
    }
    clearSave()
    this.setCanvasCursor('')
    this.chat?.destroy()
    this.chat = null
    this.hud?.destroy()
    this.hud = null
    this.scene.start('Create')
  }

  shutdown(): void {
    this.persist()
    if (this.onBeforeUnload) {
      window.removeEventListener('beforeunload', this.onBeforeUnload)
      this.onBeforeUnload = null
    }
    this.setCanvasCursor('')
    this.chat?.destroy()
    this.chat = null
    this.hud?.destroy()
    this.hud = null
  }
}
