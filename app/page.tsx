"use client"

import { useState, useEffect, useCallback } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, CalendarIcon, Settings } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { format, addMinutes } from "date-fns"
import { cn } from "@/lib/utils"

export default function Home() {
  const [date, setDate] = useState<Date>(new Date())
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationName, setLocationName] = useState<string>("")
  const [calculationMethod, setCalculationMethod] = useState<string>("3") // Default to Umm al-Qura
  const [prayerTimes, setPrayerTimes] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [upcomingPrayer, setUpcomingPrayer] = useState<string>("")
  const [countdown, setCountdown] = useState<string>("")
  const [countdownType, setCountdownType] = useState<"adhan" | "iqama">("adhan")

  const calculationMethods = [
    { id: "0", name: "Shia Ithna-Ashari" },
    { id: "1", name: "University of Islamic Sciences, Karachi" },
    { id: "2", name: "Islamic Society of North America" },
    { id: "3", name: "Umm al-Qura University, Makkah" },
    { id: "4", name: "Egyptian General Authority of Survey" },
    { id: "5", name: "Institute of Geophysics, University of Tehran" },
    { id: "7", name: "Muslim World League" },
    { id: "8", name: "Gulf Region" },
    { id: "9", name: "Kuwait" },
    { id: "10", name: "Qatar" },
    { id: "11", name: "Singapore" },
    { id: "12", name: "Turkey" },
    { id: "13", name: "Other" },
  ]

  // Get user location from browser
  const getUserLocation = () => {
    setLoading(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          setLocation({ lat: latitude, lng: longitude })

          // Get location name from coordinates
          try {
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
            console.error("Error fetching location name:", error)
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
  }

  // Get location from IP address
  const getIPLocation = async () => {
    try {
      const response = await fetch("https://ipapi.co/json/")
      const data = await response.json()
      setLocation({ lat: data.latitude, lng: data.longitude })
      setLocationName(`${data.city}, ${data.region}, ${data.country_name}`)
    } catch (error) {
      console.error("Error getting IP location:", error)
      setLocationName("Unknown Location")
    } finally {
      setLoading(false)
    }
  }

  // Fetch prayer times
  const fetchPrayerTimes = async () => {
    if (!location) return

    setLoading(true)
    try {
      const formattedDate = format(date, "dd-MM-yyyy")
      const response = await fetch(
        `https://api.aladhan.com/v1/timings/${formattedDate}?latitude=${location.lat}&longitude=${location.lng}&method=${calculationMethod}`,
      )
      const data = await response.json()
      setPrayerTimes(data.data)
    } catch (error) {
      console.error("Error fetching prayer times:", error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate Iqama times (typically 15 minutes after Adhan)
  const calculateIqamaTimes = useCallback(
    (times: any) => {
      if (!times) return {}

      const iqamaTimes: Record<string, Date> = {}
      const prayerNames = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]

      prayerNames.forEach((prayer) => {
        if (times.timings && times.timings[prayer]) {
          const [hours, minutes] = times.timings[prayer].split(":").map(Number)
          const adhanTime = new Date(date)
          adhanTime.setHours(hours, minutes, 0, 0)
          iqamaTimes[prayer] = addMinutes(adhanTime, 15)
        }
      })

      return iqamaTimes
    },
    [date],
  )

  // Determine upcoming prayer and update countdown
  const updateUpcomingPrayerAndCountdown = useCallback(() => {
    if (!prayerTimes || !prayerTimes.timings) return

    const now = new Date()
    const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]
    const prayerTimesObj: Record<string, Date> = {}
    const iqamaTimesObj = calculateIqamaTimes(prayerTimes)

    // Convert prayer times to Date objects
    prayers.forEach((prayer) => {
      const [hours, minutes] = prayerTimes.timings[prayer].split(":").map(Number)
      const prayerTime = new Date(now)
      prayerTime.setHours(hours, minutes, 0, 0)
      prayerTimesObj[prayer] = prayerTime
    })

    // Add tomorrow's Fajr
    const tomorrowFajr = new Date(now)
    tomorrowFajr.setDate(tomorrowFajr.getDate() + 1)
    const [fajrHours, fajrMinutes] = prayerTimes.timings.Fajr.split(":").map(Number)
    tomorrowFajr.setHours(fajrHours, fajrMinutes, 0, 0)
    prayerTimesObj["TomorrowFajr"] = tomorrowFajr
    iqamaTimesObj["TomorrowFajr"] = addMinutes(tomorrowFajr, 15)

    // Find upcoming prayer
    let upcoming = ""
    let targetTime: Date
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
    const diff = targetTime.getTime() - now.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    setCountdown(
      `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
    )
  }, [prayerTimes, calculateIqamaTimes])

  // Initialize with IP location on component mount
  useEffect(() => {
    getIPLocation()
  }, [])

  // Fetch prayer times when location, date, or calculation method changes
  useEffect(() => {
    if (location) {
      fetchPrayerTimes()
    }
  }, [location, date, calculationMethod])

  // Update upcoming prayer and countdown every second
  useEffect(() => {
    if (!prayerTimes) return

    updateUpcomingPrayerAndCountdown()
    const interval = setInterval(() => {
      updateUpcomingPrayerAndCountdown()
    }, 1000)

    return () => clearInterval(interval)
  }, [prayerTimes, updateUpcomingPrayerAndCountdown])

  const formatDate = (date: Date, hijriDate: any) => {
    const gregorian = format(date, "do MMMM yyyy")
    const hijri = `${hijriDate.day}${getOrdinalSuffix(hijriDate.day)} ${hijriDate.month.en} ${hijriDate.year}`
    return `${gregorian} — ${hijri}`
  }

  const getOrdinalSuffix = (day: number) => {
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

  return (
    <main className="min-h-screen bg-[#1e1e2e] text-[#cdd6f4] p-4 md:p-8 flex flex-col">
      <div className="max-w-5xl mx-auto flex-grow w-full">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-[#cba6f7]">Salawat</h1>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#181825] border-[#313244] text-[#cdd6f4]">
              <DialogHeader>
                <DialogTitle className="text-[#f5c2e7]">Settings</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 mt-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[#a6adc8] text-sm">Location</label>
                  <div className="text-[#cdd6f4] flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {locationName || "Detecting location..."}
                  </div>
                  <Button onClick={getUserLocation} className="bg-[#cba6f7] hover:bg-[#b4befe] text-[#1e1e2e] mt-2">
                    Update Location
                  </Button>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[#a6adc8] text-sm">Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal bg-[#313244] border-[#45475a] text-[#cdd6f4]"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-[#181825] border-[#313244]">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(date) => date && setDate(date)}
                        initialFocus
                        className="bg-[#181825] text-[#cdd6f4]"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[#a6adc8] text-sm">Calculation Method</label>
                  <Select value={calculationMethod} onValueChange={setCalculationMethod}>
                    <SelectTrigger className="w-full bg-[#313244] border-[#45475a] text-[#cdd6f4]">
                      <SelectValue placeholder="Select calculation method" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#181825] border-[#313244] text-[#cdd6f4]">
                      {calculationMethods.map((method) => (
                        <SelectItem
                          key={method.id}
                          value={method.id}
                          className="focus:bg-[#313244] focus:text-[#cdd6f4]"
                        >
                          {method.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Countdown to Next Prayer */}
        {prayerTimes && !loading && (
          <Card className="bg-[#181825] border-[#313244] mb-8">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center">
                <div className="text-[#a6adc8] mb-2">
                  Next {countdownType === "adhan" ? "Adhān" : "Iqāma"}: {upcomingPrayer}
                </div>
                <div className="text-5xl font-bold text-[#f9e2af] mb-2 font-mono">{countdown}</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Prayer Times Display */}
        <Card className="bg-[#181825] border-[#313244] mb-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#f5c2e7] text-xl">Prayer Times</CardTitle>
            <CardDescription className="text-[#a6adc8]">
              {prayerTimes?.date && formatDate(date, prayerTimes.date.hijri)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#cba6f7]"></div>
              </div>
            ) : prayerTimes ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"].map((prayer) => (
                  <Card
                    key={prayer}
                    className={cn(
                      "bg-[#313244] border-[#45475a] transition-all duration-300",
                      upcomingPrayer === prayer && "bg-[#45475a] border-[#cba6f7] shadow-lg",
                    )}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center">
                        {upcomingPrayer === prayer && (
                          <div className="w-2 h-2 rounded-full bg-[#cba6f7] mr-2 animate-pulse"></div>
                        )}
                        <h3
                          className={cn(
                            "text-lg font-medium",
                            upcomingPrayer === prayer ? "text-[#cba6f7]" : "text-[#89b4fa]",
                          )}
                        >
                          {prayer}
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-right">
                          <p className="text-[#a6adc8] text-xs">Adhān</p>
                          <p className="text-[#f9e2af] text-base font-medium">{prayerTimes.timings[prayer]}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[#a6adc8] text-xs">Iqāma</p>
                          <p className="text-[#a6e3a1] text-base font-medium">
                            {format(calculateIqamaTimes(prayerTimes)[prayer], "HH:mm")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#f38ba8]">
                Unable to load prayer times. Please check your connection and try again.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-[#a6adc8] text-sm">
        <p>
          Made with 💖 by{" "}
          <a href="https://orangc.net" className="text-[#fab387] hover:underline">
            orangc
          </a>
          .
        </p>
      </footer>
    </main>
  )
}

