"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

type ThemeType = "dark" | "light"

interface ThemeColors {
  background: string
  foreground: string
  card: string
  cardForeground: string
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  accent: string
  accentForeground: string
  border: string
  input: string
  ring: string
}

interface ThemeContextType {
  theme: ThemeType
  setTheme: (theme: ThemeType) => void
}

// Dark colors (Catppuccin Mocha)
const darkColors: ThemeColors = {
  background: "#1e1e2e", // Catppuccin Mocha background
  foreground: "#cdd6f4", // Catppuccin Mocha text
  card: "#181825", // Catppuccin Mocha surface
  cardForeground: "#cdd6f4", // Catppuccin Mocha text
  primary: "#cba6f7", // Catppuccin Mocha lavender
  primaryForeground: "#1e1e2e", // Catppuccin Mocha background
  secondary: "#f5c2e7", // Catppuccin Mocha pink
  secondaryForeground: "#1e1e2e", // Catppuccin Mocha background
  accent: "#89b4fa", // Catppuccin Mocha blue
  accentForeground: "#1e1e2e", // Catppuccin Mocha background
  border: "#313244", // Catppuccin Mocha border
  input: "#313244", // Catppuccin Mocha border
  ring: "#cba6f7", // Catppuccin Mocha lavender
}

// Light colors
const lightColors: ThemeColors = {
  background: "#EEEEEE", // Light gray background
  foreground: "#444444", // Dark gray text
  card: "#F8F8F8", // Slightly darker card background
  cardForeground: "#444444", // Dark gray text
  primary: "#444444", // Dark gray for primary
  primaryForeground: "#FFFFFF", // White text on primary
  secondary: "#666666", // Darker gray for secondary
  secondaryForeground: "#FFFFFF", // White text on secondary
  accent: "#444444", // Dark gray for accent
  accentForeground: "#FFFFFF", // White text on accent
  border: "#DDDDDD", // Light border
  input: "#F0F0F0", // Slightly darker input background
  ring: "#999999", // Medium gray ring
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>("dark") // Default to dark theme

  // Initialize theme from localStorage if available
  useEffect(() => {
    const savedTheme = localStorage.getItem("salawat-theme") as ThemeType | null
    if (savedTheme && (savedTheme === "dark" || savedTheme === "light")) {
      setThemeState(savedTheme)
    }
  }, [])

  // Apply theme colors to document
  useEffect(() => {
    const root = document.documentElement
    const colors = theme === "dark" ? darkColors : lightColors

    // Apply each color directly to CSS variables
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value)
    })

    // Set data-theme attribute for shadcn components
    document.body.className = theme === "light" ? "light" : "dark"

    // Save theme preference
    localStorage.setItem("salawat-theme", theme)
  }, [theme])

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme)
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

