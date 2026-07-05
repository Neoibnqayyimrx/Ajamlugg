/**
 * app/(home)/chat.tsx
 *
 * Chat Tab — Placeholder Screen
 *
 * This will contain the community chat, AI conversation practice,
 * and messaging features powered by Stream Chat.
 */

import { Ionicons } from "@expo/vector-icons";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ChatScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FAF6F0" }}>
      <ScrollView
        contentContainerClassName="flex-1 items-center justify-center p-6 gap-4"
        scrollEnabled={false}
      >
        {/* Icon */}
        <View className="w-20 h-20 rounded-full bg-[#E8F5EE] items-center justify-center">
          <Ionicons name="chatbubble" size={36} color="#1B6B3A" />
        </View>

        {/* Title */}
        <Text className="font-[Poppins-Bold] text-2xl text-[#1A1A1A] text-center">
          Chat
        </Text>

        {/* Subtitle */}
        <Text className="font-[Poppins-Regular] text-[15px] text-[#6B7280] text-center leading-[22px] max-w-[260px]">
          Practice conversations with AI and connect with other learners — coming soon.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
