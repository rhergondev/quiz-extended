/** @type {import('tailwindcss').Config} */
module.exports = {
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
      },
      
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
      },
    },
  },
  plugins: [],
}