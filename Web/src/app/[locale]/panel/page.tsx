import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import {
  Cpu, UserCircle2, Heart, Bell, BellRing, Trash2,
  Globe2, BookmarkCheck, ExternalLink, TrendingDown,
} from "lucide-react";
import {
  getProfile, getFavorites, getPriceAlerts, updateProfile, updateGeo,
  removeFavorite, createPriceAlert, deletePriceAlert,
  type UserProfile,
} from "@/lib/railsApi";
import { formatCurrencyString } from "@/lib/currency";
import ProfileForm from "@/components/ProfileForm";
import esDict from "@/dictionaries/es.json";
import enDict from "@/dictionaries/en.json";
import ptDict from "@/dictionaries/pt.json";

interface PanelPageProps {
  params: Promise<{ locale: string }>;
}

const COUNTRY_FLAGS: Record<string, string> = {
  AR: "🇦🇷", US: "🇺🇸", ES: "🇪🇸", MX: "🇲🇽", BR: "🇧🇷", CO: "🇨🇴", CL: "🇨🇱",
};

export default async function PanelPage({ params }: PanelPageProps) {
  const { locale } = await params;
  const dict = locale === "en" ? enDict : locale === "pt" ? ptDict : esDict;

  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);
  const userId = session.user.id;

  /* ── 🌍 Geo del visitante (inyectado por el proxy desde la IP) ── */
  const headersList = await headers();
  const detectedCountry = (headersList.get("x-country-code") || "US").toUpperCase();

  /* ── Cargar perfil + persistir geo, vía Rails (único dueño de Postgres) ──
     Registro de región + última visita — alimenta segmentación y futuras
     alertas regionales, sin persistir la IP cruda del visitante. ── */
  await updateGeo(userId, detectedCountry, locale);

  const [profileData, favorites, alerts] = await Promise.all([
    getProfile(userId),
    getFavorites(userId),
    getPriceAlerts(userId),
  ]);

  const profile: UserProfile = profileData ?? {
    id: userId,
    name: null,
    last_name: null,
    email: session.user.email ?? null,
    phone: null,
    city: null,
    image: null,
    created_at: null,
    country_code: null,
    detected_country: null,
  };

  /* ── Fecha de registro legible ── */
  const memberSince = profile.created_at
    ? new Intl.DateTimeFormat(locale === "pt" ? "pt-BR" : locale === "en" ? "en-US" : "es-AR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date(profile.created_at))
    : null;

  /* ── Iniciales para avatar fallback ── */
  const initials =
    [profile.name, profile.last_name]
      .filter((s): s is string => typeof s === "string" && s.length > 0)
      .map((s) => s[0].toUpperCase())
      .join("") || (profile.email?.[0] ?? "U").toUpperCase();

  const displayName = profile.name
    ? `${profile.name}${profile.last_name ? " " + profile.last_name : ""}`
    : profile.email?.split("@")[0];

  const countryNames = dict.dashboard?.countries as Record<string, string> | undefined;
  const regionLabel = `${COUNTRY_FLAGS[detectedCountry] ?? "🌐"} ${countryNames?.[detectedCountry] ?? detectedCountry}`;

  /* ════════════════ Server Actions ════════════════ */

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
    // País preferido del catálogo: vacío = automático por IP
    const rawCountry = (formData.get("country_code") as string)?.trim().toUpperCase() || "";
    const country_code = /^(AR|US|ES|MX|BR|CO|CL)$/.test(rawCountry) ? rawCountry : null;

    const result = await updateProfile(sess.user.id, { name, last_name, phone, city, country_code });
    if (!result.ok) return { success: false, error: result.error };
    revalidatePath(`/${locale}/panel`);
    revalidatePath(`/${locale}`);
    return { success: true };
  }

  async function signOutAction(): Promise<void> {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  async function removeFavoriteAction(formData: FormData): Promise<void> {
    "use server";
    const sess = await auth();
    if (!sess?.user?.id) redirect(`/${locale}/login`);
    const laptopId = formData.get("laptop_id") as string;
    if (laptopId) await removeFavorite(sess.user.id, laptopId);
    revalidatePath(`/${locale}/panel`);
    revalidatePath(`/${locale}`);
  }

  async function createAlertAction(formData: FormData): Promise<void> {
    "use server";
    const sess = await auth();
    if (!sess?.user?.id) redirect(`/${locale}/login`);
    const laptopId = formData.get("laptop_id") as string;
    const moneda = ((formData.get("moneda") as string) || "USD").toUpperCase();
    const target = parseFloat((formData.get("target_price") as string) || "");
    if (laptopId && Number.isFinite(target) && target > 0) {
      await createPriceAlert(sess.user.id, laptopId, target, moneda);
    }
    revalidatePath(`/${locale}/panel`);
  }

  async function deleteAlertAction(formData: FormData): Promise<void> {
    "use server";
    const sess = await auth();
    if (!sess?.user?.id) redirect(`/${locale}/login`);
    const alertId = formData.get("alert_id") as string;
    if (alertId) await deletePriceAlert(sess.user.id, alertId);
    revalidatePath(`/${locale}/panel`);
  }

  /* ════════════════ Render ════════════════ */
  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-32 pb-20">

        {/* ── Header con avatar + info ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-10">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#f5f6f8] border border-[#e6e8ec] flex items-center justify-center shrink-0">
            {profile.image ? (
              <Image
                src={profile.image}
                alt={profile.name ?? "Avatar"}
                width={80}
                height={80}
                className="object-cover w-full h-full"
              />
            ) : initials.length > 0 ? (
              <span className="text-2xl font-black text-blue-600" style={{ fontFamily: "var(--font-display)" }}>
                {initials}
              </span>
            ) : (
              <UserCircle2 size={36} className="text-[#9aa1ac]" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-7 h-7 bg-[#0a0e14] rounded flex items-center justify-center">
                <Cpu size={14} className="text-white stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-black text-[#9aa1ac] uppercase tracking-widest">
                {dict.auth?.panelTitle || "Mi Panel"}
              </span>
            </div>
            <h1
              className="text-4xl sm:text-5xl font-bold text-[#0a0e14] leading-none"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
            >
              {displayName}
            </h1>
            <p className="text-[#6b7280] text-sm mt-1.5">{profile.email}</p>
            {memberSince && (
              <p className="text-[10px] text-[#9aa1ac] mt-1 font-semibold uppercase tracking-wider">
                {dict.auth?.memberSince || "Miembro desde"} {memberSince}
              </p>
            )}
          </div>
        </div>

        {/* ── Stats del dashboard ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="bg-white border border-[#e6e8ec] rounded-2xl p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center">
              <BookmarkCheck size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-[#0a0e14] leading-none">{favorites.length}</p>
              <p className="text-[10px] font-bold text-[#6b7280] uppercase tracking-widest mt-1">
                {dict.dashboard?.savedItems || "Guardados"}
              </p>
            </div>
          </div>
          <div className="bg-white border border-[#e6e8ec] rounded-2xl p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
              <BellRing size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-[#0a0e14] leading-none">{alerts.length}</p>
              <p className="text-[10px] font-bold text-[#6b7280] uppercase tracking-widest mt-1">
                {dict.dashboard?.activeAlerts || "Alertas activas"}
              </p>
            </div>
          </div>
          <div className="bg-white border border-[#e6e8ec] rounded-2xl p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <Globe2 size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-black text-[#0a0e14] leading-none">{regionLabel}</p>
              <p className="text-[10px] font-bold text-[#6b7280] uppercase tracking-widest mt-1">
                {dict.dashboard?.detectedCountry || "Tu región"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Favoritos ── */}
        <section className="mb-10">
          <div className="flex items-center gap-2.5 mb-4">
            <Heart size={16} className="text-red-400" />
            <h2 className="text-lg font-bold text-[#0a0e14]" style={{ fontFamily: "var(--font-display)" }}>
              {dict.dashboard?.favorites || "Mis favoritos"}
            </h2>
          </div>

          {favorites.length === 0 ? (
            <div className="bg-[#f5f6f8] border border-dashed border-[#d3d7dd] rounded-2xl p-8 text-center">
              <Heart size={28} className="text-[#9aa1ac] mx-auto mb-3" />
              <p className="text-[#6b7280] text-sm mb-4">
                {dict.dashboard?.favoritesEmpty || "Aún no guardaste ninguna laptop."}
              </p>
              <Link
                href={`/${locale}/#productos`}
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-300 text-xs font-bold uppercase tracking-wider transition-colors"
              >
                {dict.dashboard?.goCatalog || "Explorar catálogo"} →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {favorites.map((fav) => {
                const price = fav.precio_actual ? parseFloat(fav.precio_actual) : null;
                return (
                  <div
                    key={fav.laptop_id}
                    className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white border border-[#e6e8ec] rounded-2xl p-4 hover:border-[#d3d7dd] transition-colors"
                  >
                    {/* Imagen + nombre */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-14 h-14 rounded bg-[#f5f6f8] border border-[#e6e8ec] overflow-hidden shrink-0 flex items-center justify-center">
                        {fav.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element -- imagen externa de retailer, fetch directo del browser
                          <img src={fav.image_url} alt={fav.modelo} className="w-full h-full object-contain p-1" />
                        ) : (
                          <Cpu size={20} className="text-[#9aa1ac]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{fav.marca}</p>
                        <p className="text-[#0a0e14] text-sm font-semibold truncate">{fav.modelo}</p>
                        <p className="text-[#6b7280] text-xs mt-0.5">
                          {COUNTRY_FLAGS[fav.country_code] ?? "🌐"}{" "}
                          {price !== null
                            ? formatCurrencyString(price, fav.moneda || "USD")
                            : "—"}
                        </p>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {/* Crear alerta inline */}
                      <form action={createAlertAction} className="flex items-center gap-1.5">
                        <input type="hidden" name="laptop_id" value={fav.laptop_id} />
                        <input type="hidden" name="moneda" value={fav.moneda || "USD"} />
                        <input
                          type="number"
                          name="target_price"
                          min="1"
                          step="any"
                          required
                          placeholder={dict.dashboard?.targetPrice || "Precio objetivo"}
                          className="w-32 bg-white border border-[#e6e8ec] rounded-lg px-3 py-2 text-[#0a0e14] text-xs placeholder-[#9aa1ac] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-200"
                        />
                        <button
                          type="submit"
                          title={dict.dashboard?.createAlert || "Crear alerta"}
                          className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 hover:bg-amber-900/40 transition-colors cursor-pointer"
                        >
                          <Bell size={14} />
                        </button>
                      </form>

                      {/* Ver producto */}
                      <Link
                        href={`/${locale}/laptop/${fav.slug}`}
                        title={dict.dashboard?.viewProduct || "Ver producto"}
                        className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-900/40 transition-colors"
                      >
                        <ExternalLink size={14} />
                      </Link>

                      {/* Quitar de favoritos */}
                      <form action={removeFavoriteAction}>
                        <input type="hidden" name="laptop_id" value={fav.laptop_id} />
                        <button
                          type="submit"
                          title={dict.dashboard?.remove || "Quitar"}
                          className="p-2 rounded-lg bg-white border border-[#e6e8ec] text-[#6b7280] hover:text-red-500 hover:border-red-200 transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Alertas de precio ── */}
        <section className="mb-10">
          <div className="flex items-center gap-2.5 mb-1">
            <BellRing size={16} className="text-amber-600" />
            <h2 className="text-lg font-bold text-[#0a0e14]" style={{ fontFamily: "var(--font-display)" }}>
              {dict.dashboard?.alerts || "Alertas de precio"}
            </h2>
          </div>
          <p className="text-[#9aa1ac] text-xs mb-4">
            {dict.dashboard?.alertsHint || "Te avisamos cuando el precio baje de tu objetivo."}
          </p>

          {alerts.length === 0 ? (
            <div className="bg-[#f5f6f8] border border-dashed border-[#d3d7dd] rounded-2xl p-8 text-center">
              <Bell size={28} className="text-[#9aa1ac] mx-auto mb-3" />
              <p className="text-[#6b7280] text-sm">
                {dict.dashboard?.alertsEmpty || "Sin alertas configuradas."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => {
                const current = alert.precio_actual ? parseFloat(alert.precio_actual) : null;
                const target = parseFloat(alert.target_price);
                const triggered = current !== null && current <= target;
                return (
                  <div
                    key={alert.id}
                    className={`flex flex-col sm:flex-row sm:items-center gap-4 bg-white border rounded-2xl p-4 transition-colors ${
                      triggered ? "border-emerald-300" : "border-[#e6e8ec]"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{alert.marca}</p>
                      <Link
                        href={`/${locale}/laptop/${alert.slug}`}
                        className="text-[#0a0e14] text-sm font-semibold truncate hover:text-blue-600 transition-colors block"
                      >
                        {alert.modelo}
                      </Link>
                      <div className="flex items-center gap-4 mt-1.5 text-xs">
                        <span className="text-[#6b7280]">
                          {dict.dashboard?.targetPrice || "Objetivo"}:{" "}
                          <span className="text-amber-600 font-bold">
                            {formatCurrencyString(target, alert.moneda)}
                          </span>
                        </span>
                        <span className="text-[#6b7280]">
                          {dict.dashboard?.currentPrice || "Actual"}:{" "}
                          <span className="text-[#0a0e14] font-bold">
                            {current !== null ? formatCurrencyString(current, alert.moneda) : "—"}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          triggered
                            ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                            : "bg-white border-[#e6e8ec] text-[#6b7280]"
                        }`}
                      >
                        <TrendingDown size={11} />
                        {triggered
                          ? dict.dashboard?.alertTriggered || "¡Precio alcanzado!"
                          : dict.dashboard?.alertWaiting || "Esperando baja"}
                      </span>
                      <form action={deleteAlertAction}>
                        <input type="hidden" name="alert_id" value={alert.id} />
                        <button
                          type="submit"
                          title={dict.dashboard?.deleteAlert || "Eliminar alerta"}
                          className="p-2 rounded-lg bg-white border border-[#e6e8ec] text-[#6b7280] hover:text-red-500 hover:border-red-200 transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Formulario de perfil (incluye país preferido del catálogo) ── */}
        <ProfileForm
          profile={profile}
          updateAction={updateProfileAction}
          signOutAction={signOutAction}
          dict={dict}
        />

      </div>
    </div>
  );
}
