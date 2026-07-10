"use client";

import { useActionState } from "react";
import { CheckCircle, Loader2, Save, LogOut } from "lucide-react";
import type { Dict } from "@/types/dictionary";

interface UserProfile {
  id: string;
  name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  image?: string | null;
  created_at?: string | null;
  /** País preferido del catálogo (null = automático según IP) */
  country_code?: string | null;
}

/* 🌍 Países soportados por la plataforma (catálogo + afiliación regional) */
const SUPPORTED_COUNTRIES = ["AR", "US", "ES", "MX", "BR", "CO", "CL"] as const;
const COUNTRY_FLAGS: Record<string, string> = {
  AR: "🇦🇷", US: "🇺🇸", ES: "🇪🇸", MX: "🇲🇽", BR: "🇧🇷", CO: "🇨🇴", CL: "🇨🇱",
};

type UpdateState = { success: boolean; error?: string } | null;

interface ProfileFormProps {
  readonly profile: UserProfile;
  readonly updateAction: (prev: UpdateState, fd: FormData) => Promise<UpdateState>;
  readonly signOutAction: () => Promise<void>;
  readonly dict: Dict;
}

const inputClass =
  "w-full bg-white border border-[#e6e8ec] rounded-xl px-4 py-3 text-[#0a0e14] text-sm placeholder-[#9aa1ac] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-colors";

const labelClass = "block text-[10px] font-black text-[#9aa1ac] uppercase tracking-widest mb-1.5";

export default function ProfileForm({ profile, updateAction, signOutAction, dict }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(updateAction, null);

  return (
    <div className="space-y-6">
      {/* ── Formulario de perfil ── */}
      <div className="bg-white border border-[#e6e8ec] rounded-2xl p-6 md:p-8">
        <h2
          className="text-2xl font-bold text-[#0a0e14] mb-6"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
        >
          {dict.auth?.profileSection || "Perfil"}
        </h2>

        <form action={formAction} className="space-y-5">
          {/* Nombre / Apellido */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{dict.auth?.firstName || "Nombre"}</label>
              <input
                name="name"
                type="text"
                defaultValue={profile.name ?? ""}
                placeholder="Ej: Juan"
                className={inputClass}
                maxLength={100}
              />
            </div>
            <div>
              <label className={labelClass}>{dict.auth?.lastName || "Apellido"}</label>
              <input
                name="last_name"
                type="text"
                defaultValue={profile.last_name ?? ""}
                placeholder="Ej: García"
                className={inputClass}
                maxLength={100}
              />
            </div>
          </div>

          {/* Teléfono / Ciudad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{dict.auth?.phone || "Teléfono"}</label>
              <input
                name="phone"
                type="tel"
                defaultValue={profile.phone ?? ""}
                placeholder="+54 11 1234-5678"
                className={inputClass}
                maxLength={25}
              />
              <p className="text-[9px] text-[#9aa1ac] mt-1 px-1">
                {dict.auth?.phoneNote || "Solo para recuperación de cuenta"}
              </p>
            </div>
            <div>
              <label className={labelClass}>{dict.auth?.city || "Ciudad"}</label>
              <input
                name="city"
                type="text"
                defaultValue={profile.city ?? ""}
                placeholder="Ej: Buenos Aires"
                className={inputClass}
                maxLength={100}
              />
            </div>
          </div>

          {/* Email (solo lectura) */}
          <div>
            <label className={labelClass}>{dict.auth?.emailLabel || "Email"}</label>
            <input
              type="email"
              value={profile.email ?? ""}
              readOnly
              className={`${inputClass} opacity-50 cursor-default select-none`}
            />
          </div>

          {/* 🌍 País preferido del catálogo (vacío = automático por ubicación) */}
          <div>
            <label className={labelClass}>{dict.dashboard?.preferredCountry || "País del catálogo"}</label>
            <select
              name="country_code"
              defaultValue={profile.country_code ?? ""}
              className={`${inputClass} cursor-pointer appearance-none`}
            >
              <option value="">{dict.dashboard?.autoByIp || "Automático (según tu ubicación)"}</option>
              {SUPPORTED_COUNTRIES.map((code) => (
                <option key={code} value={code}>
                  {COUNTRY_FLAGS[code]} {dict.dashboard?.countries?.[code] || code}
                </option>
              ))}
            </select>
            <p className="text-[9px] text-[#9aa1ac] mt-1 px-1">
              {dict.dashboard?.countryHint || "Elegí desde qué país querés ver productos y precios."}
            </p>
          </div>

          {/* Feedback */}
          {state?.success && (
            <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold animate-hero-entry">
              <CheckCircle size={16} />
              {dict.auth?.profileSaved || "¡Perfil actualizado!"}
            </div>
          )}
          {state?.error && (
            <p className="text-red-600 text-sm">{dict.auth?.saveError || "Error al guardar. Intentá de nuevo."}</p>
          )}

          {/* Guardar */}
          <button
            type="submit"
            disabled={pending}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm py-3 px-7 rounded-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed "
          >
            {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {dict.auth?.saveProfile || "Guardar cambios"}
          </button>
        </form>
      </div>

      {/* ── Cerrar sesión ── */}
      <div className="flex justify-end">
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex items-center gap-2 text-[#6b7280] hover:text-red-600 text-sm font-semibold transition-colors cursor-pointer select-none py-2 px-4 rounded-[2px] hover:bg-red-50 border border-transparent hover:border-red-200"
          >
            <LogOut size={15} />
            {dict.auth?.signOut || "Cerrar sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}
