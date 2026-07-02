/**
 * app/(home)/learn.tsx
 *
 * Learn Tab — Placeholder Screen
 *
 * This will contain the lesson browser, unit/level selection,
 * and structured learning curriculum.
 */

import { Ionicons } from "@expo/vector-icons";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LearnScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FAF6F0" }}>
      <ScrollView
        contentContainerStyle={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          gap: 16,
        }}
        scrollEnabled={false}
      >
        {/* Icon */}
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: "#E8F5EE",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="book" size={36} color="#1B6B3A" />
        </View>

        {/* Title */}
        <Text
          style={{
            fontFamily: "Poppins-Bold",
            fontSize: 24,
            color: "#1A1A1A",
            textAlign: "center",
          }}
        >
          Learn
        </Text>

        {/* Subtitle */}
        <Text
          style={{
            fontFamily: "Poppins-Regular",
            fontSize: 15,
            color: "#6B7280",
            textAlign: "center",
            lineHeight: 22,
            maxWidth: 260,
          }}
        >
          Explore lessons, units, and your structured Ajami curriculum — coming soon.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
