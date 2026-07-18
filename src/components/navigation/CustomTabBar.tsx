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

import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, LayoutChangeEvent, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLanguageStore } from "@/store/useLanguageStore";

// ── Design tokens ──────────────────────────────────────────────────────────────
const ACTIVE_BG = "#1B6B3A";
const ACTIVE_ICON_COLOR = "#FFFFFF";
const INACTIVE_ICON_COLOR = "#A0AEC0";
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

// Hidden screens (href: null) that should keep the tab bar visible with a
// parent tab highlighted. Hidden screens NOT listed here hide the tab bar
// entirely. "languages" is listed but still hidden during onboarding — see
// isLanguagesOnboarding below, which overrides this for that one case.
const PARENT_TAB: Record<string, string> = {
  "audio-lesson": "learn",
  languages: "profile",
};

// ── Component ──────────────────────────────────────────────────────────────────
export default function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const selectedLanguageId = useLanguageStore((s) => s.selectedLanguageId);

  // Routes without a TAB_CONFIG entry (e.g. "languages", href: null) are
  // hidden screens — they must not render a tab button. state.routes still
  // contains them, so all index math below uses this filtered list.
  const visibleRoutes = state.routes.filter(
    (route) => TAB_CONFIG[route.name] !== undefined
  );
  const focusedRoute = state.routes[state.index];
  // First-time onboarding traps the user on "languages" until they pick a
  // language (see the redirect effect in (home)/_layout.tsx) — the tab bar
  // must stay hidden there, even though PARENT_TAB maps "languages" to
  // "profile" for the ordinary "change language" case.
  const isLanguagesOnboarding =
    focusedRoute.name === "languages" && selectedLanguageId === null;
  // The tab to highlight: the focused route itself, or — for hidden screens
  // like the audio lesson — the parent tab it belongs to.
  const highlightName = isLanguagesOnboarding
    ? undefined
    : TAB_CONFIG[focusedRoute.name]
      ? focusedRoute.name
      : PARENT_TAB[focusedRoute.name];
  const activeIndex = visibleRoutes.findIndex(
    (route) => route.name === highlightName
  );

  // Use a ref (not state) to store tab center X positions.
  // Using state here would cause setState → re-render → onLayout → setState
  // infinite loop. The ref holds positions without triggering re-renders.
  const tabCenters = useRef<number[]>([]);
  const measuredCount = useRef(0);

  // Animated X position of the sliding circle.
  // useState initializer (not useRef.current) — safe to read during render.
  const [circleX] = useState(() => new Animated.Value(-CIRCLE_SIZE));
  const initialized = useRef(false);

  // Derived: total visible tab count (stable between renders)
  const tabCount = visibleRoutes.length;

  // Only depends on stable values (refs + circleX), so the callback identity
  // never changes — keeps the useEffect below from re-firing every render.
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
    [circleX]
  );

  // Animate whenever the active tab index changes.
  // activeIndex is -1 while a hidden screen (languages) is focused — skip.
  useEffect(() => {
    if (activeIndex >= 0) animateToIndex(activeIndex);
  }, [activeIndex, animateToIndex]);

  const handleTabLayout = (index: number) => (e: LayoutChangeEvent) => {
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
  };

  const bottomPad = Math.max(insets.bottom, 8);
  const totalHeight = TAB_BAR_HEIGHT + bottomPad;

  // Hidden screens (like the language picker) should show no tab bar at all,
  // matching their `tabBarStyle: { display: "none" }` option.
  if (activeIndex === -1) return null;

  return (
    <View
      className="flex-row bg-white items-center border-t border-t-[#E8E0D8]"
      style={{
        paddingBottom: bottomPad,
        height: totalHeight,
        // boxShadow is not a NativeWind utility — keep inline for shadow
        boxShadow: "0 -4px 16px rgba(0,0,0,0.07)",
      } as any}
    >
      {/* ── Sliding circle ───────────────────────────────────────────────── */}
      {/* Always rendered; starts offscreen (-CIRCLE_SIZE) and animates into
          position once the first onLayout fires for all tabs               */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          width: CIRCLE_SIZE,
          height: CIRCLE_SIZE,
          borderRadius: CIRCLE_SIZE / 2,
          backgroundColor: ACTIVE_BG,
          left: 0,
          zIndex: 0,
          transform: [{ translateX: circleX }],
          top: (TAB_BAR_HEIGHT - CIRCLE_SIZE) / 2,
        }}
      />

      {/* ── Tab buttons ──────────────────────────────────────────────────── */}
      {visibleRoutes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = route.key === focusedRoute.key;
        // Visual active state — also true when a child screen of this tab
        // (e.g. audio-lesson under Learn) is the focused route.
        const isHighlighted = index === activeIndex;
        const cfg = TAB_CONFIG[route.name];

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
            className="flex-1 items-center justify-center"
            style={{ height: TAB_BAR_HEIGHT, zIndex: 1 }}
            accessibilityRole="button"
            accessibilityState={isHighlighted ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? cfg.label}
          >
            {isHighlighted ? (
              /* Active state: just the icon (circle drawn by sliding overlay) */
              <View
                className="items-center justify-center bg-transparent"
                style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2 }}
              >
                <Ionicons name={cfg.active} size={24} color={ACTIVE_ICON_COLOR} />
              </View>
            ) : (
              /* Inactive state: outline icon + label */
              <View className="items-center justify-center gap-[3px]">
                <Ionicons name={cfg.inactive} size={24} color={INACTIVE_ICON_COLOR} />
                <Text
                  className="text-[10px] text-[#A0AEC0] font-[Poppins-Regular] text-center"
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
