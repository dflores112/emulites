/** Live Emulite SPL mint / program address on Solana. */
export const EMULITE_CONTRACT = '7icmxYNjhFUDp9HQ3dtgsyay2ctaaC42FWvVcKZfpump'

/** Hide the mint address UI until a real address is ready. */
export const SHOW_CONTRACT = true

export const EMULITE_CHAIN = 'Solana'

export const ANNOUNCE_TEXT = SHOW_CONTRACT
  ? 'Built on Solana — read About & copy the Emulite mint address'
  : 'Built on Solana — read About'

export const ABOUT = {
  title: 'About Emulites',
  lead: 'Emulites is a little isometric pixel world you build in the browser — name your Emulite, pick an outfit, and shape a town.',
  body: SHOW_CONTRACT
    ? 'Wander the plaza, place floors and fences, chat in town, and keep your world in this browser. Emulites is built on the Solana blockchain: the on-chain Emulite mint is the project’s home on Solana, while you play the world here in real time.'
    : 'Wander the plaza, place floors and fences, chat in town, and keep your world in this browser. Emulites is built on the Solana blockchain.',
  chainNote: 'Built on Solana',
  contractLabel: 'Emulite mint (Solana)',
}
