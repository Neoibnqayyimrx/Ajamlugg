/**
 * Ajami Design System — ProgressBar Component
 *
 * Shows lesson/XP/streak progress in the brand emerald color.
 *
 * Usage:
 *   <ProgressBar progress={0.6} />
 *   <ProgressBar progress={0.3} variant="gold" height={10} />
 */

import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, ViewProps } from "react-native";
import { palette } from "@/constants/colors";
import { radius, neutral } from "@/constants/layout";

// ─── Types ─────────────────────────────────────────────────────────────────
export type ProgressVariant = "emerald" | "gold" | "sky" | "streak";

export interface ProgressBarProps extends ViewProps {
  /** 0–1 */
  progress:  number;
  variant?:  ProgressVariant;
  height?:   number;
  animated?: boolean;
}

const trackColors: Record<ProgressVariant, string> = {
  emerald: palette.emeraldLight,
  gold:    palette.goldLight,
  sky:     palette.skyLight,
  streak:  "#FFF7ED",
};

const fillColors: Record<ProgressVariant, string> = {
  emerald: palette.emerald,
  gold:    palette.gold,
  sky:     palette.sky,
  streak:  palette.streak,
};

// ─── Component ─────────────────────────────────────────────────────────────
export function ProgressBar({
  progress,
  variant  = "emerald",
  height   = 8,
  animated = true,
  style,
  ...rest
}: ProgressBarProps) {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const clampedProgress = Math.min(Math.max(progress, 0), 1);
    if (animated) {
      Animated.timing(animValue, {
        toValue:         clampedProgress,
        duration:        400,
        useNativeDriver: false,
      }).start();
    } else {
      animValue.setValue(clampedProgress);
    }
  }, [progress, animated]);

  const widthInterpolation = animValue.interpolate({
    inputRange:  [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View
      style={[
        styles.track,
        {
          height:          height,
          backgroundColor: trackColors[variant],
          borderRadius:    height / 2,
        },
        style,
      ]}
      {...rest}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            width:           widthInterpolation,
            height:          height,
            backgroundColor: fillColors[variant],
            borderRadius:    height / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    overflow: "hidden",
    width:    "100%",
  },
  fill: {
    position: "absolute",
    left:     0,
    top:      0,
  },
});
