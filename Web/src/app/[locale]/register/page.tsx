import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Cpu } from "lucide-react";
import MagicLinkForm from "../login/MagicLinkForm";
import esDict from "@/dictionaries/es.json";
import enDict from "@/dictionaries/en.json";
import ptDict from "@/dictionaries/pt.json";

interface RegisterPageProps {
  params: Promise<{ locale: string }>;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <rect x="1" y="1" width="10" height="10" fill="#f25022"/>
      <rect x="13" y="1" width="10" height="10" fill="#7fba00"/>
      <rect x="1" y="13" width="10" height="10" fill="#00a4ef"/>
      <rect x="13" y="13" width="10" height="10" fill="#ffb900"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

export default async function RegisterPage({ params }: RegisterPageProps) {
  const { locale } = await params;
  const dict: any = locale === "en" ? enDict : locale === "pt" ? ptDict : esDict;

  const session = await auth();
  if (session?.user) redirect(`/${locale}/panel`);

  const panelUrl = `/${locale}/panel`;

  async function signInGoogle() {
    "use server";
    await signIn("google", { redirectTo: panelUrl });
  }

  async function signInMicrosoft() {
    "use server";
    await signIn("microsoft-entra-id", { redirectTo: panelUrl });
  }

  async function signInFacebook() {
    "use server";
    await signIn("facebook", { redirectTo: panelUrl });
  }

  async function sendMagicLink(
    prev: { sent: boolean; email?: string; error?: string },
    formData: FormData
  ): Promise<{ sent: boolean; email?: string; error?: string }> {
    "use server";
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    if (!email || !email.includes("@")) return { sent: false, error: "invalid" };
    try {
      await signIn("resend", { email, redirect: false, redirectTo: panelUrl });
      return { sent: true, email };
    } catch {
      return { sent: false, error: "failed" };
    }
  }

  const oauthProviders = [
    { action: signInGoogle, label: dict.auth?.loginGoogle || "Continuar con Google", Icon: GoogleIcon },
    { action: signInMicrosoft, label: dict.auth?.loginMicrosoft || "Continuar con Microsoft", Icon: MicrosoftIcon },
    { action: signInFacebook, label: dict.auth?.loginFacebook || "Continuar con Facebook", Icon: FacebookIcon },
  ];

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-16 relative overflow-hidden">
      <div className="hero-grid-overlay absolute inset-0 opacity-15 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/20 via-black to-black pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-gray-950/90 backdrop-blur-xl border border-gray-800/60 rounded-3xl p-8 shadow-2xl shadow-black/60">

          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Link href={`/${locale}`} className="flex items-center gap-3 group transition-transform active:scale-95">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/10 group-hover:rotate-3 transition-transform duration-300">
                <Cpu size={20} className="text-black stroke-[2.5]" />
              </div>
              <span className="text-xl font-black text-white tracking-tight uppercase">
                Clicks <span className="text-blue-500">&</span> Go
              </span>
            </Link>
          </div>

          {/* Título */}
          <div className="text-center mb-2">
            <h1
              className="text-3xl font-bold text-white mb-2"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
            >
              {dict.auth?.registerTitle || "Crear cuenta"}
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              {dict.auth?.registerSubtitle || "Es gratis y sin tarjeta de crédito"}
            </p>
          </div>

          {/* Email primero (registro prioriza email) */}
          <div className="mb-6">
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-3">
              {dict.auth?.emailLabel || "Con tu email"}
            </p>
            <MagicLinkForm action={sendMagicLink} dict={dict} />
          </div>

          {/* Divisor */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-800/80" />
            <span className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em]">
              {dict.auth?.orSocial || "o con red social"}
            </span>
            <div className="flex-1 h-px bg-gray-800/80" />
          </div>

          {/* OAuth */}
          <div className="space-y-2.5 mb-6">
            {oauthProviders.map(({ action, label, Icon }) => (
              <form key={label} action={action}>
                <button
                  type="submit"
                  className="w-full flex items-center gap-4 px-5 py-3 bg-white/5 hover:bg-white/10 active:bg-white/15 border border-gray-800/60 hover:border-gray-700 rounded-xl text-white text-sm font-semibold transition-all cursor-pointer select-none"
                >
                  <Icon />
                  <span>{label}</span>
                </button>
              </form>
            ))}
          </div>

          {/* Footer */}
          <div className="text-center space-y-2">
            <p className="text-xs text-gray-500">
              {dict.auth?.hasAccount || "¿Ya tenés cuenta?"}{" "}
              <Link href={`/${locale}/login`} className="text-blue-400/80 hover:text-blue-400 font-semibold transition-colors">
                {dict.auth?.signIn || "Iniciar sesión"}
              </Link>
            </p>
            <p className="text-[10px] text-gray-700 leading-relaxed">
              {dict.auth?.privacyNote || "Al continuar aceptás nuestra Política de Privacidad y Términos de Uso."}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
