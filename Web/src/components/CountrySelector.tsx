"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { MapPin, ChevronDown } from "lucide-react";
import { SUPPORTED_COUNTRIES, COUNTRY_LABELS, COUNTRY_LABELS_COMPACT, COUNTRY_COOKIE } from "@/lib/countries";

interface CountrySelectorProps {
  /** País resuelto en el servidor (cookie → cabecera de IP → "US"). Evita el
   *  parpadeo de hidratación: el `<select>` nace ya con el valor correcto en
   *  vez de mostrar "US" un instante y saltar al real tras el primer render. */
  readonly initialCountry: string;
  /** Navbar renderiza DOS instancias de este componente (desktop y móvil,
   *  una oculta por CSS según breakpoint, no condicionalmente montada). En
   *  compacto se muestra bandera + código en vez del nombre completo — a
   *  375px de ancho el navbar ya está al límite solo con logo + idioma + botón. */
  readonly compact?: boolean;
}

export default function CountrySelector({ initialCountry, compact = false }: CountrySelectorProps) {
  const router = useRouter();
  const [country, setCountry] = React.useState(initialCountry);

  // 🔄 Las dos instancias (desktop/móvil) tienen su propio `useState`, cada
  // una sembrada UNA vez desde `initialCountry` al montar. `useState` no
  // vuelve a leer la prop en renders posteriores, así que sin este efecto,
  // cambiar el país desde una instancia dejaba a la otra mostrando el valor
  // viejo — aunque el catálogo real (gobernado por la cookie) ya estaba
  // actualizado. Verificado: elegir Argentina en desktop y después mirar el
  // selector móvil seguía mostrando "Estados Unidos" hasta recargar la página.
  React.useEffect(() => {
    setCountry(initialCountry);
  }, [initialCountry]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    setCountry(next); // respuesta visual inmediata en ESTA instancia
    // Cookie legible por el cliente (no httpOnly): la necesita este mismo
    // selector para mostrar el valor elegido en la próxima carga. Un año de
    // vida — es una preferencia de navegación, no un dato sensible.
    document.cookie = `${COUNTRY_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    // El catálogo se arma en un Server Component (`page.tsx` lee la cookie
    // en el servidor); `router.refresh()` vuelve a pedirlo y baja un nuevo
    // `initialCountry` a AMBAS instancias, que el efecto de arriba sincroniza.
    router.refresh();
  };

  const labels = compact ? COUNTRY_LABELS_COMPACT : COUNTRY_LABELS;

  return (
    <div
      className={compact ? "relative group w-[84px]" : "relative group w-[168px]"}
      data-agent-target="country-selector"
    >
      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none z-10">
        <MapPin size={14} className="text-[#9aa1ac] group-hover:text-blue-600 transition-colors duration-200" />
      </div>

      <select
        value={country}
        onChange={handleChange}
        aria-label="Cambiar país del catálogo"
        className={`w-full appearance-none bg-white border border-[#e6e8ec] text-[#6b7280] text-[10px] font-black outline-none cursor-pointer transition-all duration-200 hover:text-blue-600 hover:border-blue-300 tracking-widest rounded-[2px] py-2.5 ${
          compact ? "pl-8 pr-5" : "pl-9 pr-7"
        }`}
      >
        {SUPPORTED_COUNTRIES.map((code) => (
          <option key={code} value={code} className="bg-white text-[#0a0e14] font-bold py-2">
            {labels[code]}
          </option>
        ))}
      </select>

      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
        <ChevronDown size={12} className="text-[#9aa1ac] group-hover:text-blue-600 transition-colors duration-200" />
      </div>
    </div>
  );
}
