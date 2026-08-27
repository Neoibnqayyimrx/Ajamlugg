/**
 * app/(home)/_layout.tsx
 *
 * Protected shell for the main app section.
 *
 * Guard order:
 *  1. Clerk not loaded yet            → spinner
 *  2. Not signed in                   → /onboarding
 *  3. Store not hydrated yet          → spinner (AsyncStorage read in progress)
 *  4. No language selected            → redirect to languages screen (handled via effect,
 *                                        Tabs still render so the target screen can mount)
 *  5. All good                        → render Tabs (home content)
 */

import CustomTabBar from "@/components/navigation/CustomTabBar";
import { AI_TEACHER_ENABLED } from "@/constants/features";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Tabs, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

function Spinner() {
  return (
    <View className="flex-1 items-center justify-center bg-[#FAF6F0]">
      <ActivityIndicator size="large" color="#1B6B3A" />
    </View>
  );
}

export default function HomeLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const { selectedLanguageId, isHydrated } = useLanguageStore();
  const router = useRouter();

  // ── 4. Language guard (imperative) ────────────────────────────────────────
  // Uses useEffect + router.replace instead of <Redirect> so the redirect
  // fires as a side effect after render, not during it.
  //
  // IMPORTANT: this effect targets a screen ("/(home)/languages") that lives
  // INSIDE this same Tabs navigator. That screen can only ever mount if this
  // layout actually renders <Tabs>. So we must NOT early-return a spinner
  // below when selectedLanguageId is null — doing so blocks the very screen
  // we're redirecting to, which causes an infinite redirect loop.
  useEffect(() => {
    if (isLoaded && isSignedIn && isHydrated && selectedLanguageId === null) {
      router.replace("/(home)/languages");
    }
  }, [isLoaded, isSignedIn, isHydrated, selectedLanguageId, router]);

  // ── 1. Wait for Clerk ──────────────────────────────────────────────────────
  if (!isLoaded) return <Spinner />;

  // ── 2. Auth guard ──────────────────────────────────────────────────────────
  if (!isSignedIn) return <Redirect href="/onboarding" />;

  // ── 3. Wait for AsyncStorage hydration ────────────────────────────────────
  if (!isHydrated) return <Spinner />;

  // ── 5. Main tab navigation ─────────────────────────────────────────────────
  // Always render Tabs once loaded/signed-in/hydrated, even if
  // selectedLanguageId is still null — the effect above will redirect to the
  // languages screen, which needs Tabs mounted to receive that navigation.
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarLabel: "Home",
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: "Learn",
          tabBarLabel: "Learn",
        }}
      />
      {/* Optional extra, off by default. `href: null` hides the tab without
          unregistering the route, so the screen stays reachable by deep link
          for testing and returns instantly if the flag is turned on. */}
      <Tabs.Screen
        name="ai-teacher"
        options={{
          title: "AI Teacher",
          tabBarLabel: "AI Teacher",
          href: AI_TEACHER_ENABLED ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarLabel: "Chat",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
        }}
      />
      {/* Hidden — language picker, not a tab */}
      <Tabs.Screen
        name="languages"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
      {/* Hidden — the lesson player, opened from Learn with a lessonId. Not a
          tab itself; the tab bar stays visible with Learn highlighted (see
          PARENT_TAB in CustomTabBar). */}
      <Tabs.Screen
        name="lesson"
        options={{
          href: null,
        }}
      />
      {/* Hidden — AI Teacher audio lesson. No longer on the learner's path:
          Learn opens the player above. Kept registered so the optional
          feature can be re-enabled without restoring routing. */}
      <Tabs.Screen
        name="audio-lesson"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}