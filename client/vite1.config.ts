import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';
import { UnifiedViteWeappTailwindcssPlugin as uvwt } from 'weapp-tailwindcss/vite';

// A Vite plugin to strip Tailwind v4 var(...) duplicate declarations in wxss.
// Keep concrete fallback declarations (e.g. width:128rpx) and remove later
// duplicates that use var(...) and may break on some WeChat runtimes.
const stripBuggyCssVarsPlugin = () => {
  const normalizeProp = (decl) => decl.slice(0, decl.indexOf(':')).trim()

  const normalizeValue = (decl) => decl.slice(decl.indexOf(':') + 1).trim()

  const processRuleBody = (body) => {
    const rawDecls = body
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean)

    const kept = []
    const hasNonVarByProp = new Set()

    for (const decl of rawDecls) {
      if (!decl.includes(':')) {
        kept.push(decl)
        continue
      }

      const prop = normalizeProp(decl)
      const value = normalizeValue(decl)
      const hasVarFn = value.includes('var(')

      // If we already have a concrete value for this property in this rule,
      // drop the var(...) duplicate to avoid runtime incompatibility.
      if (hasVarFn && hasNonVarByProp.has(prop)) {
        continue
      }

      if (!hasVarFn) {
        hasNonVarByProp.add(prop)
      }

      kept.push(decl)
    }

    return kept.length ? `${kept.join(';')};` : ''
  }

  return {
    name: 'strip-buggy-css-vars',
    enforce: 'post',
    generateBundle(options, bundle) {
      for (const fileName in bundle) {
        if (fileName.endsWith('.wxss')) {
          let code = bundle[fileName].source;

          code = code.replace(/\{([^{}]*)\}/g, (match, body) => {
            const nextBody = processRuleBody(body)
            return `{${nextBody}}`
          })

          bundle[fileName].source = code;
        }
      }
    }
  }
};

export default defineConfig({
  plugins: [
    uni(),
    uvwt({
      cssEntries: ['/src/App.vue']
    }),
    stripBuggyCssVarsPlugin()
  ],
  css: {
    postcss: {
      plugins: [
        require('@tailwindcss/postcss')(),
        require('autoprefixer'),
        require('postcss-rem-to-responsive-pixel')({
          rootValue: 32,
          propList: ['*'],
          transformUnit: 'rpx'
        })
      ]
    }
  }
});