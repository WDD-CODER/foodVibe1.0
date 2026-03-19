/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heebo: ['Heebo', 'sans-serif'],
      },
      screens: {
        sm: '768px',   // matches $break-mobile
        md: '900px',   // matches $break-tablet
        lg: '1200px',  // matches $break-desktop
      },
    },
  },
  plugins: [],
}