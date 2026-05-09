import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

/**
 * Le Meilleur Panier 2.0 — palette: Terracotta & Sage
 *
 * Strategy: we keep the historical `emerald-*` class names but remap them to
 * a soft sage scale so existing components don't need to be touched. We then
 * add `terracotta-*` (warm primary CTA) and `honey-*` (celebration accent)
 * scales for new visual moments.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },

        // === Le Meilleur Panier — palette Terracotta & Sage ===
        // emerald is REMAPPED to a sage scale so all existing
        // `bg-emerald-50`, `text-emerald-600` etc. automatically pick
        // up the new natural look.
        emerald: {
          50: '#f4f7f1',
          100: '#e7ede1',
          200: '#cfdac5',
          300: '#b1c1a3',
          400: '#90a583',
          500: '#728866',  // primary sage
          600: '#5b6f51',
          700: '#475841',
          800: '#3a4836',
          900: '#313c2e',
          950: '#1a2018',
        },

        // Terracotta — warm primary accent (CTAs, highlights, hero buttons)
        terracotta: {
          50: '#fdf5ef',
          100: '#fae8db',
          200: '#f4cfb6',
          300: '#ebaf86',
          400: '#df8a5a',
          500: '#c97c5d',  // primary terracotta
          600: '#b06343',
          700: '#925036',
          800: '#76432f',
          900: '#603929',
          950: '#341c14',
        },

        // Honey — celebration / reward / promo accent
        honey: {
          50: '#fcf7e8',
          100: '#f9eec9',
          200: '#f3da8e',
          300: '#ecc35c',
          400: '#e2ac38',
          500: '#d4a04c',  // primary honey gold
          600: '#b6831e',
          700: '#92681c',
          800: '#79561e',
          900: '#664a1d',
          950: '#3a280f',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
export default config;
