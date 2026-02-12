import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import { sveltekit } from '@sveltejs/kit/vite'
import { SvelteKitPWA } from '@vite-pwa/sveltekit'

export default defineConfig({
  plugins: [
    tailwindcss(),
    {
      // fix for vitest v4 setting base to '/'
      name: 'reset-base',
      config() {
        return {
          base: '',
        }
      },
    },
    sveltekit(),
    SvelteKitPWA({
      srcDir: 'src',
      strategies: 'generateSW',
      scope: '/',
      base: '/',
      manifest: {
        name: 'Chapel Screen',
        short_name: 'Chapel',
        description: 'Real-time collaborative presentations with live sync and presenter mode',
        theme_color: '#1f2937',
        background_color: '#111827',
        display: 'standalone',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],

  test: {
    expect: { requireAssertions: true },

    projects: [
      {
        extends: './vite.config.ts',

        test: {
          name: 'client',

          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: 'chromium', headless: true }],
          },

          include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
        },
      },

      {
        extends: './vite.config.ts',

        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.{test,spec}.{js,ts}'],
          exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
        },
      },
    ],
  },

  clearScreen: false,

  server: {
    proxy: {
      '/users': 'http://localhost:4000',
      '/dev/': 'http://localhost:4000',
      '/health': 'http://localhost:4000',
      '/assets': 'http://localhost:4000',
      '/live': {
        target: 'http://localhost:4000',
        ws: true,
      },
      '/phoenix': {
        target: 'http://localhost:4000',
        ws: true,
      },
      '/socket': {
        target: 'http://localhost:4000',
        ws: true,
      },
    },
  },
})
