import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon-32x32.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Tha. Veymandoo Police Chandhaa',
        short_name: 'Veymandoo Chandhaa',
        description: 'Chandhaa collection & expense management system for Tha. Veymandoo Police',
        theme_color: '#0F3D5C',
        background_color: '#F7F9FB',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/rest/v1') || url.pathname.startsWith('/auth/v1'),
            handler: 'NetworkOnly'
          }
        ]
      }
    })
  ],
  server: { port: 5173 }
})
