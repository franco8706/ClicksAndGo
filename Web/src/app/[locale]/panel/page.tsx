import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import { Cpu, UserCircle2, Heart } from "lucide-react";
import { pool } from "@/lib/db";
import ProfileForm from "@/components/ProfileForm";
import esDict from "@/dictionaries/es.json";
import enDict from "@/dictionaries/en.json";
import ptDict from "@/dictionaries/pt.json";

interface PanelPageProps {
  params: Promise<{ locale: string }>;
}

export default async function PanelPage({ params }: PanelPageProps) {
  const { locale } = await params;
  const dict: any = locale === "en" ? enDict : locale === "pt" ? ptDict : esDict;

  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);

  /* ── Cargar perfil completo (incluye columnas extendidas) ── */
  const { rows } = await pool.query(
    `SELECT id, name, last_name, email, phone, city, image, role, created_at
     FROM users WHERE id = $1`,
    [session.user.id]
  );
  const profile = rows[0] ?? { id: session.user.id, email: session.user.email };

  /* ── Fecha de registro legible ── */
  const memberSince = profile.created_at
    ? new Intl.DateTimeFormat(locale === "pt" ? "pt-BR" : locale === "en" ? "en-US" : "es-AR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date(profile.created_at))
    : null;

  /* ── Iniciales para avatar fallback ── */
  const initials = [profile.name, profile.last_name]
    .filter(Boolean)
    .map((s: string) => s[0].toUpperCase())
    .join("") || (profile.email?.[0] ?? "U").toUpperCase();

  /* ── Server Actions ── */
  async function updateProfileAction(
    prev: { success: boolean; error?: string } | null,
    formData: FormData
  ): Promise<{ success: boolean; error?: string }> {
    "use server";
    const sess = await auth();
    if (!sess?.user?.id) return { success: false, error: "no_session" };

    const name      = (formData.get("name") as string)?.trim() || null;
    const last_name = (formData.get("last_name") as string)?.trim() || null;
    const phone     = (formData.get("phone") as string)?.trim() || null;
    const city      = (formData.get("city") as string)?.trim() || null;

    try {
      await pool.query(
        `UPDATE users SET name=$1, last_name=$2, phone=$3, city=$4 WHERE id=$5`,
        [name, last_name, phone, city, sess.user.id]
      );
      return { success: true };
    } catch {
      return { success: false, error: "db_error" };
    }
  }

  async function signOutAction(): Promise<void> {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-32 pb-20">

        {/* ── Header con avatar + info ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-10">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-900 border border-gray-800/60 flex items-center justify-center shrink-0 shadow-xl shadow-black/40">
            {profile.image ? (
              <Image
                src={profile.image}
                alt={profile.name ?? "Avatar"}
                width={80}
                height={80}
                className="object-cover w-full h-full"
              />
            ) : initials.length > 0 ? (
              <span className="text-2xl font-black text-blue-400" style={{ fontFamily: "var(--font-display)" }}>
                {initials}
              </span>
            ) : (
              <UserCircle2 size={36} className="text-gray-600" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
                <Cpu size={14} className="text-black stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
                {dict.auth?.panelTitle || "Mi Panel"}
              </span>
            </div>
            <h1
              className="text-4xl sm:text-5xl font-bold text-white leading-none"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
            >
              {profile.name
                ? `${profile.name}${profile.last_name ? " " + profile.last_name : ""}`
                : profile.email?.split("@")[0]}
            </h1>
            <p className="text-gray-500 text-sm mt-1.5">{profile.email}</p>
            {memberSince && (
              <p className="text-[10px] text-gray-700 mt-1 font-semibold uppercase tracking-wider">
                {dict.auth?.memberSince || "Miembro desde"} {memberSince}
              </p>
            )}
          </div>
        </div>

        {/* ── Formulario de perfil ── */}
        <ProfileForm
          profile={profile}
          updateAction={updateProfileAction}
          signOutAction={signOutAction}
          dict={dict}
        />

        {/* ── Favoritos (placeholder) ── */}
        <div className="mt-8 bg-gray-950/50 border border-dashed border-gray-800/60 rounded-2xl p-8 text-center">
          <Heart size={28} className="text-gray-700 mx-auto mb-3" />
          <h3
            className="text-lg font-bold text-gray-400 mb-1"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {dict.auth?.favoritesSection || "Mis favoritos"}
          </h3>
          <p className="text-gray-600 text-sm">
            {dict.auth?.noFavorites || "Aún no guardaste ninguna laptop"}
          </p>
        </div>

      </div>
    </div>
  );
}
