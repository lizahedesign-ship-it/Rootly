import { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../src/theme';

// ─── Illustrations ────────────────────────────────────────────────────────────

const img1 = require('../assets/illustrations/onboarding-1.png');
const img2 = require('../assets/illustrations/onboarding-2.png');
const img3 = require('../assets/illustrations/onboarding-3.png');

// ─── Screen data ──────────────────────────────────────────────────────────────

const SCREENS = [
  {
    image:    img1,
    headline: 'Their day. Their habits.',
    subtitle: "Kids build habits better when it's theirs.",
    btnLabel: 'Get started',
  },
  {
    image:    img2,
    headline: 'Watch your child grow.',
    subtitle: 'See progress. Know when to nudge.',
    btnLabel: 'Next',
  },
  {
    image:    img3,
    headline: 'Ready to begin?',
    subtitle: "Build your child's first habit together.",
    btnLabel: "Let's go 🚀",
  },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [step, setStep] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  function skip() {
    router.push('/(parent)/create-profile');
  }

  function scrollTo(index: number) {
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
    setStep(index);
  }

  function handlePrimary() {
    if (step < SCREENS.length - 1) {
      scrollTo(step + 1);
    } else {
      router.push('/(parent)/create-profile?from=onboarding');
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>

      {/* Top bar — back only on screens 2+, skip always visible */}
      <View style={styles.topBar}>
        {step > 0 ? (
          <TouchableOpacity onPress={() => scrollTo(step - 1)} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={Colors.green700} />
          </TouchableOpacity>
        ) : (
          <View style={styles.topBarSpacer} />
        )}

        <TouchableOpacity onPress={skip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Horizontally paged content — illustration + text per screen */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const newStep = Math.round(e.nativeEvent.contentOffset.x / width);
          setStep(newStep);
        }}
        style={styles.pager}
      >
        {SCREENS.map((screen, i) => (
          <View key={i} style={[styles.page, { width }]}>
            <Image source={screen.image} style={styles.illustration} resizeMode="cover" />
            <View style={styles.content}>
              <Text style={styles.headline}>{screen.headline}</Text>
              <Text style={styles.subtitle}>{screen.subtitle}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Primary button + progress dots — fixed outside the pager */}
      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handlePrimary}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>{SCREENS[step].btnLabel}</Text>
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
  skipBtn: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  skipText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: Typography.size.base,
    color: Colors.textMuted,
  },

  // ── Pager ────────────────────────────────────────────────────────────────────
  pager: {
    flex: 1,
  },
  page: {
    // width set inline via useWindowDimensions
    paddingTop: Spacing['4xl'] + 24,   // breathing room above the illustration
  },

  // ── Illustration ──────────────────────────────────────────────────────────────
  illustration: {
    width:  '100%',
    height: 300,
  },

  // ── Text content ──────────────────────────────────────────────────────────────
  content: {
    paddingHorizontal: Spacing['3xl'],
    paddingTop: Spacing['3xl'],
    gap: Spacing.md,
  },
  headline: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: Typography.size['2xl'],
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Outfit_500Medium',
    fontSize: Typography.size.md,
    color: Colors.textSecondary,
    lineHeight: Typography.size.md * 1.6,
    textAlign: 'center',
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
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontFamily: 'Outfit_600SemiBold',
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
