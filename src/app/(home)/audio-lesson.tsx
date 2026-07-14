/**
 * app/(home)/audio-lesson.tsx
 *
 * Web/server fallback for the Audio Lesson screen.
 *
 * The real screen (audio-lesson.native.tsx) uses
 * @stream-io/video-react-native-sdk (directly, and via
 * hooks/useAudioLessonCall.ts), which calls native modules
 * (requireNativeComponent) that don't exist in Node/web bundling — Metro
 * only resolves the `.native.tsx` file for iOS/Android, so this bare
 * `.tsx` is what web/server rendering falls back to instead. The audio
 * lesson call itself is a mobile-only, audio-first experience (per
 * AGENTS.md's mobile-first UI principles), so this is a small "not on web"
 * placeholder rather than a reimplementation of the call UI.
 */

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LANGUAGES } from "@/data/languages";
import { LESSONS } from "@/data/lessons";
import { UNITS } from "@/data/units";

const C = {
  bg: "#FAF6F0",
  green: "#1B6B3A",
  greenLight: "#E8F5EE",
  text: "#1A1A1A",
  textSub: "#6B7280",
};

export default function AudioLessonWebFallback() {
  const router = useRouter();
  const { lessonId } = useLocalSearchParams<{ lessonId?: string }>();

  const lesson = LESSONS.find((l) => l.id === lessonId);
  const unit = UNITS.find((u) => u.id === lesson?.unitId);
  const language = LANGUAGES.find((l) => l.id === unit?.languageId);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(home)/learn");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View className="flex-1 items-center justify-center p-6 gap-4">
        <View className="w-20 h-20 rounded-full bg-[#E8F5EE] items-center justify-center">
          <Ionicons name="phone-portrait-outline" size={36} color={C.green} />
        </View>
        <Text className="font-poppins-bold text-2xl text-[#1A1A1A] text-center">
          Audio lessons are mobile-only
        </Text>
        <Text className="font-poppins-regular text-[15px] text-[#6B7280] text-center leading-[22px] max-w-[300px]">
          {lesson && language
            ? `Open "${lesson.title}" (${language.name}) in the Ajami app on your phone to start a live audio session with your AI teacher.`
            : "Open this lesson in the Ajami app on your phone to start a live audio session with your AI teacher."}
        </Text>
        <Pressable onPress={goBack} className="bg-[#1B6B3A] rounded-full px-6 py-3 mt-2">
          <Text className="font-poppins-semibold text-[#FFFFFF] text-[15px]">Go back</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
