/**
 * Ajami Design System — Divider Component
 *
 * Horizontal or vertical separator line using border color token.
 *
 * Usage:
 *   <Divider />
 *   <Divider spacing={16} />
 *   <Divider orientation="vertical" />
 */

import React from "react";
import { View, ViewProps } from "react-native";
import { neutral } from "@/constants/colors";

export interface DividerProps extends ViewProps {
  orientation?: "horizontal" | "vertical";
  spacing?:     number;
  color?:       string;
  thickness?:   number;
}

export function Divider({
  orientation = "horizontal",
  spacing     = 0,
  color       = neutral.border,
  thickness   = 1,
  style,
  ...rest
}: DividerProps) {
  const isVertical = orientation === "vertical";
  return (
    <View
      style={[
        {
          backgroundColor: color,
          marginVertical:   isVertical ? 0 : spacing,
          marginHorizontal: isVertical ? spacing : 0,
          height:    isVertical ? "100%" : thickness,
          width:     isVertical ? thickness : "100%",
        },
        style,
      ]}
      {...rest}
    />
  );
}
