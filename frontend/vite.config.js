import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { communityMiddleware } from './communityDev.js'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'community-recipes-endpoint',
      configureServer(server) {
        server.middlewares.use(communityMiddleware())
      },
    },
  ],
  server: {
    watch: {
      ignored: ['**/data/community-recipes.json'],
    },
  },
})
