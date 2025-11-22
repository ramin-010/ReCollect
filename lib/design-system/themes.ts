// ReCollect Design System - Theme Configuration
// Complete theme system with Dark, Light, Blue, and Gray modes

export const themes = {
  dark: {
    // Preserving the beloved dark theme colors exactly
    name: 'dark',
    colors: {
      background: 'hsl(240, 10%, 3.9%)',
      foreground: 'hsl(0, 0%, 98%)',
      card: 'hsl(240, 10%, 3.9%)',
      cardForeground: 'hsl(0, 0%, 98%)',
      popover: 'hsl(240, 10%, 3.9%)',
      popoverForeground: 'hsl(0, 0%, 98%)',
      primary: 'hsl(0, 0%, 98%)',
      primaryForeground: 'hsl(240, 5.9%, 10%)',
      secondary: 'hsl(240, 3.7%, 15.9%)',
      secondaryForeground: 'hsl(0, 0%, 98%)',
      muted: 'hsl(240, 3.7%, 15.9%)',
      mutedForeground: 'hsl(240, 5%, 64.9%)',
      accent: 'hsl(240, 3.7%, 15.9%)',
      accentForeground: 'hsl(0, 0%, 98%)',
      destructive: 'hsl(0, 62.8%, 30.6%)',
      destructiveForeground: 'hsl(0, 0%, 98%)',
      border: 'hsl(240, 3.7%, 15.9%)',
      input: 'hsl(240, 3.7%, 15.9%)',
      ring: 'hsl(240, 4.9%, 83.9%)',
      // Custom colors for ReCollect
      surfaceLight: 'hsl(240, 10%, 8%)',
      surfaceMedium: 'hsl(240, 10%, 12%)',
      textSecondary: 'hsl(240, 5%, 65%)',
      brandPrimary: 'hsl(259, 100%, 65%)', // Purple accent
      brandSecondary: 'hsl(217, 91%, 60%)', // Blue accent
    }
  },
  light: {
    name: 'light',
    colors: {
      background: 'hsl(0, 0%, 100%)',
      foreground: 'hsl(240, 10%, 3.9%)',
      card: 'hsl(0, 0%, 100%)',
      cardForeground: 'hsl(240, 10%, 3.9%)',
      popover: 'hsl(0, 0%, 100%)',
      popoverForeground: 'hsl(240, 10%, 3.9%)',
      primary: 'hsl(240, 5.9%, 10%)',
      primaryForeground: 'hsl(0, 0%, 98%)',
      secondary: 'hsl(240, 4.8%, 95.9%)',
      secondaryForeground: 'hsl(240, 5.9%, 10%)',
      muted: 'hsl(240, 4.8%, 95.9%)',
      mutedForeground: 'hsl(240, 3.8%, 46.1%)',
      accent: 'hsl(240, 4.8%, 95.9%)',
      accentForeground: 'hsl(240, 5.9%, 10%)',
      destructive: 'hsl(0, 84.2%, 60.2%)',
      destructiveForeground: 'hsl(0, 0%, 98%)',
      border: 'hsl(240, 5.9%, 90%)',
      input: 'hsl(240, 5.9%, 90%)',
      ring: 'hsl(240, 5.9%, 10%)',
      // Custom colors
      surfaceLight: 'hsl(0, 0%, 98%)',
      surfaceMedium: 'hsl(240, 4.8%, 95.9%)',
      textSecondary: 'hsl(240, 3.8%, 46.1%)',
      brandPrimary: 'hsl(259, 84%, 55%)',
      brandSecondary: 'hsl(217, 91%, 50%)',
    }
  },
  blue: {
    name: 'blue',
    colors: {
      background: 'hsl(210, 40%, 98%)',
      foreground: 'hsl(222, 47%, 11%)',
      card: 'hsl(210, 40%, 99%)',
      cardForeground: 'hsl(222, 47%, 11%)',
      popover: 'hsl(210, 40%, 99%)',
      popoverForeground: 'hsl(222, 47%, 11%)',
      primary: 'hsl(217, 91%, 50%)',
      primaryForeground: 'hsl(0, 0%, 100%)',
      secondary: 'hsl(214, 32%, 91%)',
      secondaryForeground: 'hsl(222, 47%, 11%)',
      muted: 'hsl(214, 32%, 91%)',
      mutedForeground: 'hsl(215, 16%, 47%)',
      accent: 'hsl(214, 32%, 91%)',
      accentForeground: 'hsl(222, 47%, 11%)',
      destructive: 'hsl(0, 84%, 60%)',
      destructiveForeground: 'hsl(0, 0%, 98%)',
      border: 'hsl(214, 32%, 85%)',
      input: 'hsl(214, 32%, 91%)',
      ring: 'hsl(217, 91%, 50%)',
      // Custom colors
      surfaceLight: 'hsl(210, 40%, 99.5%)',
      surfaceMedium: 'hsl(214, 32%, 94%)',
      textSecondary: 'hsl(215, 16%, 47%)',
      brandPrimary: 'hsl(217, 91%, 50%)',
      brandSecondary: 'hsl(259, 84%, 55%)',
    }
  },
  gray: {
    name: 'gray',
    colors: {
      background: 'hsl(0, 0%, 96%)',
      foreground: 'hsl(0, 0%, 9%)',
      card: 'hsl(0, 0%, 98%)',
      cardForeground: 'hsl(0, 0%, 9%)',
      popover: 'hsl(0, 0%, 98%)',
      popoverForeground: 'hsl(0, 0%, 9%)',
      primary: 'hsl(0, 0%, 18%)',
      primaryForeground: 'hsl(0, 0%, 98%)',
      secondary: 'hsl(0, 0%, 91%)',
      secondaryForeground: 'hsl(0, 0%, 18%)',
      muted: 'hsl(0, 0%, 91%)',
      mutedForeground: 'hsl(0, 0%, 45%)',
      accent: 'hsl(0, 0%, 91%)',
      accentForeground: 'hsl(0, 0%, 18%)',
      destructive: 'hsl(0, 72%, 51%)',
      destructiveForeground: 'hsl(0, 0%, 98%)',
      border: 'hsl(0, 0%, 85%)',
      input: 'hsl(0, 0%, 91%)',
      ring: 'hsl(0, 0%, 45%)',
      // Custom colors
      surfaceLight: 'hsl(0, 0%, 99%)',
      surfaceMedium: 'hsl(0, 0%, 93%)',
      textSecondary: 'hsl(0, 0%, 45%)',
      brandPrimary: 'hsl(0, 0%, 25%)',
      brandSecondary: 'hsl(0, 0%, 35%)',
    }
  }
}

export type ThemeName = keyof typeof themes
export type Theme = typeof themes[ThemeName]

export const getTheme = (name: ThemeName): Theme => {
  return themes[name] || themes.dark
}

// CSS variables generator
export const generateCSSVariables = (theme: Theme): string => {
  const vars: string[] = []
  
  Object.entries(theme.colors).forEach(([key, value]) => {
    const cssVar = key.replace(/([A-Z])/g, '-$1').toLowerCase()
    vars.push(`--${cssVar}: ${value};`)
  })
  
  return vars.join('\n    ')
}
