/**
 * src/features/learning/components/AudioButton.tsx
 *
 * Plays one pre-recorded clip from a lesson document.
 *
 * Deliberately dumb: it is handed a URL and plays it. It does no fetching,
 * caching or downloading of its own — Phase 4 will hand it a local file:// URI
 * for a cached clip and an https:// one otherwise, and this component will not
 * need to change or even know which it received.
 *
 * There is no text-to-speech fallback and no synthesis. A missing clip renders
 * a disabled button, because the alternative — generating audio at runtime —
 * is exactly the dependency the content model exists to remove.
 */

import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Pressable, Text, View } from "react-native";

import type { MediaRef } from "@/types/content";

const C = {
  green: "#1B6B3A",
  greenLight: "#E8F5EE",
  disabled: "#D8D2C7",
  textSub: "#6B7280",
};

export interface AudioButtonProps {
  audio?: MediaRef;
  /** "lg" for the exercise stem, "sm" for an inline option. */
  size?: "sm" | "lg";
  label?: string;
}

export function AudioButton({ audio, size = "lg", label }: AudioButtonProps) {
  // Hooks cannot be conditional, so the player is always created; passing
  // null simply gives an idle player for exercises that have no clip.
  const player = useAudioPlayer(audio ? { uri: audio.url } : null);
  const status = useAudioPlayerStatus(player);

  const available = audio !== undefined;
  const diameter = size === "lg" ? 72 : 40;
  const iconSize = size === "lg" ? 32 : 18;

  const handlePress = () => {
    if (!available) return;
    // Always restart from the top: a learner tapping replay wants to hear the
    // word again from the beginning, not resume from wherever it stopped.
    player.seekTo(0);
    player.play();
  };

  return (
    <View className="items-center gap-2">
      <Pressable
        onPress={handlePress}
        disabled={!available}
        accessibilityRole="button"
        accessibilityLabel={label ?? "Play audio"}
        accessibilityState={{ disabled: !available }}
        style={{
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          backgroundColor: available ? C.greenLight : "#F3F0EA",
          borderWidth: 2,
          borderColor: available ? C.green : C.disabled,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons
          name={status.playing ? "volume-high" : "play"}
          size={iconSize}
          color={available ? C.green : C.disabled}
        />
      </Pressable>

      {size === "lg" && !available && (
        <Text className="font-poppins-regular text-xs text-[#6B7280]">
          No recording yet
        </Text>
      )}
    </View>
  );
}
