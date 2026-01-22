/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{svelte,js,ts}'],
  theme: {
    extend: {
      colors: {
        blocked: '#f59e0b',
        working: '#3b82f6',
        idle: '#4b5563',
        success: '#22c55e',
      },
    },
  },
  plugins: [],
};
