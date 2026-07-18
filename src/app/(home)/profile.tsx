/**
 * app/(home)/profile.tsx
 *
 * Profile Tab — learner identity, stats, settings, and account actions.
 */

import { useClerk, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import images from "@/constants/images";
import { LANGUAGES } from "@/data/languages";
import { useCaptionsStore } from "@/store/useCaptionsStore";
import { useLanguageStore } from "@/store/useLanguageStore";

// Mock progress data — same values/pattern as index.tsx, so Home and
// Profile agree until a real progress store exists.
const STREAK_DAYS = 12;
const XP_TODAY = 15;
const XP_GOAL = 20;

const C = {
  bg: "#FAF6F0",
  surface: "#FFFFFF",
  green: "#1B6B3A",
  greenLight: "#E8F5EE",
  gold: "#D4A017",
  text: "#1A1A1A",
  textSub: "#6B7280",
  border: "#EDE8E0",
  danger: "#DC2626",
};

function ProfileAvatar({ imageUrl }: { imageUrl?: string | null }) {
  return (
    <View className="w-24 h-24 rounded-full bg-[#E8F5EE] overflow-hidden border-2 border-[#FFFFFF] shadow-md">
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} className="w-24 h-24 rounded-full" />
      ) : (
        <Image
          source={images.mascotLogo}
          className="w-24 h-24 rounded-full"
          resizeMode="cover"
        />
      )}
    </View>
  );
}

function IdentityCard({
  name,
  email,
  imageUrl,
}: {
  name: string;
  email?: string | null;
  imageUrl?: string | null;
}) {
  return (
    <View className="bg-[#FFFFFF] rounded-2xl p-6 items-center border border-[#EDE8E0] shadow-md gap-2">
      <ProfileAvatar imageUrl={imageUrl} />
      <Text className="font-poppins-bold text-[#1A1A1A] text-xl mt-2">
        {name}
      </Text>
      {email && (
        <Text className="font-poppins-regular text-[#6B7280] text-sm">
          {email}
        </Text>
      )}
    </View>
  );
}

function StatTile({
  icon,
  iconColor,
  scriptChar,
  value,
  label,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  scriptChar?: string;
  value: string | number;
  label: string;
}) {
  return (
    <View className="flex-1 items-center bg-[#FFFFFF] rounded-2xl py-4 border border-[#EDE8E0] shadow-sm gap-1">
      {scriptChar ? (
        <Text
          className="font-poppins-bold text-2xl"
          style={{ color: iconColor }}
        >
          {scriptChar}
        </Text>
      ) : (
        <Ionicons name={icon!} size={22} color={iconColor} />
      )}
      <Text className="font-poppins-bold text-[#1A1A1A] text-lg">{value}</Text>
      <Text className="font-poppins-regular text-[#6B7280] text-xs text-center px-1">
        {label}
      </Text>
    </View>
  );
}

function StatsRow({
  streakDays,
  xpToday,
  xpGoal,
  language,
}: {
  streakDays: number;
  xpToday: number;
  xpGoal: number;
  language: { name: string; script: string; color: string };
}) {
  return (
    <View className="flex-row gap-3">
      <StatTile
        icon="flame"
        iconColor={C.gold}
        value={streakDays}
        label="Day streak"
      />
      <StatTile
        icon="star"
        iconColor={C.gold}
        value={`${xpToday}/${xpGoal}`}
        label="XP today"
      />
      <StatTile
        scriptChar={language.script}
        iconColor={language.color}
        value=""
        label={language.name}
      />
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  right,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  right: React.ReactNode;
  onPress?: () => void;
}) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      className="flex-row items-center px-4 py-3.5 gap-3"
    >
      <Ionicons name={icon} size={20} color={C.text} />
      <Text className="flex-1 font-poppins-medium text-[#1A1A1A] text-sm">
        {label}
      </Text>
      {right}
    </Wrapper>
  );
}

function SettingsCard({
  captionsEnabled,
  onToggleCaptions,
  onChangeLanguage,
}: {
  captionsEnabled: boolean;
  onToggleCaptions: () => void;
  onChangeLanguage: () => void;
}) {
  return (
    <View>
      <Text className="font-poppins-bold text-[#1A1A1A] text-lg mb-3">
        Settings
      </Text>
      <View className="bg-[#FFFFFF] rounded-2xl border border-[#EDE8E0] shadow-md">
        <SettingsRow
          icon="chatbox-ellipses-outline"
          label="Live captions"
          right={
            <Switch
              value={captionsEnabled}
              onValueChange={onToggleCaptions}
              trackColor={{ false: C.border, true: C.green }}
              thumbColor="#FFFFFF"
            />
          }
        />
        <View className="h-px bg-[#EDE8E0] ml-14" />
        <SettingsRow
          icon="earth-outline"
          label="Change language"
          onPress={onChangeLanguage}
          right={
            <Ionicons name="chevron-forward" size={18} color={C.textSub} />
          }
        />
      </View>
    </View>
  );
}

function AccountCard({ onSignOut }: { onSignOut: () => void }) {
  return (
    <View>
      <Text className="font-poppins-bold text-[#1A1A1A] text-lg mb-3">
        Account
      </Text>
      <Pressable
        onPress={onSignOut}
        className="flex-row items-center justify-center gap-2 bg-[#FFFFFF] rounded-2xl py-3.5 border border-[#EDE8E0] shadow-sm"
      >
        <Ionicons name="log-out-outline" size={20} color={C.danger} />
        <Text
          className="font-poppins-semibold text-sm"
          style={{ color: C.danger }}
        >
          Sign out
        </Text>
      </Pressable>
    </View>
  );
}

export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const { selectedLanguageId } = useLanguageStore();
  const { captionsEnabled, toggleCaptions } = useCaptionsStore();

  const name = user?.fullName || user?.firstName || "Learner";
  const email = user?.primaryEmailAddress?.emailAddress;
  const imageUrl = user?.imageUrl;

  const language =
    LANGUAGES.find((l) => l.id === selectedLanguageId) ?? LANGUAGES[0];

  const handleSignOut = () => {
    Alert.alert(
      "Sign out?",
      "You'll need to sign in again to continue learning.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: () => signOut(),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 24,
          gap: 20,
        }}
      >
        <Text className="font-poppins-bold text-[#1A1A1A] text-2xl">
          Profile
        </Text>
        <IdentityCard name={name} email={email} imageUrl={imageUrl} />
        <StatsRow
          streakDays={STREAK_DAYS}
          xpToday={XP_TODAY}
          xpGoal={XP_GOAL}
          language={language}
        />
        <SettingsCard
          captionsEnabled={captionsEnabled}
          onToggleCaptions={toggleCaptions}
          onChangeLanguage={() => router.push("/(home)/languages")}
        />
        <AccountCard onSignOut={handleSignOut} />
      </ScrollView>
    </SafeAreaView>
  );
}
