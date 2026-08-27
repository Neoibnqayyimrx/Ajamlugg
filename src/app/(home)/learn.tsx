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
 * Progress comes from useProgressStore (persisted to AsyncStorage): a lesson
 * counts as completed once the learner has finished an audio session for it.
 * There is intentionally NO locking logic on lessons — any lesson can be
 * opened, which here means selecting it as the "in progress" lesson.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { getUnits } from "@/features/content/repository";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useProgressStore } from "@/store/useProgressStore";
import type { ManifestLesson, ManifestUnit } from "@/types/content";

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

// ─── Unit artwork ─────────────────────────────────────────────────────────────
// Bundled assets only — no remote placeholder services. Remote art would show
// as an empty box on a slow or offline connection, and the unit hero is the
// first thing on this screen. Units with no entry fall back to images.ajam.

const UNIT_IMAGES: Record<string, ImageSourcePropType> = {
  "hausa-unit-1": images.palace,
  "hausa-unit-2": images.ajam,
  "swahili-unit-1": images.treasure,
  "wolof-unit-1": images.palace,
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
}: {
  unit: ManifestUnit;
  completedCount: number;
  totalCount: number;
}) {
  return (
    <View className="px-5 pt-2">
      {/* Top bar: bookmark only — Learn is a tab, exit via the tab bar */}
      <View className="flex-row items-center justify-end mb-1">
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
  completedIds,
  onSelect,
}: {
  units: ManifestUnit[];
  activeUnitId: string;
  completedIds: string[];
  onSelect: (unit: ManifestUnit) => void;
}) {
  if (units.length < 2) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
      className="mt-4 grow-0"
    >
      {units.map((unit, index) => {
        const active = unit.id === activeUnitId;
        // A unit unlocks once every lesson in the *previous* unit (by
        // position in this sorted list) is complete. The first unit is
        // always open.
        const previousUnit = units[index - 1];
        const isLocked =
          previousUnit !== undefined &&
          !previousUnit.lessons.every((l) => completedIds.includes(l.id));
        return (
          <Pressable
            key={unit.id}
            disabled={isLocked}
            onPress={() => onSelect(unit)}
            className={`flex-row items-center gap-1.5 px-4 py-2 rounded-full border ${
              active ? "bg-[#1B6B3A] border-[#1B6B3A]" : "bg-[#FFFFFF] border-[#EDE8E0]"
            } ${isLocked ? "opacity-50" : ""}`}
          >
            {isLocked && (
              <Ionicons name="lock-closed" size={12} color={C.textSub} />
            )}
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
  lesson: ManifestLesson;
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
            {lesson.exerciseCount}{" "}
            {lesson.exerciseCount === 1 ? "exercise" : "exercises"}
          </Text>
        )}
      </View>

      {/* Status indicator. Upcoming lessons show a chevron, not a padlock —
          every lesson here is openable, and a lock that opens when tapped
          tells the learner the opposite of what's true. */}
      {status === "completed" && (
        <Ionicons name="checkmark-circle" size={30} color={C.green} />
      )}
      {status === "upcoming" && (
        <Ionicons name="chevron-forward" size={20} color={C.lock} />
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

  // NOTE: this screen used to warm the vision-agent service on mount, so the
  // AI teacher's cold start would overlap with lesson browsing. That call is
  // gone: lessons no longer involve the AI service at all, so waking it would
  // be a network request on behalf of a feature the learner is not using.

  const language =
    LANGUAGES.find((l) => l.id === selectedLanguageId) ?? LANGUAGES[0];

  // Content is fetched through the repository rather than imported from
  // src/data, so Phase 4 can put a cache and a sync in front of it without
  // touching this screen.
  const [units, setUnits] = useState<ManifestUnit[]>([]);
  // The language whose fetch has settled. Deriving `loadingUnits` from it
  // rather than setting a flag at the top of the effect avoids a redundant
  // render, and still shows the spinner again when the learner switches
  // language.
  const [loadedLanguageId, setLoadedLanguageId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const languageId = language.id;

    getUnits(languageId)
      // A failed lookup falls through to the "no lessons yet" state rather
      // than leaving the spinner running forever.
      .catch(() => [])
      .then((result) => {
        if (!active) return;
        setUnits(result);
        setLoadedLanguageId(languageId);
      });

    return () => {
      active = false;
    };
  }, [language.id]);

  const loadingUnits = loadedLanguageId !== language.id;

  const completedIds = useProgressStore((s) => s.completedLessonIds);

  // The unit the learner explicitly picked, if any. Null means "work it out
  // for me". It must NOT be seeded from `units` in a useState initializer:
  // units arrive asynchronously, so the initializer would capture the empty
  // first render and pin the selection to nothing.
  const [chosenUnitId, setChosenUnitId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("lessons");
  // The lesson the learner explicitly tapped, if any. Null means "just show
  // me where I am" — see activeLessonId below.
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  // Default to the first unit that still has unfinished lessons.
  const defaultUnit =
    units.find((u) => u.lessons.some((l) => !completedIds.includes(l.id))) ??
    units[0];

  const activeUnit = units.find((u) => u.id === chosenUnitId) ?? defaultUnit;

  if (loadingUnits) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={C.green} />
        </View>
      </SafeAreaView>
    );
  }

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

  // The manifest already carries the unit's lessons in order, so there is no
  // second lookup to do here any more.
  const lessons = activeUnit.lessons;

  const completedCount = lessons.filter((l) =>
    completedIds.includes(l.id)
  ).length;

  // Which lesson shows the "In progress" badge. An explicit tap wins, but
  // only until that lesson is actually finished — after that we fall back to
  // the first unfinished lesson, so completing one advances the badge to the
  // next instead of leaving it stuck on a lesson already marked complete.
  const nextUnfinishedId =
    lessons.find((l) => !completedIds.includes(l.id))?.id ?? null;
  const activeLessonId =
    selectedLessonId && !completedIds.includes(selectedLessonId)
      ? selectedLessonId
      : nextUnfinishedId;

  const statusFor = (lesson: ManifestLesson): LessonStatus => {
    if (completedIds.includes(lesson.id)) return "completed";
    if (lesson.id === activeLessonId) return "in-progress";
    return "upcoming";
  };

  const handleSelectUnit = (unit: ManifestUnit) => {
    setChosenUnitId(unit.id);
    // Clear the explicit pick so the new unit re-derives its own position.
    setSelectedLessonId(null);
  };

  // Tapping a lesson marks it in progress and opens the lesson player. This
  // used to open the AI Teacher audio session — the change that takes the AI
  // off the learner's critical path.
  const handleOpenLesson = (lesson: ManifestLesson) => {
    setSelectedLessonId(lesson.id);
    router.push({
      pathname: "/(home)/lesson",
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
        />

        <UnitChips
          units={units}
          activeUnitId={activeUnit.id}
          completedIds={completedIds}
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
