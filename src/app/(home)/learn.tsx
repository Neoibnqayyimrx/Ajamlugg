/**
 * app/(home)/learn.tsx
 *
 * Learn Tab — Lessons screen.
 *
 * Shows the current unit for the user's selected language (Zustand +
 * AsyncStorage) with its lesson list, matching the lesson-screen design:
 *   - Hero header: unit title, progress ("x / y lessons"), description, art
 *   - Lessons / Practice tab switch
 *   - Lesson cards with status: completed, in progress, or upcoming
 *
 * Progress is mocked locally for now (MOCK_COMPLETED + local selection state).
 * There is intentionally NO locking logic — any lesson can be opened, which
 * here means selecting it as the "in progress" lesson.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import images from "@/constants/images";
import { LANGUAGES } from "@/data/languages";
import { LESSONS } from "@/data/lessons";
import { UNITS } from "@/data/units";
import { useLanguageStore } from "@/store/useLanguageStore";
import { LanguageId, Lesson, Unit } from "@/types/learning";

// ─── Palette (matches home screen) ────────────────────────────────────────────

const C = {
  bg: "#FAF6F0",
  surface: "#FFFFFF",
  green: "#1B6B3A",
  greenLight: "#E8F5EE",
  gold: "#D4A017",
  tan: "#EADFC8",
  tanIcon: "#8A6D3B",
  text: "#1A1A1A",
  textSub: "#6B7280",
  border: "#EDE8E0",
  lock: "#9CA3AF",
};

// ─── Mock progress data ───────────────────────────────────────────────────────
// Which lessons the user has already completed, per language. Real progress
// tracking (synced + offline) comes later; this drives the status badges now.

const MOCK_COMPLETED: Record<LanguageId, string[]> = {
  "hausa-ajami": ["hausa-lesson-1-1", "hausa-lesson-1-2"],
  "swahili-ajami": ["swahili-lesson-1-1"],
  "wolof-ajami": [],
};

// ─── Unit artwork ─────────────────────────────────────────────────────────────
// Local assets where we have a fitting image; Picsum placeholders otherwise.

const UNIT_IMAGES: Record<string, ImageSourcePropType> = {
  "hausa-unit-1": images.palace,
  "hausa-unit-2": images.ajam,
  "swahili-unit-1": { uri: "https://picsum.photos/seed/swahili-ajami/600/500" },
  "wolof-unit-1": { uri: "https://picsum.photos/seed/wolof-ajami/600/500" },
};

// Themed icons for lesson cards, cycled by lesson position in the unit.
const LESSON_ICONS = [
  "hand-left",
  "home",
  "cafe",
  "navigate",
  "basket",
  "people",
] as const;

type LessonStatus = "completed" | "in-progress" | "upcoming";

// ─── Hero header ──────────────────────────────────────────────────────────────

function UnitHero({
  unit,
  completedCount,
  totalCount,
  onBack,
  canGoBack,
}: {
  unit: Unit;
  completedCount: number;
  totalCount: number;
  onBack: () => void;
  canGoBack: boolean;
}) {
  return (
    <View className="px-5 pt-2">
      {/* Top bar: back + bookmark */}
      <View className="flex-row items-center justify-between mb-1">
        {canGoBack ? (
          <Pressable onPress={onBack} className="w-10 h-10 items-center justify-center -ml-2.5">
            <Ionicons name="chevron-back" size={26} color={C.green} />
          </Pressable>
        ) : (
          <View className="w-10 h-10" />
        )}
        <Pressable className="w-10 h-10 items-center justify-center -mr-2.5">
          <Ionicons name="bookmark-outline" size={24} color={C.green} />
        </Pressable>
      </View>

      {/* Title + progress + description, with unit artwork on the right */}
      <View className="flex-row">
        <View className="flex-1 gap-2 pr-2">
          <Text className="font-poppins-bold text-[30px] leading-[38px] text-[#1B6B3A]">
            {unit.title}
          </Text>
          <View className="flex-row items-center gap-2">
            <Text className="font-poppins-semibold text-[15px] text-[#1B6B3A]">
              Unit {unit.order}
            </Text>
            <View className="w-1.5 h-1.5 rounded-full bg-[#D4A017]" />
            <Text className="font-poppins-semibold text-[15px] text-[#1B6B3A]">
              {completedCount} / {totalCount} lessons
            </Text>
          </View>
          <Text className="font-poppins-regular text-sm leading-[21px] text-[#6B7280]">
            {unit.description}
          </Text>
        </View>
        <Image
          source={UNIT_IMAGES[unit.id] ?? images.ajam}
          className="w-[150px] h-[140px] rounded-2xl"
          resizeMode="cover"
        />
      </View>
    </View>
  );
}

// ─── Unit switcher ────────────────────────────────────────────────────────────
// The design shows a single unit; languages with several units get this small
// chip row so every unit in the dataset is reachable.

function UnitChips({
  units,
  activeUnitId,
  onSelect,
}: {
  units: Unit[];
  activeUnitId: string;
  onSelect: (unit: Unit) => void;
}) {
  if (units.length < 2) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
      className="mt-4 grow-0"
    >
      {units.map((unit) => {
        const active = unit.id === activeUnitId;
        return (
          <Pressable
            key={unit.id}
            onPress={() => onSelect(unit)}
            className={`px-4 py-2 rounded-full border ${
              active ? "bg-[#1B6B3A] border-[#1B6B3A]" : "bg-[#FFFFFF] border-[#EDE8E0]"
            }`}
          >
            <Text
              className={`font-poppins-semibold text-[13px] ${
                active ? "text-[#FFFFFF]" : "text-[#6B7280]"
              }`}
            >
              Unit {unit.order} · {unit.title}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── Lessons / Practice tab switch ────────────────────────────────────────────

type TabId = "lessons" | "practice";

function TabSwitch({ active, onChange }: { active: TabId; onChange: (tab: TabId) => void }) {
  const tabs: { id: TabId; label: string; icon: "book-outline" | "grid-outline" }[] = [
    { id: "lessons", label: "Lessons", icon: "book-outline" },
    { id: "practice", label: "Practice", icon: "grid-outline" },
  ];

  return (
    <View className="flex-row mx-5 mt-5 bg-[#F1EAE0] rounded-xl overflow-hidden">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            className={`flex-1 flex-row items-center justify-center gap-2 py-3.5 ${
              isActive ? "bg-[#FFFFFF] border-b-[3px] border-[#1B6B3A] rounded-xl" : ""
            }`}
          >
            <Ionicons
              name={tab.icon}
              size={20}
              color={isActive ? C.green : C.textSub}
            />
            <Text
              className={`font-poppins-semibold text-base ${
                isActive ? "text-[#1B6B3A]" : "text-[#6B7280]"
              }`}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Lesson card ──────────────────────────────────────────────────────────────

function LessonCard({
  lesson,
  index,
  status,
  onPress,
}: {
  lesson: Lesson;
  index: number;
  status: LessonStatus;
  onPress: () => void;
}) {
  const icon = LESSON_ICONS[index % LESSON_ICONS.length];
  const started = status !== "upcoming";

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "rgba(0,0,0,0.05)" }}
      className={`bg-[#FFFFFF] rounded-2xl p-4 flex-row items-center gap-3.5 overflow-hidden ${
        status === "in-progress"
          ? "border-[1.5px] border-[#1B6B3A]"
          : "border border-[#EDE8E0]"
      }`}
    >
      {/* Decorative script art on the active card (like the design's lantern) */}
      {status === "in-progress" && (
        <Image
          source={images.ajam}
          className="absolute -right-4 -top-2 w-[110px] h-[110px] opacity-20"
          resizeMode="contain"
        />
      )}

      {/* Icon circle */}
      <View
        className="w-14 h-14 rounded-full items-center justify-center"
        style={{
          backgroundColor: started
            ? index % 2 === 0
              ? C.green
              : C.gold
            : C.tan,
        }}
      >
        <Ionicons name={icon} size={24} color={started ? "#FFFFFF" : C.tanIcon} />
      </View>

      {/* Labels */}
      <View className="flex-1 gap-0.5">
        <Text className="font-poppins-medium text-[13px] text-[#6B7280]">
          Lesson {index + 1}
        </Text>
        <Text className="font-poppins-bold text-base text-[#1A1A1A]" numberOfLines={1}>
          {lesson.title}
        </Text>
        {status === "in-progress" && (
          <Text className="font-poppins-semibold text-[13px] text-[#D4A017]">
            In progress
          </Text>
        )}
        {status === "upcoming" && (
          <Text className="font-poppins-regular text-xs text-[#6B7280]">
            {lesson.activities.length}{" "}
            {lesson.activities.length === 1 ? "activity" : "activities"}
          </Text>
        )}
      </View>

      {/* Status indicator (visual only — every lesson stays openable) */}
      {status === "completed" && (
        <Ionicons name="checkmark-circle" size={30} color={C.green} />
      )}
      {status === "upcoming" && (
        <Ionicons name="lock-closed" size={20} color={C.lock} />
      )}
    </Pressable>
  );
}

// ─── Practice tab placeholder ─────────────────────────────────────────────────

function PracticeEmptyState() {
  return (
    <View className="bg-[#FFFFFF] rounded-2xl border border-[#EDE8E0] items-center p-8 gap-3">
      <View className="w-16 h-16 rounded-full bg-[#FDF6E3] items-center justify-center">
        <Ionicons name="dice-outline" size={30} color={C.gold} />
      </View>
      <Text className="font-poppins-bold text-lg text-[#1A1A1A]">Practice mode</Text>
      <Text className="font-poppins-regular text-sm text-[#6B7280] text-center leading-[21px]">
        Review exercises for this unit are coming soon. Finish lessons to unlock
        more practice material.
      </Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LearnScreen() {
  const router = useRouter();
  const { selectedLanguageId } = useLanguageStore();

  const language =
    LANGUAGES.find((l) => l.id === selectedLanguageId) ?? LANGUAGES[0];

  const units = UNITS.filter((u) => u.languageId === language.id).sort(
    (a, b) => a.order - b.order
  );

  const completedIds = MOCK_COMPLETED[language.id] ?? [];

  // Default to the first unit that still has unfinished lessons.
  const defaultUnit =
    units.find((u) => u.lessonIds.some((id) => !completedIds.includes(id))) ??
    units[0];

  const [activeUnitId, setActiveUnitId] = useState(defaultUnit?.id ?? "");
  const [activeTab, setActiveTab] = useState<TabId>("lessons");
  // The lesson currently "open" / in progress. Tapping any card moves it —
  // no locking logic for now.
  const [activeLessonId, setActiveLessonId] = useState<string | null>(
    defaultUnit?.lessonIds.find((id) => !completedIds.includes(id)) ?? null
  );

  const activeUnit = units.find((u) => u.id === activeUnitId) ?? units[0];

  // Empty state: the selected language has no units in the dataset yet.
  if (!activeUnit) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View className="flex-1 items-center justify-center p-6 gap-4">
          <View className="w-20 h-20 rounded-full bg-[#E8F5EE] items-center justify-center">
            <Ionicons name="book" size={36} color={C.green} />
          </View>
          <Text className="font-poppins-bold text-2xl text-[#1A1A1A]">
            No lessons yet
          </Text>
          <Text className="font-poppins-regular text-[15px] text-[#6B7280] text-center leading-[22px] max-w-[260px]">
            Lessons for {language.name} are on the way. Check back soon!
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const lessons = activeUnit.lessonIds
    .map((id) => LESSONS.find((l) => l.id === id))
    .filter((l): l is Lesson => l !== undefined);

  const completedCount = lessons.filter((l) =>
    completedIds.includes(l.id)
  ).length;

  const statusFor = (lesson: Lesson): LessonStatus => {
    if (completedIds.includes(lesson.id)) return "completed";
    if (lesson.id === activeLessonId) return "in-progress";
    return "upcoming";
  };

  const handleSelectUnit = (unit: Unit) => {
    setActiveUnitId(unit.id);
    setActiveLessonId(
      unit.lessonIds.find((id) => !completedIds.includes(id)) ?? null
    );
  };

  // Tapping a lesson marks it in progress and opens the AI Teacher
  // audio lesson session for it.
  const handleOpenLesson = (lesson: Lesson) => {
    setActiveLessonId(lesson.id);
    router.push({
      pathname: "/(home)/audio-lesson",
      params: { lessonId: lesson.id },
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <UnitHero
          unit={activeUnit}
          completedCount={completedCount}
          totalCount={lessons.length}
          onBack={() => router.back()}
          canGoBack={router.canGoBack()}
        />

        <UnitChips
          units={units}
          activeUnitId={activeUnit.id}
          onSelect={handleSelectUnit}
        />

        <TabSwitch active={activeTab} onChange={setActiveTab} />

        <View className="px-5 pt-4 gap-3">
          {activeTab === "lessons" ? (
            lessons.map((lesson, index) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                index={index}
                status={statusFor(lesson)}
                onPress={() => handleOpenLesson(lesson)}
              />
            ))
          ) : (
            <PracticeEmptyState />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
