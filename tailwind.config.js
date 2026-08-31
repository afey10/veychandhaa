/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef4f8', 100: '#d6e6ee', 200: '#adccdd', 300: '#7fb0ca',
          400: '#4e8dad', 500: '#2f6f92', 600: '#215577', 700: '#1a4260',
          800: '#153650', 900: '#0F3D5C', 950: '#0A2438'
        },
        gold: {
          50: '#fdf8ec', 100: '#faedc7', 200: '#f5da8f', 300: '#efc157',
          400: '#e8a930', 500: '#d68f1e', 600: '#b06f16', 700: '#8a5314',
          800: '#704316', 900: '#5c3816'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,61,92,0.06), 0 4px 16px rgba(15,61,92,0.06)'
      },
      borderRadius: {
        xl2: '1.25rem'
      }
    }
  },
  plugins: []
}
