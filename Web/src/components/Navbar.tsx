"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu, LayoutDashboard } from "lucide-react";
import LanguageSelector from "./LanguageSelector";
import type { Dict } from "@/types/dictionary";

interface UserSession {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}

interface NavbarProps {
  readonly dict: Dict;
  readonly currentLocale?: string;
  readonly session?: UserSession | null;
}

export default function Navbar({ dict, currentLocale: forcedLocale, session }: NavbarProps) {
  const pathname = usePathname();
  const currentLocale = forcedLocale || pathname?.split("/")[1] || "es";

  const getHref = (path: string) => `/${currentLocale}${path}`;

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    // 🐛 Sincronización inicial: sin esta llamada el navbar solo reaccionaba al
    // EVENTO scroll, así que al entrar con un ancla (`/es#productos`) o al
    // restaurar la posición al recargar, se quedaba en su estado translúcido
    // con el catálogo pasando por detrás y el logo ilegible.
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-200 ease-out border-b ${
        scrolled
          ? "glass-effect border-[#e6e8ec] py-3 shadow-sm"
          : "bg-white/80 backdrop-blur-sm border-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link
            href={getHref("/")}
            className="flex items-center gap-3 group transition-transform active:scale-95 shrink-0 select-none"
          >
            <div className="w-10 h-10 bg-[#0a0e14] rounded-md flex items-center justify-center group-hover:rotate-3 transition-transform duration-200">
              <Cpu size={20} className="text-white stroke-[2.5]" />
            </div>
            <span className="text-xl font-black text-[#0a0e14] tracking-tight uppercase">
              Clicks <span className="text-blue-600">&</span> Go
            </span>
          </Link>

          {/* Auth buttons + language — desktop */}
          <div className="hidden md:flex items-center gap-4">
            <LanguageSelector />

            {session?.user ? (
              /* Usuario logueado → botón Panel */
              <Link
                href={getHref("/panel")}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-[2px] text-sm font-bold tracking-wide transition-all duration-200 active:scale-95 select-none"
              >
                <LayoutDashboard size={15} />
                {dict.auth?.panel || "Mi Panel"}
              </Link>
            ) : (
              /* Visitante → login + register */
              <>
                <Link
                  href={getHref("/login")}
                  className="text-[#414855] hover:text-[#0a0e14] text-sm font-semibold tracking-wide transition-colors px-4 py-2"
                >
                  {dict.navbar?.login || "Iniciar sesión"}
                </Link>
                <Link
                  href={getHref("/register")}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-[2px] text-sm font-bold tracking-wide transition-all duration-200 active:scale-95 select-none"
                >
                  {dict.navbar?.register || "Registrarse"}
                </Link>
              </>
            )}
          </div>

          {/* Mobile: language + auth */}
          <div className="md:hidden flex items-center gap-3">
            <LanguageSelector />
            {session?.user ? (
              <Link
                href={getHref("/panel")}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-[2px] text-xs font-bold tracking-wide transition-colors active:scale-95 select-none"
              >
                <LayoutDashboard size={13} />
                {dict.auth?.panel || "Panel"}
              </Link>
            ) : (
              <Link
                href={getHref("/register")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-[2px] text-xs font-bold tracking-wide transition-colors active:scale-95 select-none"
              >
                {dict.navbar?.register || "Registrarse"}
              </Link>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}
