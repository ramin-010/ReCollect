// tailwind.config.ts
import type { Config } from "tailwindcss";

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
        border: 'hsl(var(--border))',
        divider: 'hsl(var(--divider))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        'card-bg': 'hsl(var(--card-bg))',
        // Custom brand colors
        'brand-primary': 'hsl(var(--brand-primary))',
        'brand-secondary': 'hsl(var(--brand-secondary))',
        'surface-light': 'hsl(var(--surface-light))',
        'surface-medium': 'hsl(var(--surface-medium))',
        'surface-dark': 'hsl(var(--surface-dark))',
        'text-secondary': 'hsl(var(--text-secondary))',
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        // Sidebar specific colors
        'sidebar-bg': 'hsl(var(--sidebar-bg))',
        'sidebar-hover': 'hsl(var(--sidebar-hover))',
        'sidebar-active': 'hsl(var(--sidebar-active))',
        'welcome-bg': 'hsl(var(--welcome-bg))',
        'border-light': 'hsl(var(--border-light))',
        // Translucent surface tokens (Notion-like depth)
        'surface-elevated': 'var(--surface-elevated)',
        'surface-raised': 'var(--surface-raised)',
        'surface-overlay': 'var(--surface-overlay)',
        'surface-inset': 'var(--surface-inset)',
        'border-subtle': 'var(--border-subtle)',
        'border-strong': 'var(--border-strong)',
        'hover-bg': 'var(--hover-bg)',
        'active-bg': 'var(--active-bg)',
        'overlay-mask': 'var(--overlay-mask)',
        'slide-bg': 'var(--slide-bg)',
        'text-tertiary': 'hsl(var(--text-tertiary))',
        'card-highlight': 'hsl(var(--card-highlight))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-out': 'fadeOut 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'scale-out': 'scaleOut 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        scaleOut: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.95)', opacity: '0' }
        }
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;