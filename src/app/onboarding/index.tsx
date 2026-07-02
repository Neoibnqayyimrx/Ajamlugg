// src/app/onboarding/index.tsx
import { router } from "expo-router";
import {
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OnboardingScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF6EF" />

      {/* ── Header ── */}
      <View className="flex-row items-center gap-x-2.5 pt-2 mb-5">
        <Image
          source={require("../../../assets/images/mascot-logo.png")}
          className="w-11 h-11"
          resizeMode="contain"
        />
        <View>
          <Text className="font-[Poppins-Bold] text-[22px] text-[#0E9F6E] leading-[26px]">
            Ajamlugg
          </Text>
          <Text className="font-[Poppins-Regular] text-[11px] text-[#64748B] tracking-wide">
            Learn. Read. Preserve.
          </Text>
        </View>
      </View>

      {/* ── Hero copy ── */}
      <View className="mb-4">
        <Text className="font-[Poppins-Bold] text-[36px] text-[#0F172A] leading-[44px]">
          Your Ajami{"\n"}
          <Text className="text-[#0E9F6E]">tutor</Text>
          <Text className="text-[#D4A017]">.</Text>
        </Text>
        <Text className="font-[Poppins-Regular] text-[15px] text-[#64748B] leading-[22px] mt-2">
          Real conversations, personalized lessons, anytime, anywhere.
        </Text>
      </View>

      {/* ── Mascot + speech bubbles ── */}
      <View className="flex-1 flex-row items-end justify-center relative">
        {/* Left bubble */}
        <View
          className="absolute left-0 top-16 z-10 rounded-2xl px-3 py-2 min-w-[90px] max-w-[130px]"
          style={{ backgroundColor: "#E6F4EC" }}
        >
          <Text className="font-[NotoSansArabic-Regular] text-[18px] text-[#0F172A] leading-7 text-right">
            سَنُّو
          </Text>
          <Text className="font-[Poppins-Regular] text-[11px] text-[#64748B] mt-0.5">
            (Sannu!)
          </Text>
        </View>

        <Image
          source={require("../../../assets/images/mascot-welcome.png")}
          className="w-[220px] h-[300px] z-[1]"
          resizeMode="contain"
        />

        {/* Right bubbles */}
        <View className="absolute right-0 top-10 z-10 gap-y-2">
          <View
            className="rounded-2xl px-3 py-2 min-w-[90px] max-w-[130px]"
            style={{ backgroundColor: "#EAF4FB" }}
          >
            <Text className="font-[NotoSansArabic-Regular] text-[18px] text-[#0F172A] leading-7 text-right">
              طَنْ اَلْبَرْكَه
            </Text>
            <Text className="font-[Poppins-Regular] text-[11px] text-[#64748B] mt-0.5">
              (ɗan albarka!)
            </Text>
          </View>

          <View
            className="rounded-2xl px-3 py-2 min-w-[90px] max-w-[130px] mt-16"
            style={{ backgroundColor: "#F5F0E4" }}
          >
            <Text className="font-[NotoSansArabic-Regular] text-[18px] text-[#0F172A] leading-7 text-right">
              يَايَا كَكِي؟
            </Text>
            <Text className="font-[Poppins-Regular] text-[11px] text-[#64748B] mt-0.5">
              (Yaya kake?)
            </Text>
          </View>
        </View>
      </View>

      {/* ── Footer CTA ── */}
      <View className="pb-3 pt-4 gap-y-3">
        <TouchableOpacity
          className="bg-[#0E9F6E] rounded-2xl py-[18px] px-7 flex-row items-center justify-center"
          onPress={() => router.push("/(auth)/sign-up")}
          activeOpacity={0.85}
        >
          <Text className="font-[Poppins-Bold] text-[17px] text-white">
            Get Started
          </Text>
        </TouchableOpacity>

        <Text className="font-[Poppins-Regular] text-[13px] text-[#64748B] text-center">
          📖 Built for every Ajami learner
        </Text>
      </View>
    </SafeAreaView>
  );
}

// SafeAreaView needs StyleSheet — NativeWind className doesn't apply to it
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FAF6EF",
    paddingHorizontal: 24,
  },
});
