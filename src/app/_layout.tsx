
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { useFonts } from "expo-font";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import "../../global.css";

SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY as string;

if (!publishableKey) {
  throw new Error("Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to your .env file");
}

// ─── Crash screen ───────────────────────────────────────────────────────────
// Expo Router renders this instead of unmounting the whole tree when a screen
// throws. Without it a render error in production is a blank white screen the
// learner can't recover from — `retry` re-mounts the failed route, so a
// transient failure (a bad fetch, a missing lesson) doesn't end the session.
//
// The error text stays on screen deliberately: this build is a prototype and
// the fastest bug report is a screenshot. Hide it behind __DEV__ before any
// public release.

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View className="flex-1 bg-[#FAF6F0] items-center justify-center p-6">
      <View className="w-16 h-16 rounded-full bg-[#FDF6E3] items-center justify-center mb-4">
        <Text className="text-3xl">😔</Text>
      </View>
      <Text className="font-poppins-bold text-xl text-[#1A1A1A] text-center">
        Something went wrong
      </Text>
      <Text className="font-poppins-regular text-[15px] text-[#6B7280] text-center leading-[22px] mt-2 max-w-[280px]">
        The app hit an unexpected error. You can try again — your progress is
        saved on this device.
      </Text>

      <ScrollView
        className="max-h-32 self-stretch mt-4 rounded-xl bg-[#FFFFFF] border border-[#EDE8E0]"
        contentContainerStyle={{ padding: 12 }}
      >
        <Text className="font-poppins-regular text-[11px] text-[#9CA3AF]">
          {error.message}
        </Text>
      </ScrollView>

      <Pressable
        onPress={retry}
        className="bg-[#1B6B3A] rounded-full px-8 py-3.5 mt-5"
      >
        <Text className="font-poppins-semibold text-[#FFFFFF] text-[15px]">
          Try again
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Inner layout — can use Clerk hooks here ────────────────────────────────
function RootLayoutNav() {
  const { isLoaded } = useAuth();

  // Show a spinner while Clerk initialises (prevents blank screen on reload)
  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FAF6F0]">
        <ActivityIndicator size="large" color="#0E9F6E" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* index handles its own auth-based <Redirect> — see app/index.tsx */}
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding/index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(home)" />
    </Stack>
  );
}

// ─── Root layout — provides ClerkProvider ───────────────────────────────────
export default function RootLayout() {
  const [fontsLoaded, error] = useFonts({
    "Poppins-Bold":           require("../../assets/fonts/Poppins-Bold.ttf"),
    "Poppins-SemiBold":       require("../../assets/fonts/Poppins-SemiBold.ttf"),
    "Poppins-Medium":         require("../../assets/fonts/Poppins-Medium.ttf"),
    "Poppins-Regular":        require("../../assets/fonts/Poppins-Regular.ttf"),
    "NotoSansArabic-Regular": require("../../assets/fonts/NotoSansArabic-Regular.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || error) SplashScreen.hideAsync();
  }, [fontsLoaded, error]);

  if (!fontsLoaded && !error) return null;

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <RootLayoutNav />
    </ClerkProvider>
  );
}