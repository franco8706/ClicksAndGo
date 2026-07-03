import React from "react";
import { View, Text, Image, TouchableOpacity, Linking, StyleSheet } from "react-native";
import type { Laptop } from "../types";
import { monetizedUrl } from "../api";
import { COLORS, formatCurrency } from "../theme";
import type { Locale } from "../i18n";
import { DICTS } from "../i18n";

interface Props {
  laptop: Laptop;
  locale: Locale;
}

export default function LaptopCard({ laptop, locale }: Props) {
  const dict = DICTS[locale];
  const price = laptop.financials?.current_price ?? 0;
  const rate = laptop.financials?.applied_exchange_rate;
  const usdRef =
    laptop.currency !== "USD" && rate && rate > 0 ? price / rate : null;
  const score = laptop.intelligence?.deal_score ?? 0;
  const isTopDeal = score >= 8.5;
  const buyUrl = monetizedUrl(laptop);
  const retailer =
    laptop.metadata_extra?.retailer
      ?.replace(/_(ar|es|us|mx|br|co|cl)$/i, "")
      .replace(/_/g, " ")
      .toUpperCase() || "TIENDA OFICIAL";

  return (
    <View style={[styles.card, isTopDeal && styles.cardTop]}>
      <View style={styles.header}>
        <Text style={styles.brand}>{laptop.brand}</Text>
        <View style={[styles.scoreBadge, isTopDeal && styles.scoreBadgeTop]}>
          <Text style={[styles.scoreText, isTopDeal && styles.scoreTextTop]}>
            ★ {score.toFixed(1)}/10
          </Text>
        </View>
      </View>

      {laptop.urls?.image ? (
        <Image
          source={{ uri: laptop.urls.image.replace(/^http:\/\//, "https://") }}
          style={styles.image}
          resizeMode="contain"
        />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]} />
      )}

      <Text style={styles.name} numberOfLines={2}>
        {laptop.name}
      </Text>

      {laptop.hardware?.cpu ? (
        <Text style={styles.specs} numberOfLines={1}>
          {laptop.hardware.cpu} · {laptop.hardware.ram_gb} GB · {laptop.hardware.storage_gb} GB
        </Text>
      ) : null}

      <Text style={styles.priceLabel}>{dict.verifiedPrice}</Text>
      <Text style={styles.price}>{formatCurrency(price, laptop.currency)}</Text>
      {usdRef ? (
        <Text style={styles.usdRef}>
          {dict.usdRef}: U$D {Math.round(usdRef).toLocaleString("en-US")}
        </Text>
      ) : null}

      {buyUrl ? (
        <TouchableOpacity
          style={styles.buyButton}
          onPress={() => Linking.openURL(buyUrl)}
          activeOpacity={0.85}
        >
          <Text style={styles.buyText}>
            🛒 {dict.buyAt} {retailer}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={[styles.buyButton, styles.buyDisabled]}>
          <Text style={styles.buyTextDisabled}>{dict.unavailable}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 14,
  },
  cardTop: { borderColor: "rgba(16, 185, 129, 0.4)" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(2, 6, 23, 0.8)",
  },
  scoreBadgeTop: { borderColor: "rgba(16, 185, 129, 0.5)" },
  scoreText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: "800" },
  scoreTextTop: { color: COLORS.success },
  image: { width: "100%", height: 140, marginVertical: 12 },
  imagePlaceholder: { backgroundColor: "rgba(30, 41, 59, 0.4)", borderRadius: 12 },
  name: { color: COLORS.text, fontSize: 16, fontWeight: "700", marginBottom: 4 },
  specs: { color: COLORS.textMuted, fontSize: 12, marginBottom: 10 },
  priceLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  price: { color: COLORS.text, fontSize: 26, fontWeight: "900", marginTop: 2 },
  usdRef: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  buyButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  buyDisabled: { backgroundColor: "rgba(30, 41, 59, 0.5)" },
  buyText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  buyTextDisabled: { color: COLORS.textMuted, fontSize: 12, fontWeight: "700" },
});
