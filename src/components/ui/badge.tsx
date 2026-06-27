/**
 * Ajami Design System — Badge Component
 *
 * Small label for XP, streaks, achievements, difficulty levels.
 *
 * Usage:
 *   <Badge label="XP +10" variant="emerald" />
 *   <Badge label="🔥 7" variant="streak" />
 *   <Badge label="New" variant="gold" />
 */

import React from "react";
import { View, Text as RNText, StyleSheet, ViewProps } from "react-native";
import { palette, semantic } from "@/constants/colors";
import { radius } from "@/constants/layout";

// ─── Types ─────────────────────────────────────────────────────────────────
export type BadgeVariant =
  | "emerald"
  | "gold"
  | "sky"
  | "navy"
  | "success"
  | "warning"
  | "streak"
  | "error"
  | "neutral";

export type BadgeSize = "sm" | "md";

export interface BadgeProps extends ViewProps {
  label:    string;
  variant?: BadgeVariant;
  size?:    BadgeSize;
}

// ─── Style maps ────────────────────────────────────────────────────────────
const bgMap: Record<BadgeVariant, string> = {
  emerald: palette.emeraldLight,
  gold:    palette.goldLight,
  sky:     palette.skyLight,
  navy:    palette.navyLight,
  success: "#DCFCE7",
  warning: "#FEF9C3",
  streak:  "#FFF7ED",
  error:   "#FEE2E2",
  neutral: "#F1F5F9",
};

const textColorMap: Record<BadgeVariant, string> = {
  emerald: palette.emerald,
  gold:    palette.gold,
  sky:     palette.sky,
  navy:    palette.navy,
  success: semantic.success,
  warning: semantic.warning,
  streak:  semantic.streak,
  error:   semantic.error,
  neutral: palette.textSecondary,
};

// ─── Component ─────────────────────────────────────────────────────────────
export function Badge({
  label,
  variant = "emerald",
  size    = "md",
  style,
  ...rest
}: BadgeProps) {
  const isSmall = size === "sm";

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: bgMap[variant],
          paddingHorizontal: isSmall ? 8  : 12,
          paddingVertical:   isSmall ? 3  : 5,
        },
        style,
      ]}
      {...rest}
    >
      <RNText
        style={{
          fontSize:    isSmall ? 11 : 13,
          lineHeight:  isSmall ? 15 : 18,
          fontWeight:  "600",
          color:       textColorMap[variant],
          letterSpacing: 0.1,
        }}
      >
        {label}
      </RNText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius:   radius.full,
    alignSelf:      "flex-start",
    alignItems:     "center",
    justifyContent: "center",
  },
});
