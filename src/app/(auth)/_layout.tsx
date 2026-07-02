/**
 * app/(auth)/_layout.tsx
 *
 * Shell for the auth route group (sign-in, sign-up, etc).
 *
 * Guard order:
 *  1. Clerk not loaded yet → spinner
 *  2. Already signed in    → redirect to "/" (let root index route decide home)
 *  3. Signed out            → render the auth Stack
 */

import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function AuthRoutesLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  // ── 1. Wait for Clerk ──────────────────────────────────────────────────────
  // Returning a spinner View (instead of null) avoids potential navigator
  // remount/flash issues some Expo Router versions have with null layouts.
  if (!isLoaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FAF6F0",
        }}
      >
        <ActivityIndicator size="large" color="#0E9F6E" />
      </View>
    );
  }

  // ── 2. Already signed in — bounce out of the auth group ────────────────────
  if (isSignedIn) return <Redirect href="/" />;

  // ── 3. Signed out — render the auth stack ───────────────────────────────────
  return <Stack screenOptions={{ headerShown: false }} />;
}