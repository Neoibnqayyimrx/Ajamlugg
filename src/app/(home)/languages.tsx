/**
 * app/(home)/languages.tsx
 *
 * Language selection screen.
 *
 * Two modes:
 *  - "onboarding" (no language stored yet): the tab bar stays hidden (see
 *    isLanguagesOnboarding in CustomTabBar.tsx) and Confirm calls
 *    router.replace("/(home)") — there is no way out until a language is
 *    picked, since the (home)/_layout.tsx guard would just redirect back.
 *  - "change language" (accessed from Profile): the tab bar is visible,
 *    highlighting Profile, and doubles as the way out — no in-screen close
 *    button. Confirm calls router.back() as before.
 */

import { LANGUAGES } from "@/data/languages";
import { useLanguageStore } from "@/store/useLanguageStore";
import { LanguageId } from "@/types/learning";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LanguageSelectionScreen() {
  const router = useRouter();
  const { selectedLanguageId, setLanguage } = useLanguageStore();

  // Pre-select the existing choice (or first language for new users)
  const [localSelectedId, setLocalSelectedId] = useState<LanguageId>(
    (selectedLanguageId as LanguageId) ?? "hausa-ajami"
  );
  const [query, setQuery] = useState("");
  const inputRef = useRef<TextInput>(null);

  // New user = no language stored yet → tab bar stays hidden (see
  // isLanguagesOnboarding in CustomTabBar.tsx) until Confirm is pressed
  const isOnboarding = selectedLanguageId === null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q)
    );
  }, [query]);

  const handleConfirm = () => {
    // Persist the selection in the Zustand store (written to AsyncStorage)
    setLanguage(localSelectedId);

    if (isOnboarding) {
      // New user: replace so they can't swipe back to an empty-language state
      router.replace("/(home)");
    } else {
      // Returning user changing their language: just go back
      router.back();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FAF6EF" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-5 pt-4 pb-24"
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Hero Image ── */}
        <View
          className="w-full h-[200px] rounded-2xl overflow-hidden mb-6"
          style={{ boxShadow: "0 8px 24px rgba(14, 159, 110, 0.15)" } as any}
        >
          <Image
            source={require("@/assets/images/ajam.webp")}
            className="w-full h-full"
            resizeMode="cover"
          />
        </View>

        <Text className="font-poppins-bold text-h2 text-navy-900 mb-1.5 leading-9">
          What would you like to learn?
        </Text>
        <Text className="font-poppins text-body-md text-text-secondary mb-4">
          Choose a language to start your Ajami journey.
        </Text>

        {/* ── Search Bar ── */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => inputRef.current?.focus()}
          className="flex-row items-center bg-white border border-border rounded-xl px-3.5 gap-2.5 mb-5"
          style={{ boxShadow: "0 1px 4px rgba(15, 23, 42, 0.06)" } as any}
        >
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Search languages…"
            placeholderTextColor="#94A3B8"
            returnKeyType="search"
            className="flex-1 font-poppins text-body-md text-navy-900 py-3.5"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* ── Language List ── */}
        {filtered.length === 0 ? (
          <View className="items-center py-10 gap-2">
            <Text className="text-3xl">🔍</Text>
            <Text className="font-poppins-semi text-body-md text-text-secondary">
              No languages found
            </Text>
            <Text className="font-poppins text-body-sm text-slate-400 text-center">
              Try a different search term
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {filtered.map((lang) => {
              const isSelected = localSelectedId === lang.id;
              const isLocked = lang.locked === true;
              return (
                <TouchableOpacity
                  key={lang.id}
                  disabled={isLocked}
                  className={`bg-white rounded-[20px] p-4 flex-row items-center justify-between border-2 ${
                    isSelected ? "border-emerald bg-emerald-50" : "border-border"
                  } ${isLocked ? "opacity-50" : ""}`}
                  activeOpacity={0.8}
                  onPress={() => setLocalSelectedId(lang.id as LanguageId)}
                >
                  <View className="flex-row items-center flex-1 gap-4">
                    {/* Ajami script icon */}
                    <View
                      className="w-12 h-12 rounded-full items-center justify-center"
                      style={{ backgroundColor: lang.color + "20" }}
                    >
                      <Text
                        className="font-poppins-bold text-[22px] leading-none"
                        style={{ color: lang.color, includeFontPadding: false } as any}
                      >
                        {lang.script}
                      </Text>
                    </View>

                    <View className="flex-1">
                      <View className="flex-row items-center gap-2 mb-0.5">
                        <Text
                          className={`font-poppins-bold text-h4 ${
                            isSelected ? "text-emerald-700" : "text-navy-900"
                          }`}
                        >
                          {lang.name}
                        </Text>
                        {isLocked && (
                          <View className="bg-slate-100 rounded-full px-2 py-0.5">
                            <Text className="font-poppins-medium text-[10px] text-slate-500">
                              Coming soon
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text
                        className={`font-poppins text-body-sm leading-[18px] ${
                          isSelected ? "text-emerald-900" : "text-text-secondary"
                        }`}
                        numberOfLines={2}
                      >
                        {lang.description}
                      </Text>
                    </View>
                  </View>

                  {/* Radio button, or a lock icon for languages not yet available */}
                  {isLocked ? (
                    <View className="w-6 h-6 items-center justify-center ml-3">
                      <Ionicons name="lock-closed" size={16} color="#94A3B8" />
                    </View>
                  ) : (
                    <View
                      className={`w-6 h-6 rounded-full border-2 items-center justify-center ml-3 ${
                        isSelected ? "border-emerald" : "border-slate-300"
                      }`}
                    >
                      {isSelected && (
                        <View className="w-3 h-3 rounded-full bg-emerald" />
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── Bottom CTA ── */}
      <View className="absolute bottom-0 left-0 right-0 bg-[#FAF6EF] px-5 pt-3 pb-8 border-t border-border">
        <TouchableOpacity
          className="bg-emerald py-[18px] rounded-2xl items-center"
          style={{ boxShadow: "0 4px 12px rgba(14, 159, 110, 0.25)" } as any}
          onPress={handleConfirm}
          activeOpacity={0.85}
        >
          <Text className="font-poppins-semi text-body-lg text-white">
            Confirm Selection
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
