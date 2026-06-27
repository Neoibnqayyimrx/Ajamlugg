/**
 * Ajami Design System — Card Component
 *
 * Surface container with consistent border radius, shadow, and padding.
 *
 * Usage:
 *   <Card>...</Card>
 *   <Card variant="elevated" padding="lg">...</Card>
 *   <Card variant="outlined">...</Card>
 */

import React from "react";
import { View, ViewProps, StyleSheet } from "react-native";
import { neutral, palette } from "@/constants/colors";
import { radius, shadow, spacing } from "@/constants/layout";

// ─── Types ─────────────────────────────────────────────────────────────────
export type CardVariant = "default" | "elevated" | "outlined" | "emerald" | "gold";
export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps extends ViewProps {
  variant?: CardVariant;
  padding?: CardPadding;
}

// ─── Style Maps ────────────────────────────────────────────────────────────
const variantStyles: Record<CardVariant, object> = {
  default: {
    backgroundColor: neutral.background,
    boxShadow:       shadow.md,
  },
  elevated: {
    backgroundColor: neutral.background,
    boxShadow:       shadow.lg,
  },
  outlined: {
    backgroundColor: neutral.background,
    borderWidth:     1.5,
    borderColor:     neutral.border,
  },
  emerald: {
    backgroundColor: palette.emeraldLight,
    borderWidth:     1.5,
    borderColor:     palette.emerald,
    boxShadow:       shadow.card,
  },
  gold: {
    backgroundColor: palette.goldLight,
    borderWidth:     1.5,
    borderColor:     palette.gold,
    boxShadow:       shadow.goldGlow,
  },
};

const paddingMap: Record<CardPadding, number> = {
  none: 0,
  sm:   spacing[3],   // 12
  md:   spacing[4],   // 16
  lg:   spacing[6],   // 24
};

// ─── Component ─────────────────────────────────────────────────────────────
export function Card({
  variant = "default",
  padding = "md",
  style,
  children,
  ...rest
}: CardProps) {
  return (
    <View
      style={[
        styles.base,
        variantStyles[variant],
        { padding: paddingMap[padding] },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    overflow:     "hidden",
  },
});
