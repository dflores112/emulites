import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    // Native fs events can be missed in sandboxed shells and on network volumes,
    // which leaves the dev server serving stale modules until a manual restart.
    watch: { usePolling: true, interval: 300 },
  },
})
