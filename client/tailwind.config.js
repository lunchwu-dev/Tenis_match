/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{vue,js,ts,jsx,tsx}'],
  corePlugins: {
    // 微信小程序中 preflight 会引起基础样式冲突，需关闭
    preflight: false
  },
  theme: {
    extend: {
      colors: {
        'tennis-neon': '#D4F820',
        'dark-slate': '#0A0E17',
        'card-bg': '#151A26',
        'accent-blue': '#2E68FF'
      },
      fontFamily: {
        display: ['Oswald', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      boxShadow: {
        'neon-glow': '0 0 40px rgba(212, 248, 32, 0.3)',
        'neon-glow-sm': '0 10px 25px -5px rgba(212, 248, 32, 0.4)',
        'inner-glow': 'inset 0 0 20px rgba(212, 248, 32, 0.05)'
      }
    },
  },
  plugins: [],
};
