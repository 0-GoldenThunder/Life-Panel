// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],

  vite: {
    plugins: [
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        manifest: {
          name: 'Pro Max Life Manager',
          short_name: 'Life Manager',
          description: 'A centralized, offline-first hub for task management and financial tracking.',
          theme_color: '#050505',
          background_color: '#050505',
          display: 'standalone',
          icons: [
            {
              src: '/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        },
        workbox: {
          runtimeCaching: [
            {
              urlPattern: /\.(?:js|css|woff2)$/,
              handler: 'CacheFirst',
            },
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/,
              handler: 'NetworkFirst',
            },
          ],
        },
      })
    ]
  }
});