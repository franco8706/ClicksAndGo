import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Cpu, AlertTriangle, MailCheck } from "lucide-react";
import MagicLinkForm from "./MagicLinkForm";
import esDict from "@/dictionaries/es.json";
import enDict from "@/dictionaries/en.json";
import ptDict from "@/dictionaries/pt.json";

interface LoginPageProps {
  params: Promise<{ locale: string }>;
  // NextAuth redirige aquí con ?error=<código> (fallo OAuth/adapter) y
  // ?verify=1 (magic link enviado). Sin leerlos, el usuario no ve nada.
  searchParams: Promise<{ error?: string; verify?: string }>;
}

/* ── Iconos SVG inline de proveedores OAuth ──────────────────────── */
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

/* ── Login Page — Server Component ───────────────────────────────── */
export default async function LoginPage({ params, searchParams }: LoginPageProps) {
  const { locale } = await params;
  const { error: authError, verify } = await searchParams;
  const dict = locale === "en" ? enDict : locale === "pt" ? ptDict : esDict;

  const session = await auth();
  if (session?.user) redirect(`/${locale}/panel`);

  const panelUrl = `/${locale}/panel`;

  /* ── Server Actions (capturan locale en closure) ── */
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
    <div className="min-h-screen bg-[#f5f6f8] flex items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Fondo — grid tech sutil */}
      <div className="hero-grid-overlay absolute inset-0 opacity-40 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-white pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white border border-[#e6e8ec] rounded-lg p-8 shadow-lg">

          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Link
              href={`/${locale}`}
              className="flex items-center gap-3 group transition-transform active:scale-95"
            >
              <div className="w-10 h-10 bg-[#0a0e14] rounded-md flex items-center justify-center group-hover:rotate-3 transition-transform duration-200">
                <Cpu size={20} className="text-white stroke-[2.5]" />
              </div>
              <span className="text-xl font-black text-[#0a0e14] tracking-tight uppercase">
                Clicks <span className="text-blue-600">&</span> Go
              </span>
            </Link>
          </div>

          {/* Título */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#0a0e14] mb-2 tracking-tight">
              {dict.auth?.loginTitle || "Iniciar sesión"}
            </h1>
            <p className="text-[#6b7280] text-sm">
              {dict.auth?.loginSubtitle || "Para guardar favoritos y recibir alertas de precio"}
            </p>
          </div>

          {/* Feedback de flujo: error OAuth / magic link enviado */}
          {authError && (
            <div className="mb-6 flex items-start gap-3 px-4 py-3 rounded bg-red-50 border border-red-200">
              <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-700 text-xs leading-relaxed">
                {dict.auth?.loginError || "No pudimos iniciar sesión. Probá de nuevo o usá otro método."}
              </p>
            </div>
          )}
          {verify && !authError && (
            <div className="mb-6 flex items-start gap-3 px-4 py-3 rounded bg-emerald-50 border border-emerald-200">
              <MailCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-emerald-700 text-xs leading-relaxed">
                {dict.auth?.verifySent || "Te enviamos un enlace de acceso. Revisá tu correo."}
              </p>
            </div>
          )}

          {/* Botones OAuth */}
          <div className="space-y-2.5 mb-6">
            {oauthProviders.map(({ action, label, Icon }) => (
              <form key={label} action={action}>
                <button
                  type="submit"
                  className="w-full flex items-center gap-4 px-5 py-3.5 bg-white hover:bg-[#f5f6f8] active:bg-[#eef0f3] border border-[#e6e8ec] hover:border-[#d3d7dd] rounded-[2px] text-[#0a0e14] text-sm font-semibold transition-all cursor-pointer select-none"
                >
                  <Icon />
                  <span>{label}</span>
                </button>
              </form>
            ))}
          </div>

          {/* Divisor */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-[#e6e8ec]" />
            <span className="text-[10px] text-[#9aa1ac] font-black uppercase tracking-[0.2em]">
              {dict.auth?.orEmail || "o con tu email"}
            </span>
            <div className="flex-1 h-px bg-[#e6e8ec]" />
          </div>

          {/* Magic link form */}
          <MagicLinkForm action={sendMagicLink} dict={dict} />

          {/* Footer */}
          <div className="mt-6 text-center space-y-2">
            <p className="text-xs text-[#6b7280]">
              {dict.auth?.noAccount || "¿No tenés cuenta?"}{" "}
              <Link
                href={`/${locale}/register`}
                className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
              >
                {dict.auth?.createAccount || "Crear cuenta"}
              </Link>
            </p>
            <p className="text-[10px] text-[#9aa1ac] leading-relaxed">
              {dict.auth?.privacyNote || "Al continuar aceptás nuestra Política de Privacidad y Términos de Uso."}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
