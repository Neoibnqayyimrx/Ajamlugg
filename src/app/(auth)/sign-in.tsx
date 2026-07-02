import { SocialAuthButtons } from "@/features/auth/components/SocialAuthButtons";
import { useSignIn } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function SignInScreen() {
  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn();

  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [loading, setLoading]           = useState(false);

  const handleSignIn = async () => {
    if (!isLoaded) return;
    setError(null);
    setLoading(true);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === "complete") {
        await setActive!({ session: result.createdSessionId });
        router.replace("/");
      } else {
        console.warn("Sign-in incomplete:", result.status);
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        className="flex-1 bg-[#FAF6F0]"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-14 ml-5 w-10 h-10 items-center justify-center"
          >
            <Ionicons name="chevron-back" size={24} color="#1A1A2E" />
          </TouchableOpacity>

          {/* Header + Mascot */}
          <View className="px-6 mt-1">
            <Text className="font-[Poppins-Bold] text-[28px] text-[#1A1A2E]">
              Welcome back
            </Text>
            <Text className="font-[Poppins-Regular] text-base text-[#6B7280] mt-1">
              Continue your journey ✨
            </Text>
            <Image
              source={require("@/assets/images/mascot-auth.png")}
              className="w-full h-64 mt-2"
              resizeMode="contain"
              style={{ marginBottom: -24 }}
            />
          </View>

          {/* Form — negative margin pulls it up against mascot base */}
          <View className="px-5 gap-3">
            {/* Email */}
            <View className="bg-white rounded-2xl px-4 pt-2.5 pb-3 border border-[#E5E7EB]">
              <Text className="text-xs text-[#9CA3AF]">Email</Text>
              <TextInput
                className="text-base text-[#1A1A2E] mt-0.5"
                placeholder="you@example.com"
                placeholderTextColor="#D1D5DB"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Password */}
            <View className="bg-white rounded-2xl px-4 pt-2.5 pb-3 border border-[#E5E7EB] flex-row items-center">
              <View className="flex-1">
                <Text className="text-xs text-[#9CA3AF]">Password</Text>
                <TextInput
                  className="text-base text-[#1A1A2E] mt-0.5"
                  placeholder="••••••••"
                  placeholderTextColor="#D1D5DB"
                  secureTextEntry={!showPassword}
                  autoComplete="current-password"
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>

            {/* Error */}
            {error ? (
              <Text className="text-sm text-[#EF4444] px-1">{error}</Text>
            ) : null}

            {/* Log In CTA */}
            <TouchableOpacity
              onPress={handleSignIn}
              disabled={loading || !email || !password}
              className="bg-[#1E6B4A] rounded-2xl py-4 items-center mt-1"
              activeOpacity={0.85}
              style={{ opacity: loading || !email || !password ? 0.6 : 1 }}
            >
              <Text className="font-[Poppins-SemiBold] text-white text-base">
                {loading ? "Logging in..." : "Log In"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View className="flex-row items-center px-5 my-5">
            <View className="flex-1 h-px bg-[#E5E7EB]" />
            <Text className="mx-3 text-sm text-[#9CA3AF]">or continue with</Text>
            <View className="flex-1 h-px bg-[#E5E7EB]" />
          </View>

          <SocialAuthButtons />

          {/* Footer */}
          <View className="flex-row justify-center mt-8 mb-10">
            <Text className="text-sm text-[#6B7280]">Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/sign-up")}>
              <Text className="text-sm text-[#1E6B4A] font-semibold">Sign up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
