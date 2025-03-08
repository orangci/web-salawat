"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, CalendarIcon, Settings } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { format, addMinutes, addDays } from "date-fns"
import { cn } from "@/lib/utils"
import { ThemeSelector } from "@/components/theme-selector"
import { LanguageSelector } from "@/components/language-selector"
import { LocationSearch } from "@/components/location-search"
import { useTheme } from "@/contexts/theme-context"
import { useLanguage } from "@/contexts/language-context"

export default function Home() {
  const { theme } = useTheme()
  const { t, language, dir } = useLanguage()
  const [date, setDate] = useState<Date>(new Date())
  const [location, setLocation] = useState<{ lat: number; lng: number; timezone?: string } | null>(null)
  const [locationName, setLocationName] = useState<string>("")
  const [prayerTimes, setPrayerTimes] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [upcomingPrayer, setUpcomingPrayer] = useState<string>("")
  const [countdown, setCountdown] = useState<string>("")
  const [countdownType, setCountdownType] = useState<"adhan" | "iqama">("adhan")
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [hoveredPrayer, setHoveredPrayer] = useState<string | null>(null)
  const [hoveredCountdown, setHoveredCountdown] = useState<string>("")
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [locationChanged, setLocationChanged] = useState(0) // Counter to force re-renders
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const locationRef = useRef<{ lat: number; lng: number; timezone?: string } | null>(null)

  // Update locationRef when location changes
  useEffect(() => {
    locationRef.current = location
  }, [location])

  // Get user location from browser
  const getUserLocation = useCallback(() => {
    setLoading(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          // Get timezone from coordinates
          try {
            const tzResponse = await fetch(
              `https://api.timezonedb.com/v2.1/get-time-zone?key=2PFF2XVAP7AW&format=json&by=position&lat=${latitude}&lng=${longitude}`,
            ).then((res) => res.json())

            // Clear any existing interval before changing location
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
              intervalRef.current = null
            }

            setLocation({ lat: latitude, lng: longitude, timezone: tzResponse.zoneName })
            setLocationChanged((prev) => prev + 1) // Force re-render

            // Get location name from coordinates
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            )
            const data = await response.json()
            const city = data.address.city || data.address.town || data.address.village || ""
            const state = data.address.state || ""
            const country = data.address.country || ""
            setLocationName(
              `${city}${city && state ? ", " : ""}${state}${(city || state) && country ? ", " : ""}${country}`,
            )
          } catch (error) {
            console.error("Error fetching location data:", error)
            setLocation({ lat: latitude, lng: longitude })
            setLocationName("Unknown Location")
          }
        },
        async (error) => {
          console.error("Error getting location:", error)
          // Fallback to IP-based location
          getIPLocation()
        },
      )
    } else {
      // Fallback to IP-based location if geolocation is not supported
      getIPLocation()
    }
  }, [])

  // Get location from IP address
  const getIPLocation = useCallback(async () => {
    try {
      const response = await fetch("https://ipapi.co/json/")
      const data = await response.json()

      // Clear any existing interval before changing location
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }

      setLocation({ lat: data.latitude, lng: data.longitude, timezone: data.timezone })
      setLocationChanged((prev) => prev + 1) // Force re-render
      setLocationName(`${data.city}, ${data.region}, ${data.country_name}`)
    } catch (error) {
      console.error("Error getting IP location:", error)
      setLocationName("Unknown Location")
    } finally {
      setLoading(false)
    }
  }, [])

  // Handle location selection from search
  const handleLocationSelect = useCallback(async (selectedLocation: { lat: number; lng: number; name: string }) => {
    try {
      // Get timezone for the selected location
      const tzResponse = await fetch(
        `https://api.timezonedb.com/v2.1/get-time-zone?key=2PFF2XVAP7AW&format=json&by=position&lat=${selectedLocation.lat}&lng=${selectedLocation.lng}`,
      ).then((res) => res.json())

      // Clear any existing interval before changing location
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }

      // Reset states related to prayer times
      setUpcomingPrayer("")
      setCountdown("")
      setPrayerTimes(null)

      // Update location
      setLocation({
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        timezone: tzResponse.zoneName,
      })
      setLocationChanged((prev) => prev + 1) // Force re-render
      setLocationName(selectedLocation.name)
    } catch (error) {
      console.error("Error getting timezone for location:", error)
      setLocation({ lat: selectedLocation.lat, lng: selectedLocation.lng })
      setLocationName(selectedLocation.name)
    }
  }, [])

  // Fetch prayer times
  const fetchPrayerTimes = useCallback(async () => {
    if (!location) return

    setLoading(true)
    try {
      const formattedDate = format(date, "dd-MM-yyyy")
      // Using method 3 (Umm al-Qura) by default
      const response = await fetch(
        `https://api.aladhan.com/v1/timings/${formattedDate}?latitude=${location.lat}&longitude=${location.lng}&method=3`,
      )
      const data = await response.json()
      setPrayerTimes(data.data)
    } catch (error) {
      console.error("Error fetching prayer times:", error)
    } finally {
      setLoading(false)
    }
  }, [location, date])

  // Calculate Iqama times (typically 15 minutes after Adhan)
  const calculateIqamaTimes = useCallback((times: any) => {
    if (!times) return {}

    const iqamaTimes: Record<string, Date> = {}
    const prayerNames = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]
    const now = getLocationAdjustedTime()

    prayerNames.forEach((prayer) => {
      if (times.timings && times.timings[prayer]) {
        const [hours, minutes] = times.timings[prayer].split(":").map(Number)

        // Create a date object for the prayer time using the location's date
        const adhanTime = new Date(now)
        adhanTime.setHours(hours, minutes, 0, 0)

        iqamaTimes[prayer] = addMinutes(adhanTime, 15)
      }
    })

    return iqamaTimes
  }, [])

  // Get current time adjusted for selected location's timezone
  const getLocationAdjustedTime = useCallback(() => {
    const loc = locationRef.current
    if (!loc?.timezone) return new Date()

    try {
      const now = new Date()

      // Get current time components in the location's timezone
      const options = { timeZone: loc.timezone, hour12: false } as Intl.DateTimeFormatOptions
      const timeString = now.toLocaleTimeString("en-US", options)
      const dateString = now.toLocaleDateString("en-US", {
        timeZone: loc.timezone,
        year: "numeric",
        month: "numeric",
        day: "numeric",
      })

      // Parse the date and time strings
      const [month, day, year] = dateString.split("/").map(Number)
      const [hours, minutes, seconds] = timeString.split(":").map(Number)

      // Create a new date with the location's date and time
      const adjustedTime = new Date(year, month - 1, day, hours, minutes, seconds)

      return adjustedTime
    } catch (error) {
      console.error("Error adjusting time for location:", error)
      return new Date()
    }
  }, [])

  // Format countdown time from difference in milliseconds
  const formatCountdown = (diffMs: number) => {
    if (diffMs <= 0) return "00:00:00"

    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000)

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  // Calculate countdown to a specific prayer
  const calculateCountdownToPrayer = useCallback(
    (prayer: string, isIqama = false) => {
      if (!prayerTimes || !prayerTimes.timings) return "00:00:00"

      const now = getLocationAdjustedTime()
      const [hours, minutes] = prayerTimes.timings[prayer].split(":").map(Number)

      // Create a date object for the prayer time using the same date as the adjusted time
      let prayerTime = new Date(now)
      prayerTime.setHours(hours, minutes, 0, 0)

      // If it's for iqama, add 15 minutes
      if (isIqama) {
        prayerTime = addMinutes(prayerTime, 15)
      }

      // If the prayer time has already passed today, use tomorrow's time
      if (prayerTime < now) {
        prayerTime = addDays(prayerTime, 1)
      }

      const diffMs = prayerTime.getTime() - now.getTime()
      return formatCountdown(diffMs)
    },
    [prayerTimes, getLocationAdjustedTime],
  )

  // Determine upcoming prayer and update countdown
  const updateUpcomingPrayerAndCountdown = useCallback(() => {
    if (!prayerTimes || !prayerTimes.timings) return

    const now = getLocationAdjustedTime()
    const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]
    const prayerTimesObj: Record<string, Date> = {}
    const iqamaTimesObj = calculateIqamaTimes(prayerTimes)

    // Convert prayer times to Date objects
    prayers.forEach((prayer) => {
      if (prayerTimes.timings[prayer]) {
        const [hours, minutes] = prayerTimes.timings[prayer].split(":").map(Number)

        const prayerTime = new Date(now) // Use the same date as the adjusted time
        prayerTime.setHours(hours, minutes, 0, 0)

        prayerTimesObj[prayer] = prayerTime
      }
    })

    // Add tomorrow's Fajr
    if (prayerTimes.timings.Fajr) {
      const [fajrHours, fajrMinutes] = prayerTimes.timings.Fajr.split(":").map(Number)
      const tomorrowFajr = addDays(new Date(now), 1) // Use the adjusted time's date
      tomorrowFajr.setHours(fajrHours, fajrMinutes, 0, 0)

      prayerTimesObj["TomorrowFajr"] = tomorrowFajr
      iqamaTimesObj["TomorrowFajr"] = addMinutes(tomorrowFajr, 15)
    }

    // Find upcoming prayer
    let upcoming = ""
    let targetTime: Date = now
    let isIqama = false

    for (let i = 0; i < prayers.length; i++) {
      const prayer = prayers[i]
      const adhanTime = prayerTimesObj[prayer]
      const iqamaTime = iqamaTimesObj[prayer]

      if (now < adhanTime) {
        upcoming = prayer
        targetTime = adhanTime
        break
      } else if (now < iqamaTime) {
        upcoming = prayer
        targetTime = iqamaTime
        isIqama = true
        break
      }
    }

    if (!upcoming) {
      upcoming = "Fajr"
      targetTime = prayerTimesObj.TomorrowFajr
    }

    setUpcomingPrayer(upcoming)
    setCountdownType(isIqama ? "iqama" : "adhan")

    // Calculate countdown
    const diffMs = targetTime.getTime() - now.getTime()
    setCountdown(formatCountdown(diffMs))

    // Update hovered countdown if a prayer is being hovered
    if (hoveredPrayer) {
      setHoveredCountdown(calculateCountdownToPrayer(hoveredPrayer))
    }
  }, [prayerTimes, calculateIqamaTimes, getLocationAdjustedTime, hoveredPrayer, calculateCountdownToPrayer])

  // Initialize with IP location on component mount
  useEffect(() => {
    getIPLocation()

    // Clean up interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [getIPLocation])

  // Fetch prayer times when location or date changes
  useEffect(() => {
    if (location) {
      fetchPrayerTimes()
    }
  }, [location, date, fetchPrayerTimes, locationChanged])

  // Update upcoming prayer and countdown every second
  useEffect(() => {
    if (!prayerTimes) return

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Initial update
    updateUpcomingPrayerAndCountdown()

    // Set up interval for updates
    intervalRef.current = setInterval(() => {
      updateUpcomingPrayerAndCountdown()
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [prayerTimes, updateUpcomingPrayerAndCountdown, location, locationChanged])

  const formatDate = (date: Date, hijriDate: any) => {
    // Format Gregorian date: 8th March 2025
    const gregorianDate = format(date, "do MMMM yyyy")

    // Format Hijri date: 8th Ramaḍān 1446 AH
    // Add ordinal suffix to the day
    const hijriDay = `${hijriDate.day}${getOrdinalSuffix(hijriDate.day)}`
    const hijriMonth = hijriDate.month.en
    const hijriYear = hijriDate.year
    const hijriDateStr = `${hijriDay} ${hijriMonth} ${hijriYear} AH`

    // Combine with em dash
    return (
      <div className="flex flex-col">
        <span>{`${gregorianDate} — ${hijriDateStr}`}</span>
      </div>
    )
  }

  const getOrdinalSuffix = (day: number) => {
    if (language === "ar") return ""

    const j = day % 10,
      k = day % 100
    if (j == 1 && k != 11) {
      return "st"
    }
    if (j == 2 && k != 12) {
      return "nd"
    }
    if (j == 3 && k != 13) {
      return "rd"
    }
    return "th"
  }

  const getPrayerNameTranslation = (prayer: string) => {
    const key = prayer.toLowerCase()
    return t(key)
  }

  // Handle date change
  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate)
      setIsDatePickerOpen(false)
    }
  }

  // Handle prayer card hover
  const handlePrayerHover = (prayer: string | null) => {
    setHoveredPrayer(prayer)
    if (prayer) {
      setHoveredCountdown(calculateCountdownToPrayer(prayer))
    }
  }

  // Toggle date picker dialog
  const toggleDatePicker = () => {
    setIsDatePickerOpen(!isDatePickerOpen)
  }

  return (
    <main
      className="min-h-screen p-4 md:p-8 flex flex-col"
      style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
      dir={dir}
    >
      <div className="max-w-5xl mx-auto flex-grow w-full">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold" style={{ color: "var(--primary)" }}>
            {t("appTitle")}
          </h1>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <ThemeSelector />
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent
                style={{
                  backgroundColor: "var(--card)",
                  color: "var(--card-foreground)",
                  borderColor: "var(--border)",
                }}
              >
                <DialogHeader>
                  <DialogTitle style={{ color: "var(--primary)" }}>{t("settings")}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4 mt-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {locationName || t("detectingLocation")}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        onClick={getUserLocation}
                        style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
                      >
                        {t("updateLocation")}
                      </Button>
                      <LocationSearch onLocationSelect={handleLocationSelect} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {/* Date picker button */}
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      style={{ backgroundColor: "var(--input)", borderColor: "var(--border)" }}
                      onClick={toggleDatePicker}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>{t("pickDate")}</span>}
                    </Button>

                    {/* Date picker dialog */}
                    {isDatePickerOpen && (
                      <Dialog open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                        <DialogContent
                          className="p-0 max-w-fit"
                          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
                        >
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={handleDateChange}
                            initialFocus
                            className="rounded-md border p-3"
                            style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
                          />
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Countdown to Next Prayer */}
        {prayerTimes && !loading && (
          <Card className="mb-8" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center">
                <div className="mb-2" style={{ color: "var(--card-foreground)" }}>
                  {hoveredPrayer ? (
                    <>
                      {t("nextAdhan")}: {getPrayerNameTranslation(hoveredPrayer)}
                    </>
                  ) : (
                    <>
                      {countdownType === "adhan" ? t("nextAdhan") : t("nextIqama")}:{" "}
                      {getPrayerNameTranslation(upcomingPrayer)}
                    </>
                  )}
                </div>
                <div className="text-5xl font-bold mb-2 font-mono" style={{ color: "var(--secondary)" }}>
                  {hoveredPrayer ? hoveredCountdown : countdown}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Prayer Times Display */}
        <Card className="mb-8" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl" style={{ color: "var(--primary)" }}>
              {t("prayerTimes")}
            </CardTitle>
            <CardDescription style={{ color: "var(--card-foreground)" }}>
              {prayerTimes?.date && formatDate(date, prayerTimes.date.hijri)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div
                  className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2"
                  style={{ borderColor: "var(--primary)" }}
                ></div>
              </div>
            ) : prayerTimes ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"].map((prayer) => (
                  <Card
                    key={prayer}
                    className={cn(
                      "transition-all duration-300",
                      upcomingPrayer === prayer && "border-[var(--primary)] shadow-lg",
                    )}
                    style={{
                      backgroundColor: "var(--card)",
                      borderColor: upcomingPrayer === prayer ? "var(--primary)" : "var(--border)",
                    }}
                    onMouseEnter={() => handlePrayerHover(prayer)}
                    onMouseLeave={() => handlePrayerHover(null)}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center">
                        {upcomingPrayer === prayer && (
                          <div
                            className={cn("w-2 h-2 rounded-full animate-pulse", language === "ar" ? "ml-2" : "mr-2")}
                            style={{ backgroundColor: "var(--primary)" }}
                          ></div>
                        )}
                        <h3 className="text-lg font-medium" style={{ color: "var(--card-foreground)" }}>
                          {getPrayerNameTranslation(prayer)}
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-right">
                          <p className="text-xs" style={{ color: "var(--card-foreground)" }}>
                            {t("adhan")}
                          </p>
                          <p className="text-base font-medium" style={{ color: "var(--secondary)" }}>
                            {prayerTimes.timings[prayer]}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs" style={{ color: "var(--card-foreground)" }}>
                            {t("iqama")}
                          </p>
                          <p
                            className="text-base font-medium"
                            style={{ color: theme === "light" ? "#40a02b" : "#a6e3a1" }}
                          >
                            {prayerTimes.timings[prayer] && format(calculateIqamaTimes(prayerTimes)[prayer], "HH:mm")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8" style={{ color: theme === "light" ? "#d20f39" : "#f38ba8" }}>
                {t("unableToLoad")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-sm">
        <p style={{ color: "var(--card-foreground)" }}>
          {t("madeWith")} 💖 {t("by")}{" "}
          <a
            href="https://orangc.net"
            style={{ color: theme === "light" ? "#fe640b" : "#fab387" }}
            className="hover:underline"
          >
            orangc
          </a>
          .
        </p>
      </footer>
    </main>
  )
}

