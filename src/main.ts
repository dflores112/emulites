import Phaser from 'phaser'
import { CreateScene } from './scenes/CreateScene'
import { WorldScene } from './scenes/WorldScene'
import { mountAnnounceChrome } from './ui/announce'

mountAnnounceChrome()

const host = document.getElementById('phaser-host')!

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: host,
  backgroundColor: '#1a2430',
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true,
  },
  scene: [CreateScene, WorldScene],
  input: {
    mouse: {
      preventDefaultDown: false,
    },
  },
}

new Phaser.Game(config)
