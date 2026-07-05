/**
 * Ajami Design System — Text Component
 *
 * Wraps React Native Text with Poppins / Noto Sans Arabic font variants
 * and the Ajami type scale.
 *
 * Usage:
 *   <Text variant="h1">Learn Ajami</Text>
 *   <Text variant="bodyMd" color="emerald">Start today</Text>
 *   <Text variant="body" arabic>بسم الله</Text>
 */

import React from "react";
import { Text as RNText, TextProps as RNTextProps } from "react-native";
import { typeScale, ajamTypeScale, fontFamily } from "@/constants/typography";
import { palette } from "@/constants/colors";

// ─── Types ─────────────────────────────────────────────────────────────────
export type TextVariant = keyof typeof typeScale;

export interface TextProps extends RNTextProps {
  /** Type scale variant from design system */
  variant?: TextVariant;
  /** Use Noto Sans Arabic font — for Ajami script */
  arabic?: boolean;
  /** Shorthand color token from palette or any valid color string */
  color?: keyof typeof palette | string;
  /** Align text */
  align?: "left" | "center" | "right" | "auto";
  className?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────
export function Text({
  variant = "bodyMd",
  arabic = false,
  color,
  align,
  style,
  children,
  ...rest
}: TextProps) {
  const scale = arabic
    ? (ajamTypeScale[variant as keyof typeof ajamTypeScale] ?? typeScale[variant])
    : typeScale[variant];

  const resolvedColor =
    color !== undefined
      ? color in palette
        ? palette[color as keyof typeof palette]
        : color
      : palette.textPrimary;

  return (
    <RNText
      style={[
        {
          fontSize:   scale.fontSize,
          lineHeight: scale.lineHeight,
          fontWeight: scale.fontWeight,
          fontFamily: arabic ? fontFamily.notoArabic : scale.fontFamily,
          color:      resolvedColor,
          textAlign:  align ?? (arabic ? "right" : "left"),
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
}

// ─── Convenience sub-components ────────────────────────────────────────────
// Named function expressions so each component has a display name in DevTools.
Text.H1 = function TextH1(props: Omit<TextProps, "variant">) { return <Text variant="h1" {...props} />; };
Text.H2 = function TextH2(props: Omit<TextProps, "variant">) { return <Text variant="h2" {...props} />; };
Text.H3 = function TextH3(props: Omit<TextProps, "variant">) { return <Text variant="h3" {...props} />; };
Text.H4 = function TextH4(props: Omit<TextProps, "variant">) { return <Text variant="h4" {...props} />; };
Text.BodyLg = function TextBodyLg(props: Omit<TextProps, "variant">) { return <Text variant="bodyLg" {...props} />; };
Text.BodyMd = function TextBodyMd(props: Omit<TextProps, "variant">) { return <Text variant="bodyMd" {...props} />; };
Text.BodySm = function TextBodySm(props: Omit<TextProps, "variant">) { return <Text variant="bodySm" {...props} />; };
Text.Caption = function TextCaption(props: Omit<TextProps, "variant">) { return <Text variant="caption" {...props} />; };
Text.Arabic = function TextArabic(props: Omit<TextProps, "arabic">) { return <Text arabic {...props} />; };
