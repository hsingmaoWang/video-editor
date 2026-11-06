/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canva: {
          dark: '#0e1318',
          panel: '#181e27',
          card: '#222b38',
          accent: '#00c4cc',
          purple: '#7d2ae8',
          hover: '#2c3645',
          border: '#333f52',
        }
      }
    },
  },
  plugins: [],
}

