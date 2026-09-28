/** Configuración de Tailwind para el estilo neobrutalista del simulador. */
module.exports = {
  content: ['./index.html', './js/**/*.js'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Work Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        tinta: '#0A0A0A',
        papel: '#FFFBEA',
        sol: '#FFD60A',
        menta: '#3DDC97',
        cielo: '#4CC9F0',
        fucsia: '#FF4D8D',
        naranja: '#FF8A00',
        lila: '#B69CFF',
        coral: '#FF6B6B',
      },
      boxShadow: {
        brutal: '5px 5px 0 0 #0A0A0A',
        'brutal-sm': '3px 3px 0 0 #0A0A0A',
        'brutal-lg': '8px 8px 0 0 #0A0A0A',
      },
      borderWidth: {
        3: '3px',
      },
    },
  },
  plugins: [],
};
