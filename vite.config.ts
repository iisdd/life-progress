import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { localDataPlugin } from './vite-plugin-local-data.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localDataPlugin()],
})
