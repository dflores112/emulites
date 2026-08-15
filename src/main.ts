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
    // Smooth filtering: the world art is vector-drawn, and nearest-neighbour
    // upscaling on a high-DPI screen turns it into chunky blocks. Character
    // sprites opt back into NEAREST individually, since they are true pixel art.
    antialias: true,
    roundPixels: false,
  },
  scene: [CreateScene, WorldScene],
  input: {
    mouse: {
      preventDefaultDown: false,
    },
  },
}

new Phaser.Game(config)
