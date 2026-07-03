"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu, LayoutDashboard } from "lucide-react";
import LanguageSelector from "./LanguageSelector";

interface UserSession {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}

interface NavbarProps {
  readonly dict: any;
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
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ease-out border-b ${
        scrolled
          ? "glass-effect border-gray-800/50 py-3 shadow-xl shadow-black/20"
          : "bg-transparent border-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link
            href={getHref("/")}
            className="flex items-center gap-3 group transition-transform active:scale-95 shrink-0 select-none"
          >
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/10 group-hover:rotate-3 transition-transform duration-300">
              <Cpu size={20} className="text-black stroke-[2.5]" />
            </div>
            <span className="text-xl font-black text-white tracking-tight uppercase">
              Clicks <span className="text-blue-500">&</span> Go
            </span>
          </Link>

          {/* Auth buttons + language — desktop */}
          <div className="hidden md:flex items-center gap-4">
            <LanguageSelector />

            {session?.user ? (
              /* Usuario logueado → botón Panel */
              <Link
                href={getHref("/panel")}
                className="flex items-center gap-2 bg-blue-600/45 backdrop-blur-sm hover:bg-blue-600/70 border border-blue-500/30 text-white px-5 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 shadow-lg shadow-blue-500/20 active:scale-95 select-none"
              >
                <LayoutDashboard size={15} />
                {dict.auth?.panel || dict.navbar?.panel || "Mi Panel"}
              </Link>
            ) : (
              /* Visitante → login + register */
              <>
                <Link
                  href={getHref("/login")}
                  className="text-white/80 hover:text-white text-sm font-semibold tracking-wide transition-colors px-4 py-2"
                >
                  {dict.navbar?.login || "Iniciar sesión"}
                </Link>
                <Link
                  href={getHref("/register")}
                  className="bg-blue-600/45 backdrop-blur-sm hover:bg-blue-600/70 border border-blue-500/30 text-white px-5 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 shadow-lg shadow-blue-500/20 active:scale-95 select-none"
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
                className="flex items-center gap-1.5 bg-blue-600/45 backdrop-blur-sm hover:bg-blue-600/70 border border-blue-500/30 text-white px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-colors active:scale-95 select-none"
              >
                <LayoutDashboard size={13} />
                {dict.auth?.panel || "Panel"}
              </Link>
            ) : (
              <Link
                href={getHref("/register")}
                className="bg-blue-600/45 backdrop-blur-sm hover:bg-blue-600/70 border border-blue-500/30 text-white px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-colors active:scale-95 select-none"
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
