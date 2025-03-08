"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

type LanguageType = "en" | "ar"

interface Translations {
  [key: string]: {
    en: string
    ar: string
  }
}

const translations: Translations = {
  appTitle: {
    en: "Salawat",
    ar: "صلوات",
  },
  settings: {
    en: "Settings",
    ar: "الإعدادات",
  },
  location: {
    en: "Location",
    ar: "الموقع",
  },
  updateLocation: {
    en: "Update Location",
    ar: "تحديث الموقع",
  },
  searchLocation: {
    en: "Search Location",
    ar: "البحث عن موقع",
  },
  date: {
    en: "Date",
    ar: "التاريخ",
  },
  calculationMethod: {
    en: "Calculation Method",
    ar: "طريقة الحساب",
  },
  prayerTimes: {
    en: "Prayer Times",
    ar: "أوقات الصلاة",
  },
  nextAdhan: {
    en: "Next Adhān",
    ar: "الأذان القادم",
  },
  nextIqama: {
    en: "Next Iqāma",
    ar: "الإقامة القادمة",
  },
  adhan: {
    en: "Adhān",
    ar: "أذان",
  },
  iqama: {
    en: "Iqāma",
    ar: "إقامة",
  },
  fajr: {
    en: "Fajr",
    ar: "الفجر",
  },
  dhuhr: {
    en: "Dhuhr",
    ar: "الظهر",
  },
  asr: {
    en: "Asr",
    ar: "العصر",
  },
  maghrib: {
    en: "Maghrib",
    ar: "المغرب",
  },
  isha: {
    en: "Isha",
    ar: "العشاء",
  },
  gregorian: {
    en: "Gregorian",
    ar: "ميلادي",
  },
  hijri: {
    en: "Hijri",
    ar: "هجري",
  },
  language: {
    en: "Language",
    ar: "اللغة",
  },
  english: {
    en: "English",
    ar: "الإنجليزية",
  },
  arabic: {
    en: "Arabic",
    ar: "العربية",
  },
  madeWith: {
    en: "Made with",
    ar: "صنع بـ",
  },
  by: {
    en: "by",
    ar: "بواسطة",
  },
  searchForLocation: {
    en: "Search for a Location",
    ar: "البحث عن موقع",
  },
  enterCity: {
    en: "Enter city, address, or place",
    ar: "أدخل المدينة أو العنوان أو المكان",
  },
  searching: {
    en: "Searching...",
    ar: "جاري البحث...",
  },
  noResults: {
    en: "No results found. Try a different search term.",
    ar: "لم يتم العثور على نتائج. جرب مصطلح بحث مختلف.",
  },
  enterLocation: {
    en: "Enter a location to search",
    ar: "أدخل موقعًا للبحث",
  },
  detectingLocation: {
    en: "Detecting location...",
    ar: "جاري تحديد الموقع...",
  },
  pickDate: {
    en: "Pick a date",
    ar: "اختر تاريخًا",
  },
  selectCalculationMethod: {
    en: "Select calculation method",
    ar: "اختر طريقة الحساب",
  },
  unableToLoad: {
    en: "Unable to load prayer times. Please check your connection and try again.",
    ar: "تعذر تحميل أوقات الصلاة. يرجى التحقق من اتصالك والمحاولة مرة أخرى.",
  },
}

interface LanguageContextType {
  language: LanguageType
  setLanguage: (language: LanguageType) => void
  t: (key: string) => string
  dir: string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageType>("en")

  // Initialize language from localStorage if available
  useEffect(() => {
    const savedLanguage = localStorage.getItem("salawat-language") as LanguageType | null
    if (savedLanguage) {
      setLanguageState(savedLanguage)
    }
  }, [])

  // Save language preference
  useEffect(() => {
    localStorage.setItem("salawat-language", language)
    document.documentElement.lang = language
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr"
  }, [language])

  const setLanguage = (newLanguage: LanguageType) => {
    setLanguageState(newLanguage)
  }

  const t = (key: string): string => {
    if (!translations[key]) {
      console.warn(`Translation key not found: ${key}`)
      return key
    }
    return translations[key][language]
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir: language === "ar" ? "rtl" : "ltr" }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}

