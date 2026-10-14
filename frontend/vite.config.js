import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// على GitHub Pages الموقع بيكون تحت مسار اسم الـ repo، فلازم base وقت البناء بس
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/dental-lab-management/' : '/',
  plugins: [react(), tailwindcss()],
}))