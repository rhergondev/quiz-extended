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
        
        // 🎨 TEMA DINÁMICO: Mapear TODOS los colores de Tailwind a variables CSS del tema
        // Esto garantiza que TODAS las clases de Tailwind usen el tema personalizado
        
        // Gray -> Color de texto personalizado
        'gray': {
          50: '#f9fafb',
          100: 'var(--qe-background)',
          200: '#e5e7eb',
          300: 'var(--qe-text-secondary)',
          400: 'var(--qe-text-secondary)',
          500: 'var(--qe-text-secondary)',
          600: 'var(--qe-text-secondary)',
          700: 'var(--qe-text)',
          800: 'var(--qe-text)',
          900: 'var(--qe-text)',
        },
        
        // Blue -> Primary (color principal del tema)
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
        
        // Indigo -> Secondary (color secundario del tema)
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
        
        // Yellow -> Accent (color de acento)
        'yellow': {
          50: 'var(--qe-accent-light)',
          100: 'var(--qe-accent-light)',
          200: 'var(--qe-accent-light)',
          300: 'var(--qe-accent)',
          400: 'var(--qe-accent)',
          500: 'var(--qe-accent)',
          600: 'var(--qe-accent)',
          700: 'var(--qe-accent-hover)',
          800: 'var(--qe-accent-hover)',
          900: 'var(--qe-accent-hover)',
        },
        
        // Orange -> Accent alternativo (también usa accent)
        'orange': {
          50: 'var(--qe-accent-light)',
          100: 'var(--qe-accent-light)',
          200: 'var(--qe-accent-light)',
          300: 'var(--qe-accent)',
          400: 'var(--qe-accent)',
          500: 'var(--qe-accent)',
          600: 'var(--qe-accent)',
          700: 'var(--qe-accent-hover)',
          800: 'var(--qe-accent-hover)',
          900: 'var(--qe-accent-hover)',
        },
        
        // Amber -> Accent alternativo
        'amber': {
          50: 'var(--qe-accent-light)',
          100: 'var(--qe-accent-light)',
          200: 'var(--qe-accent-light)',
          300: 'var(--qe-accent)',
          400: 'var(--qe-accent)',
          500: 'var(--qe-accent)',
          600: 'var(--qe-accent)',
          700: 'var(--qe-accent-hover)',
          800: 'var(--qe-accent-hover)',
          900: 'var(--qe-accent-hover)',
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
      },
      keyframes: {
        slideDown: {
          '0%': { opacity: '0', maxHeight: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', maxHeight: '500px', transform: 'translateY(0)' }
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' }
        },
        slideOutRight: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' }
        }
      },
      animation: {
        slideDown: 'slideDown 0.3s ease-out forwards',
        'slide-in-right': 'slideInRight 0.2s ease-out forwards',
        'slide-out-right': 'slideOutRight 0.2s ease-in forwards'
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}