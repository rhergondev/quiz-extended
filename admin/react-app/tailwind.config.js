/** @type {import('tailwindcss').Config} */
module.exports = {
  // ✅ **NUEVO CÓDIGO**: Esta es la clave para aumentar la especificidad.
  important: '.qe-lms-app',

  content: [
    "./src/**/*.{js,jsx,ts,tsx}", 
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#24375A', 
        'secondary': '#54595F',
        'text-main': '#7A7A7A',   
        'accent': '#FFAF03',     
        'gray-light': '#F3F3F3',   
        'footer-blue': '#111E35',
        
        // 🎨 TEMA DINÁMICO: Reemplazar colores azules con variables CSS del tema
        'blue': {
          50: 'var(--qe-primary-light)',
          100: 'var(--qe-primary-light)',
          200: 'var(--qe-primary-light)',
          300: 'var(--qe-primary)',
          400: 'var(--qe-primary)',
          500: 'var(--qe-primary)',
          600: 'var(--qe-primary)',
          700: 'var(--qe-primary-hover)',
          800: 'var(--qe-primary-hover)',
          900: 'var(--qe-primary-hover)',
        },
        'indigo': {
          50: 'var(--qe-secondary-light)',
          100: 'var(--qe-secondary-light)',
          200: 'var(--qe-secondary-light)',
          300: 'var(--qe-secondary)',
          400: 'var(--qe-secondary)',
          500: 'var(--qe-secondary)',
          600: 'var(--qe-secondary)',
          700: 'var(--qe-secondary-hover)',
          800: 'var(--qe-secondary-hover)',
          900: 'var(--qe-secondary-hover)',
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
      },
      keyframes: {
        slideDown: {
          '0%': { opacity: '0', maxHeight: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', maxHeight: '500px', transform: 'translateY(0)' }
        }
      },
      animation: {
        slideDown: 'slideDown 0.3s ease-out forwards'
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}