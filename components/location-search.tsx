"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, MapPin, Loader2 } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface LocationSearchProps {
  onLocationSelect: (location: { lat: number; lng: number; name: string }) => void
}

export default function LocationSearch({ onLocationSelect }: LocationSearchProps) {
  const { t, dir } = useLanguage()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const searchLocations = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`,
      )
      const data = await response.json()
      setSearchResults(data)
    } catch (error) {
      console.error("Error searching locations:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleLocationSelect = (result: any) => {
    onLocationSelect({
      lat: Number.parseFloat(result.lat),
      lng: Number.parseFloat(result.lon),
      name: result.display_name,
    })
    setIsDialogOpen(false)
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          <span>{t("searchLocation")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent dir={dir} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("searchForLocation")}</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 mt-4">
          <Input
            placeholder={t("enterCity")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchLocations()}
          />
          <Button onClick={searchLocations} disabled={isSearching}>
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
        <div className="mt-4 max-h-[300px] overflow-y-auto">
          {searchResults.length > 0 ? (
            <ul className="space-y-2">
              {searchResults.map((result) => (
                <li key={result.place_id}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left"
                    onClick={() => handleLocationSelect(result)}
                  >
                    <MapPin className={`h-4 w-4 ${dir === "rtl" ? "ml-2" : "mr-2"} flex-shrink-0`} />
                    <span className="truncate">{result.display_name}</span>
                  </Button>
                </li>
              ))}
            </ul>
          ) : isSearching ? (
            <p className="text-center py-4">{t("searching")}</p>
          ) : searchQuery ? (
            <p className="text-center py-4">{t("noResults")}</p>
          ) : (
            <p className="text-center py-4">{t("enterLocation")}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

