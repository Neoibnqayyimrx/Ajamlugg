
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { useFonts } from "expo-font";
import { Redirect, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import "../../global.css";

SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY as string;

if (!publishableKey) {
  throw new Error("Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to your .env file");
}

// ─── Inner layout — can use Clerk hooks here ────────────────────────────────
function RootLayoutNav() {
  const { isSignedIn, isLoaded } = useAuth();

  // Show a spinner while Clerk initialises (prevents blank screen on reload)
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FAF6F0" }}>
        <ActivityIndicator size="large" color="#0E9F6E" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
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