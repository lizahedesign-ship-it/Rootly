import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../src/theme';

// ─── Screen data ──────────────────────────────────────────────────────────────

const SCREENS = [
  {
    illustrationColor: Colors.green100,
    headline: 'Their day. Their habits.',
    subtitle: "Kids build habits better when it's theirs.",
    btnLabel: 'Get started',
  },
  {
    illustrationColor: Colors.green200,
    headline: 'Watch your child grow.',
    subtitle: 'See progress. Know when to nudge.',
    btnLabel: 'Next',
  },
  {
    illustrationColor: Colors.green300,
    headline: 'Ready to begin?',
    subtitle: "Build your child's first habit together.",
    btnLabel: "Let's go 🚀",
  },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  async function skip() {
    await AsyncStorage.setItem('onboarding_complete', 'true');
    router.push('/(parent)/create-profile');
  }

  async function handlePrimary() {
    if (step < SCREENS.length - 1) {
      setStep((s) => s + 1);
    } else {
      await AsyncStorage.setItem('onboarding_complete', 'true');
      router.push('/(parent)/create-profile');
    }
  }

  const { illustrationColor, headline, subtitle, btnLabel } = SCREENS[step];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>

      {/* Top bar */}
      <View style={styles.topBar}>
        {step > 0 ? (
          <TouchableOpacity onPress={() => setStep((s) => s - 1)} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.topBarSpacer} />
        )}

        {step === 0 ? (
          <TouchableOpacity onPress={skip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.topBarSpacer} />
        )}
      </View>

      {/* Illustration placeholder */}
      <View style={[styles.illustration, { backgroundColor: illustrationColor }]} />

      {/* Text content */}
      <View style={styles.content}>
        <Text style={styles.headline}>{headline}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {/* Primary button + progress dots */}
      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handlePrimary}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>{btnLabel}</Text>
        </TouchableOpacity>

        <View style={styles.dotsRow}>
          {SCREENS.map((_, i) => (
            <View key={i} style={[styles.dot, step === i && styles.dotActive]} />
          ))}
        </View>
      </View>

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },

  // ── Top bar ──────────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  topBarSpacer: {
    minWidth: 60,
  },
  backBtn: {
    minWidth: 60,
  },
  backText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: Typography.size.base,
    color: Colors.green700,
  },
  skipBtn: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  skipText: {
    fontFamily: 'Nunito_500Medium',
    fontSize: Typography.size.base,
    color: Colors.textMuted,
  },

  // ── Illustration ──────────────────────────────────────────────────────────────
  illustration: {
    width: '100%',
    height: 300,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },

  // ── Text content ──────────────────────────────────────────────────────────────
  content: {
    flex: 1,
    paddingHorizontal: Spacing['3xl'],
    paddingTop: Spacing['3xl'],
    gap: Spacing.md,
  },
  headline: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: Typography.size['2xl'],
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: 'Nunito_500Medium',
    fontSize: Typography.size.md,
    color: Colors.textSecondary,
    lineHeight: Typography.size.md * 1.6,
  },

  // ── Bottom ────────────────────────────────────────────────────────────────────
  bottom: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  primaryBtn: {
    backgroundColor: Colors.green700,
    borderRadius: Radius.full,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: Typography.size.md,
    color: Colors.white,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.green700,
  },
});
