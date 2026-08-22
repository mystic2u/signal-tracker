import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relative paths so the built app works at https://USERNAME.github.io/REPO-NAME/
  // regardless of what the repo is named.
  base: './',
})
