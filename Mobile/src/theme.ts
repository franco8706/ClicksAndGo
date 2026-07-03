// =====================================================================
// 🎨 TEMA OSCURO — misma identidad visual que la web (#090d16 + azul)
// =====================================================================
export const COLORS = {
  background: "#090d16",
  card: "#0d1117",
  border: "#1e293b",
  borderSoft: "rgba(30, 41, 59, 0.7)",
  text: "#f8fafc",
  textSecondary: "#cbd5e1",
  textMuted: "#94a3b8",
  primary: "#3b82f6",
  primaryDark: "#2563eb",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
} as const;

export const IMPACT_COLORS: Record<string, string> = {
  CRITICAL: COLORS.danger,
  HIGH: COLORS.warning,
  MEDIUM: COLORS.primary,
  LOW: COLORS.textMuted,
};

// 💱 Formato de moneda local (espejo de Web/src/lib/currency.ts)
export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(currency === "USD" ? "en-US" : "es-AR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString()}`;
  }
}
