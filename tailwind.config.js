/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: { colors: { sky: 'var(--ayos-sky)', orange: 'var(--ayos-orange)', ink: 'var(--ayos-ink)' } } },
  plugins: [],
}
