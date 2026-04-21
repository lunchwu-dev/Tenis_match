import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import { postcssWeappTailwindcss } from 'weapp-tailwindcss/postcss'

export default defineConfig({
  plugins: [
    uni(),
  ],
  css: {
    postcss: {
      plugins: [
        tailwindcss(),
        postcssWeappTailwindcss(),
        autoprefixer(),
      ],
    },
  },
})
