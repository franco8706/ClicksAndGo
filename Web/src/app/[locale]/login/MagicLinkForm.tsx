"use client";

import { useActionState } from "react";
import { Mail, CheckCircle, Loader2, ArrowRight } from "lucide-react";

interface MagicLinkState {
  sent: boolean;
  email?: string;
  error?: string;
}

interface MagicLinkFormProps {
  readonly action: (prev: MagicLinkState, fd: FormData) => Promise<MagicLinkState>;
  readonly dict: any;
}

export default function MagicLinkForm({ action, dict }: MagicLinkFormProps) {
  const [state, formAction, pending] = useActionState(action, { sent: false });

  if (state.sent) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 px-2 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <CheckCircle size={26} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-white font-bold text-lg mb-1">
            {dict.auth?.linkSentTitle || "Revisá tu bandeja de entrada"}
          </p>
          <p className="text-gray-400 text-sm leading-relaxed">
            {dict.auth?.linkSentDesc || "Te enviamos el enlace de acceso. Expira en 10 minutos."}
          </p>
          {state.email && (
            <p className="text-blue-400/80 text-xs mt-2 font-medium">{state.email}</p>
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
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
        />
        <input
          name="email"
          type="email"
          required
          placeholder={dict.auth?.emailPlaceholder || "tu@email.com"}
          className="w-full bg-gray-900/60 border border-gray-800/60 rounded-xl px-4 py-3 pl-10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-gray-800/60 transition-colors"
          autoComplete="email"
        />
      </div>
      {state.error && (
        <p className="text-red-400 text-xs px-1">
          {dict.auth?.sendError || "Algo salió mal. Intentá de nuevo."}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full flex items-center justify-center gap-2 bg-blue-600/45 backdrop-blur-sm hover:bg-blue-600/70 active:bg-blue-700/65 border border-blue-500/30 text-white font-bold text-sm py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/10"
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
