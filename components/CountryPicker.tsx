"use client";

import { useState, useEffect } from "react";

interface Country {
  code: string;
  name: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "BO", name: "Bolivia", flag: "🇧🇴" },
  { code: "BR", name: "Brasil", flag: "🇧🇷" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "CR", name: "Costa Rica", flag: "🇨🇷" },
  { code: "EC", name: "Ecuador", flag: "🇪🇨" },
  { code: "ES", name: "España", flag: "🇪🇸" },
  { code: "GT", name: "Guatemala", flag: "🇬🇹" },
  { code: "HN", name: "Honduras", flag: "🇭🇳" },
  { code: "MX", name: "México", flag: "🇲🇽" },
  { code: "NI", name: "Nicaragua", flag: "🇳🇮" },
  { code: "PA", name: "Panamá", flag: "🇵🇦" },
  { code: "PE", name: "Perú", flag: "🇵🇪" },
  { code: "PY", name: "Paraguay", flag: "🇵🇾" },
  { code: "SV", name: "El Salvador", flag: "🇸🇻" },
  { code: "UY", name: "Uruguay", flag: "🇺🇾" },
  { code: "VE", name: "Venezuela", flag: "🇻🇪" },
  { code: "US", name: "Estados Unidos", flag: "🇺🇸" },
  { code: "GB", name: "Reino Unido", flag: "🇬🇧" },
  { code: "DE", name: "Alemania", flag: "🇩🇪" },
  { code: "FR", name: "Francia", flag: "🇫🇷" },
  { code: "IT", name: "Italia", flag: "🇮🇹" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
];

interface CountryPickerProps {
  currentCountry: string;
  onCountryChange: (code: string) => void;
}

export default function CountryPicker({ currentCountry, onCountryChange }: CountryPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const current = COUNTRIES.find((c) => c.code === currentCountry) ?? COUNTRIES[7]; // default ES

  const filtered = search
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.code.toLowerCase().includes(search.toLowerCase())
      )
    : COUNTRIES;

  const handleSelect = (code: string) => {
    onCountryChange(code);
    setIsOpen(false);
    setSearch("");
    localStorage.setItem("pelicula-country", code);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-country-picker]")) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" data-country-picker>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#141414] hover:bg-[#1C1C1C] border border-[#262626] hover:border-[#525252] transition-all text-sm text-[#A3A3A3] hover:text-white min-h-[36px]"
        aria-label="Cambiar país"
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="hidden sm:inline text-xs font-medium">{current.code}</span>
        <svg className="w-3 h-3 text-[#525252]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-[#1C1C1C] border border-[#262626] rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="p-2 border-b border-[#262626]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar país..."
              className="w-full bg-[#141414] text-sm text-white placeholder-[#525252] px-3 py-2 rounded-xl outline-none focus:ring-1 focus:ring-[#525252] border border-[#262626] focus:border-[#525252] transition-colors"
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.map((country) => (
              <button
                key={country.code}
                onClick={() => handleSelect(country.code)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-[#262626] transition-colors text-left min-h-[44px]
                  ${country.code === currentCountry ? "text-[#E50914]" : "text-[#A3A3A3] hover:text-white"}
                `}
              >
                <span className="text-base">{country.flag}</span>
                <span>{country.name}</span>
                {country.code === currentCountry && (
                  <svg className="w-4 h-4 ml-auto text-[#E50914]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
