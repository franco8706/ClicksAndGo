"use client";

import { useActionState } from "react";
import { Mail, CheckCircle, Loader2, ArrowRight } from "lucide-react";
import type { Dict } from "@/types/dictionary";

interface MagicLinkState {
  sent: boolean;
  email?: string;
  error?: string;
}

interface MagicLinkFormProps {
  readonly action: (prev: MagicLinkState, fd: FormData) => Promise<MagicLinkState>;
  readonly dict: Dict;
}

export default function MagicLinkForm({ action, dict }: MagicLinkFormProps) {
  const [state, formAction, pending] = useActionState(action, { sent: false });

  if (state.sent) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 px-2 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
          <CheckCircle size={26} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-[#0a0e14] font-bold text-lg mb-1">
            {dict.auth?.linkSentTitle || "Revisá tu bandeja de entrada"}
          </p>
          <p className="text-[#6b7280] text-sm leading-relaxed">
            {dict.auth?.linkSentDesc || "Te enviamos el enlace de acceso. Expira en 10 minutos."}
          </p>
          {state.email && (
            <p className="text-blue-600 text-xs mt-2 font-medium">{state.email}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <div className="relative">
        <Mail
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9aa1ac] pointer-events-none"
        />
        <input
          name="email"
          type="email"
          required
          placeholder={dict.auth?.emailPlaceholder || "tu@email.com"}
          className="w-full bg-white border border-[#e6e8ec] rounded-[2px] px-4 py-3 pl-10 text-[#0a0e14] text-sm placeholder-[#9aa1ac] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-colors"
          autoComplete="email"
        />
      </div>
      {state.error && (
        <p className="text-red-500 text-xs px-1">
          {dict.auth?.sendError || "Algo salió mal. Intentá de nuevo."}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm py-3 rounded-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <>
            {dict.auth?.sendLink || "Enviar enlace de acceso"}
            <ArrowRight size={16} />
          </>
        )}
      </button>
    </form>
  );
}
