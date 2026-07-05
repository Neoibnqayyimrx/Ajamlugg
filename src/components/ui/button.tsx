/**
 * Ajami Design System — Button Component
 *
 * Variants: primary | secondary | outline | ghost | danger | streak
 * Sizes: sm | md | lg
 *
 * Usage:
 *   <Button onPress={...}>Start Lesson</Button>
 *   <Button variant="outline" size="sm">Skip</Button>
 *   <Button variant="streak" icon="🔥">7-Day Streak</Button>
 */

import React from "react";
import {
  Pressable,
  PressableProps,
  ActivityIndicator,
  StyleSheet,
  View,
  Text as RNText,
} from "react-native";
import { palette } from "@/constants/colors";
import { radius } from "@/constants/layout";

// ─── Types ─────────────────────────────────────────────────────────────────
export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "streak";
export type ButtonSize    = "sm" | "md" | "lg";

export interface ButtonProps extends PressableProps {
  variant?:  ButtonVariant;
  size?:     ButtonSize;
  loading?:  boolean;
  icon?:     string;
  iconRight?: string;
  fullWidth?: boolean;
}

// ─── Style Maps ────────────────────────────────────────────────────────────
const containerStyles: Record<ButtonVariant, object> = {
  primary: {
    backgroundColor: palette.emerald,
    boxShadow: "0 4px 20px rgba(14, 159, 110, 0.25)",
  },
  secondary: {
    backgroundColor: palette.gold,
    boxShadow: "0 4px 20px rgba(212, 160, 23, 0.25)",
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: palette.emerald,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  danger: {
    backgroundColor: palette.error,
  },
  streak: {
    backgroundColor: palette.streak,
    boxShadow: "0 4px 16px rgba(251, 146, 60, 0.30)",
  },
};

const textColors: Record<ButtonVariant, string> = {
  primary:   "#FFFFFF",
  secondary: "#FFFFFF",
  outline:   palette.emerald,
  ghost:     palette.emerald,
  danger:    "#FFFFFF",
  streak:    "#FFFFFF",
};

const pressedOpacity: Record<ButtonVariant, number> = {
  primary:   0.85,
  secondary: 0.85,
  outline:   0.70,
  ghost:     0.60,
  danger:    0.85,
  streak:    0.85,
};

const sizeMap: Record<ButtonSize, { paddingH: number; paddingV: number; fontSize: number; lineHeight: number; radius: number }> = {
  sm: { paddingH: 16, paddingV: 8,  fontSize: 13, lineHeight: 18, radius: radius.md },
  md: { paddingH: 24, paddingV: 14, fontSize: 16, lineHeight: 22, radius: radius.lg },
  lg: { paddingH: 32, paddingV: 18, fontSize: 18, lineHeight: 24, radius: radius.xl },
};

// ─── Component ─────────────────────────────────────────────────────────────
export function Button({
  variant  = "primary",
  size     = "md",
  loading  = false,
  icon,
  iconRight,
  fullWidth = false,
  disabled,
  style,
  children,
  ...rest
}: ButtonProps) {
  const sizeToken    = sizeMap[size];
  const isDisabled   = disabled || loading;

  return (
    <Pressable
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        containerStyles[variant],
        {
          paddingHorizontal: sizeToken.paddingH,
          paddingVertical:   sizeToken.paddingV,
          borderRadius:      sizeToken.radius,
          opacity: isDisabled ? 0.45 : pressed ? pressedOpacity[variant] : 1,
          alignSelf: fullWidth ? "stretch" : "auto",
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={textColors[variant]} size="small" />
      ) : (
        <View style={styles.row}>
          {icon ? (
            <RNText style={[styles.icon, { fontSize: sizeToken.fontSize + 2 }]}>
              {icon}
            </RNText>
          ) : null}
          <RNText
            style={{
              fontSize:   sizeToken.fontSize,
              lineHeight: sizeToken.lineHeight,
              fontWeight: "600",
              color:      textColors[variant],
              letterSpacing: 0.2,
            }}
          >
            {children as string}
          </RNText>
          {iconRight ? (
            <RNText style={[styles.icon, { fontSize: sizeToken.fontSize + 2 }]}>
              {iconRight}
            </RNText>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems:     "center",
    justifyContent: "center",
    flexDirection:  "row",
  },
  row: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           8,
  },
  icon: {
    lineHeight: 24,
  },
});
