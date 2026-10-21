/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Teko', 'sans-serif'],
        hud: ['Chakra Petch', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      colors: {
        mlbb: {
          bg: '#080c17',
          panel: '#0f1629',
          blue: '#1e90ff',
          blueGlow: '#00bfff',
          red: '#ff334b',
          redGlow: '#ff5266',
          gold: '#eab308',
          goldLight: '#fde047',
        },
      },
      boxShadow: {
        'blue-glow': '0 0 18px rgba(0, 191, 255, 0.45)',
        'red-glow': '0 0 18px rgba(255, 51, 75, 0.45)',
        'gold-glow': '0 0 20px rgba(234, 179, 8, 0.5)',
      },
    },
  },
  plugins: [],
};

