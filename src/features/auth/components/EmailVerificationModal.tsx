/**
 * features/auth/components/EmailVerificationModal.tsx
 *
 * Email verification modal — wired to Clerk.
 * Works for both sign-up (attemptEmailAddressVerification)
 * and sign-in (attemptFirstFactor with email_code strategy).
 *
 * The modal figures out which flow is active and calls the right Clerk method.
 */

import { Button } from "@/components/ui/button";
import { useSignIn, useSignUp } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Types ───────────────────────────────────────────────────────────────────

interface EmailVerificationModalProps {
  visible: boolean;
  email: string;
  onClose: () => void;
  onVerified: () => void;
}

const CODE_LENGTH = 6;

// ─── Component ────────────────────────────────────────────────────────────────

export function EmailVerificationModal({
  visible,
  email,
  onClose,
  onVerified,
}: EmailVerificationModalProps) {
  const { signUp, setActive: setActiveSignUp } = useSignUp();
  const { signIn, setActive: setActiveSignIn } = useSignIn();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setCode("");
      setError(null);
      setResent(false);
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [visible]);

  useEffect(() => {
    if (code.length === CODE_LENGTH) {
      handleVerify(code);
    }
  }, [code]);

  // ── Determine active flow ──────────────────────────────────────────────────

  const isSignUpFlow = signUp?.status === "missing_requirements";

  // ── Verify ────────────────────────────────────────────────────────────────

  const handleVerify = async (value: string) => {
    setError(null);
    setLoading(true);
    try {
      if (isSignUpFlow && signUp) {
        // Sign-up verification
        const result = await signUp.attemptEmailAddressVerification({
          code: value,
        });
        if (result.status === "complete") {
          await setActiveSignUp!({ session: result.createdSessionId });
          onVerified();
        } else {
          throw new Error("Verification incomplete. Please try again.");
        }
      } else if (signIn) {
        // Sign-in verification
        const result = await signIn.attemptFirstFactor({
          strategy: "email_code",
          code: value,
        });
        if (result.status === "complete") {
          await setActiveSignIn!({ session: result.createdSessionId });
          onVerified();
        } else {
          throw new Error("Verification incomplete. Please try again.");
        }
      }
    } catch (err: any) {
      setCode("");
      setError(
        err.errors?.[0]?.message ??
          err.message ??
          "Invalid code. Please try again.",
      );
      shake();
    } finally {
      setLoading(false);
    }
  };

  // ── Resend ────────────────────────────────────────────────────────────────

  const handleResend = async () => {
    setError(null);
    setResent(false);
    try {
      if (isSignUpFlow && signUp) {
        await signUp.prepareEmailAddressVerification({
          strategy: "email_code",
        });
      } else if (signIn) {
        await signIn.create({ identifier: email, strategy: "email_code" });
      }
      setResent(true);
    } catch (err: any) {
      setError(err.errors?.[0]?.message ?? "Couldn't resend code.");
    }
  };

  // ── Shake animation on error ───────────────────────────────────────────────

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 6,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -6,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable className="absolute inset-0 bg-black/45" onPress={onClose} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "position" : "height"}
        className="flex-1 justify-end"
      >
        <View className="bg-[#FAF6F0] rounded-t-[28px] px-6 pt-5 pb-10 items-center">
          {/* Close */}
          <TouchableOpacity
            className="absolute top-[18px] right-5"
            onPress={onClose}
            hitSlop={12}
          >
            <Ionicons name="close" size={22} color="#64748B" />
          </TouchableOpacity>

          {/* Icon */}
          <View className="w-[60px] h-[60px] rounded-full bg-[#E6F7F2] items-center justify-center mt-2 mb-4">
            <Ionicons name="mail-outline" size={30} color="#0E9F6E" />
          </View>

          {/* Heading */}
          <Text className="text-[22px] font-bold text-[#0F172A] mb-1.5 text-center">
            Check your email
          </Text>
          <Text className="text-sm text-[#64748B] text-center leading-[21px] mb-7">
            We sent a 6-digit code to{"\n"}
            <Text className="font-semibold text-[#0F172A]">{email}</Text>
          </Text>

          {/* Hidden input */}
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={(v) => {
              const cleaned = v.replace(/\D/g, "").slice(0, CODE_LENGTH);
              setCode(cleaned);
              if (error) setError(null);
            }}
            keyboardType="number-pad"
            maxLength={CODE_LENGTH}
            style={styles.hiddenInput}
            caretHidden
            autoCorrect={false}
          />

          {/* Digit boxes */}
          <Animated.View
            className="w-full mb-2"
            style={{ transform: [{ translateX: shakeAnim }] }}
          >
            <Pressable
              className="flex-row justify-center gap-2.5"
              onPress={() => inputRef.current?.focus()}
            >
              {Array.from({ length: CODE_LENGTH }).map((_, i) => {
                const char = code[i] ?? "";
                const isCurrent = i === code.length && !loading;
                return (
                  <View
                    key={i}
                    className={[
                      "w-[46px] h-[52px] rounded-xl items-center justify-center border-[1.5px]",
                      error
                        ? "border-[#EF4444] bg-[#FEF2F2]"
                        : char
                          ? "border-[#0E9F6E] bg-[#E6F7F2]"
                          : isCurrent
                            ? "border-2 border-[#0E9F6E] bg-white"
                            : "border-[#E5E7EB] bg-white",
                    ].join(" ")}
                  >
                    <Text className="text-[22px] font-bold text-[#0F172A]">
                      {char}
                    </Text>
                  </View>
                );
              })}
            </Pressable>
          </Animated.View>

          {/* Feedback */}
          {error ? (
            <Text className="text-[13px] text-[#EF4444] text-center mb-3 min-h-[18px]">
              {error}
            </Text>
          ) : resent ? (
            <Text className="text-[13px] text-[#22C55E] text-center mb-3 min-h-[18px]">
              Code resent — check your inbox.
            </Text>
          ) : (
            <View className="min-h-[30px]" />
          )}

          {/* Verify button */}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            disabled={code.length < CODE_LENGTH || loading}
            onPress={() => handleVerify(code)}
            style={{ marginBottom: 16 }}
          >
            Verify email
          </Button>

          {/* Resend */}
          <TouchableOpacity className="py-1" onPress={handleResend} hitSlop={8}>
            <Text className="text-sm text-[#64748B]">
              Didn't receive it?{" "}
              <Text className="text-[#0E9F6E] font-semibold">Resend code</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
});
