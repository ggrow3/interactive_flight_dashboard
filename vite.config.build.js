import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    // Skip TypeScript checking during build
    typescript: {
      ignoreBuildErrors: true,
    }
  }
})