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
      fontSize: {
        // Type ramp for Argus dashboard
        'agent': ['1.125rem', { lineHeight: '1.5' }],    // 18px - agent names
        'task': ['1rem', { lineHeight: '1.5' }],         // 16px - task descriptions
        'label': ['0.875rem', { lineHeight: '1.5' }],    // 14px - labels, secondary
        'caption': ['0.75rem', { lineHeight: '1.4' }],   // 12px - captions, tertiary
      },
    },
  },
  plugins: [],
};
