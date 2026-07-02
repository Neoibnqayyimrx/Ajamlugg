/**
 * components/navigation/CustomTabBar.tsx
 *
 * Custom bottom tab bar for the Ajami learning app.
 *
 * Design (matches 05-home-and-tab-navigation design):
 *  - Active tab: icon inside a dark-green filled circle, no label visible
 *  - Inactive tabs: outline icon + small label below
 *  - Animated circle indicator slides smoothly between active tabs
 */

import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs/types";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef } from "react";
import {
  Animated,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ── Design tokens ──────────────────────────────────────────────────────────────
const ACTIVE_BG = "#1B6B3A";
const ACTIVE_ICON_COLOR = "#FFFFFF";
const INACTIVE_ICON_COLOR = "#A0AEC0";
const INACTIVE_LABEL_COLOR = "#A0AEC0";
const CIRCLE_SIZE = 52;
const TAB_BAR_HEIGHT = 68;

// ── Tab configuration ──────────────────────────────────────────────────────────
type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const TAB_CONFIG: Record<
  string,
  { active: IoniconsName; inactive: IoniconsName; label: string }
> = {
  index: {
    active: "home",
    inactive: "home-outline",
    label: "Home",
  },
  learn: {
    active: "book",
    inactive: "book-outline",
    label: "Learn",
  },
  "ai-teacher": {
    active: "hardware-chip",
    inactive: "hardware-chip-outline",
    label: "AI Teacher",
  },
  chat: {
    active: "chatbubble",
    inactive: "chatbubble-outline",
    label: "Chat",
  },
  profile: {
    active: "person",
    inactive: "person-outline",
    label: "Profile",
  },
};

// ── Component ──────────────────────────────────────────────────────────────────
export default function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeIndex = state.index;

  // Use a ref (not state) to store tab center X positions.
  // Using state here would cause setState → re-render → onLayout → setState
  // infinite loop. The ref holds positions without triggering re-renders.
  const tabCenters = useRef<number[]>([]);
  const measuredCount = useRef(0);

  // Animated X position of the sliding circle
  const circleX = useRef(new Animated.Value(-CIRCLE_SIZE)).current;
  const initialized = useRef(false);

  // Derived: total tab count (stable between renders)
  const tabCount = state.routes.length;

  const animateToIndex = useCallback(
    (index: number) => {
      const center = tabCenters.current[index];
      if (center === undefined) return;
      const targetX = center - CIRCLE_SIZE / 2;

      if (!initialized.current) {
        circleX.setValue(targetX);
        initialized.current = true;
        return;
      }
      Animated.spring(circleX, {
        toValue: targetX,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
        mass: 0.7,
      }).start();
    },
    // circleX is a stable Animated.Value ref — no deps needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Animate whenever the active tab index changes
  useEffect(() => {
    animateToIndex(activeIndex);
  }, [activeIndex, animateToIndex]);

  const handleTabLayout = useCallback(
    (index: number) => (e: LayoutChangeEvent) => {
      const { x, width } = e.nativeEvent.layout;
      const center = x + width / 2;

      // Only update if the value actually changed (avoids unnecessary work)
      if (tabCenters.current[index] === center) return;

      tabCenters.current[index] = center;
      measuredCount.current += 1;

      // Once all tabs are measured, animate to the current active tab
      if (measuredCount.current >= tabCount) {
        animateToIndex(activeIndex);
      }
    },
    [activeIndex, tabCount, animateToIndex]
  );

  const bottomPad = Math.max(insets.bottom, 8);
  const totalHeight = TAB_BAR_HEIGHT + bottomPad;

  return (
    <View
      style={[styles.container, { paddingBottom: bottomPad, height: totalHeight }]}
    >
      {/* ── Sliding circle ───────────────────────────────────────────────── */}
      {/* Always rendered; starts offscreen (-CIRCLE_SIZE) and animates into
          position once the first onLayout fires for all tabs               */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.slidingCircle,
          {
            transform: [{ translateX: circleX }],
            top: (TAB_BAR_HEIGHT - CIRCLE_SIZE) / 2,
          },
        ]}
      />

      {/* ── Tab buttons ──────────────────────────────────────────────────── */}
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const cfg = TAB_CONFIG[route.name] ?? TAB_CONFIG["index"];

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: "tabLongPress", target: route.key });
        };

        return (
          <Pressable
            key={route.key}
            onLayout={handleTabLayout(index)}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabButton}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? cfg.label}
          >
            {isFocused ? (
              /* Active state: just the icon (circle drawn by sliding overlay) */
              <View style={styles.activeIconWrapper}>
                <Ionicons
                  name={cfg.active}
                  size={24}
                  color={ACTIVE_ICON_COLOR}
                />
              </View>
            ) : (
              /* Inactive state: outline icon + label */
              <View style={styles.inactiveWrapper}>
                <Ionicons
                  name={cfg.inactive}
                  size={24}
                  color={INACTIVE_ICON_COLOR}
                />
                <Text
                  style={styles.label}
                  numberOfLines={1}
                  allowFontScaling={false}
                >
                  {cfg.label}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E8E0D8",
    alignItems: "center",
    // Modern shadow
    boxShadow: "0 -4px 16px rgba(0,0,0,0.07)",
  } as any,
  slidingCircle: {
    position: "absolute",
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: ACTIVE_BG,
    left: 0,
    zIndex: 0,
  },
  tabButton: {
    flex: 1,
    height: TAB_BAR_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  activeIconWrapper: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: "transparent", // sliding circle handles background
    alignItems: "center",
    justifyContent: "center",
  },
  inactiveWrapper: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  label: {
    fontSize: 10,
    color: INACTIVE_LABEL_COLOR,
    fontFamily: "Poppins-Regular",
    textAlign: "center",
  },
});
