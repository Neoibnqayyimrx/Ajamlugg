/**
 * app/index.tsx
 *
 * Entry point — redirects based on Clerk auth state.
 *   Signed in  → / renders home content
 *   Signed out → /onboarding
 */

import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FAF6F0]">
        <ActivityIndicator size="large" color="#0E9F6E" />
      </View>
    );
  }

  if (isSignedIn) {
    // TODO: replace with your real home screen once built
    return <Redirect href="/(home)" />;
  }

  return <Redirect href="/onboarding" />;
}