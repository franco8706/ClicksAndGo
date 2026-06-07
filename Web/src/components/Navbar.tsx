"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu, Search, Menu, X } from "lucide-react";
import LanguageSelector from "./LanguageSelector";

interface NavbarProps {
  readonly dict: any;
  readonly currentLocale?: string;
}

export default function Navbar({ dict, currentLocale: forcedLocale }: NavbarProps) {
  const pathname = usePathname();
  const currentLocale = forcedLocale || pathname?.split("/")[1] || "es";

  const getHref = (path: string) => `/${currentLocale}${path}`;

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ease-out border-b ${scrolled
        ? "glass-effect border-gray-800/50 py-3 shadow-xl shadow-black/20"
        : "bg-transparent border-transparent py-5"
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

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

          <div className="hidden md:flex items-center space-x-8">
            <Link href={getHref("/")} className="nav-link text-white hover:text-blue-400 text-sm font-bold tracking-wide">
              {dict.navbar?.home || "Productos"}
            </Link>

            <Link href={getHref("/#ofertas")} className="nav-link text-white hover:text-blue-400 text-sm font-bold tracking-wide">
              {dict.navbar?.promotions || "Ofertas IA"}
            </Link>

            <Link href={getHref("/#noticias")} className="nav-link text-white hover:text-blue-400 text-sm font-bold tracking-wide">
              {dict.navbar?.news || "Noticias"}
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-6">
            <LanguageSelector />

            <Link
              href={getHref("/#productos")}
              className="bg-white text-black px-5 py-3 rounded-xl text-xs font-black hover:bg-gray-100 transition-all duration-200 uppercase tracking-widest flex items-center gap-2 shadow-lg active:scale-98 select-none"
            >
              <Search size={14} className="stroke-[2.5]" />
              {dict.nav?.cta || "Buscar"}
            </Link>
          </div>

          <div className="md:hidden flex items-center gap-4">
            <LanguageSelector />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white hover:text-blue-400 p-2 transition-colors"
              aria-label="Alternar menú"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden glass-effect absolute top-full left-0 right-0 border-b border-gray-800/80 shadow-2xl animate-hero-entry">
          <div className="px-4 pt-2 pb-6 space-y-1">
            <Link href={getHref("/")} onClick={() => setMobileMenuOpen(false)} className="block text-white hover:text-blue-400 py-4 text-base font-bold border-b border-gray-800/40">
              Productos
            </Link>
            <Link href={getHref("/#ofertas")} onClick={() => setMobileMenuOpen(false)} className="block text-white hover:text-blue-400 py-4 text-base font-bold border-b border-gray-800/40">
              Ofertas IA
            </Link>
            <Link href={getHref("/#noticias")} onClick={() => setMobileMenuOpen(false)} className="block text-white hover:text-blue-400 py-4 text-base font-bold">
              {dict.navbar?.news || "Noticias"}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}