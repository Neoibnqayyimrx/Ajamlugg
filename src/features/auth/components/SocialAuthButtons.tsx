/**
 * features/auth/components/SocialAuthButtons.tsx
 *
 * Browser-based OAuth — works in Expo Go (no dev build needed).
 * Uses Clerk's useOAuth hook with expo-web-browser.
 *
 * To enable a provider, toggle it on in your Clerk Dashboard:
 * https://dashboard.clerk.com/~/user-authentication/sso-connections
 */

import AppleIcon from "@/assets/images/apple.svg";
import FacebookIcon from "@/assets/images/facebook.svg";
import GoogleIcon from "@/assets/images/google.svg";
import { useOAuth } from "@clerk/clerk-expo";
import * as WebBrowser from "expo-web-browser";
import { Text, TouchableOpacity, View } from "react-native";

// Required for browser-based OAuth to work in Expo Go
WebBrowser.maybeCompleteAuthSession();

// ─── Individual OAuth button ──────────────────────────────────────────────────

function OAuthButton({
  strategy,
  label,
  Icon,
}: {
  strategy: "oauth_google" | "oauth_facebook" | "oauth_apple";
  label: string;
  Icon: React.FC<{ width: number; height: number }>;
}) {
  const { startOAuthFlow } = useOAuth({ strategy });

  const handlePress = async () => {
    try {
      const { createdSessionId, setActive } = await startOAuthFlow();
      if (createdSessionId) {
        await setActive!({ session: createdSessionId });
      }
    } catch (err) {
      console.error("OAuth error:", err);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      className="flex-row items-center bg-white border border-[#E5E7EB] rounded-2xl px-4 py-3.5"
      activeOpacity={0.8}
    >
      <View className="w-6 h-6 mr-4 items-center justify-center">
        <Icon width={24} height={24} />
      </View>
      <Text className="text-base text-[#1A1A2E] font-medium">{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Combined buttons ─────────────────────────────────────────────────────────

export function SocialAuthButtons() {
  return (
    <View className="px-5 gap-3">
      <OAuthButton
        strategy="oauth_google"
        label="Continue with Google"
        Icon={GoogleIcon}
      />
      <OAuthButton
        strategy="oauth_facebook"
        label="Continue with Facebook"
        Icon={FacebookIcon}
      />
      <OAuthButton
        strategy="oauth_apple"
        label="Continue with Apple"
        Icon={AppleIcon}
      />
    </View>
  );
}
