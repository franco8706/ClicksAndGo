"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Globe, ChevronDown } from "lucide-react";

export default function LanguageSelector() {
  const pathname = usePathname();
  const router = useRouter();

  const currentLocale = pathname?.split("/")[1] || "es";

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value;
    if (!pathname || pathname === "/" || pathname === `/${currentLocale}`) {
      router.push(`/${newLocale}`);
      return;
    }
    const segments = pathname.split("/");
    segments[1] = newLocale;
    router.push(segments.join("/"));
  };

  return (
    <div className="relative group w-[124px]" data-agent-target="language-selector">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
        <Globe size={14} className="text-[#9aa1ac] group-hover:text-blue-600 transition-colors duration-200" />
      </div>

      <select
        value={currentLocale}
        onChange={handleChange}
        aria-label="Cambiar idioma del sistema"
        className="w-full appearance-none bg-white border border-[#e6e8ec] text-[#6b7280] text-[10px] font-black pl-9 pr-7 py-2.5 rounded-[2px] outline-none cursor-pointer transition-all duration-200 hover:text-blue-600 hover:border-blue-300 tracking-widest"
      >
        <option value="es" className="bg-white text-[#0a0e14] font-bold py-2">ESPAÑOL</option>
        <option value="en" className="bg-white text-[#0a0e14] font-bold py-2">ENGLISH</option>
        <option value="pt" className="bg-white text-[#0a0e14] font-bold py-2">PORTUGUÊS</option>
      </select>

      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <ChevronDown size={12} className="text-[#9aa1ac] group-hover:text-blue-600 transition-colors duration-200" />
      </div>
    </div>
  );
}
