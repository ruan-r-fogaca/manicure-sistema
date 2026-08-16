/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta inspirada em esmaltes: base neutra clara + rosa amora como cor de marca
        base: {
          50: '#FBF9F8',
          100: '#F3EEEC',
          200: '#E6DDD9',
        },
        plum: {
          500: '#7A2E4A',
          600: '#5F2038',
          700: '#471729',
        },
        rose: {
          400: '#D46A8C',
          500: '#C14C74',
        },
        ink: '#2B2320',
        // Cores de status (esmaltes) usadas nos badges de agendamento
        status: {
          agendado: '#C9A66B',
          confirmado: '#4F86A6',
          atendido: '#5B9279',
          cancelado: '#A65C5C',
          pendente: '#D98E4A',
        },
      },
      fontFamily: {
        display: ['"Quicksand"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};
