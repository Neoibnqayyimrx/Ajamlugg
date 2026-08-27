// Home screen migrated to NativeWind styling
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import images from "@/constants/images";
import { LANGUAGES } from "@/data/languages";
import { UNITS } from "@/data/units";
import { useLanguageStore } from "@/store/useLanguageStore";
import {
  selectPractisedToday,
  selectStreakDays,
  selectXpToday,
  useProgressStore,
} from "@/store/useProgressStore";

// Today's plan. `done` is derived from real progress where we track it —
// the lesson row flips once the learner finishes any lesson today. The other
// two rows are for features that don't exist yet (see the Chat / AI Teacher
// tabs), so they have nothing real to report and stay unchecked.
const TODAY_PLAN = [
  {
    id: "lesson",
    type: "Lesson",
    subtitle: "Continue where you left off",
    icon: "book" as const,
    iconBg: "#1B6B3A",
  },
  {
    id: "ai-convo",
    type: "AI Conversation",
    subtitle: "Talk about your day",
    icon: "headset" as const,
    iconBg: "#D4A017",
  },
  {
    id: "vocab",
    type: "New words",
    subtitle: "10 words",
    icon: "chatbubble-ellipses" as const,
    iconBg: "#C4853A",
  },
];

const C = {
  bg: "#FAF6F0",
  surface: "#FFFFFF",
  green: "#1B6B3A",
  greenLight: "#E8F5EE",
  greenMid: "#2D8653",
  gold: "#D4A017",
  goldLight: "#FDF6E3",
  text: "#1A1A1A",
  textSub: "#6B7280",
  border: "#EDE8E0",
  streakOrange: "#E8511A",
};

function AvatarBubble({ imageUrl }: { imageUrl?: string | null }) {
  return (
    <View className="w-[60px] h-[60px] rounded-full bg-[#E8F5EE] overflow-hidden border-2 border-[#FFFFFF] shadow-md">
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          className="w-[60px] h-[60px] rounded-full"
        />
      ) : (
        <Image
          source={images.mascotLogo}
          className="w-[60px] h-[60px] rounded-full"
          resizeMode="cover"
        />
      )}
    </View>
  );
}

function StreakBadge({ days }: { days: number }) {
  return (
    <View className="flex-row items-center bg-[#FFFFFF] rounded-md px-2.5 py-2 gap-1.5 shadow-sm">
      <Image
        source={images.streakFire}
        className="w-6 h-6"
        resizeMode="contain"
      />
      <View>
        <Text className="font-poppins-bold text-[#1A1A1A] text-base">
          {days}
        </Text>
        <Text className="font-poppins-regular text-[#6B7280] text-xs">
          Days
        </Text>
      </View>
    </View>
  );
}

function BellButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="w-10 h-10 rounded-md bg-[#FFFFFF] flex items-center justify-center shadow-sm relative"
    >
      <Ionicons name="notifications-outline" size={22} color={C.text} />
      <View className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#D4A017] border-[1.5px] border-[#FFFFFF]" />
    </Pressable>
  );
}

function DailyGoalCard({ xp, goal }: { xp: number; goal: number }) {
  const pct = Math.min(xp / goal, 1);
  const remaining = goal - xp;
  return (
    <View className="bg-[#FFFFFF] rounded-2xl p-5 flex-row items-center border border-[#EDE8E0] shadow-md overflow-hidden">
      <View className="flex-1 gap-2">
        <Text className="font-poppins-semibold text-[#1B6B3A] text-sm">
          Daily goal
        </Text>
        <View className="flex-row items-baseline">
          <Text className="font-poppins-bold text-4xl text-[#1A1A1A]">
            {xp}
          </Text>
          <Text className="font-poppins-regular text-base text-[#6B7280]">
            {" "}
            / {goal} XP
          </Text>
        </View>
        <View className="h-2.5 bg-[#EDE8E0] rounded-md overflow-visible mr-2 relative">
          <View
            className="h-full bg-[#1B6B3A] rounded-md"
            style={{ width: `${pct * 100}%` }}
          />
          <View
            style={{ position: "absolute", top: -4, left: `${pct * 100}%` }}
          >
            <Ionicons name="star" size={16} color={C.gold} />
          </View>
        </View>
        <View className="flex-row items-center gap-1 mt-0.5">
          <Ionicons name="star" size={13} color={C.gold} />
          <Text className="font-poppins-regular text-[#D4A017] text-sm">
            {remaining > 0
              ? `${remaining} XP to go! Keep it up!`
              : "Daily goal reached! 🎉"}
          </Text>
        </View>
      </View>
      <Image
        source={images.treasure}
        className="w-[90px] h-[90px] -mr-2 ml-2"
        resizeMode="contain"
      />
    </View>
  );
}

function ContinueLearningCard({
  languageName,
  unitOrder,
  onPress,
}: {
  languageName: string;
  unitOrder: number;
  onPress: () => void;
}) {
  return (
    <View className="h-[200px] rounded-2xl bg-[#1B6B3A] overflow-hidden border-[1.5px] border-[#D4A017] relative">
      <Image
        source={images.ajam}
        className="absolute -right-5 -bottom-2.5 w-[70%] h-[130%] opacity-35"
        resizeMode="cover"
      />
      <View className="absolute inset-0 w-[65%] bg-green-500/30" />
      <View className="p-5 flex-1 justify-between gap-1">
        <Text className="font-poppins-semibold text-[#D4A017] text-xs">
          Continue learning
        </Text>
        <Text className="font-poppins-bold text-[#FFFFFF] text-2xl">
          {languageName}
        </Text>
        <Text className="font-poppins-regular text-[#FFFFFF]/80 text-sm">
          Level A1 · Unit {unitOrder}
        </Text>
        <Pressable
          onPress={onPress}
          className="flex-row items-center gap-1.5 bg-[#FFFFFF] self-start py-2.5 px-5 rounded-full mt-2"
        >
          <Text className="font-poppins-semibold text-[#1A1A1A] text-sm">
            Continue
          </Text>
          <Ionicons name="arrow-forward" size={16} color={C.text} />
        </Pressable>
      </View>
    </View>
  );
}

function PlanItem({
  item,
  done,
  isLast,
}: {
  item: (typeof TODAY_PLAN)[number];
  done: boolean;
  isLast: boolean;
}) {
  return (
    <View>
      <View className="flex-row items-center p-4 gap-3.5">
        <View
          className="w-11 h-11 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: item.iconBg }}
        >
          <Ionicons name={item.icon} size={20} color="#FFFFFF" />
        </View>
        <View className="flex-1">
          <Text className="font-poppins-semibold text-[#1A1A1A] text-sm">
            {item.type}
          </Text>
          <Text className="font-poppins-regular text-[#6B7280] text-xs">
            {item.subtitle}
          </Text>
        </View>
        <View
          className="w-7 h-7 rounded-full border-2 border-[#D4D4D4] flex items-center justify-center"
          style={done ? { backgroundColor: C.green, borderColor: C.green } : {}}
        >
          {done && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
        </View>
      </View>
      {!isLast && <View className="h-px bg-[#EDE8E0] ml-14" />}
    </View>
  );
}

function TodaysPlanCard({
  lessonDone,
  onViewAll,
}: {
  lessonDone: boolean;
  onViewAll: () => void;
}) {
  return (
    <View>
      <View className="flex-row items-center justify-between mb-3">
        <Text className="font-poppins-bold text-[#1A1A1A] text-lg">
          Today&apos;s plan
        </Text>
        <Pressable
          onPress={onViewAll}
          className="flex-row items-center gap-0.5"
        >
          <Text className="font-poppins-semibold text-[#1B6B3A] text-sm">
            View all
          </Text>
          <Ionicons name="chevron-forward" size={14} color={C.green} />
        </Pressable>
      </View>
      <View className="bg-[#FFFFFF] rounded-2xl px-4 border border-[#EDE8E0] shadow-md">
        {TODAY_PLAN.map((item, i) => (
          <PlanItem
            key={item.id}
            item={item}
            done={item.id === "lesson" && lessonDone}
            isLast={i === TODAY_PLAN.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

function NextUpBanner({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-[#EBF5EE] rounded-2xl p-5 flex-row items-center border border-[#C6E3CE] shadow-md"
      android_ripple={{ color: "rgba(0,0,0,0.05)" }}
    >
      <View className="flex-1 gap-[3px]">
        <Text className="font-poppins-regular text-[#1B6B3A] text-xs">
          Next up
        </Text>
        {/* This banner used to advertise the AI audio lesson and open the
            Stream call directly, which put the AI on the learner's main path
            straight from the home screen. It now points at the lesson list. */}
        <Text className="font-poppins-bold text-[#1A1A1A] text-xl">
          Continue your lessons
        </Text>
        <Text className="font-poppins-regular text-[#6B7280] text-sm">
          Pick up where you left off
        </Text>
      </View>
      {/* The AI teacher is our mascot — not a stock photo of a stranger from
          a remote avatar service, which was also a blank box when offline. */}
      <View className="relative w-20 h-20">
        <Image
          source={images.mascotLogo}
          className="w-20 h-20 rounded-full border-2 border-[#FFFFFF] bg-[#FFFFFF]"
          resizeMode="cover"
        />
        <View className="absolute bottom-0 right-0 w-[30px] h-[30px] rounded-full bg-[#1B6B3A] flex items-center justify-center border-2 border-[#FFFFFF]">
          <Ionicons name="mic" size={16} color="#FFFFFF" />
        </View>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { user } = useUser();
  const router = useRouter();
  const { selectedLanguageId } = useLanguageStore();

  // Real, persisted progress — these all start at zero for a new learner and
  // grow as lessons are finished (see useProgressStore).
  const streakDays = useProgressStore(selectStreakDays);
  const xpToday = useProgressStore(selectXpToday);
  const practisedToday = useProgressStore(selectPractisedToday);
  const dailyGoal = useProgressStore((s) => s.dailyGoal);

  const firstName = user?.firstName ?? "Learner";
  const avatarUrl = user?.imageUrl;

  const handleNotificationsPress = () => {
    Alert.alert("Notifications", "Coming soon!");
  };

  const language =
    LANGUAGES.find((l) => l.id === selectedLanguageId) ?? LANGUAGES[0];
  const currentUnit =
    UNITS.find((u) => u.languageId === language.id) ?? UNITS[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FAF6F0" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 24,
          gap: 20,
        }}
      >
        <View className="flex-row items-center gap-3">
          <AvatarBubble imageUrl={avatarUrl} />
          <View className="flex-1">
            <Text className="font-poppins-bold text-[#1A1A1A] text-md">
              Sannu, {firstName}! 👋
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <StreakBadge days={streakDays} />
            <BellButton onPress={handleNotificationsPress} />
          </View>
        </View>
        <DailyGoalCard xp={xpToday} goal={dailyGoal} />
        <ContinueLearningCard
          languageName={language.name}
          unitOrder={currentUnit.order}
          onPress={() => router.push("/(home)/learn")}
        />
        <TodaysPlanCard
          lessonDone={practisedToday}
          onViewAll={() => router.push("/(home)/learn")}
        />
        <NextUpBanner onPress={() => router.push("/(home)/learn")} />
      </ScrollView>
    </SafeAreaView>
  );
}
