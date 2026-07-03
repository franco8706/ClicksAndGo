// =====================================================================
// 📱 CLICKS & GO — App móvil (Android / iOS)
// Consume la MISMA API de Rails que la web:
//   - GET /api/v1/geo                        → país/moneda/idioma por IP
//   - GET /api/v1/notebooks?country=XX       → catálogo geolocalizado
//   - GET /api/v1/notebooks/hardware_news    → noticias geolocalizadas
// Las compras salen por el gateway /out de la web (tags de afiliado).
// =====================================================================
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";

import { fetchGeo, fetchLaptops, fetchNews } from "./src/api";
import type { GeoInfo, HardwareNews, Laptop } from "./src/types";
import { SUPPORTED_COUNTRIES } from "./src/config";
import { DICTS, type Locale } from "./src/i18n";
import { COLORS } from "./src/theme";
import LaptopCard from "./src/components/LaptopCard";
import NewsCard from "./src/components/NewsCard";

type Tab = "catalog" | "news";

const COUNTRY_FLAGS: Record<string, string> = {
  AR: "🇦🇷", ES: "🇪🇸", US: "🇺🇸", MX: "🇲🇽", BR: "🇧🇷", CO: "🇨🇴", CL: "🇨🇱",
};

export default function App() {
  const [geo, setGeo] = useState<GeoInfo | null>(null);
  const [laptops, setLaptops] = useState<Laptop[]>([]);
  const [news, setNews] = useState<HardwareNews[]>([]);
  const [tab, setTab] = useState<Tab>("catalog");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const locale: Locale = geo?.locale ?? "es";
  const dict = DICTS[locale];

  const loadAll = useCallback(async (countryOverride?: string) => {
    setError(false);
    try {
      // 1. Resolver región (por IP, o forzada por el usuario)
      const g = await fetchGeo(countryOverride);
      setGeo(g);
      // 2. Catálogo + noticias de esa región, en paralelo
      const [l, n] = await Promise.all([
        fetchLaptops(g.country_code),
        fetchNews(g.country_code),
      ]);
      setLaptops(l);
      setNews(n);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAll(geo?.country_code);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, styles.center]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>{dict.loading}</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.root, styles.center]}>
        <StatusBar style="light" />
        <Text style={styles.errorText}>{dict.error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadAll()}>
          <Text style={styles.retryText}>{dict.retry}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.logo}>
          CLICKS <Text style={{ color: COLORS.primary }}>&</Text> GO
        </Text>
      </View>

      {/* ── Selector de región (override manual del geo) ── */}
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.countryRow}>
          {SUPPORTED_COUNTRIES.map((c) => {
            const active = geo?.country_code === c;
            return (
              <TouchableOpacity
                key={c}
                style={[styles.countryChip, active && styles.countryChipActive]}
                onPress={() => {
                  setLoading(true);
                  loadAll(c);
                }}
              >
                <Text style={[styles.countryText, active && styles.countryTextActive]}>
                  {COUNTRY_FLAGS[c]} {c}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Contenido ── */}
      {tab === "catalog" ? (
        <FlatList
          data={laptops}
          keyExtractor={(l) => l.id}
          renderItem={({ item }) => <LaptopCard laptop={item} locale={locale} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          ListHeaderComponent={
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{dict.catalogTitle}</Text>
              <Text style={styles.sectionSubtitle}>
                {dict.catalogSubtitle} ({geo?.country_code})
              </Text>
            </View>
          }
          ListFooterComponent={<Text style={styles.affiliateNote}>{dict.affiliateNote}</Text>}
        />
      ) : (
        <FlatList
          data={news}
          keyExtractor={(n) => n.title}
          renderItem={({ item }) => <NewsCard item={item} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          ListHeaderComponent={
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{dict.newsTitle}</Text>
            </View>
          }
        />
      )}

      {/* ── Tab bar ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, tab === "catalog" && styles.tabActive]}
          onPress={() => setTab("catalog")}
        >
          <Text style={[styles.tabText, tab === "catalog" && styles.tabTextActive]}>
            💻 {dict.tabCatalog}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, tab === "news" && styles.tabActive]}
          onPress={() => setTab("news")}
        >
          <Text style={[styles.tabText, tab === "news" && styles.tabTextActive]}>
            📡 {dict.tabNews}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { color: COLORS.textMuted, fontSize: 13 },
  errorText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: "600" },
  retryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: { color: "#fff", fontWeight: "800" },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: { color: COLORS.text, fontSize: 18, fontWeight: "900", letterSpacing: 1 },
  countryRow: { paddingHorizontal: 12, marginVertical: 8, flexGrow: 0 },
  countryChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginHorizontal: 4,
    backgroundColor: COLORS.card,
  },
  countryChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primaryDark },
  countryText: { color: COLORS.textMuted, fontSize: 12, fontWeight: "700" },
  countryTextActive: { color: "#fff" },
  sectionHeader: { paddingHorizontal: 16, paddingVertical: 12 },
  sectionTitle: { color: COLORS.text, fontSize: 28, fontWeight: "900", letterSpacing: -0.5 },
  sectionSubtitle: { color: COLORS.textMuted, fontSize: 13, marginTop: 2 },
  affiliateNote: {
    color: COLORS.textMuted,
    fontSize: 10,
    lineHeight: 15,
    paddingHorizontal: 20,
    paddingVertical: 16,
    textAlign: "center",
  },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabActive: { borderTopWidth: 2, borderTopColor: COLORS.primary },
  tabText: { color: COLORS.textMuted, fontSize: 13, fontWeight: "700" },
  tabTextActive: { color: COLORS.text },
});
