"use client";

import { useActionState } from "react";
import { CheckCircle, Loader2, Save, LogOut } from "lucide-react";

interface UserProfile {
  id: string;
  name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  image?: string | null;
  created_at?: string | null;
}

type UpdateState = { success: boolean; error?: string } | null;

interface ProfileFormProps {
  readonly profile: UserProfile;
  readonly updateAction: (prev: UpdateState, fd: FormData) => Promise<UpdateState>;
  readonly signOutAction: () => Promise<void>;
  readonly dict: any;
}

const inputClass =
  "w-full bg-gray-900/60 border border-gray-800/60 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-gray-800/60 transition-colors";

const labelClass = "block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5";

export default function ProfileForm({ profile, updateAction, signOutAction, dict }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(updateAction, null);

  return (
    <div className="space-y-6">
      {/* ── Formulario de perfil ── */}
      <div className="bg-gray-950/80 border border-gray-800/60 rounded-2xl p-6 md:p-8">
        <h2
          className="text-2xl font-bold text-white mb-6"
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
              <p className="text-[9px] text-gray-600 mt-1 px-1">
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

          {/* Feedback */}
          {state?.success && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold animate-hero-entry">
              <CheckCircle size={16} />
              {dict.auth?.profileSaved || "¡Perfil actualizado!"}
            </div>
          )}
          {state?.error && (
            <p className="text-red-400 text-sm">{dict.auth?.saveError || "Error al guardar. Intentá de nuevo."}</p>
          )}

          {/* Guardar */}
          <button
            type="submit"
            disabled={pending}
            className="flex items-center gap-2 bg-blue-600/45 backdrop-blur-sm hover:bg-blue-600/70 active:bg-blue-700/65 border border-blue-500/30 text-white font-bold text-sm py-3 px-7 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/10"
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
            className="flex items-center gap-2 text-gray-500 hover:text-red-400 text-sm font-semibold transition-colors cursor-pointer select-none py-2 px-4 rounded-xl hover:bg-red-950/20 border border-transparent hover:border-red-900/30"
          >
            <LogOut size={15} />
            {dict.auth?.signOut || "Cerrar sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}
