/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#007AFF',
        secondary: '#5AC8FA',
        success: '#34C759',
        warning: '#FF9500',
        error: '#FF3B30',
        light: '#F5F5F5',
        border: '#E0E0E0',
      },
      spacing: {
        'safe-bottom': 'max(1.5rem, env(safe-area-inset-bottom))',
        'safe-top': 'max(1rem, env(safe-area-inset-top))',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
