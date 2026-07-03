import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { HardwareNews } from "../types";
import { COLORS, IMPACT_COLORS } from "../theme";

export default function NewsCard({ item }: { item: HardwareNews }) {
  const impactColor = IMPACT_COLORS[item.impactScore ?? "MEDIUM"] ?? COLORS.primary;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.category}>{item.category}</Text>
        {item.impactScore ? (
          <View style={[styles.impact, { borderColor: impactColor }]}>
            <Text style={[styles.impactText, { color: impactColor }]}>
              {item.impactScore}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.summary} numberOfLines={3}>
        {item.summary}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  category: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  impact: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  impactText: { fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  title: { color: COLORS.text, fontSize: 15, fontWeight: "800", marginBottom: 6, lineHeight: 20 },
  summary: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18 },
});
