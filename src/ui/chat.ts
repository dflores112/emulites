const CHATTERS = [
  'Mira',
  'Jon',
  'Kez',
  'Nori',
  'Ash',
  'Pip',
  'Ren',
  'Sol',
  'Tavi',
  'Uma',
  'Wren',
  'Zed',
  'Luma',
  'Ori',
  'Vex',
  'Sable',
  'Finn',
  'Nova',
  'Cleo',
  'Basil',
]

const LINES = [
  'anyone else building by the lake?',
  'this cottage looks cozy',
  'found a frog near the path lol',
  'who planted all these trees??',
  'trade chairs for a table?',
  'zoom out — the map is huge',
  'meeting at the town square',
  'my outfit is better, no debate',
  'watch out for the west pond',
  'just placed a wall wrong 😭',
  'good morning Emulites',
  'drag to explore the far villages',
  'chicken just stole my vibe',
  'path to the NE village is done',
  'anyone online from the south?',
  'building a market stall rn',
  'the red roofs look so good',
  'need more doors over here',
  'lol rabbit ran through my house',
  'this world feels alive',
  'who wants to race to the SE cabin?',
  'afk for a sec, watering flowers',
  'nice place by the sand shore',
  'can we get a fountain next?',
  'brb grabbing snacks',
]

export type ChatHandle = {
  push: (name: string, text: string, self?: boolean) => void
  destroy: () => void
  tick: (delta: number) => void
}

export function mountChat(root: HTMLElement, playerName: string): ChatHandle {
  const panel = document.createElement('div')
  panel.className = 'chat-panel'
  panel.innerHTML = `
    <div class="chat-header">Town Chat</div>
    <div class="chat-log" id="chat-log"></div>
    <form class="chat-form" id="chat-form">
      <input id="chat-input" type="text" maxlength="80" placeholder="Say something…" autocomplete="off" />
      <button type="submit" class="chat-send">Send</button>
    </form>
  `
  root.appendChild(panel)

  const log = panel.querySelector('#chat-log') as HTMLElement
  const form = panel.querySelector('#chat-form') as HTMLFormElement
  const input = panel.querySelector('#chat-input') as HTMLInputElement

  const push = (name: string, text: string, self = false) => {
    const row = document.createElement('div')
    row.className = `chat-row${self ? ' self' : ''}`
    row.innerHTML = `<span class="chat-user">${escapeHtml(name)}</span><span class="chat-text">${escapeHtml(text)}</span>`
    log.appendChild(row)
    while (log.children.length > 40) log.firstElementChild?.remove()
    log.scrollTop = log.scrollHeight
  }

  // Phaser listens for keys on window, so chat text would otherwise trigger game hotkeys.
  input.addEventListener('keydown', (e) => e.stopPropagation())

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const text = input.value.trim()
    if (!text) return
    push(playerName, text, true)
    input.value = ''
    input.blur()
  })

  // Seed a few lines so chat isn't empty
  push(CHATTERS[0]!, LINES[0]!)
  push(CHATTERS[3]!, LINES[2]!)
  push(CHATTERS[7]!, LINES[5]!)

  let cooldown = 1800 + Math.random() * 2200

  return {
    push,
    destroy() {
      panel.remove()
    },
    tick(delta: number) {
      cooldown -= delta
      if (cooldown > 0) return
      cooldown = 2200 + Math.random() * 4500
      const name = CHATTERS[Math.floor(Math.random() * CHATTERS.length)]!
      const text = LINES[Math.floor(Math.random() * LINES.length)]!
      // Avoid echoing the local player name as "other"
      if (name.toLowerCase() === playerName.toLowerCase()) return
      push(name, text)
    },
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
