import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { communityMiddleware } from './communityDev.js'
import { userPlacesMiddleware } from './userPlacesDev.js'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'community-recipes-endpoint',
      configureServer(server) {
        server.middlewares.use(communityMiddleware())
        server.middlewares.use(userPlacesMiddleware())
      },
    },
  ],
  server: {
    watch: {
      ignored: ['**/data/community-recipes.json', '**/data/user-places.json'],
    },
  },
})
