/**
 * app/(home)/index.tsx
 *
 * Home Dashboard Screen
 *
 * Sections (matching design 05-home-and-tab-navigation):
 *  1. Header       — mascot avatar, greeting, streak badge, bell
 *  2. Daily Goal   — XP progress card with treasure chest
 *  3. Continue     — Full-width dark-green learning card
 *  4. Today's Plan — Checklist of today's activities
 *  5. Next Up      — AI Video Call promo banner
 */

import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import images from "@/constants/images";
import { LANGUAGES } from "@/data/languages";
import { LESSONS } from "@/data/lessons";
import { UNITS } from "@/data/units";
import { useLanguageStore } from "@/store/useLanguageStore";

// ── Mock progress data (will come from a progress store in a future step) ─────
const STREAK_DAYS = 12;
const XP_TODAY = 15;
const XP_GOAL = 20;

// ── Today's plan items ────────────────────────────────────────────────────────
const TODAY_PLAN = [
  {
    id: "lesson",
    type: "Lesson",
    subtitle: "The First Three Letters",
    icon: "book" as const,
    iconBg: "#1B6B3A",
    done: true,
  },
  {
    id: "ai-convo",
    type: "AI Conversation",
    subtitle: "Talk about your day",
    icon: "headset" as const,
    iconBg: "#D4A017",
    done: false,
  },
  {
    id: "vocab",
    type: "New words",
    subtitle: "10 words",
    icon: "chatbubble-ellipses" as const,
    iconBg: "#C4853A",
    done: false,
  },
];

// ── Colors ────────────────────────────────────────────────────────────────────
const C = {
  bg:           "#FAF6F0",
  surface:      "#FFFFFF",
  green:        "#1B6B3A",
  greenLight:   "#E8F5EE",
  greenMid:     "#2D8653",
  gold:         "#D4A017",
  goldLight:    "#FDF6E3",
  text:         "#1A1A1A",
  textSub:      "#6B7280",
  border:       "#EDE8E0",
  streakOrange: "#E8511A",
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Circular avatar — shows Clerk profile photo or mascot fallback */
function AvatarBubble({ imageUrl }: { imageUrl?: string | null }) {
  return (
    <View style={styles.avatarOuter}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.avatarImg} />
      ) : (
        <Image source={images.mascotLogo} style={styles.avatarImg} resizeMode="cover" />
      )}
    </View>
  );
}

/** Streak badge — fire icon + day count */
function StreakBadge({ days }: { days: number }) {
  return (
    <View style={styles.streakBadge}>
      <Image source={images.streakFire} style={styles.streakFireImg} resizeMode="contain" />
      <View>
        <Text style={styles.streakCount}>{days}</Text>
        <Text style={styles.streakLabel}>Day streak</Text>
      </View>
    </View>
  );
}

/** Bell button with notification dot */
function BellButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.bellBtn}>
      <Ionicons name="notifications-outline" size={22} color={C.text} />
      <View style={styles.bellDot} />
    </Pressable>
  );
}

/** Daily XP goal card */
function DailyGoalCard({ xp, goal }: { xp: number; goal: number }) {
  const pct = Math.min(xp / goal, 1);
  const remaining = goal - xp;

  return (
    <View style={styles.goalCard}>
      {/* Left content */}
      <View style={styles.goalLeft}>
        <Text style={styles.goalLabel}>Daily goal</Text>

        {/* XP numbers */}
        <View style={styles.goalXpRow}>
          <Text style={styles.goalXpBig}>{xp}</Text>
          <Text style={styles.goalXpOf}> / {goal} XP</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct * 100}%` as any }]} />
          {/* Gold star marker at progress point */}
          <View style={[styles.progressStar, { left: `${pct * 100}%` as any }]}>
            <Ionicons name="star" size={16} color={C.gold} />
          </View>
        </View>

        {/* Motivating subtitle */}
        <View style={styles.goalSubRow}>
          <Ionicons name="star" size={13} color={C.gold} />
          <Text style={styles.goalSubText}>
            {remaining > 0 ? `${remaining} XP to go! Keep it up!` : "Daily goal reached! 🎉"}
          </Text>
        </View>
      </View>

      {/* Treasure chest */}
      <Image source={images.treasure} style={styles.treasureImg} resizeMode="contain" />
    </View>
  );
}

/** Continue learning card — dark green, shows current language & unit */
function ContinueLearningCard({
  languageName,
  unitTitle,
  unitOrder,
  onPress,
}: {
  languageName: string;
  unitTitle: string;
  unitOrder: number;
  onPress: () => void;
}) {
  return (
    <View style={styles.continueCard}>
      {/* Background mosque image (semi-transparent, right side) */}
      <Image
        source={images.ajam}
        style={styles.continueBgImg}
        resizeMode="cover"
      />

      {/* Gradient overlay — darkens the left so text is readable */}
      <View style={styles.continueOverlay} />

      {/* Content */}
      <View style={styles.continueContent}>
        <Text style={styles.continueEyebrow}>Continue learning</Text>
        <Text style={styles.continueLangName}>{languageName}</Text>
        <Text style={styles.continueMeta}>Level A1 · Unit {unitOrder}</Text>

        {/* Continue button */}
        <Pressable onPress={onPress} style={styles.continueBtn} android_ripple={{ color: "rgba(255,255,255,0.15)" }}>
          <Text style={styles.continueBtnText}>Continue</Text>
          <Ionicons name="arrow-forward" size={16} color={C.text} />
        </Pressable>
      </View>
    </View>
  );
}

/** Single task row inside Today's Plan */
function PlanItem({
  item,
  isLast,
}: {
  item: (typeof TODAY_PLAN)[number];
  isLast: boolean;
}) {
  return (
    <View>
      <View style={styles.planItem}>
        {/* Icon chip */}
        <View style={[styles.planIconWrap, { backgroundColor: item.iconBg }]}>
          <Ionicons name={item.icon} size={20} color="#FFFFFF" />
        </View>

        {/* Text */}
        <View style={styles.planItemText}>
          <Text style={styles.planItemTitle}>{item.type}</Text>
          <Text style={styles.planItemSub}>{item.subtitle}</Text>
        </View>

        {/* Check circle */}
        <View
          style={[
            styles.planCheck,
            item.done && { backgroundColor: C.green, borderColor: C.green },
          ]}
        >
          {item.done && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
        </View>
      </View>

      {/* Divider between rows */}
      {!isLast && <View style={styles.planDivider} />}
    </View>
  );
}

/** Today's plan section */
function TodaysPlanCard({ onViewAll }: { onViewAll: () => void }) {
  return (
    <View>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today's plan</Text>
        <Pressable onPress={onViewAll} style={styles.viewAllBtn}>
          <Text style={styles.viewAllText}>View all</Text>
          <Ionicons name="chevron-forward" size={14} color={C.green} />
        </Pressable>
      </View>

      {/* Plan card */}
      <View style={styles.planCard}>
        {TODAY_PLAN.map((item, i) => (
          <PlanItem
            key={item.id}
            item={item}
            isLast={i === TODAY_PLAN.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

/** Next Up — AI Video Call promo */
function NextUpBanner({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.nextUpCard} android_ripple={{ color: "rgba(0,0,0,0.05)" }}>
      {/* Text content */}
      <View style={styles.nextUpLeft}>
        <Text style={styles.nextUpEyebrow}>Next up</Text>
        <Text style={styles.nextUpTitle}>AI Video Call</Text>
        <Text style={styles.nextUpSub}>Practice speaking with AI</Text>
      </View>

      {/* Right side — person + camera icon */}
      <View style={styles.nextUpRight}>
        {/* Person placeholder from Picsum */}
        <Image
          source={{ uri: "https://i.pravatar.cc/120?img=12" }}
          style={styles.nextUpPersonImg}
        />
        {/* Green camera badge */}
        <View style={styles.nextUpCamBadge}>
          <Ionicons name="videocam" size={16} color="#FFFFFF" />
        </View>
      </View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user } = useUser();
  const router = useRouter();
  const { selectedLanguageId } = useLanguageStore();

  // ── Derived data ────────────────────────────────────────────────────────────
  const firstName = user?.firstName ?? "Learner";
  const avatarUrl = user?.imageUrl;

  const language = LANGUAGES.find((l) => l.id === selectedLanguageId) ?? LANGUAGES[0];
  const currentUnit = UNITS.find((u) => u.languageId === language.id) ?? UNITS[0];
  const currentLesson = LESSONS.find((l) => l.unitId === currentUnit.id) ?? LESSONS[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >

        {/* ── 1. Header ─────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          {/* Avatar */}
          <AvatarBubble imageUrl={avatarUrl} />

          {/* Greeting */}
          <View style={styles.greetingBlock}>
            <Text style={styles.greetingName}>Sannu, {firstName}! 👋</Text>
            <Text style={styles.greetingSub}>Let's continue your Ajami journey.</Text>
          </View>

          {/* Right actions */}
          <View style={styles.headerRight}>
            <StreakBadge days={STREAK_DAYS} />
            <BellButton onPress={() => {}} />
          </View>
        </View>

        {/* ── 2. Daily Goal ─────────────────────────────────────────────────── */}
        <DailyGoalCard xp={XP_TODAY} goal={XP_GOAL} />

        {/* ── 3. Continue Learning ──────────────────────────────────────────── */}
        <ContinueLearningCard
          languageName={language.name}
          unitTitle={currentUnit.title}
          unitOrder={currentUnit.order}
          onPress={() => {}}
        />

        {/* ── 4. Today's Plan ───────────────────────────────────────────────── */}
        <TodaysPlanCard onViewAll={() => {}} />

        {/* ── 5. Next Up ────────────────────────────────────────────────────── */}
        <NextUpBanner onPress={() => {}} />

        {/* Bottom spacer so last card clears the tab bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 20,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarOuter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.greenLight,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: C.surface,
    // Shadow
    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
  } as any,
  avatarImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  greetingBlock: {
    flex: 1,
  },
  greetingName: {
    fontFamily: "Poppins-Bold",
    fontSize: 17,
    color: C.text,
    lineHeight: 24,
  },
  greetingSub: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    color: C.textSub,
    lineHeight: 18,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  // ── Streak badge ──────────────────────────────────────────────────────────
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 6,
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  } as any,
  streakFireImg: {
    width: 24,
    height: 24,
  },
  streakCount: {
    fontFamily: "Poppins-Bold",
    fontSize: 14,
    color: C.text,
    lineHeight: 18,
  },
  streakLabel: {
    fontFamily: "Poppins-Regular",
    fontSize: 10,
    color: C.textSub,
    lineHeight: 13,
  },

  // ── Bell button ───────────────────────────────────────────────────────────
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  } as any,
  bellDot: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.gold,
    borderWidth: 1.5,
    borderColor: C.surface,
  },

  // ── Daily Goal Card ───────────────────────────────────────────────────────
  goalCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    overflow: "hidden",
  } as any,
  goalLeft: {
    flex: 1,
    gap: 8,
  },
  goalLabel: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 13,
    color: C.green,
    letterSpacing: 0.2,
  },
  goalXpRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  goalXpBig: {
    fontFamily: "Poppins-Bold",
    fontSize: 40,
    color: C.text,
    lineHeight: 46,
  },
  goalXpOf: {
    fontFamily: "Poppins-Regular",
    fontSize: 16,
    color: C.textSub,
  },
  progressTrack: {
    height: 10,
    backgroundColor: "#EDE8E0",
    borderRadius: 6,
    overflow: "visible",
    marginRight: 8,
    position: "relative",
  },
  progressFill: {
    height: "100%",
    backgroundColor: C.green,
    borderRadius: 6,
  },
  progressStar: {
    position: "absolute",
    top: -4,
    marginLeft: -10,
  },
  goalSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  goalSubText: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    color: C.gold,
  },
  treasureImg: {
    width: 90,
    height: 90,
    marginLeft: 8,
    marginRight: -8,
  },

  // ── Continue Learning Card ────────────────────────────────────────────────
  continueCard: {
    height: 200,
    borderRadius: 20,
    backgroundColor: C.green,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#D4A017",
    position: "relative",
  },
  continueBgImg: {
    position: "absolute",
    right: -20,
    bottom: -10,
    width: "70%",
    height: "130%",
    opacity: 0.35,
  },
  continueOverlay: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "65%",
    // Gradient from opaque green to transparent right
    backgroundColor: "transparent",
  },
  continueContent: {
    padding: 22,
    flex: 1,
    justifyContent: "space-between",
    gap: 4,
  },
  continueEyebrow: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 12,
    color: C.gold,
    letterSpacing: 0.3,
  },
  continueLangName: {
    fontFamily: "Poppins-Bold",
    fontSize: 26,
    color: "#FFFFFF",
    lineHeight: 32,
  },
  continueMeta: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 50,
    marginTop: 8,
  },
  continueBtnText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
    color: C.text,
  },

  // ── Section header ────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: 17,
    color: C.text,
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  viewAllText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 13,
    color: C.green,
  },

  // ── Plan card ─────────────────────────────────────────────────────────────
  planCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: C.border,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  } as any,
  planItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 14,
  },
  planIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderCurve: "continuous",
  } as any,
  planItemText: {
    flex: 1,
  },
  planItemTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
    color: C.text,
    lineHeight: 20,
  },
  planItemSub: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    color: C.textSub,
    lineHeight: 18,
  },
  planCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#D4D4D4",
    alignItems: "center",
    justifyContent: "center",
  },
  planDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
    marginLeft: 58,
  },

  // ── Next Up Banner ────────────────────────────────────────────────────────
  nextUpCard: {
    backgroundColor: "#EBF5EE",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C6E3CE",
    overflow: "hidden",
    boxShadow: "0 2px 8px rgba(27,107,58,0.08)",
  } as any,
  nextUpLeft: {
    flex: 1,
    gap: 3,
  },
  nextUpEyebrow: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    color: C.green,
  },
  nextUpTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: 20,
    color: C.text,
    lineHeight: 26,
  },
  nextUpSub: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    color: C.textSub,
  },
  nextUpRight: {
    position: "relative",
    width: 80,
    height: 80,
  },
  nextUpPersonImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: C.surface,
  },
  nextUpCamBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.green,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: C.surface,
  },

  // ── Bottom spacer ─────────────────────────────────────────────────────────
  bottomSpacer: {
    height: 12,
  },
});
