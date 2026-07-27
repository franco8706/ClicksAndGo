"use client";

/**
 * ⚖️ Banner de consentimiento (ePrivacy art. 5.3 — AEPD España / Garante
 * Italia, mercados core). Pide permiso ANTES de usar almacenamiento local
 * no esencial (personalización "Elegidos para vos"). Las cookies de
 * sesión/login son esenciales y están exentas — se informa igual.
 * Diseño: discreto, tinta del sistema, sin bloquear la navegación
 * (rechazar es tan fácil como aceptar, como exige la AEPD).
 */

import React, { useState, useEffect } from "react";
import { getConsent, setConsent } from "@/lib/affinity";
import type { Dict } from "@/types/dictionary";

export default function ConsentBanner({ dict }: { readonly dict: Dict }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Solo se muestra si el visitante nunca eligió (client-only).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única de localStorage post-hidratación, sin cascada
    if (getConsent() === null) setVisible(true);
  }, []);

  if (!visible) return null;

  const choose = (granted: boolean) => {
    setConsent(granted ? "granted" : "denied");
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label={dict.consent?.title || "Tu privacidad"}
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[60] bg-[#0a0e14] text-white rounded-md shadow-2xl p-5 sm:p-6"
    >
      <p className="text-sm font-bold mb-1.5">{dict.consent?.title || "Tu privacidad"}</p>
      <p className="text-xs text-white/80 leading-relaxed mb-4">
        {dict.consent?.text ||
          "Usamos el almacenamiento de tu navegador para recordar tus preferencias y personalizar qué productos te mostramos. Esa información nunca sale de tu dispositivo. Las cookies de inicio de sesión son esenciales y no se usan para publicidad."}
      </p>
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => choose(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-5 py-2.5 rounded-[2px] transition-colors cursor-pointer"
        >
          {dict.consent?.accept || "Aceptar"}
        </button>
        <button
          onClick={() => choose(false)}
          className="border border-white/30 hover:border-white/60 text-white text-xs font-bold px-5 py-2.5 rounded-[2px] transition-colors cursor-pointer"
        >
          {dict.consent?.decline || "Solo lo esencial"}
        </button>
      </div>
    </div>
  );
}
